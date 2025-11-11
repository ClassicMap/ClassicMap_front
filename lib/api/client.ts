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
  concertCount: number;
  countryCount: number;
  albumCount: number;
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
  ticketUrl?: string;
  isRecommended: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
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
  ticketUrl?: string;
  isRecommended: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
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
    imageUrl: api.imageUrl ? `http://34.60.221.92:1028${api.imageUrl}` : undefined,
    avatarUrl: api.avatarUrl ? `http://34.60.221.92:1028${api.avatarUrl}` : undefined,
    coverImageUrl: api.coverImageUrl ? `http://34.60.221.92:1028${api.coverImageUrl}` : undefined,
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
});

const mapArtist = (api: APIArtist): Artist => ({
  id: api.id,
  name: api.name,
  englishName: api.englishName,
  category: api.category,
  tier: api.tier,
  rating: api.rating,
  imageUrl: api.imageUrl ? `http://34.60.221.92:1028${api.imageUrl}` : undefined,
  coverImageUrl: api.coverImageUrl ? `http://34.60.221.92:1028${api.coverImageUrl}` : undefined,
  birthYear: api.birthYear,
  nationality: api.nationality,
  bio: api.bio,
  style: api.style,
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
  posterUrl: api.posterUrl ? `http://34.60.221.92:1028${api.posterUrl}` : undefined,
  ticketUrl: api.ticketUrl,
  isRecommended: api.isRecommended,
  status: api.status,
});

// API Base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

// 실제 API 사용 여부
const USE_REAL_API = true;

/**
 * 작곡가 API
 */
export const ComposerAPI = {
  /**
   * 모든 작곡가 조회
   */
  async getAll(): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/composers`);
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
      const [composerRes, piecesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/composers/${id}`),
        fetch(`${API_BASE_URL}/composers/${id}/pieces`),
      ]);
      
      if (!composerRes.ok) throw new Error('Failed to fetch composer');
      
      const composerData: APIComposer = await composerRes.json();
      if (!composerData) return null;
      
      const piecesData: APIPiece[] = piecesRes.ok ? await piecesRes.json() : [];
      
      return {
        ...mapComposer(composerData),
        majorPieces: piecesData.map(mapPiece),
      };
    }
    const composer = getComposerById(id);
    if (!composer) return null;
    const majorPieces = getMajorPiecesByComposer(id);
    return Promise.resolve({ ...composer, majorPieces });
  },

  /**
   * 시대별 작곡가 조회
   */
  async getByPeriod(period: string): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/composers`);
      if (!response.ok) throw new Error('Failed to fetch composers');
      const data: APIComposer[] = await response.json();
      return data
        .filter((c) => c.period === period)
        .map(mapComposer);
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
      const response = await fetch(`${API_BASE_URL}/pieces/${id}`);
      if (!response.ok) throw new Error('Failed to fetch piece');
      const pieceData: APIPiece = await response.json();
      if (!pieceData) return null;

      const composerRes = await fetch(`${API_BASE_URL}/composers/${pieceData.composerId}`);
      if (!composerRes.ok) throw new Error('Failed to fetch composer');
      const composerData: APIComposer = await composerRes.json();

      return {
        ...mapPiece(pieceData),
        composer: mapComposer(composerData),
        performances: [], // TODO: Performance API 연동 후 추가
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
      const response = await fetch(`${API_BASE_URL}/composers/${composerId}/pieces`);
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
      const response = await fetch(`${API_BASE_URL}/artists`);
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
      const response = await fetch(`${API_BASE_URL}/artists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch artist');
      const data: APIArtist = await response.json();
      if (!data) return null;
      return mapArtist(data);
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
      const response = await fetch(`${API_BASE_URL}/concerts`);
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
      const response = await fetch(`${API_BASE_URL}/concerts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch concert');
      const data: APIConcert = await response.json();
      if (!data) return null;
      const mapped = mapConcert(data);
      return mapped;
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
      const response = await fetch(`${API_BASE_URL}/artists/${artistId}/recordings`);
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
      const response = await fetch(`${API_BASE_URL}/recordings/${id}`);
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
      const response = await fetch(`${API_BASE_URL}/venues`);
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
      const response = await fetch(`${API_BASE_URL}/venues/${id}`);
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
      const response = await fetch(`${API_BASE_URL}/pieces/${pieceId}/performances`);
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
      const response = await fetch(`${API_BASE_URL}/artists/${artistId}/performances`);
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
      const response = await fetch(`${API_BASE_URL}/performances/${id}`);
      if (!response.ok) throw new Error('Failed to fetch performance');
      const data: APIPerformance = await response.json();
      return data;
    }
    return Promise.resolve(null);
  },
};
