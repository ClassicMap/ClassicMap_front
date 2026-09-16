import { Path } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 연주 전환 — 현악 활의 업보우(⊓)와 다운보우(∨)를 나란히 둡니다.
 * A/B 토글 사이에 놓여 "같은 자리를 다른 활법으로 켠다"는 뜻을 전합니다.
 * 두 기호의 끝 높이가 다른 것은 실제 악보 기호 그대로입니다.
 */
export const SwitchTakeIcon = createClassicIcon('SwitchTakeIcon', () => (
  <>
    <Path d="M3 13.5V7.5h6.5v6" />
    <Path d="M14.5 7.5 18 16l3.5-8.5" />
  </>
));
