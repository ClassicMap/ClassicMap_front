// react-dom 은 웹(react-native-web)에 딸려 설치돼 있지만 타입 패키지가 없다. 쓰는 것만 선언한다.
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';

  export function createPortal(children: ReactNode, container: Element | DocumentFragment, key?: string | null): ReactPortal;
}
