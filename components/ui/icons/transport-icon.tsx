import { Path } from 'react-native-svg';
import { CLASSIC_ICON_STROKE, createClassicIcon } from './icon-base';

// 이전/다음은 곡이 아니라 "구간" 이동입니다. 맨 앞의 굵은 세로선이 구간 경계이고
// 삼각형이 이동 방향입니다. 민 삼각형만 쓰면 빨리감기와 구분되지 않습니다.
const barWidth = (strokeWidth: number) => (strokeWidth / CLASSIC_ICON_STROKE) * 2.6;

export const PrevSectionIcon = createClassicIcon('PrevSectionIcon', ({ color, strokeWidth }) => (
  <>
    <Path d="M5.5 5.5v13" strokeWidth={barWidth(strokeWidth)} />
    <Path d="M19 6.5 11 12l8 5.5z" fill={color} stroke="none" />
  </>
));

export const NextSectionIcon = createClassicIcon('NextSectionIcon', ({ color, strokeWidth }) => (
  <>
    <Path d="M18.5 5.5v13" strokeWidth={barWidth(strokeWidth)} />
    <Path d="M5 6.5 13 12l-8 5.5z" fill={color} stroke="none" />
  </>
));
