/**
 * 영어 사전. 키는 화면에 쓰인 한국어 원문, 값은 영어 문구다. `{name}` 자리는 그대로 둔다.
 * 영역마다 파일을 나눠 여러 사람이 동시에 고쳐도 부딪히지 않게 한다. 같은 키가 둘이면 뒤 파일이 이긴다.
 */
import { COMMON } from './common';
import { SHELL } from './shell';
import { HOME } from './home';
import { SEARCH } from './search';
import { COMPARE } from './compare';
import { COMPOSER } from './composer';
import { PIECE } from './piece';
import { ARTIST } from './artist';
import { ALBUM } from './album';
import { CONCERT } from './concert';
import { LIBRARY } from './library';
import { ACCOUNT } from './account';
import { SCREEN } from './screen';
import { MISC } from './misc';
import { LEGAL } from './legal';

export const EN: Readonly<Record<string, string>> = {
  ...COMMON,
  ...SHELL,
  ...HOME,
  ...SEARCH,
  ...COMPARE,
  ...COMPOSER,
  ...PIECE,
  ...ARTIST,
  ...ALBUM,
  ...CONCERT,
  ...LIBRARY,
  ...ACCOUNT,
  ...SCREEN,
  ...MISC,
  ...LEGAL,
};
