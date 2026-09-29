import { MiniPlayerBar } from '@/components/player/mini-player-bar';
import * as React from 'react';

/**
 * 네이티브는 셸이 없다. 비교 화면 밖에서 듣고 있으면 탭바 위에 미니 플레이어만 띄운다.
 * 웹 구현은 root-chrome.web.tsx
 */
export function RootChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MiniPlayerBar />
    </>
  );
}
