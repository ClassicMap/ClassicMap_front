/**
 * API 클라이언트
 * 현재는 목 데이터를 반환하지만, 나중에 실제 API 호출로 쉽게 대체 가능
 */

import {
  COMPOSERS,
  PIECES,
  ARTISTS,
  PERFORMANCES,
  PERIODS,
  getMajorPiecesByComposer,
  getPerformancesByPiece,
  getPieceById,
  getComposerById,
  getArtistById,
  getComposersByPeriod,
} from '../data';

import type {
  Composer,
  Piece,
  Artist,
  Performance,
  PerformanceSector,
  PerformanceSectorWithCount,
  Period,
  ComposerWithPieces,
  PieceWithPerformances,
  PieceSearchResult,
  PerformanceWithArtist,
  Recording,
  Venue,
  Concert,
  ConcertArtist,
  ConcertImage,
  TicketVendor,
  BoxofficeRanking,
} from '../types/models';

// API 응답 타입 정의
interface APIComposer {
  id: number;
  name: string;
  fullName: string;
  englishName: string;
  period: string;
  birthYear: number;
  deathYear: number | null;
  nationality: string;
  imageUrl?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  style?: string;
  influence?: string;
  pieceCount?: number;
}

interface APIPiece {
  id: number;
  composerId: number;
  type: 'album' | 'song';
  title: string;
  titleEn?: string;
  description?: string;
  opusNumber?: string;
  compositionYear?: number;
  difficultyLevel?: number;
  durationMinutes?: number;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
}

interface APIPieceSearchResult extends APIPiece {
  composerName: string;
  composerAvatarUrl?: string | null;
}

interface APIArtistAward {
  id: number;
  artistId: number;
  year: string;
  awardName: string;
  displayOrder: number;
}

interface APIArtist {
  id: number;
  name: string;
  englishName: string;
  category: string;
  tier: 'S' | 'A' | 'B' | 'Rising';
  rating: number;
  imageUrl?: string;
  coverImageUrl?: string;
  birthYear?: string;
  nationality: string;
  bio?: string;
  style?: string;
  awards?: APIArtistAward[];
  concertCount: number;
  countryCount: number;
  albumCount: number;
}

interface APIConcertArtist {
  id: number;
  concertId: number;
  artistId: number;
  artistName: string;
  role?: string;
}

interface APIBoxofficeRanking {
  id: number;
  ranking: number;
  genreName?: string;
  areaName?: string;
  seatScale?: string;
  performanceCount?: number;
}

interface APITicketVendor {
  id: number;
  concertId: number;
  vendorName?: string;
  vendorUrl: string;
  displayOrder: number;
}

interface APIConcertImage {
  id: number;
  concertId: number;
  imageUrl: string;
  imageType: string;
  displayOrder: number;
}

interface APIConcert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  startDate: string; // 백엔드에서 startDate로 보냄
  endDate?: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  program?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
  artists?: APIConcertArtist[];
  facilityName?: string;
  area?: string;
  genre?: string;
  boxofficeRanking?: APIBoxofficeRanking | number; // ConcertListItem에서는 숫자만 올 수 있음
  ticketVendors?: APITicketVendor[]; // ConcertWithDetails에서 오는 데이터
  // Detail fields
  synopsis?: string;
  runtime?: string;
  ageRestriction?: string;
  cast?: string;
  crew?: string;
  performanceSchedule?: string;
  productionCompany?: string;
  productionCompanyHost?: string;
  images?: APIConcertImage[];
  // Metadata
  kopisId?: string;
  dataSource?: string;
  isOpenRun?: boolean;
  isVisit?: boolean;
  isChild?: boolean;
  isDaehakro?: boolean;
  isFestival?: boolean;
  /** 편성 코드(쉼표 구분). 배포 전 백엔드는 보내지 않는다 */
  instrumentation?: string | null;
}

interface APIVenue {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
}



// Performance API 타입
interface APIPerformance {
  id: number;
  sectorId: number;
  pieceId: number;
  artistId: number;
  videoPlatform: 'youtube' | 'vimeo' | 'other';
  videoId: string;
  startTime: number;
  endTime: number;
  characteristic?: string;
  viewCount: number;
  rating: number;
}

// API 응답을 프론트엔드 모델로 변환
const COMPOSER_TIERS: ReadonlySet<unknown> = new Set(['S', 'A', 'B', 'C']);

const mapComposer = (api: any): Composer => {
  const mapped = {
    id: api.id,
    name: api.name,
    fullName: api.fullName,
    englishName: api.englishName,
    period: api.period as '중세' | '르네상스' | '바로크' | '고전주의' | '낭만주의' | '근현대',
    birthYear: api.birthYear,
    deathYear: api.deathYear,
    nationality: api.nationality,
    imageUrl: api.imageUrl ? api.imageUrl : undefined,
    avatarUrl: api.avatarUrl ? api.avatarUrl : undefined,
    coverImageUrl: api.coverImageUrl ? api.coverImageUrl : undefined,
    bio: api.bio,
    style: api.style,
    influence: api.influence,
    pieceCount: api.pieceCount,
    tier: COMPOSER_TIERS.has(api.tier) ? (api.tier as Composer['tier']) : undefined,
  };
  return mapped;
};

const mapPiece = (api: APIPiece): Piece => ({
  id: api.id,
  composerId: api.composerId,
  title: api.title,
  titleEn: api.titleEn,
  type: 'song', // 기본값
  description: api.description,
  opusNumber: api.opusNumber,
  compositionYear: api.compositionYear,
  difficultyLevel: api.difficultyLevel,
  durationMinutes: api.durationMinutes,
  spotifyUrl: api.spotifyUrl,
  appleMusicUrl: api.appleMusicUrl,
  youtubeMusicUrl: api.youtubeMusicUrl,
});

const mapArtist = (api: APIArtist): Artist => ({
  id: api.id,
  name: api.name,
  englishName: api.englishName,
  category: api.category,
  tier: api.tier,
  rating: api.rating,
  imageUrl: api.imageUrl ? api.imageUrl : undefined,
  coverImageUrl: api.coverImageUrl ? api.coverImageUrl : undefined,
  birthYear: api.birthYear,
  nationality: api.nationality,
  bio: api.bio,
  style: api.style,
  awards: api.awards?.map((award) => ({
    id: award.id,
    artistId: award.artistId,
    year: award.year,
    awardName: award.awardName,
    displayOrder: award.displayOrder,
  })),
  concertCount: api.concertCount,
  countryCount: api.countryCount,
  albumCount: api.albumCount,
});

const mapConcert = (api: APIConcert): Concert => ({
  id: api.id,
  title: api.title,
  composerInfo: api.composerInfo,
  venueId: api.venueId,
  startDate: api.startDate,
  endDate: api.endDate,
  concertTime: api.concertTime,
  priceInfo: api.priceInfo,
  posterUrl: api.posterUrl ? api.posterUrl : undefined,
  program: api.program,
  status: api.status,
  rating: api.rating,
  ratingCount: api.ratingCount,
  facilityName: api.facilityName,
  area: api.area,
  genre: api.genre,
  // boxofficeRanking이 숫자면 객체로 변환 (ConcertListItem의 경우)
  boxofficeRanking:
    typeof api.boxofficeRanking === 'number'
      ? { id: 0, ranking: api.boxofficeRanking }
      : api.boxofficeRanking,
  ticketVendors: api.ticketVendors,
  artists: api.artists?.map((artist) => ({
    id: artist.id,
    concertId: artist.concertId,
    artistId: artist.artistId,
    artistName: artist.artistName,
    role: artist.role,
  })),
  // Detail fields
  synopsis: api.synopsis,
  runtime: api.runtime,
  ageRestriction: api.ageRestriction,
  cast: api.cast,
  crew: api.crew,
  performanceSchedule: api.performanceSchedule,
  productionCompany: api.productionCompany,
  productionCompanyHost: api.productionCompanyHost,
  images: api.images,
  // Metadata
  kopisId: api.kopisId,
  dataSource: api.dataSource,
  isOpenRun: api.isOpenRun,
  isVisit: api.isVisit,
  isChild: api.isChild,
  isDaehakro: api.isDaehakro,
  isFestival: api.isFestival,
  // 필드가 없으면 undefined로 남겨 '백엔드가 아직 모름'과 '분류 못 함(null)'을 가른다
  instrumentation: api.instrumentation,
});

// API Base URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

// 실제 API 사용 여부
const USE_REAL_API = true;

// 토큰 provider (매 요청마다 신선한 토큰을 가져옴)
let getTokenFn: (() => Promise<string | null>) | null = null;

/**
 * 토큰 provider 설정 (useAuth 훅에서 호출)
 * getToken 함수 자체를 저장하여 매 요청마다 신선한 토큰을 받아옴
 */
export const setTokenProvider = (fn: (() => Promise<string | null>) | null) => {
  getTokenFn = fn;
};

/**
 * 인증된 fetch 요청
 * 매 요청마다 Clerk에서 유효한 토큰을 받아옴 (만료시 자동 갱신)
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body && !headers.has('Content-Type') && !isFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (getTokenFn) {
    const token = await getTokenFn();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

const parseJsonResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(`${fallbackMessage} (${response.status})`);
  }

  return response.json() as Promise<T>;
};

const requestJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, options);
  return parseJsonResponse<T>(response, 'API request failed');
};

const requestEmpty = async (path: string, options?: RequestInit): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }
};

export interface RatedConcertListItem {
  concertId: number;
  title: string;
  posterUrl?: string | null;
  startDate: string;
  facilityName?: string | null;
  myRating: number;
  ratedAt: string;
}

export interface FavoriteConcertItem {
  concertId: number;
  title: string;
  posterUrl?: string | null;
  startDate: string;
  facilityName?: string | null;
  createdAt: string;
}

export interface FavoriteArtistItem {
  artistId: number;
  name: string;
  englishName: string;
  category: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface FavoriteComposerItem {
  composerId: number;
  name: string;
  fullName: string;
  englishName: string;
  period: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface FavoritePieceItem {
  pieceId: number;
  title: string;
  titleEn?: string | null;
  composerId: number;
  composerName: string;
  composerAvatarUrl?: string | null;
  createdAt: string;
}

export interface FavoriteGroups {
  concerts: FavoriteConcertItem[];
  artists: FavoriteArtistItem[];
  composers: FavoriteComposerItem[];
  pieces: FavoritePieceItem[];
}

export interface ProfileVisibility {
  userId: number;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  summaryPublic: boolean;
  ratingsPublic: boolean;
  favoritesPublic: boolean;
  collectionsPublic: boolean;
}

export interface UpdateProfileVisibilityInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  summaryPublic?: boolean;
  ratingsPublic?: boolean;
  favoritesPublic?: boolean;
  collectionsPublic?: boolean;
}

export interface ProfileSummary {
  ratingsCount: number;
  averageRating: number;
  favoritesCount: number;
  collectionsCount: number;
}

export interface AutoCollection {
  id: string;
  title: string;
  count: number;
}

export interface PublicProfileResponse {
  userId: number;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  visibility: Omit<ProfileVisibility, 'userId' | 'displayName' | 'bio' | 'avatarUrl'>;
  summary?: ProfileSummary | null;
  ratings?: RatedConcertListItem[] | null;
  favorites?: FavoriteGroups | null;
  collections?: AutoCollection[] | null;
}

export type FavoriteTargetType = 'concerts' | 'artists' | 'composers' | 'pieces';

export const emptyFavoriteGroups = (): FavoriteGroups => ({
  concerts: [],
  artists: [],
  composers: [],
  pieces: [],
});

export const MyPageAPI = {
  async getRatings(): Promise<RatedConcertListItem[]> {
    return requestJson<RatedConcertListItem[]>('/me/ratings');
  },

  async getFavoriteConcerts(): Promise<FavoriteConcertItem[]> {
    return requestJson<FavoriteConcertItem[]>('/me/favorites/concerts');
  },

  async addFavoriteConcert(concertId: number): Promise<void> {
    return requestEmpty('/me/favorites/concerts', {
      method: 'POST',
      body: JSON.stringify({ concertId }),
    });
  },

  async deleteFavoriteConcert(concertId: number): Promise<void> {
    return requestEmpty(`/me/favorites/concerts/${concertId}`, { method: 'DELETE' });
  },

  async getFavoriteArtists(): Promise<FavoriteArtistItem[]> {
    return requestJson<FavoriteArtistItem[]>('/me/favorites/artists');
  },

  async addFavoriteArtist(artistId: number): Promise<void> {
    return requestEmpty('/me/favorites/artists', {
      method: 'POST',
      body: JSON.stringify({ artistId }),
    });
  },

  async deleteFavoriteArtist(artistId: number): Promise<void> {
    return requestEmpty(`/me/favorites/artists/${artistId}`, { method: 'DELETE' });
  },

  async getFavoriteComposers(): Promise<FavoriteComposerItem[]> {
    return requestJson<FavoriteComposerItem[]>('/me/favorites/composers');
  },

  async addFavoriteComposer(composerId: number): Promise<void> {
    return requestEmpty('/me/favorites/composers', {
      method: 'POST',
      body: JSON.stringify({ composerId }),
    });
  },

  async deleteFavoriteComposer(composerId: number): Promise<void> {
    return requestEmpty(`/me/favorites/composers/${composerId}`, { method: 'DELETE' });
  },

  async getFavoritePieces(): Promise<FavoritePieceItem[]> {
    return requestJson<FavoritePieceItem[]>('/me/favorites/pieces');
  },

  async addFavoritePiece(pieceId: number): Promise<void> {
    return requestEmpty('/me/favorites/pieces', {
      method: 'POST',
      body: JSON.stringify({ pieceId }),
    });
  },

  async deleteFavoritePiece(pieceId: number): Promise<void> {
    return requestEmpty(`/me/favorites/pieces/${pieceId}`, { method: 'DELETE' });
  },

  async getFavorites(): Promise<FavoriteGroups> {
    const [concerts, artists, composers, pieces] = await Promise.all([
      this.getFavoriteConcerts(),
      this.getFavoriteArtists(),
      this.getFavoriteComposers(),
      this.getFavoritePieces(),
    ]);

    return { concerts, artists, composers, pieces };
  },

  async getProfileVisibility(): Promise<ProfileVisibility> {
    return requestJson<ProfileVisibility>('/me/profile-visibility');
  },

  async updateProfileVisibility(input: UpdateProfileVisibilityInput): Promise<ProfileVisibility> {
    return requestJson<ProfileVisibility>('/me/profile-visibility', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async getPublicProfile(userId: number): Promise<PublicProfileResponse | null> {
    return requestJson<PublicProfileResponse | null>(`/users/${userId}/public-profile`);
  },
};

/**
 * 작곡가 API
 */
export const ComposerAPI = {
  /**
   * 모든 작곡가 조회
   */
  async getAll(params?: {
    offset?: number;
    limit?: number;
    period?: string;
    /** recommended: tier → 공개 비교 → 초상 → 소개 → 작품 수 순. 없으면 출생 연도 순 */
    sort?: 'recommended';
  }): Promise<Composer[]> {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    const period = params?.period;

    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      queryParams.append('offset', offset.toString());
      queryParams.append('limit', limit.toString());
      if (period && period !== 'all') {
        queryParams.append('period', period);
      }
      if (params?.sort) {
        queryParams.append('sort', params.sort);
      }

      const response = await authenticatedFetch(
        `${API_BASE_URL}/composers?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch composers');
      const data: APIComposer[] = await response.json();
      return data.map(mapComposer);
    }
    return Promise.resolve(COMPOSERS.slice(offset, offset + limit));
  },

  /**
   * 작곡가 ID로 조회. 작품은 따로 페이지로 받는다 (바흐 작품만 1,695곡)
   */
  async getById(id: number): Promise<Composer | null> {
    if (USE_REAL_API) {
      const composerResponse = await authenticatedFetch(`${API_BASE_URL}/composers/${id}`);
      if (!composerResponse.ok) throw new Error('Failed to fetch composer');

      const composerData: APIComposer = await composerResponse.json();
      if (!composerData) return null;
      return mapComposer(composerData);
    }
    return Promise.resolve(getComposerById(id) ?? null);
  },

  /**
   * Piece ID로 전체 정보 조회
   */
  async getPieceById(id: number): Promise<Piece | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${id}`);
      if (!response.ok) throw new Error('Failed to fetch piece');
      const pieceData: APIPiece = await response.json();
      return pieceData;
    }
    return Promise.resolve(getPieceById(id) ?? null);
  },

  /**
   * 작곡가 검색
   */
  async search(params: {
    q?: string;
    period?: string;
    offset?: number;
    limit?: number;
  }): Promise<Composer[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.append('q', params.q);
      if (params.period && params.period !== 'all') {
        queryParams.append('period', params.period);
      }
      if (params.offset !== undefined) {
        queryParams.append('offset', params.offset.toString());
      }
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }

      const response = await authenticatedFetch(
        `${API_BASE_URL}/composers/search?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to search composers');
      const data: APIComposer[] = await response.json();
      return data.map(mapComposer);
    }
    return Promise.resolve([]);
  },

  /**
   * 비교 영상이 있는 작곡가-곡 조합 랜덤 조회
   */
  async getWithPerformances(limit: number = 10): Promise<
    {
      composerId: number;
      composerName: string;
      composerAvatarUrl?: string;
      pieceId: number;
      pieceTitle: string;
      performanceCount: number;
      artistNames: string[];
    }[]
  > {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/composers/with-performances?limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch composers with performances');
      return response.json();
    }
    return Promise.resolve([]);
  },

  /**
   * 시대별 작곡가 조회
   */
  async getByPeriod(period: string): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/composers`);
      if (!response.ok) throw new Error('Failed to fetch composers');
      const data: APIComposer[] = await response.json();
      return data.filter((c) => c.period === period).map(mapComposer);
    }
    return Promise.resolve(getComposersByPeriod(period));
  },
};

/**
 * 곡 API
 */
export const PieceAPI = {
  /**
   * 곡 ID로 조회 (연주 정보 포함)
   */
  async getById(id: number): Promise<PieceWithPerformances | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${id}`);
      if (!response.ok) throw new Error('Failed to fetch piece');
      const pieceData: APIPiece = await response.json();
      if (!pieceData) return null;

      const composerRes = await authenticatedFetch(
        `${API_BASE_URL}/composers/${pieceData.composerId}`
      );
      if (!composerRes.ok) throw new Error('Failed to fetch composer');
      const composerData: APIComposer = await composerRes.json();

      const performancesRes = await authenticatedFetch(`${API_BASE_URL}/pieces/${id}/performances`);
      const performancesData: APIPerformance[] = performancesRes.ok
        ? await performancesRes.json()
        : [];

      return {
        ...mapPiece(pieceData),
        composer: mapComposer(composerData),
        performances: performancesData,
      };
    }
    const piece = getPieceById(id);
    if (!piece) return null;
    const composer = getComposerById(piece.composerId);
    if (!composer) return null;
    const performances = getPerformancesByPiece(id).map((perf) => {
      const artist = getArtistById(perf.artistId);
      return { ...perf, artist: artist! };
    });
    return Promise.resolve({ ...piece, composer, performances });
  },

  /**
   * 작품 이름 검색. 제목 일치 > 접두사 > 포함·별칭 > 작품번호 > 작곡가 이름 순으로 온다.
   */
  async search(params: { q: string; offset?: number; limit?: number }): Promise<PieceSearchResult[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams({ q: params.q });
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await authenticatedFetch(
        `${API_BASE_URL}/pieces/search?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to search pieces');
      const data: APIPieceSearchResult[] = await response.json();
      return data.map((item) => ({
        ...mapPiece(item),
        composerName: item.composerName,
        composerAvatarUrl: item.composerAvatarUrl ?? null,
      }));
    }
    return Promise.resolve([]);
  },

  /**
   * 작곡가의 작품 한 페이지. 스트리밍 링크·설명이 있는 작품이 앞에 온다
   */
  async getPageByComposer(
    composerId: number,
    params: { offset: number; limit: number }
  ): Promise<Piece[]> {
    if (USE_REAL_API) {
      const query = new URLSearchParams({ offset: String(params.offset), limit: String(params.limit) });
      const response = await authenticatedFetch(
        `${API_BASE_URL}/composers/${composerId}/pieces?${query.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch pieces');
      const data: APIPiece[] = await response.json();
      return data.map(mapPiece);
    }
    return Promise.resolve(
      PIECES.filter((p) => p.composerId === composerId).slice(params.offset, params.offset + params.limit)
    );
  },

  /**
   * 작곡가의 모든 곡 조회
   */
  async getByComposer(composerId: number): Promise<Piece[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/composers/${composerId}/pieces`);
      if (!response.ok) throw new Error('Failed to fetch pieces');
      const data: APIPiece[] = await response.json();
      return data.map(mapPiece);
    }
    return Promise.resolve(PIECES.filter((p) => p.composerId === composerId));
  },
};

/**
 * 아티스트 API
 */
export const ArtistAPI = {
  /**
   * 모든 아티스트 조회
   */
  async getAll(offset: number = 0, limit: number = 20): Promise<Artist[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/artists?offset=${offset}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch artists');
      const data: APIArtist[] = await response.json();
      return data.map(mapArtist);
    }
    return Promise.resolve(ARTISTS.slice(offset, offset + limit));
  },

  /**
   * 아티스트 ID로 조회
   */
  async getById(id: number): Promise<Artist | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch artist');
      const data: APIArtist = await response.json();
      if (!data) return null;
      const mapped = mapArtist(data);
      return mapped;
    }
    return Promise.resolve(getArtistById(id) || null);
  },

  /**
   * 아티스트 검색 (전체 DB 대상)
   */
  async search(params: {
    q?: string;
    tier?: string;
    category?: string;
    offset?: number;
    limit?: number;
  }): Promise<Artist[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.append('q', params.q);
      if (params.tier) queryParams.append('tier', params.tier);
      if (params.category) queryParams.append('category', params.category);
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/artists/search?${queryParams.toString()}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to search artists');
      const data: APIArtist[] = await response.json();
      return data.map(mapArtist);
    }
    return Promise.resolve([]);
  },
};

/**
 * 시대 정보 API
 */
export const PeriodAPI = {
  /**
   * 모든 시대 정보 조회
   */
  async getAll(): Promise<Period[]> {
    if (USE_REAL_API) {
      // 시대 정보는 프론트엔드에서 관리 (백엔드 API 없음)
      return Promise.resolve(PERIODS);
    }
    return Promise.resolve(PERIODS);
  },
};

/**
 * 공연 API
 */
/** `/concerts/artists` 한 줄. 공연 필터의 연주자 후보 */
export interface ConcertArtistOption {
  artistId: number;
  name: string;
  englishName?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  /** 오늘 이후 공연 수. 배포 전 대체 목록에서는 모른다 */
  concertCount?: number;
}

export const ConcertAPI = {
  /**
   * 모든 공연 조회 (페이지네이션 지원)
   */
  async getAll(params?: { offset?: number; limit?: number }): Promise<Concert[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/concerts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch concerts');
      const data: APIConcert[] = await response.json();
      const mapped = data.map(mapConcert);
      return mapped;
    }
    return Promise.resolve([]);
  },

  /**
   * 공연 ID로 조회
   */
  async getById(id: number): Promise<Concert | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/concerts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch concert');
      const data: APIConcert = await response.json();
      if (!data) return null;
      const mapped = mapConcert(data);
      return mapped;
    }
    return Promise.resolve(null);
  },

  /**
   * 아티스트의 모든 공연 조회
   */
  async getByArtist(artistId: number): Promise<Concert[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists/${artistId}/concerts`);
      if (!response.ok) throw new Error('Failed to fetch concerts for artist');
      const data: APIConcert[] = await response.json();
      return data.map(mapConcert);
    }
    return Promise.resolve([]);
  },

  /**
   * 공연 평점 제출
   */
  async submitRating(concertId: number, rating: number): Promise<void> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/concerts/${concertId}/rating`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) throw new Error('Failed to submit rating');
    }
  },

  /**
   * 사용자의 공연 평점 조회
   */
  async getUserRating(concertId: number): Promise<number | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/concerts/${concertId}/user-rating`
      );
      if (!response.ok) {
        // 401 (인증 필요) 또는 404는 null 반환
        if (response.status === 401 || response.status === 404) {
          return null;
        }
        throw new Error('Failed to get user rating');
      }
      try {
        const rating = await response.json();
        return rating ? Number(rating) : null;
      } catch (error) {
        console.error(`Failed to parse user rating for concert ${concertId}:`, error);
        return null;
      }
    }
    return Promise.resolve(null);
  },

  /**
   * 공연의 예매처 정보 조회
   */
  async getTicketVendors(concertId: number): Promise<TicketVendor[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/concerts/${concertId}/ticket-vendors`
      );
      if (!response.ok) {
        // 404는 빈 배열 반환 (예매처 없음)
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch ticket vendors');
      }
      try {
        const data: APITicketVendor[] = await response.json();
        return data;
      } catch (error) {
        console.error(`Failed to parse ticket vendors for concert ${concertId}:`, error);
        return [];
      }
    }
    return Promise.resolve([]);
  },

  /**
   * 공연 검색 (전체 DB 대상)
   */
  async search(params: {
    q?: string;
    genre?: string;
    area?: string;
    status?: string;
    /** YYYY-MM-DD. 이 날 이후에도 열리는 공연만 */
    from?: string;
    /** YYYY-MM-DD. 이 날까지 시작하는 공연만 */
    to?: string;
    /** true면 내한 공연만 */
    visit?: boolean;
    /** true면 페스티벌 공연만 */
    festival?: boolean;
    /** 이 아티스트가 연결된 공연만 */
    artist?: number;
    /** 편성 코드 하나 */
    instrument?: string;
    offset?: number;
    limit?: number;
  }): Promise<Concert[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.append('q', params.q);
      if (params.genre) queryParams.append('genre', params.genre);
      if (params.area) queryParams.append('area', params.area);
      if (params.status) queryParams.append('status', params.status);
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      if (params.visit !== undefined) queryParams.append('visit', String(params.visit));
      if (params.festival !== undefined) queryParams.append('festival', String(params.festival));
      if (params.artist !== undefined) queryParams.append('artist', String(params.artist));
      if (params.instrument) queryParams.append('instrument', params.instrument);
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/concerts/search?${queryParams.toString()}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to search concerts');
      const data: APIConcert[] = await response.json();
      return data.map(mapConcert);
    }
    return Promise.resolve([]);
  },

  /**
   * 오늘 이후 공연이 연결된 아티스트 (공연 수 많은 순).
   * 이 엔드포인트가 없는 배포 전 백엔드면 null을 돌려준다. 그 백엔드는 `artists`를 공연 id로
   * 읽다가 422를 준다(없는 경로면 404).
   */
  async getArtists(params: { q?: string; limit?: number } = {}): Promise<ConcertArtistOption[] | null> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    const response = await authenticatedFetch(`${API_BASE_URL}/concerts/artists?${queryParams.toString()}`);
    if (response.status === 404 || response.status === 422) return null;
    if (!response.ok) throw new Error('Failed to fetch concert artists');
    const data: ConcertArtistOption[] = await response.json();
    return data;
  },

  /**
   * 공연이 있는 지역 목록 조회
   */
  async getAreas(): Promise<string[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/concerts/areas`);
      if (!response.ok) throw new Error('Failed to fetch areas');
      return await response.json();
    }
    return Promise.resolve([]);
  },
};

/**
 * 녹음/앨범 API
 */
export const RecordingAPI = {
  /**
   * 특정 아티스트의 모든 녹음 조회
   */
  async getByArtist(artistId: number): Promise<Recording[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists/${artistId}/recordings`);
      if (!response.ok) throw new Error('Failed to fetch recordings');
      const data: Recording[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },

  /**
   * 녹음 ID로 조회
   */
  async getById(id: number): Promise<Recording | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/recordings/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recording');
      const data: Recording = await response.json();
      return data;
    }
    return Promise.resolve(null);
  },
};

/**
 * 공연장 API
 */
export const VenueAPI = {
  /**
   * 모든 공연장 조회
   */
  async getAll(): Promise<Venue[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/venues`);
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data: APIVenue[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },

  /**
   * 공연장 ID로 조회
   */
  async getById(id: number): Promise<Venue | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/venues/${id}`);
      if (!response.ok) {
        // 404나 다른 에러는 null 반환
        return null;
      }
      try {
        const data: APIVenue = await response.json();
        if (!data) return null;
        return data;
      } catch (error) {
        // JSON 파싱 에러 처리
        console.error(`Failed to parse venue ${id}:`, error);
        return null;
      }
    }
    return Promise.resolve(null);
  },

  /**
   * 공연장 검색
   */
  async search(params: { q?: string; offset?: number; limit?: number }): Promise<Venue[]> {
    if (USE_REAL_API) {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.append('q', params.q);
      if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());
      if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());

      const response = await authenticatedFetch(
        `${API_BASE_URL}/venues/search?${searchParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to search venues');
      const data: APIVenue[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },
};

/**
 * 연주 섹터 API
 */
export const PerformanceSectorAPI = {
  /**
   * 특정 곡의 모든 섹터 조회 (연주 개수 포함)
   */
  async getByPiece(pieceId: number): Promise<PerformanceSectorWithCount[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${pieceId}/sectors`);
      if (!response.ok) throw new Error('Failed to fetch sectors');
      return await response.json();
    }
    return Promise.resolve([]);
  },

  /**
   * 섹터 ID로 조회
   */
  async getById(id: number): Promise<PerformanceSector | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/sectors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch sector');
      return await response.json();
    }
    return Promise.resolve(null);
  },
};

/**
 * 연주 API
 */
export const PerformanceAPI = {
  /**
   * 특정 섹터의 모든 연주 조회
   */
  async getBySector(sectorId: number): Promise<Performance[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/sectors/${sectorId}/performances`);
      if (!response.ok) throw new Error('Failed to fetch performances');
      const data: APIPerformance[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },

  /**
   * 특정 곡의 모든 연주 조회
   */
  async getByPiece(pieceId: number): Promise<Performance[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${pieceId}/performances`);
      if (!response.ok) throw new Error('Failed to fetch performances');
      const data: APIPerformance[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },

  /**
   * 특정 아티스트의 모든 연주 조회
   */
  async getByArtist(artistId: number): Promise<Performance[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists/${artistId}/performances`);
      if (!response.ok) throw new Error('Failed to fetch performances');
      const data: APIPerformance[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },

  /**
   * 연주 ID로 조회
   */
  async getById(id: number): Promise<Performance | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/performances/${id}`);
      if (!response.ok) throw new Error('Failed to fetch performance');
      const data: APIPerformance = await response.json();
      return data;
    }
    return Promise.resolve(null);
  },
};

// ====================================================
// Boxoffice API
// ====================================================

export interface BoxofficeConcert {
  id: number;
  concertId: number;
  ranking: number;
  genreName?: string;
  areaName?: string;
  syncStartDate: string;
  syncEndDate: string;
  // Concert info
  title: string;
  posterUrl?: string;
  startDate: string;
  endDate?: string;
  concertTime?: string;
  facilityName?: string;
  status: string;
  rating?: number;
  ratingCount?: number;
  genre?: string;
  area?: string;
}

export const BoxofficeAPI = {
  /**
   * Get TOP 3 boxoffice concerts
   * @param areaCode - Optional area code (11=서울, 26=부산, etc.). If not provided, returns national TOP 3
   * @param genreCode - Optional genre code (default: CCCA for 클래식)
   */
  async getTop3(areaCode?: string, genreCode?: string): Promise<BoxofficeConcert[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      // area_code는 항상 전달 (기본값: 00 = 전국)
      queryParams.set('area_code', areaCode || '00');
      if (genreCode) queryParams.set('genre_code', genreCode);

      const url = `${API_BASE_URL}/concerts/boxoffice/top3${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch boxoffice TOP 3');
      const data: BoxofficeConcert[] = await response.json();
      return data;
    }
    return Promise.resolve([]);
  },
};
