import { useLocale } from '@/lib/i18n';
import { isBarePath } from '@/components/layout/bare-paths';
import { RouteProgress } from '@/components/layout/route-progress';
import { AutoplayTasteFeed } from '@/components/player/autoplay-taste-feed';
import { ComparePlayerHost } from '@/components/player/compare-player-host';
import { MiniPlayerBar } from '@/components/player/mini-player-bar';
import { AppShell } from '@/components/layout/app-shell';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { usePathname } from 'expo-router';
import * as React from 'react';

/**
 * 데스크톱 웹 셸을 루트에서 씌운다 (설계 문서 6.0).
 * 탭 화면뿐 아니라 아티스트·작곡가·공연 상세에서도 사이드바가 남는다.
 */
export function RootChrome({ children }: { children: React.ReactNode }) {
  useLocale();
  const { nav } = useBreakpoint();
  const pathname = usePathname();
  // 비교 영상은 앱 전체에 하나만 두고 라우트 밖에 둔다. 화면을 오가도, 창 폭이 바뀌어도 같은 요소라 재생이 이어진다.
  // 로그인·가입 같은 단독 화면도 영상(host)은 같은 열쇠로 남겨 듣던 곡이 끊기지 않게 한다(재생 바만 없다)
  if (isBarePath(pathname)) {
    return (
      <>
        <React.Fragment key="content">{children}</React.Fragment>
        <ComparePlayerHost key="host" />
      </>
    );
  }
  return (
    <>
      <React.Fragment key="content">
        {nav === 'tabs' ? children : <AppShell nav={nav}>{children}</AppShell>}
      </React.Fragment>
      {nav === 'tabs' ? <MiniPlayerBar key="mini" /> : null}
      {nav === 'tabs' ? <RouteProgress key="progress" placement="viewport" /> : null}
      <ComparePlayerHost key="host" />
      <AutoplayTasteFeed key="taste" />
    </>
  );
}
