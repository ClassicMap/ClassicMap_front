/** 로그인·가입 흐름과 취향 묻기는 셸과 미니 플레이어 없이 단독 화면으로 둔다. */
const BARE_PATHS = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/onboarding'];

export function isBarePath(pathname: string): boolean {
  return BARE_PATHS.some((path) => pathname.startsWith(path));
}
