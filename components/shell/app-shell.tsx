import { useLocale } from '@/lib/i18n';
import type { NavMode } from '@/lib/design/breakpoints';
import * as React from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/navigation/page-container';
import { RouteProgress } from '@/components/navigation/route-progress';
import { GlobalPlayerBar } from '@/components/player/global-player-bar';
import { QueuePanel } from '@/components/player/queue-panel';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';

import { CommandPalette } from './command-palette';
import { CommandPaletteProvider } from './command-palette-context';
import { SideNav } from './side-nav';
import { TopBar } from './top-bar';

/**
 * 데스크톱 웹 셸 (설계 문서 6.1). 배경 위에 사이드바·본문 패널·대기열 패널이 8px 간격으로 떠 있고,
 * 재생 바는 그 아래에 화면 폭 전체로 깔린다(대기열을 열어도 재생 바가 좁아지지 않게).
 * 본문 패널 안에서만 스크롤하고 사이드바·상단바는 고정한다.
 */
export function AppShell({ nav, children }: { nav: Exclude<NavMode, 'tabs'>; children: React.ReactNode }) {
  useLocale();
  return (
    <CommandPaletteProvider>
      <View className="h-full flex-1 gap-2 bg-background p-2" style={{ height: '100vh' } as object}>
        <View className="min-h-0 flex-1 flex-row gap-2">
          <SideNav collapsed={nav === 'rail'} />
          <View className="min-w-0 flex-1 overflow-hidden rounded-[9px] bg-surface-1">
            <RouteProgress placement="panel" />
            <TopBar />
            {/* 화면을 옮기면 이 자리만 바뀌고 상단바·플레이바는 그대로 있다 */}
            <PageContainer>{children}</PageContainer>
          </View>
          <QueueDock />
        </View>
        {/* 비교 화면 밖에서 듣고 있으면 맨 아래에 플레이바가 남는다 */}
        <GlobalPlayerBar />
      </View>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}

/** 닫힌 뒤에도 잠깐(나가는 애니메이션 동안) 그려 둔다 */
function useLingering(value: boolean, ms: number): boolean {
  const [lingering, setLingering] = React.useState(value);
  React.useEffect(() => {
    if (value) {
      setLingering(true);
      return;
    }
    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return value || lingering;
}

const DOCK_WIDTH = 320;
const DOCK_GAP = 8;

/**
 * 재생 대기열 패널. 열면 폭이 늘며 본문을 밀어내고, 닫으면 줄며 사라진다.
 * 행의 간격(gap)을 음수 여백으로 지워 닫혀 있을 때 본문 폭이 그대로다
 */
function QueueDock() {
  const open = useComparePlayer((state) => state.queueOpen);
  const hasCurrent = useComparePlayer((state) => state.current !== null);
  // 1:1 비교 중에는 그 화면이 재생을 맡으므로 대기열을 숨긴다(줄을 누르면 두 소리가 겹친다)
  const focus = useComparePlayer((state) => state.focus !== null);
  const shown = open && hasCurrent && !focus;
  const mounted = useLingering(shown, 320);
  return (
    <View
      aria-hidden={!shown}
      className="cm-dock shrink-0 overflow-hidden"
      style={{ width: shown ? DOCK_WIDTH + DOCK_GAP : 0, marginLeft: -DOCK_GAP }}>
      {mounted ? (
        <View
          className={cn('cm-dock-inner h-full overflow-hidden rounded-[9px] bg-surface-1', !shown && 'cm-dock-closing')}
          style={{ width: DOCK_WIDTH, marginLeft: DOCK_GAP, pointerEvents: shown ? 'auto' : 'none' }}>
          <QueuePanel onClose={() => comparePlayer.setQueueOpen(false)} />
        </View>
      ) : null}
    </View>
  );
}
