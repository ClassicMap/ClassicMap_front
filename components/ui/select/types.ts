import type * as React from 'react';

/** 앱(index.tsx)과 웹(index.web.tsx) 구현이 함께 쓰는 props. 파트 이름은 shadcn Base UI 판과 같다 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** 고를 수 있는 값 전부. 트리거가 고른 값의 이름을 보이는 데 쓴다 */
  items: readonly SelectOption[];
  disabled?: boolean;
  children: React.ReactNode;
}

export interface SelectTriggerProps {
  /** 스크린리더가 읽는 이름 */
  'aria-label'?: string;
  size?: 'default' | 'sm';
  className?: string;
  children: React.ReactNode;
}

export interface SelectValueProps {
  /** 고른 값이 없을 때 보이는 글 */
  placeholder: string;
  className?: string;
}

export interface SelectContentProps {
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
  /** 앱 전용: 그릴 PortalHost 이름 */
  portalHost?: string;
}

export interface SelectItemProps {
  value: string;
  /** 목록과 트리거에 보이는 이름 */
  label: string;
  disabled?: boolean;
  className?: string;
}

export interface SelectSectionProps {
  className?: string;
  children?: React.ReactNode;
}
