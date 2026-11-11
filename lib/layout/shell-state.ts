import * as React from 'react';

/**
 * 셸의 레이아웃 상태 한곳 (docs/frontend-structure.md 6절). 재생 상태(lib/player)와 나눠 둔다.
 * - sidebarCollapsed: 넓은 창에서 사이드바를 접어 두었는지. 이 브라우저에 남는다
 * - queueOpen: 넓은 창의 오른쪽 대기열 패널. 이 브라우저에 남는다
 * - queueSheetOpen: 좁은 화면에서 아래에서 올라오는 대기열 시트. 남기지 않는다
 */
export interface ShellState {
  sidebarCollapsed: boolean;
  queueOpen: boolean;
  queueSheetOpen: boolean;
}

const SIDEBAR_KEY = 'classicmap.sidebar-collapsed';
// 재생 스토어가 갖고 있던 값이라 열쇠 이름을 그대로 둔다(이미 저장된 값이 이어지게)
const QUEUE_KEY = 'classicmap.player.queue-open';

function readFlag(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage?.setItem(key, value ? '1' : '0');
  } catch {
    // 사생활 보호 창 등에서는 기억하지 못해도 여닫기는 된다
  }
}

const SERVER_STATE: ShellState = {
  sidebarCollapsed: false,
  queueOpen: false,
  queueSheetOpen: false,
};

let state: ShellState = {
  sidebarCollapsed: readFlag(SIDEBAR_KEY),
  queueOpen: readFlag(QUEUE_KEY),
  queueSheetOpen: false,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<ShellState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const shell = {
  getState: (): ShellState => state,
  setSidebarCollapsed(collapsed: boolean) {
    if (state.sidebarCollapsed === collapsed) return;
    writeFlag(SIDEBAR_KEY, collapsed);
    setState({ sidebarCollapsed: collapsed });
  },
  toggleSidebar() {
    shell.setSidebarCollapsed(!state.sidebarCollapsed);
  },
  setQueueOpen(open: boolean) {
    if (state.queueOpen === open) return;
    writeFlag(QUEUE_KEY, open);
    setState({ queueOpen: open });
  },
  toggleQueue() {
    shell.setQueueOpen(!state.queueOpen);
  },
  setQueueSheetOpen(open: boolean) {
    if (state.queueSheetOpen === open) return;
    setState({ queueSheetOpen: open });
  },
};

export function useShell<T>(selector: (snapshot: ShellState) => T): T {
  const selectorRef = React.useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = React.useCallback(() => selectorRef.current(state), []);
  const getServerSnapshot = React.useCallback(() => selectorRef.current(SERVER_STATE), []);
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
