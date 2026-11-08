import { msg, t } from '@/lib/i18n';

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
  'trumpeter',
  'percussionist',
  'recorder_player',
  'gambist',
  'vocalist',
  'conductor',
  'orchestra',
  'choir',
  'ensemble',
  'other',
] as const;

export type ArtistCategoryCode = (typeof ARTIST_CATEGORY_CODES)[number];

const ARTIST_CATEGORY_LABELS: Record<ArtistCategoryCode, string> = {
  pianist: msg('피아노'),
  violinist: msg('바이올린'),
  violist: msg('비올라'),
  cellist: msg('첼로'),
  double_bassist: msg('콘트라베이스'),
  // '기타' 는 공통 사전에서 Other 라 악기 쪽에 문맥을 붙인다
  guitarist: msg('instrument::기타'),
  harpist: msg('하프'),
  flutist: msg('플루트'),
  oboist: msg('오보에'),
  clarinetist: msg('클라리넷'),
  bassoonist: msg('바순'),
  saxophonist: msg('색소폰'),
  hornist: msg('호른'),
  trumpeter: msg('트럼펫'),
  percussionist: msg('타악기'),
  recorder_player: msg('리코더'),
  gambist: msg('비올라 다 감바'),
  vocalist: msg('성악'),
  conductor: msg('지휘'),
  orchestra: msg('오케스트라'),
  choir: msg('합창'),
  ensemble: msg('실내악'),
  other: msg('그 외'),
};

export function isArtistCategoryCode(value: string): value is ArtistCategoryCode {
  return (ARTIST_CATEGORY_CODES as readonly string[]).includes(value);
}

/** 코드가 아닌 값은 정규화 전 원본이므로 받은 그대로 보여준다. */
export function getArtistCategoryLabel(category: string): string {
  return t(isArtistCategoryCode(category) ? ARTIST_CATEGORY_LABELS[category] : category);
}
