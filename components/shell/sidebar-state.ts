import * as React from 'react';

/** 사이드바를 접어 두었는지(데스크톱 웹). 이 브라우저에 남는다 */
const KEY = 'classicmap.sidebar-collapsed';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let collapsed = read();

export function setSidebarCollapsed(next: boolean) {
  collapsed = next;
  try {
    window.localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // 사생활 보호 창 등에서는 기억하지 못해도 접고 펴기는 된다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSidebarCollapsed(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => collapsed,
    () => false
  );
}
