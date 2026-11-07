import type { ColorScheme } from './tokens';

/**
 * 작품 장르 7종 (2026-11-07 사용자 결정). 원곡 편성 기준으로 서버가 `genre` 로 준다.
 * 시대 색처럼 데이터 카테고리 전용이라 버튼·보더 같은 UI 크롬에는 쓰지 않는다.
 * 사용처: 작품 커버 그라데이션, 작품 머리 배경, 장르 타일·칩.
 */
export const PIECE_GENRES = [
  'symphony',
  'concerto',
  'piano',
  'chamber',
  'orchestral',
  'stage',
  'vocal',
] as const;

export type PieceGenre = (typeof PIECE_GENRES)[number];

export interface GenreStyle {
  key: PieceGenre;
  label: string;
  /** 커버 그라데이션 시작(왼쪽 위, 짙은 쪽) */
  from: string;
  /** 커버 그라데이션 끝(오른쪽 아래, 밝은 쪽) */
  to: string;
  /** 다크 배경 위 글자·도트 */
  onDark: string;
  /** 라이트 배경 위 글자·도트 */
  onLight: string;
}

export const GENRE_STYLES: Record<PieceGenre, GenreStyle> = {
  symphony: {
    key: 'symphony',
    label: '교향곡',
    from: '#232B6B',
    to: '#6A45C4',
    onDark: '#A99BF0',
    onLight: '#4B37A0',
  },
  concerto: {
    key: 'concerto',
    label: '협주곡',
    from: '#E8772B',
    to: '#C42E3F',
    onDark: '#F5A15C',
    onLight: '#A8411C',
  },
  piano: {
    key: 'piano',
    label: '피아노',
    from: '#0B7470',
    to: '#2EA463',
    onDark: '#55C9A8',
    onLight: '#0B6B5C',
  },
  chamber: {
    key: 'chamber',
    label: '실내악',
    from: '#636F1F',
    to: '#C08B2C',
    onDark: '#CDB65E',
    onLight: '#6B5A12',
  },
  orchestral: {
    key: 'orchestral',
    label: '관현악',
    from: '#1A50BE',
    to: '#3AA9E6',
    onDark: '#6FB6F2',
    onLight: '#1B4FA8',
  },
  stage: {
    key: 'stage',
    label: '오페라·발레',
    from: '#741C5F',
    to: '#D12A4E',
    onDark: '#EA6C8C',
    onLight: '#A11B45',
  },
  vocal: {
    key: 'vocal',
    label: '성악',
    from: '#4E3CA8',
    to: '#B896E6',
    onDark: '#C2A8F2',
    onLight: '#5A3FB0',
  },
};

/** 장르를 모르는 작품의 커버. 브랜드 뉴트럴(따뜻한 회갈색)로 둔다 */
export const NEUTRAL_COVER = { from: '#3B352E', to: '#1D1A17' } as const;

export function isPieceGenre(value: unknown): value is PieceGenre {
  return typeof value === 'string' && (PIECE_GENRES as readonly string[]).includes(value);
}

export function genreStyle(genre: string | null | undefined): GenreStyle | undefined {
  return isPieceGenre(genre) ? GENRE_STYLES[genre] : undefined;
}

/** 커버 그라데이션 두 색. 모르는 장르면 뉴트럴 */
export function genreGradient(genre: string | null | undefined): { from: string; to: string } {
  const style = genreStyle(genre);
  return style ? { from: style.from, to: style.to } : NEUTRAL_COVER;
}

/** 글자·도트 색. 모르는 장르면 undefined (토큰 색을 쓴다) */
export function genreForeground(
  genre: string | null | undefined,
  scheme: ColorScheme
): string | undefined {
  const style = genreStyle(genre);
  if (!style) return undefined;
  return scheme === 'dark' ? style.onDark : style.onLight;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** hex 색에 알파를 입힌 rgba. 그라데이션 배경·호버 워시에 쓴다 */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 색 번짐용 색. 다크에서는 검정 쪽으로 눌러 어둡게(스포티파이 머리 색처럼), 라이트에서는 옅게 깐다.
 * 주황·분홍 같은 밝은 색을 그대로 깔면 머리 글자가 묻혀서 이렇게 한다.
 */
export function washColor(hex: string, scheme: ColorScheme, strength = 1): string {
  if (scheme === 'light') return rgba(hex, 0.2 * strength);
  const [r, g, b] = hexToRgb(hex).map((channel) => Math.round(channel * 0.58));
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, 0.92 * strength)})`;
}

/**
 * 화면 머리 뒤에 까는 색 (스포티파이 상세 화면의 위쪽 색 번짐).
 * 다크는 짙은 시작색을, 라이트는 밝은 끝색을 옅게 쓴다.
 */
export function genreWash(
  genre: string | null | undefined,
  scheme: ColorScheme
): string | undefined {
  const style = genreStyle(genre);
  if (!style) return undefined;
  return washColor(scheme === 'dark' ? style.from : style.to, scheme);
}

/** 연주자 악기(취향 '소리')에서 머리 색으로 쓸 장르. 아티스트 화면 색 번짐에 쓴다 */
export function genreOfSound(sound: string | null | undefined): PieceGenre | null {
  switch (sound) {
    case 'piano':
      return 'piano';
    case 'orchestra':
      return 'symphony';
    case 'strings':
    case 'ensemble':
      return 'chamber';
    case 'winds':
      return 'orchestral';
    case 'voice':
      return 'vocal';
    default:
      return null;
  }
}
