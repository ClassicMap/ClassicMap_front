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
}

interface APIPiece {
  id: number;
  composerId: number;
  title: string;
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

interface APIConcert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  concertDate: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  program?: string;
  ticketUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
  artists?: APIConcertArtist[];
}

interface APIVenue {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
}

interface Concert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  concertDate: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  program?: string;
  ticketUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
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
  recordingDate?: string;
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
  };
  return mapped;
};

const mapPiece = (api: APIPiece): Piece => ({
  id: api.id,
  composerId: api.composerId,
  title: api.title,
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
  awards: api.awards?.map(award => ({
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
  concertDate: api.concertDate,
  concertTime: api.concertTime,
  priceInfo: api.priceInfo,
  posterUrl: api.posterUrl ? api.posterUrl : undefined,
  program: api.program,
  ticketUrl: api.ticketUrl,
  isRecommended: api.isRecommended,
  status: api.status,
  rating: api.rating,
  ratingCount: api.ratingCount,
  artists: api.artists?.map(artist => ({
    id: artist.id,
    concertId: artist.concertId,
    artistId: artist.artistId,
    artistName: artist.artistName,
    role: artist.role,
  })),
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
  async getAll(): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/composers`);
      if (!response.ok) throw new Error('Failed to fetch composers');
      const data: APIComposer[] = await response.json();
      const mapped = data.map(mapComposer);
      return mapped;
    }
    return Promise.resolve(COMPOSERS);
  },

  /**
   * 작곡가 ID로 조회 (주요 곡 포함)
   */
  async getById(id: number): Promise<ComposerWithPieces | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/composers/${id}`);
      if (!response.ok) throw new Error('Failed to fetch composer');

      const composerData: any = await response.json();
      if (!composerData) return null;

      const majorPieces = composerData.majorPieces
        ? composerData.majorPieces.split('|').map((p: string) => {
            const [id, title] = p.split(':');
            return { id: parseInt(id, 10), title };
          })
        : [];

      return {
        ...mapComposer(composerData),
        majorPieces,
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
  async getAll(): Promise<Artist[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists`);
      if (!response.ok) throw new Error('Failed to fetch artists');
      const data: APIArtist[] = await response.json();
      return data.map(mapArtist);
    }
    return Promise.resolve(ARTISTS);
  },

  /**
   * 아티스트 ID로 조회
   */
  async getById(id: number): Promise<Artist | null> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/artists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch artist');
      const data: APIArtist = await response.json();
      console.log('=== API Response (Raw) ===');
      console.log('Raw API data:', JSON.stringify(data, null, 2));
      console.log('Awards from API:', data.awards);
      console.log('==========================');
      if (!data) return null;
      const mapped = mapArtist(data);
      console.log('=== After Mapping ===');
      console.log('Mapped artist:', JSON.stringify(mapped, null, 2));
      console.log('Awards after mapping:', mapped.awards);
      console.log('=====================');
      return mapped;
    }
    return Promise.resolve(getArtistById(id) || null);
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
   * 모든 공연 조회
   */
  async getAll(): Promise<Concert[]> {
    if (USE_REAL_API) {
      const response = await authenticatedFetch(`${API_BASE_URL}/concerts`);
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
      const response = await authenticatedFetch(`${API_BASE_URL}/concerts/${concertId}/user-rating`);
      if (!response.ok) throw new Error('Failed to get user rating');
      const rating = await response.json();
      return rating ? Number(rating) : null;
    }
    return Promise.resolve(null);
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
      if (!response.ok) throw new Error('Failed to fetch venue');
      const data: APIVenue = await response.json();
      if (!data) return null;
      return data;
    }
    return Promise.resolve(null);
  },
};

/**
 * 연주 API
 */
export const PerformanceAPI = {
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
