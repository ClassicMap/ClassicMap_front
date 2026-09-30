import * as React from 'react';
import { makeMutable } from 'react-native-reanimated';

/**
 * 네이티브 비교 영상이 뜰 자리. 웹의 슬롯·미니 자리와 같은 역할이다.
 * 자리 컴포넌트가 UI 스레드에서 매 프레임 자기 화면 좌표를 적고, 루트의 영상 호스트가 그 좌표로 옮겨 간다.
 * 영상(WebView)은 하나라 옮겨도 다시 만들어지지 않는다.
 *
 * 이 모듈은 네이티브 파일(*.native.tsx)에서만 불러온다.
 */

export interface SurfaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type NativeSurfaceKind = 'slot' | 'mini' | 'none';

export interface NativeSurfaceTarget {
  kind: Exclude<NativeSurfaceKind, 'none'>;
  /** 영상이 보여도 되는 세로 띠(화면 좌표). 헤더·탭바 아래로 삐져나가지 않게 자른다 */
  bandTop: number;
  bandBottom: number;
  radius: number;
}

const EMPTY_RECT: SurfaceRect = { x: 0, y: 0, width: 0, height: 0 };

/** UI 스레드가 읽고 쓰는 값 */
export const surfaceRects = {
  slot: makeMutable<SurfaceRect>(EMPTY_RECT),
  mini: makeMutable<SurfaceRect>(EMPTY_RECT),
  /** 0: 없음, 1: 슬롯, 2: 미니 */
  kind: makeMutable(0),
  bandTop: makeMutable(0),
  bandBottom: makeMutable(0),
};

const targets = new Set<NativeSurfaceTarget>();
const listeners = new Set<() => void>();
let active: NativeSurfaceTarget | null = null;

function pick(): NativeSurfaceTarget | null {
  let mini: NativeSurfaceTarget | null = null;
  for (const target of targets) {
    if (target.kind === 'slot') return target;
    mini = target;
  }
  return mini;
}

function update() {
  active = pick();
  surfaceRects.kind.value = active?.kind === 'slot' ? 1 : active?.kind === 'mini' ? 2 : 0;
  if (active) {
    surfaceRects.bandTop.value = active.bandTop;
    surfaceRects.bandBottom.value = active.bandBottom;
  }
  listeners.forEach((listener) => listener());
}

/** 자리를 건다. 비교 화면 자리가 있으면 그쪽이, 없으면 미니 자리가 영상을 받는다 */
export function registerNativeSurface(target: NativeSurfaceTarget): () => void {
  targets.add(target);
  update();
  return () => {
    targets.delete(target);
    if (target.kind === 'slot') surfaceRects.slot.value = EMPTY_RECT;
    else surfaceRects.mini.value = EMPTY_RECT;
    update();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 지금 영상을 받는 자리 */
export function useNativeSurface(): NativeSurfaceTarget | null {
  return React.useSyncExternalStore(subscribe, () => active, () => null);
}
