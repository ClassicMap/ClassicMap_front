import { Path } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 시대 — 하나의 연대축 위에 길이가 다른 눈금을 세웁니다.
 * 눈금 높이 차이가 시대별 작품 밀도를 뜻합니다.
 */
export const EraIcon = createClassicIcon('EraIcon', () => (
  <>
    <Path d="M2 12h20" />
    <Path d="M7 7.5v9M12 5v14M17 9v6" />
  </>
));
