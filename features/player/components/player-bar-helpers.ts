import { type ComparePlayerTrack, useComparePlayer } from '@/lib/player/compare-player-store';
import type { Href } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

/** 이 트랙의 비교 화면. 돌아가면 같은 연주가 같은 자리에서 이어진다 */
export function compareHrefFor(track: ComparePlayerTrack): Href {
  return `/compare?composerId=${track.composerId}&pieceId=${track.pieceId}&sectorId=${track.sectorId}` as Href;
}

/**
 * 조건이 잠깐 켜졌다 꺼지는 것은 무시한다. 연주자를 바꾸는 한두 프레임 동안 영상이 자리를 옮기며
 * 미니 플레이어가 번쩍이지 않게 한다.
 */
export function useSettled(value: boolean, delayMs = 180): boolean {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    if (!value) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

/**
 * 재생 바(데스크톱 하단 바·모바일 미니 플레이어)를 보일 때인가.
 * 듣는 곡이 있고, 영상이 비교 화면 자리에 떠 있지 않고(그 화면의 재생 바가 맡는다), 1:1 비교 중이 아닐 때다
 */
export function usePlayerBarVisible(): boolean {
  const wanted = useComparePlayer(
    (state) => state.current !== null && state.surface !== 'slot' && state.focus === null
  );
  return useSettled(wanted);
}

/**
 * 데스크톱 하단 재생 바를 보일 때인가. 듣는 곡이 있으면 어느 화면에서나 같은 바가 뜬다(비교 화면도 이 바를 쓴다).
 * 1:1 비교 중에도 바는 같은 자리에 남고, 그 화면이 제 조작부를 바 안에 그린다(`PlayerBarPortal`)
 */
export function useDesktopPlayerBarVisible(): boolean {
  return useComparePlayer((state) => state.current !== null || state.focus !== null);
}

/** 탭바 높이. components/layout/tabs-layout.tsx 의 탭바 스타일과 같게 둔다 */
export function tabBarHeight(insetBottom: number): number {
  const bottomPadding = Platform.OS === 'android' ? insetBottom + 8 : 20;
  return 58 + bottomPadding;
}
