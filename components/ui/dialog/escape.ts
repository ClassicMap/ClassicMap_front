import * as React from 'react';

/** 웹 구현(dialog·sheet)이 쓴다. 안쪽 입력 칸에서 누른 Esc 로 닫는 함수 */
export const CloseContext = React.createContext<() => void>(() => undefined);

/**
 * RN 웹의 TextInput 은 모든 keydown 의 전파를 끊어서(react-native-web TextInput handleKeyDown),
 * 입력 칸에 포커스가 있으면 Base UI 가 문서에서 듣는 Esc 가 오지 않는다. 그래서 캡처 단계에서 먼저 받아 닫는다.
 * 입력 칸이 아닌 곳의 Esc 는 Base UI 가 그대로 받는다
 */
export function useCloseOnEscapeFromInput(popupRef: React.RefObject<HTMLDivElement | null>) {
  const close = React.useContext(CloseContext);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (!target || !popupRef.current?.contains(target)) return;
      if (
        !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      event.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [close, popupRef]);
}
