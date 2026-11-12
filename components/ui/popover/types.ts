import type * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** 앱(index.tsx)과 웹(index.web.tsx) 구현이 함께 쓰는 props. 파트 이름은 shadcn Base UI 판과 같다 */

export interface PopoverProps {
  /** 주면 바깥에서 여닫는다. `onOpenChange` 와 함께 쓴다 */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface PopoverTriggerProps {
  /** 누르면 열리는 요소(Button·Pressable). `asChild` 대신 쓴다 */
  render: React.ReactElement;
  /** 그 요소 안에 넣을 내용. 요소가 이미 자식을 가졌으면 생략한다 */
  children?: React.ReactNode;
  /** 웹 전용: 넘긴 요소가 `<button>` 이 아니면 false (role="button" 이 없는 Pressable 등) */
  nativeButton?: boolean;
}

export interface PopoverContentProps {
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** 앱 전용: 그릴 PortalHost 이름 */
  portalHost?: string;
}

export interface PopoverSectionProps {
  className?: string;
  children?: React.ReactNode;
}
