import { ComparePlayerHost } from '@/components/player/compare-player-host';
import { MiniPlayerBar } from '@/components/player/mini-player-bar';
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
  if (bare) return <>{children}</>;
  // 비교 영상은 앱 전체에 하나만 두고 라우트 밖에 둔다. 화면을 오가도, 창 폭이 바뀌어도 같은 요소라 재생이 이어진다
  return (
    <>
      <React.Fragment key="content">
        {nav === 'tabs' ? children : <AppShell nav={nav}>{children}</AppShell>}
      </React.Fragment>
      {nav === 'tabs' ? <MiniPlayerBar key="mini" /> : null}
      <ComparePlayerHost key="host" />
    </>
  );
}
