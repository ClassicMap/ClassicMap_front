const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;
const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
const SYLLABLES_PER_CHOSEONG = 21 * 28;

/** 대소문자·공백·구두점을 무시하고 비교한다 */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[\s·.,'"()<>「」〈〉\-_/]+/g, '');
}

function choseongOf(char: string): string {
  const code = char.charCodeAt(0);
  if (code < SYLLABLE_START || code > SYLLABLE_END) return char;
  return CHOSEONG[Math.floor((code - SYLLABLE_START) / SYLLABLES_PER_CHOSEONG)];
}

function isChoseong(char: string): boolean {
  return (CHOSEONG as readonly string[]).includes(char);
}

/**
 * 검색어가 들어 있는 위치. 없으면 -1.
 * 검색어의 자음 글자는 그 자리 음절의 초성과도 맞춰 본다 ('ㄹㅎ', '라ㅎ' → 라흐마니노프).
 */
export function searchMatchIndex(text: string, query: string): number {
  const target = normalizeSearchText(text);
  const needle = normalizeSearchText(query);
  if (!needle) return 0;
  for (let start = 0; start + needle.length <= target.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      const want = needle[offset];
      const have = target[start + offset];
      if (want !== have && !(isChoseong(want) && choseongOf(have) === want)) {
        matched = false;
        break;
      }
    }
    if (matched) return start;
  }
  return -1;
}
