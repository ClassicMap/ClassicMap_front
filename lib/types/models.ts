// ============================================
// Database Models (데이터베이스 스키마와 동일)
// ============================================

export interface Composer {
  id: number;
  name: string;
  fullName: string;
  englishName: string;
  period: '중세' | '르네상스' | '바로크' | '고전주의' | '낭만주의' | '근현대';
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
  /** 관리자 API에서 입력받는 활동 국가 수. 조회 응답에는 포함되지 않는다. */
  countryCount?: number;
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

export type ClipStatus =
  | 'pending'
  | 'queued'
  | 'generating'
  | 'ready'
  | 'failed'
  | 'retired';

export type PerformanceCreditRole =
  | 'soloist'
  | 'conductor'
  | 'orchestra'
  | 'ensemble'
  | 'accompanist'
  | 'vocalist'
  | 'other';

export interface PerformanceCredit {
  artistId: number;
  artistName: string;
  /** 연주자 사진. 서버가 크레딧에 싣는다(없으면 null) */
  imageUrl: string | null;
  role: PerformanceCreditRole;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ComparisonPerformance {
  id: number;
  sourceId: number;
  sectorId: number;
  pieceId: number;
  pieceTitle: string;
  composerId: number;
  composerName: string;
  sectorName: string;
  startMs: number;
  endMs: number;
  clipStatus: ClipStatus;
  clipUrl?: string;
  videoId?: string;
  credits: PerformanceCredit[];
  /** 확정된 연주 노트. 없으면 null */
  note: PerformanceListeningNote | null;
  /** 지금 클립의 음량 곡선. 없으면 null */
  loudness: LoudnessProfile | null;
}

/**
 * 음량 곡선. EBU R128 단기 음량을 `stepMs` 간격으로 잰, 가장 센 곳을 0dB 로 둔 상대값이다.
 * 녹음마다 전체 레벨이 달라 연주끼리 세기를 견주는 데는 쓰지 않는다.
 */
export interface LoudnessProfile {
  stepMs: number;
  curveRelDb: number[];
  /** 처음 5초 평균 */
  startRelDb: number;
  /** 가장 센 곳의 클립 안 시점과 진행률 */
  peakMs: number;
  peakRatio: number;
  /** 곡선 폭(90분위 - 10분위). 2 미만이면 평평해서 근거로 쓰지 않는다 */
  rangeDb: number;
}

/** 들을 곳. `offsetMs` 는 클립 처음부터 잰 시점이다 */
export interface ListeningMoment {
  offsetMs: number;
  label: string;
}

/** 연주 노트: 이 연주를 부르는 제목, 두세 문장, 들을 곳, 사실 태그 */
export interface PerformanceListeningNote {
  headline: string;
  body: string;
  moments: ListeningMoment[];
  facts: string[];
}

export interface FeaturedPairMoment extends ListeningMoment {
  performanceId: number;
}

/** 구간의 추천 비교 한 쌍. 두 연주 모두 이 구간의 공개 연주다 */
export interface FeaturedPair {
  performanceIds: [number, number];
  title: string;
  note: string;
  moments: FeaturedPairMoment[];
}

/** `/pieces/{id}/comparison-sectors`: 공개 기준(연주자 3명 이상)을 통과한 섹터 */
export interface ComparisonSector {
  id: number;
  pieceId: number;
  sectorName: string;
  sectorNameEn: string | null;
  /**
   * 구간의 갈래. WHOLE_WORK · MOVEMENT · EXCERPT 는 같은 대목의 다른 해석을 견주고,
   * ARRANGEMENTS 는 편성이 서로 다른 편곡을 나란히 듣는다.
   */
  sectorType: string | null;
  /** 구간 안내. 이 대목에서 무엇을 들을지 적은 큐레이션 문장 */
  description: string | null;
  displayOrder: number | null;
  measureStart: string | null;
  measureEnd: string | null;
  readyPerformanceCount: number;
  primaryArtistCount: number;
  /** 확정된 추천 비교. 없으면 null */
  featuredPair: FeaturedPair | null;
}

export interface ComparisonPiecePerformer {
  artistId: number;
  artistName: string;
  imageUrl: string | null;
}

/** `/comparison-pieces`: 공개 섹터가 하나 이상 있는 작품 */
export interface ComparisonPiece {
  pieceId: number;
  pieceTitle: string;
  opusNumber: string | null;
  composerId: number;
  composerName: string;
  composerAvatarUrl: string | null;
  sectorCount: number;
  performerCount: number;
  performers: ComparisonPiecePerformer[];
}

export interface ComparisonPerformancePage {
  items: ComparisonPerformance[];
  nextCursor: string | null;
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

/** `/pieces/search` 결과. 목록에 작곡가 이름을 함께 보여주려고 서버가 싣는다. */
export interface PieceSearchResult extends Piece {
  composerName: string;
  composerAvatarUrl: string | null;
}

export interface PieceWithPerformances extends Piece {
  composer: Composer;
  /**
   * 백엔드는 연주 목록에 artistId만 담아 보낸다.
   * 아티스트 정보가 필요하면 호출 측에서 별도로 조회해 PerformanceWithArtist로 채운다.
   */
  performances: Performance[];
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
  /**
   * 편성 코드(쉼표 구분). 분류 못 하면 null.
   * 배포 전 백엔드는 이 필드를 보내지 않는다(undefined). 그때는 제목으로 나눈다.
   */
  instrumentation?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
