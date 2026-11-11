import { useLocale } from '@/lib/i18n';
import type { NavMode } from '@/lib/design/breakpoints';
import * as React from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/navigation/page-container';
import { RouteProgress } from '@/components/navigation/route-progress';
import { GlobalPlayerBar } from '@/components/player/global-player-bar';
import { QueuePanel } from '@/components/player/queue-panel';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';

import { CommandPalette } from './command-palette';
import { CommandPaletteProvider } from './command-palette-context';
import { SideNav } from './side-nav';
import { TopBar } from './top-bar';

/**
 * 데스크톱 웹 셸 (설계 문서 6.1). 배경 위에 사이드바와 본문 패널이 8px 간격으로 떠 있다.
 * 본문 패널 안에서만 스크롤하고 사이드바·상단바는 고정한다.
 */
export function AppShell({ nav, children }: { nav: Exclude<NavMode, 'tabs'>; children: React.ReactNode }) {
  useLocale();
  return (
    <CommandPaletteProvider>
      <View className="h-full flex-1 flex-row gap-2 bg-background p-2" style={{ height: '100vh' } as object}>
        <SideNav collapsed={nav === 'rail'} />
        <View className="min-w-0 flex-1 overflow-hidden rounded-[9px] bg-surface-1">
          <RouteProgress placement="panel" />
          <TopBar />
          {/* 화면을 옮기면 이 자리만 바뀌고 상단바·플레이바는 그대로 있다 */}
          <PageContainer>{children}</PageContainer>
          {/* 비교 화면 밖에서 듣고 있으면 본문 아래에 플레이바가 남는다 */}
          <GlobalPlayerBar />
        </View>
        <QueueDock />
      </View>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}

/** 재생 대기열 패널. 열면 본문 오른쪽에 붙고 본문 폭이 그만큼 줄어든다 */
function QueueDock() {
  const open = useComparePlayer((state) => state.queueOpen);
  const hasCurrent = useComparePlayer((state) => state.current !== null);
  if (!open || !hasCurrent) return null;
  return (
    <View className="w-[320px] shrink-0 overflow-hidden rounded-[9px] bg-surface-1">
      <QueuePanel onClose={() => comparePlayer.setQueueOpen(false)} />
    </View>
  );
}
