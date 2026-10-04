// lib/hooks/useTaste.ts
// 사용자 취향. 로그인하면 서버(/me/taste), 아니면 이 기기에 둔다.

import { MyPageAPI } from '@/lib/api/client';
import { setListeningHistoryMode } from '@/lib/data/listening-events';
import * as LegacyProfile from '@/lib/api/mock-db';
import {
  EMPTY_TASTE_ANSWERS,
  ONBOARDING_VERSION,
  TasteAPI,
  type TasteSaveOptions,
} from '@/lib/api/taste';
import {
  clearGuestTaste,
  EMPTY_GUEST_TASTE,
  type GuestTaste,
  readGuestTaste,
  writeGuestTaste,
} from '@/lib/data/guest-taste';
import type { OnboardingStatus, TasteAnswers, TasteProfile } from '@/lib/types/models';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

/** 로그인 사용자 키는 ['me', …] 아래에 둬서 계정이 바뀌면 루트 레이아웃이 지운다 */
export const TASTE_QUERY_KEYS = {
  mine: ['me', 'taste'] as const,
  guest: ['guest', 'taste'] as const,
  onboardingPieces: ['taste', 'onboarding-pieces'] as const,
  myRecommendations: ['me', 'recommendations', 'home'] as const,
  guestRecommendations: ['guest', 'recommendations', 'home'] as const,
};

/**
 * 기기 답을 서버로 옮기는 일이 끝난 계정. 끝나기 전에는 로그인 사용자의 취향을 '아직 모름'으로 둔다.
 * 그래야 옮기는 도중에 온보딩이 빈 답으로 열려 옮긴 답을 덮지 않는다.
 */
let syncedUserId: string | null = null;
const syncListeners = new Set<() => void>();

function setSyncedUser(userId: string | null) {
  if (syncedUserId === userId) return;
  syncedUserId = userId;
  for (const listener of syncListeners) listener();
}

function subscribeSynced(listener: () => void) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function useSyncedUser(): string | null {
  return React.useSyncExternalStore(
    subscribeSynced,
    () => syncedUserId,
    () => syncedUserId
  );
}

/** 서버 저장은 한 번에 하나씩, 누른 순서대로 보낸다. 응답이 뒤바뀌어 앞 선택이 사라지지 않게 */
let saveChain: Promise<unknown> = Promise.resolve();
let saveSequence = 0;
/** 기기 저장도 읽고-고치고-쓰기라 한 번에 하나씩 */
let guestChain: Promise<unknown> = Promise.resolve();

function serialize<T>(chain: 'save' | 'guest', task: () => Promise<T>): Promise<T> {
  const previous = chain === 'save' ? saveChain : guestChain;
  const run = previous.then(task);
  const settled = run.catch(() => undefined);
  if (chain === 'save') saveChain = settled;
  else guestChain = settled;
  return run;
}

function refreshRecommendations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.myRecommendations });
  void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.guestRecommendations });
}

export interface TasteState {
  /** 로그인 여부와 저장된 답을 다 알았는지. 서버에서 못 읽었거나 기기 답을 옮기는 중이면 false 다 */
  ready: boolean;
  /** 저장된 답을 읽었는지. 기기 답을 옮기는 중이어도 true 라 설정처럼 지금 값을 보여 주기만 하는 곳에 쓴다 */
  loaded: boolean;
  /** 로그인했는데 서버 취향을 못 읽었다(가입 직후 사용자 행이 아직 없을 때 등) */
  failed: boolean;
  retry: () => void;
  signedIn: boolean;
  answers: TasteAnswers;
  onboardingStatus: OnboardingStatus | null;
  historyEnabled: boolean;
  guest: GuestTaste;
  save: (answers: TasteAnswers, options?: TasteSaveOptions) => Promise<void>;
  /** 로그인하지 않은 사람의 담아 둔 것·관심 없음 */
  updateGuest: (update: (current: GuestTaste) => GuestTaste) => Promise<void>;
}

export function useTaste(): TasteState {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  const signedIn = isLoaded && isSignedIn === true;
  const queryClient = useQueryClient();
  const synced = useSyncedUser();

  const mine = useQuery({
    queryKey: TASTE_QUERY_KEYS.mine,
    queryFn: TasteAPI.getMine,
    enabled: signedIn,
    staleTime: 5 * 60_000,
  });
  const guest = useQuery({
    queryKey: TASTE_QUERY_KEYS.guest,
    queryFn: readGuestTaste,
    enabled: isLoaded && !signedIn,
    staleTime: Infinity,
  });

  const updateGuest = React.useCallback(
    (update: (current: GuestTaste) => GuestTaste) =>
      serialize('guest', async () => {
        const next = update(await readGuestTaste());
        await writeGuestTaste(next);
        queryClient.setQueryData(TASTE_QUERY_KEYS.guest, next);
        refreshRecommendations(queryClient);
      }),
    [queryClient]
  );

  const save = React.useCallback(
    async (answers: TasteAnswers, options: TasteSaveOptions = {}) => {
      if (!signedIn) {
        await updateGuest((current) => ({
          ...current,
          answers,
          onboarding: options.onboarding ?? current.onboarding,
        }));
        return;
      }
      // 화면은 바로 바꾸고, 서버에는 순서대로 보낸다. 다음 칩은 바뀐 화면 값에서 계산된다
      const previous = queryClient.getQueryData<TasteProfile>(TASTE_QUERY_KEYS.mine);
      if (previous) {
        queryClient.setQueryData<TasteProfile>(TASTE_QUERY_KEYS.mine, {
          ...previous,
          ...answers,
          onboarding: options.onboarding
            ? { status: options.onboarding, version: ONBOARDING_VERSION }
            : previous.onboarding,
          historyEnabled: options.historyEnabled ?? previous.historyEnabled,
        });
      }
      const sequence = ++saveSequence;
      try {
        const saved = await serialize('save', () => TasteAPI.saveMine(answers, options));
        // 뒤에 누른 저장이 남아 있으면 그 결과가 화면을 정한다
        if (sequence === saveSequence)
          queryClient.setQueryData<TasteProfile>(TASTE_QUERY_KEYS.mine, saved);
        refreshRecommendations(queryClient);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.mine });
        throw error;
      }
    },
    [queryClient, signedIn, updateGuest]
  );

  const profile = mine.data;
  const guestTaste = guest.data ?? EMPTY_GUEST_TASTE;
  return {
    ready: isLoaded && (signedIn ? mine.isSuccess && synced === userId : guest.isSuccess),
    loaded: isLoaded && (signedIn ? mine.isSuccess : guest.isSuccess),
    failed: signedIn && mine.isError,
    retry: () => void mine.refetch(),
    signedIn,
    answers: signedIn ? (profile ?? EMPTY_TASTE_ANSWERS) : guestTaste.answers,
    onboardingStatus: signedIn ? (profile?.onboarding.status ?? null) : guestTaste.onboarding,
    historyEnabled: signedIn ? (profile?.historyEnabled ?? true) : true,
    guest: guestTaste,
    save,
    updateGuest,
  };
}

function hasAnswers(answers: TasteAnswers): boolean {
  return (
    answers.listeningLevel !== null ||
    answers.sounds.length > 0 ||
    answers.favoritePeriods.length > 0 ||
    answers.seedPieceIds.length > 0
  );
}

/**
 * 로그인하면 이 기기에 둔 것을 서버로 옮긴다.
 * - 답(온보딩 상태 포함)은 서버에 아직 답이 없을 때만 옮긴다. 예전 mock-db 의 좋아하는 시대도 이때 한 번 옮긴다
 * - 담아 둔 사람과 관심 없음은 서버에 답이 있어도 더해 둔다
 * - 다 옮겨야 기기 것을 지운다. 실패하면 남겨 두고 다음 로그인 때 다시 옮긴다
 * 끝나면 그 계정을 '옮김 끝'으로 표시해 useTaste 가 ready 가 된다.
 */
export function useTasteSync(): void {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  const queryClient = useQueryClient();
  const signedIn = isLoaded && isSignedIn === true;
  const mine = useQuery({
    queryKey: TASTE_QUERY_KEYS.mine,
    queryFn: TasteAPI.getMine,
    enabled: signedIn,
    staleTime: 5 * 60_000,
  });
  const startedFor = React.useRef<string | null>(null);

  // 로그아웃하면 다음 로그인 때 다시 옮길 수 있게 되돌린다
  React.useEffect(() => {
    if (isLoaded && !signedIn) {
      startedFor.current = null;
      setSyncedUser(null);
    }
  }, [isLoaded, signedIn]);

  // 들은 기록은 로그인했고 설정에서 켠 사람만 보낸다. 설정을 읽기 전 기록은 모아 둔다
  const historyMode = !signedIn
    ? 'off'
    : mine.data === undefined
      ? 'pending'
      : mine.data.historyEnabled
        ? 'on'
        : 'off';
  React.useEffect(() => {
    setListeningHistoryMode(historyMode);
  }, [historyMode]);

  React.useEffect(() => {
    const profile = mine.data;
    if (!signedIn || !userId || !profile || startedFor.current === userId) return;
    startedFor.current = userId;

    void (async () => {
      try {
        const guest = await readGuestTaste();
        const legacy = await LegacyProfile.getUserProfile(userId).catch(() => null);
        const legacyPeriods = legacy?.preferences?.favoritePeriods ?? [];
        const serverEmpty = profile.onboarding.status === null && !hasAnswers(profile);
        const guestHasAnswers = guest.onboarding !== null || hasAnswers(guest.answers);
        const guestHasExtras =
          guest.favoriteComposerIds.length > 0 ||
          guest.favoriteArtistIds.length > 0 ||
          guest.notInterestedPieceIds.length > 0;
        if (!guestHasAnswers && !guestHasExtras && !(serverEmpty && legacyPeriods.length > 0))
          return;

        let complete = true;
        if (serverEmpty && (guestHasAnswers || legacyPeriods.length > 0)) {
          const answers: TasteAnswers = {
            ...guest.answers,
            favoritePeriods:
              guest.answers.favoritePeriods.length > 0
                ? guest.answers.favoritePeriods
                : legacyPeriods,
          };
          try {
            const saved = await TasteAPI.saveMine(
              answers,
              guest.onboarding ? { onboarding: guest.onboarding } : {}
            );
            queryClient.setQueryData<TasteProfile>(TASTE_QUERY_KEYS.mine, saved);
          } catch {
            complete = false;
          }
        }
        if (guestHasExtras) {
          const results = await Promise.allSettled([
            ...guest.favoriteComposerIds.map((id) => MyPageAPI.addFavoriteComposer(id)),
            ...guest.favoriteArtistIds.map((id) => MyPageAPI.addFavoriteArtist(id)),
            TasteAPI.sendEvents(
              guest.notInterestedPieceIds.map((pieceId) => ({
                pieceId,
                kind: 'not_interested' as const,
              }))
            ),
          ]);
          if (results.some((result) => result.status === 'rejected')) complete = false;
          void queryClient.invalidateQueries({ queryKey: ['me'] });
        }
        if (complete && (guestHasAnswers || guestHasExtras)) {
          await clearGuestTaste();
          queryClient.removeQueries({ queryKey: TASTE_QUERY_KEYS.guest });
        }
      } finally {
        setSyncedUser(userId);
      }
    })();
  }, [mine.data, queryClient, signedIn, userId]);
}
