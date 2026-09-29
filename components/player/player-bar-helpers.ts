import type { ComparePlayerTrack } from '@/lib/player/compare-player-store';
import type { Href } from 'expo-router';
import * as React from 'react';

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
