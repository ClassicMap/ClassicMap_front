import type * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** 앱(index.tsx)과 웹(index.web.tsx) 구현이 함께 쓰는 props. sheet 도 같은 타입을 쓴다 */

export interface DialogProps {
  /** 주면 바깥에서 여닫는다. `onOpenChange` 와 함께 쓴다 */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogTriggerProps {
  /** 누르면 열리는(닫히는) 요소 */
  render: React.ReactElement;
  children?: React.ReactNode;
}

export interface DialogContentProps {
  /** 스크린리더가 읽는 이름. 안에 DialogTitle 을 두면 생략한다 */
  'aria-label'?: string;
  /** 바깥(어두운 막)을 눌러 닫는 단추의 이름 (앱) */
  closeLabel: string;
  /** 화면 전체를 덮는다(사진 크게 보기 등). 가운데 상자 모양과 어두운 막 없이 안쪽이 배경까지 그린다 */
  fullscreen?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export interface SheetContentProps extends DialogContentProps {
  /** 올라오는 쪽 */
  side?: 'bottom' | 'right';
}

export interface DialogSectionProps {
  className?: string;
  children?: React.ReactNode;
}
