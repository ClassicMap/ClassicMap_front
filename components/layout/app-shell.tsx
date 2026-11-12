import { GlobalPlayerBar } from '@/features/player/components/global-player-bar';
import { useDesktopPlayerBarVisible } from '@/features/player/components/player-bar-helpers';
import { QueuePanel } from '@/features/player/components/queue-panel';
import { CommandPalette } from '@/features/search/components/command-palette';
import { CommandPaletteProvider } from '@/features/search/components/command-palette-context';
import type { NavMode } from '@/lib/design/breakpoints';
import { t, useLocale } from '@/lib/i18n';
import { shell, useShell } from '@/lib/layout/shell-state';
import { useComparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';

import { AppSidebar } from './app-sidebar';
import { PageContainer } from './page-container';
import { RouteProgress } from './route-progress';
import { Shell, ShellAside, ShellBody, ShellFooter, ShellMain } from './shell';
import { useSidebarShortcut } from './sidebar';
import { TopBar } from './top-bar';

/**
 * 데스크톱 웹 셸 (설계 문서 6.1, docs/frontend-structure.md 6절).
 * 영역은 shell.tsx, 크기는 lib/layout/shell-layout.ts, 접힘·열림 상태는 lib/layout/shell-state.ts 한곳씩에서 정하고
 * 여기서는 그 영역에 무엇을 넣을지만 정한다.
 * 배경 위에 사이드바·본문 패널·대기열 패널이 떠 있고, 재생 바는 그 아래에 화면 폭 전체로 깔린다
 * (대기열을 열어도 재생 바가 좁아지지 않게). 본문 패널 안에서만 스크롤한다.
 */
export function AppShell({
  nav,
  children,
}: {
  nav: Exclude<NavMode, 'tabs'>;
  children: React.ReactNode;
}) {
  useLocale();
  const sidebarCollapsed = useShell((state) => state.sidebarCollapsed);
  // 사이드바를 접고 펼 수 있는 건 넓은 창(full)뿐이다. 좁으면 늘 아이콘만 남는다
  const canToggle = nav === 'full';
  useSidebarShortcut(canToggle);
  const playerBarVisible = useDesktopPlayerBarVisible();
  return (
    <CommandPaletteProvider>
      <Shell>
        <ShellBody>
          <AppSidebar
            collapsed={nav === 'rail' || (canToggle && sidebarCollapsed)}
            canToggle={canToggle}
          />
          <ShellMain>
            <RouteProgress placement="panel" />
            <TopBar sidebarTrigger={canToggle} />
            {/* 화면을 옮기면 이 자리만 바뀌고 상단바·플레이바는 그대로 있다 */}
            <PageContainer>{children}</PageContainer>
          </ShellMain>
          <QueueDock />
        </ShellBody>
        {/* 듣는 곡이 있으면 어느 화면에서나 맨 아래에 같은 플레이바가 있다 */}
        <ShellFooter visible={playerBarVisible}>
          <GlobalPlayerBar />
        </ShellFooter>
      </Shell>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}

/** 재생 대기열 패널. 재생 바의 대기열 단추가 여닫는다 */
function QueueDock() {
  useLocale();
  const open = useShell((state) => state.queueOpen);
  const hasCurrent = useComparePlayer((state) => state.current !== null);
  // 1:1 비교 중에는 그 화면이 재생을 맡으므로 대기열을 숨긴다(줄을 누르면 두 소리가 겹친다)
  const focus = useComparePlayer((state) => state.focus !== null);
  return (
    <ShellAside open={open && hasCurrent && !focus} label={t('재생 대기열')}>
      <QueuePanel onClose={() => shell.setQueueOpen(false)} />
    </ShellAside>
  );
}
