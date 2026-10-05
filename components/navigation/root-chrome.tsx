import { isBarePath } from '@/components/navigation/bare-paths';
import { ComparePlayerHost } from '@/components/player/compare-player-host';
import { MiniPlayerBar } from '@/components/player/mini-player-bar';
import { usePathname } from 'expo-router';
import * as React from 'react';

/**
 * 네이티브는 셸이 없다. 비교 영상은 루트에 하나만 두고(화면을 오가도 같은 플레이어), 비교 화면 밖에서
 * 듣고 있으면 탭바 위 미니 플레이어의 작은 자리로 옮겨 보인다.
 * 로그인·취향 묻기 같은 단독 화면에서는 미니 플레이어를 띄우지 않는다(영상은 보일 자리가 없어 멈춘다).
 * 웹 구현은 root-chrome.web.tsx
 */
export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      {children}
      {isBarePath(pathname) ? null : <MiniPlayerBar />}
      <ComparePlayerHost />
    </>
  );
}
