import type { PieceGenre } from '@/lib/design/genre-palette';
import { Circle, Path, Rect } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 장르 7종 아이콘. 무대에 앉은 편성을 위에서 본 모양으로 그린다.
 * 사람 수로 갈린다: 교향곡은 작은 점 두 줄(큰 편성), 협주곡은 점 한 줄 앞의 큰 원 하나(독주자),
 * 실내악은 중간 원 넷. 반원 선으로 그리면 작은 크기에서 와이파이 표시로 읽혀 점으로 그린다.
 */

/** 관현악 자리: 지휘대(12, 22)를 둘러싼 바깥 줄 넷, 안쪽 줄 셋. 작은 크기에서도 보이게 점을 크게 둔다 */
const OUTER_ROW: [number, number][] = [
  [3.4, 15.6],
  [8.4, 9.4],
  [15.6, 9.4],
  [20.6, 15.6],
];
const INNER_ROW: [number, number][] = [
  [7.6, 19.2],
  [12, 14.6],
  [16.4, 19.2],
];

/** 교향곡 — 지휘대를 둘러싼 관현악 두 줄 */
export const SymphonyIcon = createClassicIcon('SymphonyIcon', ({ color }) => (
  <>
    {[...OUTER_ROW, ...INNER_ROW].map(([cx, cy]) => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.2} fill={color} stroke="none" />
    ))}
  </>
));

/** 협주곡 — 관현악 한 줄 앞의 독주자 */
export const ConcertoIcon = createClassicIcon('ConcertoIcon', ({ color }) => (
  <>
    {OUTER_ROW.map(([cx, cy]) => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.1} fill={color} stroke="none" />
    ))}
    <Circle cx="12" cy="17" r="3.4" />
  </>
));

/** 피아노 — 건반 네 개와 검은 건반 둘 */
export const PianoIcon = createClassicIcon('PianoIcon', ({ color }) => (
  <>
    <Rect x="3" y="5" width="18" height="14" rx="2" />
    <Path d="M7.5 12.5V19M12 12.5V19M16.5 12.5V19" />
    <Rect x="6.3" y="5" width="2.4" height="7.5" rx="0.6" fill={color} />
    <Rect x="15.3" y="5" width="2.4" height="7.5" rx="0.6" fill={color} />
  </>
));

/** 실내악 — 반원으로 앉은 네 사람(현악 4중주) */
export const ChamberIcon = createClassicIcon('ChamberIcon', () => (
  <>
    <Circle cx="5" cy="15" r="2" />
    <Circle cx="9.5" cy="9.5" r="2" />
    <Circle cx="14.5" cy="9.5" r="2" />
    <Circle cx="19" cy="15" r="2" />
  </>
));

/** 관현악 — 지휘봉과 그 끝의 움직임 */
export const OrchestralIcon = createClassicIcon('OrchestralIcon', () => (
  <>
    <Path d="M4.5 19.5 15 9" />
    <Circle cx="4.8" cy="19.2" r="1.4" />
    <Path d="M14 4.5a6 6 0 0 1 5.5 5.5" />
    <Path d="M17 3a9 9 0 0 1 4 4" />
  </>
));

/** 오페라·발레 — 양옆으로 걷힌 막과 무대 바닥 */
export const StageIcon = createClassicIcon('StageIcon', ({ color }) => (
  <>
    <Path d="M3 4h18" />
    <Path d="M3.5 4H10c-1.6 4.6-2.2 9.4-1.4 14H3.5z" fill={color} />
    <Path d="M20.5 4H14c1.6 4.6 2.2 9.4 1.4 14h5.1z" fill={color} />
    <Path d="M3 21h18" />
  </>
));

/** 성악 — 선율(음표)과 가사(줄) */
export const VocalIcon = createClassicIcon('VocalIcon', () => (
  <>
    <Circle cx="6.5" cy="16" r="2.5" />
    <Path d="M9 16V5l4.5 1.6" />
    <Path d="M14 11h6M14 14.5h6M14 18h4" />
  </>
));

/** 장르를 못 정한 작품 */
export const OtherGenreIcon = createClassicIcon('OtherGenreIcon', ({ color }) => (
  <>
    <Circle cx="6" cy="12" r="1.3" fill={color} />
    <Circle cx="12" cy="12" r="1.3" fill={color} />
    <Circle cx="18" cy="12" r="1.3" fill={color} />
  </>
));

export const GENRE_ICONS: Record<PieceGenre, typeof SymphonyIcon> = {
  symphony: SymphonyIcon,
  concerto: ConcertoIcon,
  piano: PianoIcon,
  chamber: ChamberIcon,
  orchestral: OrchestralIcon,
  stage: StageIcon,
  vocal: VocalIcon,
};
