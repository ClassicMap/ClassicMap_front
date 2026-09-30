import { Circle, Path } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 비교 — 같은 악절을 두 연주자가 각자의 트랙 위에서 서로 다른 지점에 놓는다는 뜻입니다.
 * 두 줄은 같은 곡의 타임라인이고, 원의 어긋난 위치가 해석 차이를 나타냅니다.
 */
export const CompareIcon = createClassicIcon('CompareIcon', () => (
  <>
    <Path d="M2 8h20M2 16h20" />
    <Circle cx="8" cy="8" r="2.4" />
    <Circle cx="16" cy="16" r="2.4" />
  </>
));
