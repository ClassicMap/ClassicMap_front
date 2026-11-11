import * as React from 'react';

/** 앱 구현(dialog·sheet)이 함께 쓰는 열림 상태. 웹은 Base UI 가 갖는다 */

export interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  setOpen: () => undefined,
});

export function useDialog(): DialogContextValue {
  return React.useContext(DialogContext);
}

type PressableElement = React.ReactElement<{ onPress?: (...args: unknown[]) => void }>;

/** 요소를 누르면 그 요소의 onPress 다음에 action 을 부른다 */
export function pressTo(render: React.ReactElement, children: React.ReactNode, action: () => void) {
  const element = render as PressableElement;
  const props = {
    onPress: (...args: unknown[]) => {
      element.props.onPress?.(...args);
      action();
    },
  };
  return children === undefined
    ? React.cloneElement(element, props)
    : React.cloneElement(element, props, children);
}
