/**
 * 앱으로 들어오는 링크를 라우터가 받기 전에 고친다.
 * 소셜 로그인에서 돌아오는 링크(classicmap-front://sso-callback?…, components/social-connections.tsx)는
 * expo-web-browser 가 받아 로그인을 끝낸다. 빈 경로를 돌려주면 라우터가 화면을 옮기지 않는다.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes('sso-callback') ? '' : path;
}
