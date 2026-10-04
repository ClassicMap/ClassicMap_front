// lib/hooks/useTaste.ts
// 사용자 취향. 로그인하면 서버(/me/taste), 아니면 이 기기에 둔다.

import { MyPageAPI } from '@/lib/api/client';
import * as LegacyProfile from '@/lib/api/mock-db';
import { EMPTY_TASTE_ANSWERS, TasteAPI, type TasteSaveOptions } from '@/lib/api/taste';
import {
  clearGuestTaste,
  EMPTY_GUEST_TASTE,
  type GuestTaste,
  readGuestTaste,
  writeGuestTaste,
} from '@/lib/data/guest-taste';
import type { OnboardingStatus, TasteAnswers, TasteProfile } from '@/lib/types/models';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

/** 로그인 사용자 키는 ['me', …] 아래에 둬서 계정이 바뀌면 루트 레이아웃이 지운다 */
export const TASTE_QUERY_KEYS = {
  mine: ['me', 'taste'] as const,
  guest: ['guest', 'taste'] as const,
  onboardingPieces: ['taste', 'onboarding-pieces'] as const,
  myRecommendations: ['me', 'recommendations', 'home'] as const,
  guestRecommendations: ['guest', 'recommendations', 'home'] as const,
};

export interface TasteState {
  /** 로그인 여부와 저장된 답을 다 알았는지 */
  ready: boolean;
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
  const { isLoaded, isSignedIn } = useClerkAuth();
  const signedIn = isLoaded && isSignedIn === true;
  const queryClient = useQueryClient();

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

  const refreshRecommendations = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.myRecommendations });
    void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.guestRecommendations });
  }, [queryClient]);

  const updateGuest = React.useCallback(
    async (update: (current: GuestTaste) => GuestTaste) => {
      const next = update(await readGuestTaste());
      await writeGuestTaste(next);
      queryClient.setQueryData(TASTE_QUERY_KEYS.guest, next);
      refreshRecommendations();
    },
    [queryClient, refreshRecommendations]
  );

  const save = React.useCallback(
    async (answers: TasteAnswers, options: TasteSaveOptions = {}) => {
      if (signedIn) {
        const saved = await TasteAPI.saveMine(answers, options);
        queryClient.setQueryData<TasteProfile>(TASTE_QUERY_KEYS.mine, saved);
        refreshRecommendations();
        return;
      }
      await updateGuest((current) => ({
        ...current,
        answers,
        onboarding: options.onboarding ?? current.onboarding,
      }));
    },
    [queryClient, refreshRecommendations, signedIn, updateGuest]
  );

  const profile = mine.data;
  const guestTaste = guest.data ?? EMPTY_GUEST_TASTE;
  return {
    ready: isLoaded && (signedIn ? mine.isSuccess || mine.isError : guest.isSuccess),
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
 * 로그인하면 이 기기에 둔 것을 서버로 옮긴다. 서버에 아직 답이 없을 때만 옮기고, 옮긴 뒤 기기 것은 지운다.
 * 예전에 기기에만 두던 좋아하는 시대(mock-db)도 이때 한 번 옮긴다.
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
  const syncedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    const profile = mine.data;
    if (!signedIn || !userId || !profile || syncedFor.current === userId) return;
    syncedFor.current = userId;

    void (async () => {
      const guest = await readGuestTaste();
      const legacy = await LegacyProfile.getUserProfile(userId).catch(() => null);
      const legacyPeriods = legacy?.preferences?.favoritePeriods ?? [];
      const serverEmpty = profile.onboarding.status === null && !hasAnswers(profile);
      const guestHasSomething =
        guest.onboarding !== null ||
        hasAnswers(guest.answers) ||
        guest.favoriteComposerIds.length > 0 ||
        guest.favoriteArtistIds.length > 0 ||
        guest.notInterestedPieceIds.length > 0;

      if (serverEmpty && (guestHasSomething || legacyPeriods.length > 0)) {
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
          await Promise.allSettled([
            ...guest.favoriteComposerIds.map((id) => MyPageAPI.addFavoriteComposer(id)),
            ...guest.favoriteArtistIds.map((id) => MyPageAPI.addFavoriteArtist(id)),
          ]);
          await TasteAPI.sendEvents(
            guest.notInterestedPieceIds.map((pieceId) => ({
              pieceId,
              kind: 'not_interested' as const,
            }))
          ).catch(() => undefined);
          void queryClient.invalidateQueries({ queryKey: ['me'] });
        } catch {
          // 다음에 다시 열면 또 시도한다
          syncedFor.current = null;
          return;
        }
      }
      if (guestHasSomething) await clearGuestTaste();
      queryClient.removeQueries({ queryKey: TASTE_QUERY_KEYS.guest });
    })();
  }, [mine.data, queryClient, signedIn, userId]);
}
