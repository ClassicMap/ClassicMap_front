// ============================================
// Database Models (데이터베이스 스키마와 동일)
// ============================================

export interface Composer {
  id: number;
  name: string;
  fullName: string;
  englishName: string;
  period: '바로크' | '고전주의' | '낭만주의' | '근현대';
  birthYear: number;
  deathYear: number | null;
  nationality: string;
  tier?: 'S' | 'A' | 'B' | 'C';
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  style?: string;
  influence?: string;
  pieceCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Piece {
  id: number;
  composerId: number;
  title: string;
  titleEn?: string;
  type: 'album' | 'song';
  description?: string;
  opusNumber?: string;
  compositionYear?: number;
  difficultyLevel?: number;
  durationMinutes?: number;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ComposerMajorPiece {
  id: number;
  composerId: number;
  pieceId: number;
  displayOrder: number;
  createdAt?: Date;
}

export interface ArtistAward {
  id: number;
  artistId: number;
  year: string;
  awardName: string;
  awardType?: string;
  organization?: string;
  category?: string;
  ranking?: string;
  source?: string;
  notes?: string;
  displayOrder: number;
}

export interface Artist {
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
  awards?: ArtistAward[];
  concertCount: number;
  albumCount: number;
  topAwardId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Recording {
  id: number;
  artistId: number;
  title: string;
  year: string;
  releaseDate?: string;
  label?: string;
  coverUrl?: string;
  upc?: string;
  appleMusicId?: string;
  trackCount?: number;
  isSingle?: boolean;
  isCompilation?: boolean;
  genreNames?: string;
  copyright?: string;
  editorialNotes?: string;
  artworkWidth?: number;
  artworkHeight?: number;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  externalUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PerformanceSector {
  id: number;
  pieceId: number;
  sectorName: string;
  description?: string;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PerformanceSectorWithCount extends PerformanceSector {
  performanceCount: number;
}

export interface Performance {
  id: number;
  sectorId: number;
  pieceId: number; // 하위 호환성
  artistId: number;
  videoPlatform: 'youtube' | 'vimeo' | 'other';
  videoId: string;
  startTime: number;
  endTime: number;
  characteristic?: string;
  viewCount: number;
  rating: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// DTOs (Data Transfer Objects - API 응답용)
// ============================================

export interface ComposerDTO {
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
  majorPieces?: PieceDTO[];
}

export interface PieceDTO {
  id: number;
  composerId: number;
  title: string;
  titleEn?: string;
  type: 'album' | 'song';
  description?: string;
  opusNumber?: string;
  compositionYear?: number;
  performances?: PerformanceDTO[];
}

export interface PerformanceDTO {
  id: number;
  sectorId: number;
  pieceId: number; // 하위 호환성
  artist: ArtistDTO;
  videoPlatform: string;
  videoId: string;
  startTime: number;
  endTime: number;
  characteristic?: string;
  rating: number;
}

export interface ArtistDTO {
  id: number;
  name: string;
  englishName: string;
  category: string;
  tier: string;
  rating: number;
  imageUrl?: string;
  nationality: string;
}

// ============================================
// View Models (화면 표시용)
// ============================================

export interface ComposerWithPieces extends Composer {
  majorPieces: Piece[]; // 작곡가의 모든 작품 목록
}

export interface PieceWithPerformances extends Piece {
  composer: Composer;
  performances: PerformanceWithArtist[];
}

export interface PerformanceWithArtist extends Performance {
  artist: Artist;
}

// ============================================
// 시대별 정보
// ============================================

export interface Period {
  id: string;
  name: string;
  period: string;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
  characteristics: string[];
  keyComposers: string[];
}

// ============================================
// 공연장
// ============================================

export interface Venue {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// 공연
// ============================================

export interface ConcertArtist {
  id: number;
  concertId: number;
  artistId: number;
  artistName: string;
  role?: string;
}

export interface BoxofficeRanking {
  id: number;
  ranking: number;
  genreName?: string;
  areaName?: string;
  seatScale?: string;
  performanceCount?: number;
}

export interface TicketVendor {
  id: number;
  concertId: number;
  vendorName?: string;
  vendorUrl: string;
  displayOrder: number;
}

export interface ConcertImage {
  id: number;
  concertId: number;
  imageUrl: string;
  imageType: string; // 'introduction', 'poster', 'other'
  displayOrder: number;
}

export interface Concert {
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
  artists?: ConcertArtist[];
  facilityName?: string;
  area?: string;
  genre?: string;
  boxofficeRanking?: BoxofficeRanking;
  ticketVendors?: TicketVendor[];
  // Concert detail information
  synopsis?: string;
  runtime?: string;
  ageRestriction?: string;
  cast?: string;
  crew?: string;
  performanceSchedule?: string;
  productionCompany?: string;
  productionCompanyHost?: string;
  images?: ConcertImage[];
  // Metadata
  kopisId?: string;
  dataSource?: string;
  isOpenRun?: boolean;
  isVisit?: boolean;
  isChild?: boolean;
  isDaehakro?: boolean;
  isFestival?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
