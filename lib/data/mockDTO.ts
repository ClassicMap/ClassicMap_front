// ============================================
// DTOs - API 응답 형식과 동일하게 데이터 변환
// ============================================

import type {
  ComposerDTO,
  PieceDTO,
  PerformanceDTO,
  ArtistDTO,
  ComposerWithPieces,
  PieceWithPerformances,
  PerformanceWithArtist,
} from '@/lib/types/models';

import {
  MOCK_COMPOSERS,
  MOCK_PIECES,
  MOCK_ARTISTS,
  MOCK_PERFORMANCES,
  getComposerById,
  getPieceById,
  getArtistById,
  getMajorPiecesByComposerId,
  getPerformancesByPieceId,
  getPiecesByComposerId,
} from './mockDatabase';

// ============================================
// Composer DTOs
// ============================================

export function getComposerDTO(composerId: number): ComposerDTO | null {
  const composer = getComposerById(composerId);
  if (!composer) return null;

  const majorPieces = getMajorPiecesByComposerId(composerId);

  return {
    id: composer.id,
    name: composer.name,
    fullName: composer.fullName,
    englishName: composer.englishName,
    period: composer.period,
    birthYear: composer.birthYear,
    deathYear: composer.deathYear,
    nationality: composer.nationality,
    imageUrl: composer.avatarUrl,
    avatarUrl: composer.avatarUrl,
    coverImageUrl: composer.coverImageUrl,
    bio: composer.bio,
    style: composer.style,
    influence: composer.influence,
    majorPieces: majorPieces.map(piece => getPieceDTO(piece.id)).filter((p): p is PieceDTO => p !== null),
  };
}

export function getAllComposerDTOs(): ComposerDTO[] {
  return MOCK_COMPOSERS.map(c => getComposerDTO(c.id)).filter((c): c is ComposerDTO => c !== null);
}

// ============================================
// Piece DTOs
// ============================================

export function getPieceDTO(pieceId: number): PieceDTO | null {
  const piece = getPieceById(pieceId);
  if (!piece) return null;

  const performances = getPerformancesByPieceId(pieceId);

  return {
    id: piece.id,
    type: 'album',
    composerId: piece.composerId,
    title: piece.title,
    description: piece.description,
    opusNumber: piece.opusNumber,
    compositionYear: piece.compositionYear,
    performances: performances.map(perf => getPerformanceDTO(perf.id)).filter((p): p is PerformanceDTO => p !== null),
  };
}

export function getPieceWithPerformances(pieceId: number): PieceWithPerformances | null {
  const piece = getPieceById(pieceId);
  if (!piece) return null;

  const composer = getComposerById(piece.composerId);
  if (!composer) return null;

  const performances = getPerformancesByPieceId(pieceId);
  const performancesWithArtist: PerformanceWithArtist[] = performances
    .map(perf => {
      const artist = getArtistById(perf.artistId);
      if (!artist) return null;
      return { ...perf, artist };
    })
    .filter((p): p is PerformanceWithArtist => p !== null);

  return {
    ...piece,
    composer,
    performances: performancesWithArtist,
  };
}

// ============================================
// Performance DTOs
// ============================================

export function getPerformanceDTO(performanceId: number): PerformanceDTO | null {
  const performance = MOCK_PERFORMANCES.find(p => p.id === performanceId);
  if (!performance) return null;

  const artist = getArtistById(performance.artistId);
  if (!artist) return null;

  return {
    id: performance.id,
    pieceId: performance.pieceId,
    artist: {
      id: artist.id,
      name: artist.name,
      englishName: artist.englishName,
      category: artist.category,
      tier: artist.tier,
      rating: artist.rating,
      imageUrl: artist.imageUrl,
      nationality: artist.nationality,
    },
    videoPlatform: performance.videoPlatform,
    videoId: performance.videoId,
    startTime: performance.startTime,
    endTime: performance.endTime,
    characteristic: performance.characteristic,
    rating: performance.rating,
  };
}

// ============================================
// Artist DTOs
// ============================================

export function getArtistDTO(artistId: number): ArtistDTO | null {
  const artist = getArtistById(artistId);
  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.name,
    englishName: artist.englishName,
    category: artist.category,
    tier: artist.tier,
    rating: artist.rating,
    imageUrl: artist.imageUrl,
    nationality: artist.nationality,
  };
}

export function getAllArtistDTOs(): ArtistDTO[] {
  return MOCK_ARTISTS.map(a => getArtistDTO(a.id)).filter((a): a is ArtistDTO => a !== null);
}

// ============================================
// Composer with Pieces (View Model)
// ============================================

export function getComposerWithPieces(composerId: number): ComposerWithPieces | null {
  const composer = getComposerById(composerId);
  if (!composer) return null;

  const majorPieces = getMajorPiecesByComposerId(composerId);

  return {
    ...composer,
    majorPieces,
  };
}

// ============================================
// 비교 페이지용 데이터 구조
// ============================================

export interface ComparisonData {
  composer: ComposerDTO;
  piece: PieceDTO;
  performances: PerformanceDTO[];
}

export function getComparisonData(composerId: number, pieceId: number): ComparisonData | null {
  const composer = getComposerDTO(composerId);
  const piece = getPieceDTO(pieceId);

  if (!composer || !piece) return null;

  return {
    composer,
    piece,
    performances: piece.performances || [],
  };
}

// ============================================
// 타임라인 페이지용 데이터
// ============================================

export interface TimelineComposer {
  id: number;
  name: string;
  fullName: string;
  period: string;
  birthYear: number;
  deathYear: number;
  nationality: string;
  image?: string;
}

export function getTimelineComposers(): TimelineComposer[] {
  return MOCK_COMPOSERS.map(c => ({
    id: c.id,
    name: c.name,
    fullName: c.fullName,
    period: c.period,
    birthYear: c.birthYear,
    deathYear: c.deathYear,
    nationality: c.nationality,
    image: c.avatarUrl,
  }));
}

// ============================================
// 인기 비교 데이터
// ============================================

export interface PopularComparison {
  id: string;
  piece: string;
  artists: string;
  composerId: number;
  pieceId: number;
}

export function getPopularComparisons(): PopularComparison[] {
  return [
    {
      id: '1',
      piece: '쇼팽 발라드 1번',
      artists: '아르헤리치 vs 임윤찬',
      composerId: 4,
      pieceId: 10,
    },
    {
      id: '2',
      piece: '베토벤 열정 소나타',
      artists: '바렌보임 vs 조성진',
      composerId: 3,
      pieceId: 7,
    },
    {
      id: '3',
      piece: '라흐마니노프 협주곡 2번',
      artists: '랑랑 vs 유자 왕',
      composerId: 6,
      pieceId: 17,
    },
    {
      id: '4',
      piece: '쇼팽 녹턴 Op.9 No.2',
      artists: '조성진',
      composerId: 4,
      pieceId: 11,
    },
  ];
}

// ============================================
// 시대별 정보
// ============================================

export interface PeriodInfo {
  id: string;
  name: string;
  period: string;
  startYear: number;
  endYear: number;
  color: string;
  gradient: string[];
  description: string;
  characteristics: string[];
  keyComposers: string[];
  emoji: string;
}

export function getAllPeriods(): PeriodInfo[] {
  return [
    {
      id: 'baroque',
      name: '바로크',
      period: '1640-1750',
      startYear: 1640,
      endYear: 1750,
      color: '#9333ea',
      gradient: ['#7c3aed', '#a855f7'],
      emoji: '🎻',
      description: '화려하고 장식적인 음악의 시대. 대위법이 발달하고 협주곡, 푸가 등의 형식이 확립되었습니다.',
      characteristics: ['정교한 대위법', '화려한 장식음', '통주저음의 사용', '극적 대비'],
      keyComposers: ['바흐', '헨델', '비발디'],
    },
    {
      id: 'classical',
      name: '고전주의',
      period: '1730-1820',
      startYear: 1730,
      endYear: 1820,
      color: '#3b82f6',
      gradient: ['#2563eb', '#60a5fa'],
      emoji: '🎹',
      description: '균형과 질서를 중시한 시대. 소나타 형식이 완성되고 교향곡이 발전했습니다.',
      characteristics: ['명확한 형식미', '균형잡힌 구조', '선율 중심', '우아함과 절제'],
      keyComposers: ['하이든', '모차르트', '베토벤'],
    },
    {
      id: 'romantic',
      name: '낭만주의',
      period: '1800-1910',
      startYear: 1800,
      endYear: 1910,
      color: '#ec4899',
      gradient: ['#db2777', '#f472b6'],
      emoji: '🎼',
      description: '감정 표현과 개성을 중시한 시대. 민족주의 음악이 발전하고 형식이 자유로워졌습니다.',
      characteristics: ['강렬한 감정 표현', '개성 중시', '민족주의', '형식의 자유'],
      keyComposers: ['쇼팽', '리스트', '브람스', '차이콥스키'],
    },
    {
      id: 'modern',
      name: '근현대',
      period: '1890-현재',
      startYear: 1890,
      endYear: 2024,
      color: '#22c55e',
      gradient: ['#16a34a', '#4ade80'],
      emoji: '🎵',
      description: '전통에서 벗어나 새로운 음악 언어를 탐구한 시대. 불협화음, 무조성, 미니멀리즘 등 다양한 실험이 이루어졌습니다.',
      characteristics: ['실험적 음향', '새로운 화성', '다양한 기법', '장르의 융합'],
      keyComposers: ['드뷔시', '스트라빈스키', '쇼스타코비치', '존 윌리엄스'],
    },
  ];
}

export function getPeriodByName(name: string): PeriodInfo | undefined {
  return getAllPeriods().find(p => p.name === name);
}
