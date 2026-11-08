/** 앱(네이티브)은 화면 전환을 내비게이터가 맡는다. 웹 구현은 view-transition.web.ts */
export function installRouteTransitions(): void {}

export function runRouteTransition(navigate: () => void): void {
  navigate();
}

export function isRouteTransitionRunning(): boolean {
  return false;
}
