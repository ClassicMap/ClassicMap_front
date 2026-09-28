import { AppShell } from '@/components/shell/app-shell';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { usePathname } from 'expo-router';
import * as React from 'react';

/** 로그인·가입 흐름은 셸 없이 단독 화면으로 둔다. */
const BARE_PATHS = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

/**
 * 데스크톱 웹 셸을 루트에서 씌운다 (설계 문서 6.0).
 * 탭 화면뿐 아니라 아티스트·작곡가·공연 상세에서도 사이드바가 남는다.
 */
export function RootChrome({ children }: { children: React.ReactNode }) {
  const { nav } = useBreakpoint();
  const pathname = usePathname();
  const bare = BARE_PATHS.some((path) => pathname.startsWith(path));
  if (nav === 'tabs' || bare) return <>{children}</>;
  return <AppShell nav={nav}>{children}</AppShell>;
}
