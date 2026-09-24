/**
 * 백엔드가 내려주는 아티스트 분류 코드의 화면 라벨.
 * 코드 목록은 ClassicMap_back `src/artist/category.rs`와 같아야 한다.
 */
export const ARTIST_CATEGORY_CODES = [
  'pianist',
  'violinist',
  'violist',
  'cellist',
  'double_bassist',
  'guitarist',
  'harpist',
  'flutist',
  'oboist',
  'clarinetist',
  'bassoonist',
  'saxophonist',
  'hornist',
  'percussionist',
  'recorder_player',
  'gambist',
  'vocalist',
  'conductor',
  'orchestra',
  'other',
] as const;

export type ArtistCategoryCode = (typeof ARTIST_CATEGORY_CODES)[number];

const ARTIST_CATEGORY_LABELS: Record<ArtistCategoryCode, string> = {
  pianist: '피아노',
  violinist: '바이올린',
  violist: '비올라',
  cellist: '첼로',
  double_bassist: '콘트라베이스',
  guitarist: '기타',
  harpist: '하프',
  flutist: '플루트',
  oboist: '오보에',
  clarinetist: '클라리넷',
  bassoonist: '바순',
  saxophonist: '색소폰',
  hornist: '호른',
  percussionist: '타악기',
  recorder_player: '리코더',
  gambist: '비올라 다 감바',
  vocalist: '성악',
  conductor: '지휘',
  orchestra: '오케스트라',
  other: '그 외',
};

export function isArtistCategoryCode(value: string): value is ArtistCategoryCode {
  return (ARTIST_CATEGORY_CODES as readonly string[]).includes(value);
}

/** 코드가 아닌 값은 정규화 전 원본이므로 받은 그대로 보여준다. */
export function getArtistCategoryLabel(category: string): string {
  return isArtistCategoryCode(category) ? ARTIST_CATEGORY_LABELS[category] : category;
}
