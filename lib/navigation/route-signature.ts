import { useGlobalSearchParams, usePathname } from 'expo-router';

type Params = Readonly<Record<string, string | string[] | undefined>>;

/**
 * 같은 경로 안에서도 화면이 바뀌는 주소 값. 비교는 한 경로에서 작곡가 → 작품 → 1:1 비교로 화면이 넘어간다.
 * 구간(sectorId)·필터처럼 화면 안에서만 바뀌는 값은 넣지 않는다 (전환·진행 막대를 띄우지 않는다)
 */
const PAGE_PARAMS: Readonly<Record<string, readonly string[]>> = {
  '/compare': ['composerId', 'pieceId', 'focus'],
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** 화면 단위 주소. 이 값이 바뀌면 화면이 바뀐 것으로 본다 */
export function routeSignature(pathname: string, params: Params): string {
  const keys = PAGE_PARAMS[pathname];
  if (!keys) return pathname;
  return `${pathname}?${keys.map((key) => `${key}=${first(params[key])}`).join('&')}`;
}

export function useRouteSignature(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  return routeSignature(pathname, params);
}
