import { Path } from 'react-native-svg';
import { createClassicIcon, type ClassicIconProps } from './icon-base';

/**
 * 레퍼토리 — 책갈피에 두 줄의 목록선을 넣어 "저장한 곡 묶음"을 나타냅니다.
 * 하트나 별 대신 책갈피를 쓰는 이유는 보관이지 평가가 아니기 때문입니다.
 */
const RepertoireOutline = createClassicIcon('RepertoireIcon', () => (
  <>
    <Path d="M5 3.5h14v17l-7-4.6-7 4.6z" />
    <Path d="M9 8.5h6M9 12h6" />
  </>
));

const RepertoireFilled = createClassicIcon('RepertoireIconFilled', ({ color }) => (
  <Path d="M5 3.5h14v17l-7-4.6-7 4.6z" fill={color} stroke="none" />
));

/** 담긴 상태는 목록선을 지우고 면으로 채웁니다. 12px에서도 채움 여부만으로 구분됩니다. */
export function RepertoireIcon({ filled = false, ...props }: ClassicIconProps & { filled?: boolean }) {
  return filled ? <RepertoireFilled {...props} /> : <RepertoireOutline {...props} />;
}
