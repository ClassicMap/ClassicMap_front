/**
 * 작품 장르 7종 (2026-11-07 사용자 결정). 원곡 편성 기준으로 서버가 `genre` 로 준다.
 * 시대 색처럼 데이터 카테고리 전용이라 버튼·보더 같은 UI 크롬에는 쓰지 않는다.
 * 사용처: 둘러보기·비교 탭의 장르 타일. 작품 그림(연주자 사진)에는 덧칠하지 않는다.
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
  /** 둘러보기 타일 단색. 장르끼리 색상이 겹치지 않게 고르고 채도는 눌러 둔다 */
  color: string;
}

export const GENRE_STYLES: Record<PieceGenre, GenreStyle> = {
  symphony: { key: 'symphony', label: '교향곡', color: '#4E4A8C' },
  concerto: { key: 'concerto', label: '협주곡', color: '#A0603A' },
  piano: { key: 'piano', label: '피아노', color: '#3F7F6A' },
  chamber: { key: 'chamber', label: '실내악', color: '#8A7440' },
  orchestral: { key: 'orchestral', label: '관현악', color: '#3F6F9A' },
  stage: { key: 'stage', label: '오페라·발레', color: '#8C3F5A' },
  vocal: { key: 'vocal', label: '성악', color: '#7466A8' },
};

export function isPieceGenre(value: unknown): value is PieceGenre {
  return typeof value === 'string' && (PIECE_GENRES as readonly string[]).includes(value);
}

export function genreStyle(genre: string | null | undefined): GenreStyle | undefined {
  return isPieceGenre(genre) ? GENRE_STYLES[genre] : undefined;
}

