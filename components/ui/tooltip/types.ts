import type * as React from 'react';

/** 앱(index.tsx)과 웹(index.web.tsx) 구현이 함께 쓰는 props. 파트 이름은 shadcn Base UI 판과 같다 */

export interface TooltipProviderProps {
  /** 올린 뒤 뜨기까지 (ms). 기본 0 */
  delay?: number;
  children: React.ReactNode;
}

export interface TooltipProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 켜 두면 뜨지 않는다 */
  disabled?: boolean;
  children: React.ReactNode;
}

export interface TooltipTriggerProps {
  /** 이름표를 붙일 요소(Button·Pressable). 마우스를 올리거나 키보드로 포커스하면 뜬다 */
  render: React.ReactElement;
  children?: React.ReactNode;
}

export interface TooltipContentProps {
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
}
