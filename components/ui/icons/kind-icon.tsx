import { Circle, Path } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 작곡가 — 오선 위에 놓인 펜촉입니다. 사람 실루엣을 쓰지 않는 이유는
 * 작곡가 이미지가 없는 항목이 많아 아이콘이 아바타 자리를 대신하기 때문입니다.
 */
export const ComposerKindIcon = createClassicIcon('ComposerKindIcon', () => (
  <>
    <Path d="M4 20h7" />
    <Path d="M19.5 4.5 9 15l-3.5 1.2L6.7 12.7z" />
  </>
));

/**
 * 연주자 — 음표에서 소리가 퍼져 나가는 형태입니다.
 * 음파 호는 반드시 두 줄을 유지합니다. 한 줄로 줄이면 12px에서 8분음표 꼬리로 읽힙니다.
 */
export const PerformerKindIcon = createClassicIcon('PerformerKindIcon', () => (
  <>
    <Circle cx="8" cy="15" r="3.2" />
    <Path d="M11.2 15V5" />
    <Path d="M14.8 10.2a4.2 4.2 0 0 1 0 5.6" />
    <Path d="M18.4 7.4a8.4 8.4 0 0 1 0 11.2" />
  </>
));
