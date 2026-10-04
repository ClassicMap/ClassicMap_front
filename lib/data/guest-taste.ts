import {
  EMPTY_TASTE_ANSWERS,
  LISTENING_LEVELS,
  MAX_GUEST_IDS,
  PLAYER_INSTRUMENTS,
  TASTE_SOUNDS,
} from '@/lib/api/taste';
import type { OnboardingStatus, TasteAnswers } from '@/lib/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 로그인하지 않은 사람의 취향. 이 기기에만 두고, 로그인하면 서버로 옮긴 뒤 지운다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 빈 값으로 둔다.
 */
export interface GuestTaste {
  answers: TasteAnswers;
  onboarding: OnboardingStatus | null;
  favoriteComposerIds: number[];
  favoriteArtistIds: number[];
  notInterestedPieceIds: number[];
}

const STORAGE_KEY = 'classicmap.guest-taste.v1';

export const EMPTY_GUEST_TASTE: GuestTaste = {
  answers: EMPTY_TASTE_ANSWERS,
  onboarding: null,
  favoriteComposerIds: [],
  favoriteArtistIds: [],
  notInterestedPieceIds: [],
};

function ids(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : [];
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function parse(raw: string | null): GuestTaste {
  if (!raw) return EMPTY_GUEST_TASTE;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null) return EMPTY_GUEST_TASTE;
  const record = value as Record<string, unknown>;
  const answers = (
    typeof record.answers === 'object' && record.answers !== null ? record.answers : {}
  ) as Record<string, unknown>;
  return {
    answers: {
      listeningLevel: pick(answers.listeningLevel, LISTENING_LEVELS),
      sounds: Array.isArray(answers.sounds)
        ? answers.sounds.map((sound) => pick(sound, TASTE_SOUNDS)).filter((sound) => sound !== null)
        : [],
      instrument: pick(answers.instrument, PLAYER_INSTRUMENTS),
      favoritePeriods: Array.isArray(answers.favoritePeriods)
        ? answers.favoritePeriods.filter((period): period is string => typeof period === 'string')
        : [],
      seedPieceIds: ids(answers.seedPieceIds),
    },
    onboarding: pick<OnboardingStatus>(record.onboarding, ['completed', 'skipped']),
    favoriteComposerIds: ids(record.favoriteComposerIds),
    favoriteArtistIds: ids(record.favoriteArtistIds),
    notInterestedPieceIds: ids(record.notInterestedPieceIds),
  };
}

export async function readGuestTaste(): Promise<GuestTaste> {
  try {
    return parse(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_GUEST_TASTE;
  }
}

/** 목록은 최근 것만 남긴다. 서버가 한 요청에 받는 id 수를 넘지 않게 */
function trim(taste: GuestTaste): GuestTaste {
  return {
    ...taste,
    favoriteComposerIds: taste.favoriteComposerIds.slice(-MAX_GUEST_IDS),
    favoriteArtistIds: taste.favoriteArtistIds.slice(-MAX_GUEST_IDS),
    notInterestedPieceIds: taste.notInterestedPieceIds.slice(-MAX_GUEST_IDS),
  };
}

export async function writeGuestTaste(taste: GuestTaste): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trim(taste)));
  } catch {
    // 저장소를 못 쓰면 이번 방문 동안만 화면 상태로 둔다
  }
}

export async function clearGuestTaste(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지울 것이 없으면 그대로 둔다
  }
}
