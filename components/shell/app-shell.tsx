import type { NavMode } from '@/lib/design/breakpoints';
import * as React from 'react';
import { View } from 'react-native';

import { GlobalPlayerBar } from '@/components/player/global-player-bar';

import { CommandPalette } from './command-palette';
import { CommandPaletteProvider } from './command-palette-context';
import { SideNav } from './side-nav';
import { TopBar } from './top-bar';

/**
 * 데스크톱 웹 셸 (설계 문서 6.1). 배경 위에 사이드바와 본문 패널이 8px 간격으로 떠 있다.
 * 본문 패널 안에서만 스크롤하고 사이드바·상단바는 고정한다.
 */
export function AppShell({ nav, children }: { nav: Exclude<NavMode, 'tabs'>; children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <View className="h-full flex-1 flex-row gap-2 bg-background p-2" style={{ height: '100vh' } as object}>
        <SideNav collapsed={nav === 'rail'} />
        <View className="min-w-0 flex-1 overflow-hidden rounded-[9px] bg-surface-1">
          <TopBar />
          <View className="min-h-0 flex-1">{children}</View>
          {/* 비교 화면 밖에서 듣고 있으면 본문 아래에 플레이바가 남는다 */}
          <GlobalPlayerBar />
        </View>
      </View>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
