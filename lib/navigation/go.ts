import { type Href, router } from 'expo-router';
import { Platform } from 'react-native';

/**
 * 앱 안 이동은 여기 한곳을 지난다 (#82).
 *
 * 앱(네이티브)은 루트 스택에 탭 묶음 `(tabs)` 이 하나만 있어야 한다. 루트 화면(작곡가·아티스트 …)에서
 * 탭 주소로 push·replace 하면 탭 묶음이 하나 더 쌓이고, 밀기·시스템 뒤로가 엉뚱한 탭으로 나간다.
 * - 탭 주소로 갈 때는 루트 스택을 탭 묶음까지 비우고(`dismissAll`) 그 탭으로 옮긴다(`navigate`).
 * - 비교 단계(작곡가·장르·작품·1:1)는 탭이 아니라 루트 스택 화면 `/compare-step` 으로 쌓는다.
 * - 그 밖의 화면은 그대로 쌓는다.
 *
 * 웹은 브라우저 기록이 뒤로를 맡고 주소가 그대로 공유되므로 예전처럼 부른다(`/compare?…` 유지).
 */

/** 하단 탭 화면 주소 */
const TAB_PATHS: ReadonlySet<string> = new Set([
  '/home',
  '/search',
  '/compare',
  '/concerts',
  '/library',
]);

/** 이 값 중 하나라도 있으면 비교 탭 첫 화면이 아니라 그다음 단계다 */
const COMPARE_STEP_PARAMS = ['composerId', 'pieceId', 'genre', 'focus'] as const;

/** 앱에서 비교 단계를 여는 루트 스택 화면 */
export const COMPARE_STEP_PATH = '/compare-step';

export type WebMethod = 'push' | 'replace' | 'navigate';

function splitHref(href: string): { pathname: string; query: string } {
  const index = href.search(/[?#]/);
  if (index < 0) return { pathname: href, query: '' };
  return { pathname: href.slice(0, index), query: href.slice(index + 1).split('#')[0] };
}

function hasCompareStep(query: string): boolean {
  const params = new URLSearchParams(query);
  return COMPARE_STEP_PARAMS.some((key) => (params.get(key) ?? '') !== '');
}

/** 앱에서 실제로 여는 주소. 단계가 있는 `/compare?…` 는 `/compare-step?…` 이다. 웹은 그대로 */
export function appHref(href: string): string {
  if (Platform.OS === 'web') return href;
  const { pathname, query } = splitHref(href);
  if (pathname === '/compare' && hasCompareStep(query)) return `${COMPARE_STEP_PATH}?${query}`;
  return href;
}

/**
 * 앱으로 들어오는 링크(`classicmap-front://compare?pieceId=…`)도 비교 단계면 `/compare-step` 으로 연다.
 * 그대로 두면 비교 탭이 단계를 그리지 못하고 카탈로그만 보인다
 */
export function appLinkPath(path: string): string {
  const match = /^(.*(?:^|\/))compare\?(.*)$/.exec(path);
  if (!match || !hasCompareStep(match[2])) return path;
  return `${match[1]}${COMPARE_STEP_PATH.slice(1)}?${match[2]}`;
}

/**
 * 앱: 루트 스택을 탭 묶음까지 비우고 그 탭으로 옮긴다. 탭 묶음이 쌓이지 않는다.
 * 루트 화면 위면 `dismissTo` 가 루트 스택에서 탭 묶음까지 꺼내고 그 탭을 고른다. `dismissAll` 은
 * 가장 안쪽 스택이 받아서(가입 단계처럼 루트 아래 스택이 또 있으면) 루트가 비지 않았다.
 * 탭 화면 위면 꺼낼 스택이 없으니 탭만 옮긴다(탭 네비게이터는 dismissTo 를 받지 않는다)
 */
function goTab(href: string): void {
  if (router.canDismiss()) router.dismissTo(href as Href);
  else router.navigate(href as Href);
}

/**
 * 화면을 연다. 앱은 탭 주소면 그 탭으로 옮기고(쌓지 않음), 나머지는 루트 스택에 쌓는다.
 * 웹은 `web` 으로 고른 방법(기본 push)을 그대로 쓴다.
 */
export function go(href: string, options: { web?: WebMethod } = {}): void {
  if (Platform.OS === 'web') {
    const method = options.web ?? 'push';
    router[method](href as Href);
    return;
  }
  const target = appHref(href);
  if (TAB_PATHS.has(splitHref(target).pathname)) {
    goTab(target);
    return;
  }
  router.push(target as Href);
}
