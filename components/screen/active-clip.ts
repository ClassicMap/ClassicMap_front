import { comparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';

/** 화면에서 재생 중인 공식 클립. 한 번에 하나만 튼다 */
let activeId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setActive(id: string | null) {
  activeId = id;
  for (const listener of listeners) listener();
}

/** 이 클립을 그 자리에서 트는지. 틀면 다른 클립과 아래 재생바의 연주는 멈춘다 */
export function useActiveClip(id: string) {
  const active = React.useSyncExternalStore(
    subscribe,
    () => activeId === id,
    () => false
  );
  const open = React.useCallback(() => {
    comparePlayer.pause();
    setActive(id);
  }, [id]);
  const close = React.useCallback(() => {
    if (activeId === id) setActive(null);
  }, [id]);
  // 화면을 떠나면 닫는다. 돌아왔을 때 저절로 다시 틀지 않게
  React.useEffect(() => close, [close]);
  return { active, open, close };
}
