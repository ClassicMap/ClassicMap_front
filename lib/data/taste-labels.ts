import type { ListeningLevel, PlayerInstrument, TasteSound } from '@/lib/types/models';

/** 온보딩 첫 질문의 답. short 는 설정 칩에 쓴다 */
export const LEVEL_OPTIONS: readonly { key: ListeningLevel; label: string; short: string }[] = [
  { key: 'new', label: '이제 막 듣기 시작했어요', short: '이제 막' },
  { key: 'some', label: '좋아하는 곡이 몇 개 있어요', short: '몇 곡 알아요' },
  { key: 'often', label: '자주 찾아 들어요', short: '자주 들어요' },
  { key: 'player', label: '직접 연주해요', short: '직접 연주해요' },
];

export const SOUND_OPTIONS: readonly { key: TasteSound; label: string }[] = [
  { key: 'piano', label: '피아노' },
  { key: 'orchestra', label: '오케스트라' },
  { key: 'strings', label: '바이올린·첼로' },
  { key: 'voice', label: '목소리' },
  { key: 'ensemble', label: '작은 앙상블' },
];

export const INSTRUMENT_OPTIONS: readonly { key: PlayerInstrument; label: string }[] = [
  { key: 'piano', label: '피아노' },
  { key: 'strings', label: '현악기' },
  { key: 'winds', label: '관악기' },
  { key: 'voice', label: '성악' },
  { key: 'other', label: '그 밖의 악기' },
];

/** 좋아하는 시대로 고를 수 있는 시대. 실제 작곡가 데이터가 있는 시대만 둔다 */
export const PREFERENCE_ERAS = ['바로크', '고전주의', '낭만주의', '근현대'] as const;

/**
 * 카드에 쓰는 짧은 곡 이름. 백엔드 추천 이유와 같은 규칙이다.
 * 따옴표 별명 → 꺾쇠 제목(뒤에 붙은 말은 살린다: <타이스>의 명상곡 → 타이스의 명상곡) → 괄호 앞 제목(끝의 조성은 뺀다)
 */
export function shortPieceTitle(title: string): string {
  const quoteEnd = title.lastIndexOf('"');
  const quoteStart = quoteEnd > 0 ? title.lastIndexOf('"', quoteEnd - 1) : -1;
  if (quoteStart >= 0 && title.slice(quoteStart + 1, quoteEnd).trim() !== '') {
    return title.slice(quoteStart + 1, quoteEnd).trim();
  }
  const head = title.split(' (')[0].trim();
  const open = head.indexOf('<');
  const close = head.indexOf('>', open + 1);
  if (open >= 0 && close > open + 1) {
    const inner = head.slice(open + 1, close).trim();
    const after = head.slice(close + 1);
    return after.trim() === '' || after.trim().startsWith('중') ? inner : `${inner}${after}`.trim();
  }
  const space = head.lastIndexOf(' ');
  const key = space > 0 ? head.slice(space + 1) : '';
  return key.endsWith('장조') || key.endsWith('단조') ? head.slice(0, space).trim() : head;
}

/** 연주자 분류 코드가 어느 소리에 드는지. 홈 연주자 셸프에서 고른 소리의 연주자를 앞에 둔다 */
export function soundOfArtistCategory(category: string): TasteSound | null {
  switch (category) {
    case 'pianist':
      return 'piano';
    case 'violinist':
    case 'violist':
    case 'cellist':
    case 'double_bassist':
    case 'guitarist':
    case 'harpist':
    case 'gambist':
      return 'strings';
    case 'conductor':
    case 'orchestra':
      return 'orchestra';
    case 'vocalist':
    case 'choir':
      return 'voice';
    case 'ensemble':
      return 'ensemble';
    default:
      return null;
  }
}
