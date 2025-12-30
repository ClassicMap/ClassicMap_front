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
  PerformanceWithArtist,
  Recording,
  Venue,
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
}

interface APIVenue {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
}

interface TicketVendor {
  id: number;
  concertId: number;
  vendorName?: string;
  vendorUrl: string;
  displayOrder: number;
}

interface Concert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  startDate: string;
  endDate?: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  program?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
  facilityName?: string;
  area?: string;
  boxofficeRanking?: APIBoxofficeRanking;
  ticketVendors?: TicketVendor[];
}

// Performance API 타입
interface APIPerformance {
  id: number;
  pieceId: number;
  artistId: number;
  videoPlatform: string;
  videoId: string;
  startTime: number;
  endTime: number;
  characteristic?: string;
  viewCount: number;
  rating: number;
}

// API 응답을 프론트엔드 모델로 변환
const mapComposer = (api: any): Composer => {
  const mapped = {
    id: api.id,
    name: api.name,
    fullName: api.fullName,
    englishName: api.englishName,
    period: api.period as '바로크' | '고전주의' | '낭만주의' | '근현대',
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
});

// API Base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

// 실제 API 사용 여부
const USE_REAL_API = true;

// 인증 토큰 저장소 (Clerk에서 가져온 토큰)
let authToken: string | null = null;

/**
 * 인증 토큰 설정 (useAuth 훅에서 호출)
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

/**
 * 인증된 fetch 요청
 */
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 인증 토큰이 있으면 Authorization 헤더 추가
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
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
   * 작곡가 ID로 조회 (작품 목록 포함)
   */
  async getById(id: number): Promise<ComposerWithPieces | null> {
    if (USE_REAL_API) {
      const composerResponse = await authenticatedFetch(`${API_BASE_URL}/composers/${id}`);
      if (!composerResponse.ok) throw new Error('Failed to fetch composer');

      const composerData: APIComposer = await composerResponse.json();
      if (!composerData) return null;

      // 작곡가의 모든 곡 가져오기
      const piecesResponse = await authenticatedFetch(`${API_BASE_URL}/composers/${id}/pieces`);
      let pieces: Piece[] = [];
      if (piecesResponse.ok) {
        const piecesData: APIPiece[] = await piecesResponse.json();
        pieces = piecesData.map(mapPiece);
      }

      return {
        ...mapComposer(composerData),
        majorPieces: pieces, // pieces를 majorPieces로 사용 (기존 코드 호환성 유지)
      };
    }
    const composer = getComposerById(id);
    if (!composer) return null;
    const majorPieces = getMajorPiecesByComposer(id);
    return Promise.resolve({ ...composer, majorPieces });
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
    return Promise.resolve(getPieceById(id));
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
    offset?: number;
    limit?: number;
  }): Promise<Concert[]> {
    if (USE_REAL_API) {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.append('q', params.q);
      if (params.genre) queryParams.append('genre', params.genre);
      if (params.area) queryParams.append('area', params.area);
      if (params.status) queryParams.append('status', params.status);
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
