import { prefetchTarget, prefetchTargetFromHref } from '@/lib/navigation/prefetch';
import { routeSignature } from '@/lib/navigation/route-signature';
import { queryClient } from '@/lib/query/client';
import { type Href, router } from 'expo-router';
import { store } from 'expo-router/build/global-state/router-store';
import * as routing from 'expo-router/build/global-state/routing';
import { routingQueue } from 'expo-router/build/global-state/routing';
import { resolveHref } from 'expo-router/build/link/href';

/**
 * 웹 화면 전환. 앱 안 이동(push·replace·Link·뒤로 버튼·탭 이동·비교 화면 단계 이동)을
 * View Transitions API 로 감싸 이전 화면은 짧게 사라지고 새 화면은 살짝 올라오며 나타나게 한다.
 * 모양은 global.css 의 '화면 전환' 절에 있다. 사이드바·상단바·플레이바는 이름이 없는 root 로 남아
 * 같은 픽셀이면 그대로 보인다.
 *
 * expo-router 의 모든 이동은 routingQueue.add 를 지나고, 비교 화면 단계 이동은 router.setParams 를 쓴다.
 * 이 둘만 감싼다. 브라우저 뒤로·앞으로(popstate)는 감쌀 수 없어 본문 진입 애니메이션(route-enter)이 맡는다.
 * 지원하지 않는 브라우저, 움직임 줄이기, 숨은 탭에서는 그냥 이동한다.
 */

interface ViewTransitionHandle {
  finished: Promise<void>;
}

type StartViewTransition = (update: () => Promise<void>) => ViewTransitionHandle;

/** 새 화면이 그려지길 이 이상은 기다리지 않는다 (그동안 화면이 멈춰 보이므로 짧게) */
const MAX_COMMIT_WAIT_MS = 220;
/** 브라우저가 갱신 콜백을 끝내 부르지 않는 경우를 대비한 안전장치 */
const FLUSH_FALLBACK_MS = 1000;

let installed = false;
let running = 0;
/** 미뤄 둔 이동 뒤에 줄 세울 작업. 전환을 걸지 않는 이동도 순서를 지키려면 여기에 붙는다 */
let pending: (() => void)[] | null = null;

function startFunction(): StartViewTransition | null {
  if (typeof document === 'undefined') return null;
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof start !== 'function') return null;
  if (document.visibilityState !== 'visible') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return start.bind(document);
}

/** 내비게이션 상태가 바뀌고 새 화면의 동기 렌더가 끝날 때까지 기다린다 */
function waitForRouteCommit(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      clearTimeout(timer);
      // 상태가 바뀐 뒤 새 화면의 렌더·레이아웃이 한 번 돌도록 한 틱 더 둔다
      setTimeout(resolve, 0);
    };
    const timer = setTimeout(finish, MAX_COMMIT_WAIT_MS);
    unsubscribe = store.navigationRef.addListener('state', finish);
  });
}

/** 이동 하나를 전환으로 감싼다. 전환을 못 쓰면 바로 이동한다 */
export function runRouteTransition(navigate: () => void): void {
  if (pending) {
    pending.push(navigate);
    return;
  }
  const start = startFunction();
  if (!start) {
    navigate();
    return;
  }
  const queue: (() => void)[] = [navigate];
  let flushed = false;
  const flush = () => {
    if (flushed) return;
    flushed = true;
    if (pending === queue) pending = null;
    for (const run of queue) run();
  };
  pending = queue;
  running += 1;
  const fallback = setTimeout(flush, FLUSH_FALLBACK_MS);
  let handle: ViewTransitionHandle;
  try {
    handle = start(() => {
      clearTimeout(fallback);
      flush();
      return waitForRouteCommit();
    });
  } catch {
    clearTimeout(fallback);
    running -= 1;
    flush();
    return;
  }
  handle.finished
    .catch(() => undefined)
    .finally(() => {
      running -= 1;
    });
}

/** 지금 전환 애니메이션이 돌고 있는지. 본문 진입 애니메이션이 겹치지 않게 본다 */
export function isRouteTransitionRunning(): boolean {
  return running > 0;
}

function enqueueWithoutTransition(run: () => void) {
  if (pending) pending.push(run);
  else run();
}

/** 비교 화면처럼 같은 경로에서 화면이 바뀌는 setParams 인지 */
function changesPage(params: Record<string, unknown>): boolean {
  const info = store.getRouteInfo();
  const next: Record<string, string | string[] | undefined> = { ...info.params };
  for (const [key, value] of Object.entries(params)) {
    next[key] = value === undefined || value === null ? undefined : Array.isArray(value) ? value.map(String) : String(value);
  }
  return routeSignature(info.pathname, info.params) !== routeSignature(info.pathname, next);
}

/**
 * 전환은 새 화면을 한두 프레임 늦게 그리므로, 이동을 부르는 순간 다음 화면의 첫 데이터 요청을 먼저 띄운다.
 * 화면이 같은 쿼리를 쓰므로 그사이 받은 응답을 그대로 이어받는다.
 */
function prefetchHref(href: Href) {
  try {
    const target = prefetchTargetFromHref(resolveHref(href));
    if (target) void prefetchTarget(queryClient, target);
  } catch {
    // 주소를 못 읽으면 화면이 스스로 부른다
  }
}

type NavigateFunction = (href: Href, options?: routing.NavigationOptions) => void;
type LinkToFunction = (href: Href, options?: routing.LinkToOptions) => void;

/** 앱 시작 때 한 번 부른다 (루트 레이아웃 모듈) */
export function installRouteTransitions(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Link 는 모듈의 linkTo 를, 코드는 router.push·navigate·replace 를 부른다. 둘 다 주소를 먼저 본다
  const mutableRouting = routing as unknown as { linkTo: LinkToFunction };
  const linkTo = mutableRouting.linkTo;
  mutableRouting.linkTo = (href, options) => {
    prefetchHref(href);
    linkTo(href, options);
  };
  const mutableNavigate = router as unknown as Record<'push' | 'navigate' | 'replace', NavigateFunction>;
  for (const name of ['push', 'navigate', 'replace'] as const) {
    const navigate = mutableNavigate[name];
    mutableNavigate[name] = (href, options) => {
      prefetchHref(href);
      navigate(href, options);
    };
  }

  const add = routingQueue.add.bind(routingQueue);
  routingQueue.add = (action) => {
    // 미리 불러 두기(PRELOAD)는 화면이 바뀌지 않는다
    if (action.type === 'PRELOAD') enqueueWithoutTransition(() => add(action));
    else runRouteTransition(() => add(action));
  };

  const mutableRouter = router as unknown as { setParams: (params: Record<string, unknown>) => void };
  const setParams = mutableRouter.setParams;
  mutableRouter.setParams = (params) => {
    const run = () => setParams(params);
    if (changesPage(params)) {
      const info = store.getRouteInfo();
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries({ ...info.params, ...params })) {
        if (value !== undefined && value !== null) query.set(key, String(Array.isArray(value) ? value[0] : value));
      }
      prefetchHref(`${info.pathname}?${query.toString()}` as Href);
      runRouteTransition(run);
    } else {
      enqueueWithoutTransition(run);
    }
  };
}
