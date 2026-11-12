import * as React from 'react';

/**
 * 데스크톱 셸 재생 바의 「빌려주는 자리」. 1:1 비교처럼 화면이 재생을 직접 맡는 동안에는
 * 그 화면이 제 조작부를 이 자리에 그린다(바는 늘 같은 자리·같은 크기로 남는다).
 * 자리는 `GlobalPlayerBar` 가 걸고, 쓰는 쪽은 `PlayerBarPortal` 로 그린다
 */
let outlet: Element | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** ref 콜백으로 쓴다(늘 같은 함수라 다시 그려도 자리가 풀렸다 걸리지 않는다) */
export function setPlayerBarOutlet(node: unknown) {
  const next = node instanceof Element ? node : null;
  if (next === outlet) return;
  outlet = next;
  listeners.forEach((listener) => listener());
}

export function usePlayerBarOutlet(): Element | null {
  return React.useSyncExternalStore(
    subscribe,
    () => outlet,
    () => null
  );
}
