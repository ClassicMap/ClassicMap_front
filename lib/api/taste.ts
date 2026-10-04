import { API_BASE_URL, authenticatedFetch } from '@/lib/api/client';
import { parsePiece } from '@/lib/api/comparisons';
import type {
  HomeRecommendations,
  ListeningEvent,
  ListeningEventKind,
  ListeningLevel,
  OnboardingPiece,
  OnboardingStatus,
  PlayerInstrument,
  RecommendationShelf,
  RecommendationShelfKey,
  RecommendedPiece,
  TasteAnswers,
  TasteProfile,
  TasteSound,
} from '@/lib/types/models';

export const LISTENING_LEVELS: readonly ListeningLevel[] = ['new', 'some', 'often', 'player'];
export const TASTE_SOUNDS: readonly TasteSound[] = [
  'piano',
  'orchestra',
  'strings',
  'voice',
  'ensemble',
];
export const PLAYER_INSTRUMENTS: readonly PlayerInstrument[] = [
  'piano',
  'strings',
  'winds',
  'voice',
  'other',
];
/** 온보딩 질문 판. 질문을 바꾸면 올려서 다시 보여 줄지 정한다 */
export const ONBOARDING_VERSION = 1;

const SHELF_KEYS: readonly RecommendationShelfKey[] = ['taste', 'known', 'starter'];

export const EMPTY_TASTE_ANSWERS: TasteAnswers = {
  listeningLevel: null,
  sounds: [],
  instrument: null,
  favoritePeriods: [],
  seedPieceIds: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function listOf<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  return Array.isArray(value)
    ? value.map((item) => oneOf(item, allowed)).filter((item): item is T => item !== null)
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function ids(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : [];
}

function parseProfile(value: unknown): TasteProfile {
  if (!isRecord(value)) throw new Error('취향 응답 형식이 올바르지 않습니다.');
  const onboarding = isRecord(value.onboarding) ? value.onboarding : {};
  return {
    listeningLevel: oneOf(value.listeningLevel, LISTENING_LEVELS),
    sounds: listOf(value.sounds, TASTE_SOUNDS),
    instrument: oneOf(value.instrument, PLAYER_INSTRUMENTS),
    favoritePeriods: strings(value.favoritePeriods),
    seedPieceIds: ids(value.seedPieceIds),
    onboarding: {
      status: oneOf<OnboardingStatus>(onboarding.status, ['completed', 'skipped']),
      version: typeof onboarding.version === 'number' ? onboarding.version : null,
    },
    historyEnabled: value.historyEnabled !== false,
  };
}

function parseRecommended(value: unknown): RecommendedPiece {
  if (!isRecord(value)) throw new Error('추천 작품 응답 형식이 올바르지 않습니다.');
  return {
    ...parsePiece(value),
    sectorId:
      Number.isInteger(value.sectorId) && Number(value.sectorId) > 0
        ? Number(value.sectorId)
        : null,
    sectorName:
      typeof value.sectorName === 'string' && value.sectorName !== '' ? value.sectorName : null,
    reasons: strings(value.reasons),
  };
}

function parseRecommendations(value: unknown): HomeRecommendations {
  if (!isRecord(value)) throw new Error('추천 응답 형식이 올바르지 않습니다.');
  const shelves: RecommendationShelf[] = Array.isArray(value.shelves)
    ? value.shelves.filter(isRecord).flatMap((shelf) => {
        const key = oneOf(shelf.key, SHELF_KEYS);
        if (!key || !Array.isArray(shelf.items)) return [];
        return [{ key, items: shelf.items.map(parseRecommended) }];
      })
    : [];
  return {
    personalized: value.personalized === true,
    today: value.today ? parseRecommended(value.today) : null,
    shelves,
  };
}

async function send(path: string, init: RequestInit, failure: string): Promise<Response> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw new Error(`${failure} (${response.status})`);
  return response;
}

/** 저장할 답. 연주 악기는 직접 연주할 때만 보낸다 */
function answersBody(answers: TasteAnswers) {
  return {
    listeningLevel: answers.listeningLevel,
    sounds: answers.sounds,
    instrument: answers.listeningLevel === 'player' ? answers.instrument : null,
    favoritePeriods: answers.favoritePeriods,
    seedPieceIds: answers.seedPieceIds,
  };
}

export interface TasteSaveOptions {
  onboarding?: OnboardingStatus;
  historyEnabled?: boolean;
}

/** 로그인하지 않은 사람이 기기에 둔 것 */
export interface GuestSignals {
  answers: TasteAnswers;
  favoriteComposerIds: number[];
  favoriteArtistIds: number[];
  recentPieceIds: number[];
  notInterestedPieceIds: number[];
}

export const TasteAPI = {
  async getMine(): Promise<TasteProfile> {
    const response = await send('/me/taste', {}, '취향을 불러오지 못했습니다.');
    return parseProfile(await response.json());
  },

  async saveMine(answers: TasteAnswers, options: TasteSaveOptions = {}): Promise<TasteProfile> {
    const body = {
      ...answersBody(answers),
      ...(options.onboarding
        ? { onboarding: { status: options.onboarding, version: ONBOARDING_VERSION } }
        : {}),
      ...(options.historyEnabled === undefined ? {} : { historyEnabled: options.historyEnabled }),
    };
    const response = await send(
      '/me/taste',
      { method: 'PUT', body: JSON.stringify(body) },
      '취향을 저장하지 못했습니다.'
    );
    return parseProfile(await response.json());
  },

  async getOnboardingPieces(): Promise<OnboardingPiece[]> {
    const response = await send('/taste/onboarding-pieces', {}, '고를 곡을 불러오지 못했습니다.');
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('온보딩 곡 응답 형식이 올바르지 않습니다.');
    return payload.filter(isRecord).map((item) => ({
      pieceId: Number(item.pieceId),
      pieceTitle: String(item.pieceTitle ?? ''),
      composerId: Number(item.composerId),
      composerName: String(item.composerName ?? ''),
      composerAvatarUrl: typeof item.composerAvatarUrl === 'string' ? item.composerAvatarUrl : null,
      leadSound: String(item.leadSound ?? ''),
    }));
  },

  async getMyHome(): Promise<HomeRecommendations> {
    const response = await send('/me/recommendations/home', {}, '추천을 불러오지 못했습니다.');
    return parseRecommendations(await response.json());
  },

  async getGuestHome(signals: GuestSignals): Promise<HomeRecommendations> {
    const body = {
      taste: answersBody(signals.answers),
      favoriteComposerIds: signals.favoriteComposerIds,
      favoriteArtistIds: signals.favoriteArtistIds,
      recentPieceIds: signals.recentPieceIds,
      notInterestedPieceIds: signals.notInterestedPieceIds,
    };
    const response = await send(
      '/recommendations/home',
      { method: 'POST', body: JSON.stringify(body) },
      '추천을 불러오지 못했습니다.'
    );
    return parseRecommendations(await response.json());
  },

  async sendEvents(events: ListeningEvent[]): Promise<void> {
    if (events.length === 0) return;
    await send(
      '/me/listening-events',
      { method: 'POST', body: JSON.stringify({ events }) },
      '들은 기록을 보내지 못했습니다.'
    );
  },

  /** 작품과 종류를 주면 그것만, 안 주면 들은 기록을 모두 지운다 */
  async deleteEvents(filter: { pieceId?: number; kind?: ListeningEventKind } = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filter.pieceId) params.set('piece_id', String(filter.pieceId));
    if (filter.kind) params.set('kind', filter.kind);
    const query = params.toString();
    await send(
      `/me/listening-events${query ? `?${query}` : ''}`,
      { method: 'DELETE' },
      '들은 기록을 지우지 못했습니다.'
    );
  },
};
