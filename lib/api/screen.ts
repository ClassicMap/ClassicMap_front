import { API_BASE_URL, authenticatedFetch } from '@/lib/api/client';
import type {
  FeaturedScreenCue,
  PieceScreenCue,
  ScreenCue,
  ScreenCueEvidence,
  ScreenCueListen,
  ScreenCueUsage,
  ScreenOfficialClip,
  ScreenStillCandidates,
  ScreenStreamingLinks,
  ScreenThumbQuality,
  ScreenThumbs,
  ScreenTitleDetail,
  ScreenTitleKind,
  ScreenTitlePage,
  ScreenTitleSummary,
  ScreenWork,
  ScreenWorkPage,
} from '@/lib/types/models';

export const SCREEN_TITLE_KINDS: readonly ScreenTitleKind[] = ['MOVIE', 'SERIES', 'ANIME'];
const USAGES: readonly ScreenCueUsage[] = ['SCORE', 'SOURCE', 'PERFORMED', 'TITLES'];
const THUMB_QUALITIES: readonly ScreenThumbQuality[] = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function thumbQuality(value: unknown): ScreenThumbQuality | null {
  return typeof value === 'string' && (THUMB_QUALITIES as readonly string[]).includes(value)
    ? (value as ScreenThumbQuality)
    : null;
}

/** webp 화질만 있고 jpg 화질이 없으면 믿지 않는다(서버는 둘을 같이 적는다) */
function parseThumbs(jpg: unknown, webp: unknown): ScreenThumbs {
  const jpgQuality = thumbQuality(jpg);
  return { jpg: jpgQuality, webp: jpgQuality ? thumbQuality(webp) : null };
}

/** 포스터는 KMDb 파일 서버의 https 주소이고 출처가 같이 올 때만 쓴다 */
function parsePoster(item: Record<string, unknown>): { posterUrl: string | null; posterCredit: string | null } {
  const url = optionalText(item.posterUrl);
  const credit = optionalText(item.posterCredit);
  return url && credit && url.startsWith('https://file.koreafilm.or.kr/')
    ? { posterUrl: url, posterCredit: credit }
    : { posterUrl: null, posterCredit: null };
}

function parseSummary(item: Record<string, unknown>): ScreenTitleSummary {
  return {
    id: Number(item.id),
    slug: text(item.slug),
    kind: oneOf(item.kind, SCREEN_TITLE_KINDS, 'MOVIE'),
    titleKo: text(item.titleKo),
    titleOriginal: optionalText(item.titleOriginal),
    releaseYear: optionalNumber(item.releaseYear),
    countryCode: optionalText(item.countryCode),
    creditLine: optionalText(item.creditLine),
    posterPath: optionalText(item.posterPath),
    backdropPath: optionalText(item.backdropPath),
    ...parsePoster(item),
    cueCount: Number(item.cueCount ?? 0),
    coverVideoId: optionalText(item.coverVideoId),
    coverChannel: optionalText(item.coverChannel),
    coverThumbs: parseThumbs(item.coverThumbJpg, item.coverThumbWebp),
  };
}

function parsePage(payload: unknown): ScreenTitlePage {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error('영화 목록 응답 형식이 올바르지 않습니다.');
  }
  return {
    items: payload.items.filter(isRecord).map(parseSummary),
    hasMore: payload.hasMore === true,
  };
}

function parseClip(value: unknown): ScreenOfficialClip | null {
  if (!isRecord(value) || typeof value.videoId !== 'string') return null;
  return {
    videoId: value.videoId,
    startSec: Number(value.startSec ?? 0),
    channel: text(value.channel),
    title: text(value.title),
    thumbs: parseThumbs(value.thumbJpg, value.thumbWebp),
  };
}

function parseEvidence(value: unknown): ScreenCueEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((item) => {
    const grade = item.grade === '1' || item.grade === '2' ? item.grade : null;
    const url = text(item.url);
    if (!grade || !/^https?:\/\//.test(url)) return [];
    return [{ grade, kind: text(item.kind), url, note: text(item.note) }];
  });
}

function parseLinks(value: unknown): ScreenStreamingLinks {
  const links = isRecord(value) ? value : {};
  return {
    appleMusicUrl: optionalText(links.appleMusicUrl),
    spotifyUrl: optionalText(links.spotifyUrl),
    youtubeMusicUrl: optionalText(links.youtubeMusicUrl),
  };
}

function parseListen(value: unknown): ScreenCueListen {
  if (!isRecord(value)) return { kind: 'none' };
  if (value.kind === 'sector' && typeof value.sectorId === 'number') {
    return {
      kind: 'sector',
      sectorId: value.sectorId,
      readyPerformanceCount: Number(value.readyPerformanceCount ?? 0),
    };
  }
  if (value.kind === 'piece') return { kind: 'piece' };
  if (value.kind === 'external') return { kind: 'external', links: parseLinks(value.links) };
  return { kind: 'none' };
}

function parseCue(item: Record<string, unknown>): ScreenCue {
  return {
    id: Number(item.id),
    order: Number(item.order ?? 0),
    episodeLabel: optionalText(item.episodeLabel),
    composerId: optionalNumber(item.composerId),
    composerName: text(item.composerName),
    pieceId: optionalNumber(item.pieceId),
    workTitle: text(item.workTitle),
    partLabel: optionalText(item.partLabel),
    usage: oneOf(item.usage, USAGES, 'SCORE'),
    arranged: item.arranged === true,
    approxAtSec: optionalNumber(item.approxAtSec),
    sceneNote: text(item.sceneNote),
    spoiler: item.spoiler === true,
    officialClip: parseClip(item.officialClip),
    evidence: parseEvidence(item.evidence),
    stillPath: optionalText(item.stillPath),
    listen: parseListen(item.listen),
  };
}

/** 연결이 멈추면 끝없이 기다리지 않고 '다시 시도'를 보인다 */
const REQUEST_TIMEOUT_MS = 10_000;

async function get(path: string, failure: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`${failure} (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const ScreenAPI = {
  async getTitles(params: { kind?: ScreenTitleKind; offset?: number; limit?: number } = {}): Promise<ScreenTitlePage> {
    const query = new URLSearchParams();
    if (params.kind) query.append('kind', params.kind);
    if (params.offset) query.append('offset', String(params.offset));
    if (params.limit) query.append('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return parsePage(await get(`/screen-titles${suffix}`, '영화 목록을 불러오지 못했습니다.'));
  },

  async search(params: { q: string; kind?: ScreenTitleKind; offset?: number; limit?: number }): Promise<ScreenTitlePage> {
    const query = new URLSearchParams({ q: params.q });
    if (params.kind) query.append('kind', params.kind);
    if (params.offset) query.append('offset', String(params.offset));
    if (params.limit) query.append('limit', String(params.limit));
    return parsePage(await get(`/screen-titles/search?${query.toString()}`, '영화를 찾지 못했습니다.'));
  },

  /** 없거나 공개되지 않은 작품이면 null */
  async getTitle(titleId: number): Promise<ScreenTitleDetail | null> {
    const response = await fetch(`${API_BASE_URL}/screen-titles/${titleId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`작품을 불러오지 못했습니다. (${response.status})`);
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.cues)) {
      throw new Error('작품 응답 형식이 올바르지 않습니다.');
    }
    return { ...parseSummary(payload), cues: payload.cues.filter(isRecord).map(parseCue) };
  },

  async getPieceCues(pieceId: number): Promise<PieceScreenCue[]> {
    const payload = await get(`/pieces/${pieceId}/screen-cues`, '이 곡이 나온 작품을 불러오지 못했습니다.');
    if (!Array.isArray(payload)) return [];
    return payload.filter(isRecord).map((item) => ({
      cueId: Number(item.cueId),
      titleId: Number(item.titleId),
      titleKo: text(item.titleKo),
      kind: oneOf(item.kind, SCREEN_TITLE_KINDS, 'MOVIE'),
      releaseYear: optionalNumber(item.releaseYear),
      posterPath: optionalText(item.posterPath),
      ...parsePoster(item),
      partLabel: optionalText(item.partLabel),
      episodeLabel: optionalText(item.episodeLabel),
      sectorId: optionalNumber(item.sectorId),
      usage: oneOf(item.usage, USAGES, 'SCORE'),
      coverVideoId: optionalText(item.coverVideoId),
      coverThumbs: parseThumbs(item.coverThumbJpg, item.coverThumbWebp),
    }));
  },

  async getWorks(params: { offset?: number; limit?: number } = {}): Promise<ScreenWorkPage> {
    const query = new URLSearchParams();
    if (params.offset) query.append('offset', String(params.offset));
    if (params.limit) query.append('limit', String(params.limit));
    const payload = await get(`/screen-works?${query.toString()}`, '영화에 나온 곡을 불러오지 못했습니다.');
    if (!isRecord(payload) || !Array.isArray(payload.items)) {
      throw new Error('영화에 나온 곡 응답 형식이 올바르지 않습니다.');
    }
    const items: ScreenWork[] = payload.items.filter(isRecord).map((item) => ({
      composerId: optionalNumber(item.composerId),
      composerName: text(item.composerName),
      pieceId: optionalNumber(item.pieceId),
      workTitle: text(item.workTitle),
      titles: (Array.isArray(item.titles) ? item.titles : []).filter(isRecord).map((title) => ({
        titleId: Number(title.titleId),
        titleKo: text(title.titleKo),
        kind: oneOf(title.kind, SCREEN_TITLE_KINDS, 'MOVIE'),
        releaseYear: optionalNumber(title.releaseYear),
      })),
    }));
    return { items, hasMore: payload.hasMore === true };
  },

  async getFeaturedCues(limit = 12): Promise<FeaturedScreenCue[]> {
    const payload = await get(`/screen-cues/featured?limit=${limit}`, '바로 들을 대목을 불러오지 못했습니다.');
    if (!Array.isArray(payload)) return [];
    return payload.filter(isRecord).map((item) => ({
      cueId: Number(item.cueId),
      titleId: Number(item.titleId),
      titleKo: text(item.titleKo),
      kind: oneOf(item.kind, SCREEN_TITLE_KINDS, 'MOVIE'),
      posterPath: optionalText(item.posterPath),
      ...parsePoster(item),
      composerId: Number(item.composerId),
      composerName: text(item.composerName),
      pieceId: Number(item.pieceId),
      workTitle: text(item.workTitle),
      partLabel: optionalText(item.partLabel),
      sectorId: Number(item.sectorId),
      coverVideoId: optionalText(item.coverVideoId),
      coverThumbs: parseThumbs(item.coverThumbJpg, item.coverThumbWebp),
    }));
  },

  async getStillCandidates(titleId: number): Promise<ScreenStillCandidates> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/screen-titles/${titleId}/stills`);
    if (!response.ok) throw new Error(`스틸 후보를 불러오지 못했습니다. (${response.status})`);
    const payload: unknown = await response.json();
    if (!isRecord(payload)) throw new Error('스틸 후보 응답 형식이 올바르지 않습니다.');
    return {
      titleId: Number(payload.titleId),
      backdropPath: optionalText(payload.backdropPath),
      stillPaths: Array.isArray(payload.stillPaths) ? payload.stillPaths.filter((path): path is string => typeof path === 'string') : [],
      cues: Array.isArray(payload.cues)
        ? payload.cues.filter(isRecord).map((cue) => ({
            id: Number(cue.id),
            workTitle: text(cue.workTitle),
            partLabel: optionalText(cue.partLabel),
            stillPath: optionalText(cue.stillPath),
          }))
        : [],
    };
  },

  async setCueStill(cueId: number, stillPath: string | null): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/screen-cues/${cueId}/still`, {
      method: 'PUT',
      body: JSON.stringify({ stillPath }),
    });
    if (!response.ok) throw new Error(`스틸을 저장하지 못했습니다. (${response.status})`);
  },
};
