import { Path } from 'react-native-svg';
import { createClassicIcon } from './icon-base';

/**
 * 예매 — 가운데 절취선이 있는 티켓입니다.
 * 외부 예매처로 나가는 동작이므로 재생 계열 아이콘과 형태를 겹치지 않게 했습니다.
 */
export const TicketIcon = createClassicIcon('TicketIcon', () => (
  <>
    <Path d="M4 9.5V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5z" />
    <Path d="M14 6v12" strokeDasharray="2 2.6" />
  </>
));
