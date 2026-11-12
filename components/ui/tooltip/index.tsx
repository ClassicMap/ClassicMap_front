import * as React from 'react';

import type {
  TooltipContentProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipTriggerProps,
} from './types';

/**
 * 앱 구현. 툴팁은 마우스·키보드 포커스에 뜨는 것이라 터치 화면에서는 띄우지 않는다(Base UI 도 터치에서는 끈다).
 * 트리거만 그대로 그리고 내용은 그리지 않는다. 그래서 트리거에는 늘 접근성 이름(accessibilityLabel)을 따로 준다.
 * 웹 구현은 index.web.tsx (Base UI)
 */

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

function Tooltip({ children }: TooltipProps) {
  return <>{children}</>;
}

/** 바깥에서 끼워 넣는 props(`<Link asChild>` 등)는 요소로 넘긴다 */
function TooltipTrigger({
  render,
  children,
  ...rest
}: TooltipTriggerProps & Record<string, unknown>) {
  return children === undefined
    ? React.cloneElement(render, rest)
    : React.cloneElement(render, rest, children);
}

function TooltipContent(_props: TooltipContentProps) {
  return null;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
