import { usePlayerBarOutlet } from '@/features/player/lib/player-bar-outlet';
import * as React from 'react';
import { createPortal } from 'react-dom';

/** 셸 재생 바가 빌려준 자리에 그린다. 자리가 아직 없으면(셸이 그리기 전) 아무것도 그리지 않는다 */
export function PlayerBarPortal({ children }: { children: React.ReactNode }) {
  const outlet = usePlayerBarOutlet();
  return outlet ? createPortal(children, outlet) : null;
}
