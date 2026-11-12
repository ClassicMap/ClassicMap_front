import {
  comparePlayer,
  type ComparePlayerTrack,
  type PlaylistItem,
} from '@/lib/player/compare-player-store';
import { type ListPiece, listItems } from '@/lib/player/playlist';
import * as React from 'react';
import { Platform } from 'react-native';

/** 대기열에 넣을 것. 곡(`piece`)이면 연주는 듣던 연주자 또는 대표 연주로 고르고, `track` 이면 그 연주를 그대로 넣는다 */
export interface QueueTarget {
  piece?: ListPiece | PlaylistItem;
  track?: ComparePlayerTrack;
}

/** 터치 화면에서 여는 동작 시트에 보일 것 */
export interface QueueActionRequest extends QueueTarget {
  title: string;
  subtitle?: string;
  /** 있으면 시트 아래에 「관심 없음」을 둔다(추천 카드) */
  onDismiss?: () => void;
}

/**
 * 「다음에 재생」은 지금 곡 바로 다음, 「대기열에 추가」는 지금 보이는 목록의 맨 끝.
 * 틀 수 있는 연주가 없어 넣지 못했으면 false
 */
export async function addToQueue(
  { piece, track }: QueueTarget,
  where: 'next' | 'last'
): Promise<boolean> {
  if (track) {
    comparePlayer.enqueueTrack(track, where);
    return true;
  }
  if (!piece) return false;
  const [item] = listItems([piece] as readonly ListPiece[] | readonly PlaylistItem[]);
  return item ? comparePlayer.enqueue(item, where) : false;
}

let request: QueueActionRequest | null = null;
const listeners = new Set<() => void>();

function set(next: QueueActionRequest | null) {
  request = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 터치 화면의 대기열 동작 시트. 카드·목록 줄을 길게 누르거나 ⋯ 를 누르면 연다.
 * 시트는 루트에 하나만 있고(`QueueActionSheet`) 어디서든 이 손잡이로 연다
 */
export const queueActionSheet = {
  open: (next: QueueActionRequest) => set(next),
  close: () => set(null),
};

export function useQueueActionRequest(): QueueActionRequest | null {
  return React.useSyncExternalStore(
    subscribe,
    () => request,
    () => null
  );
}

let held: QueueActionRequest | null = null;

/**
 * 길게 눌러 시트를 여는 줄·카드에 펼쳐 넣는 props.
 * 안드로이드는 손가락을 댄 채 시트(새 창)가 뜨면 손을 뗄 때 바깥 막이 눌려 곧바로 닫힌다. 그래서 손을 뗀 뒤에 연다
 */
export function queueLongPressProps(request: () => QueueActionRequest): {
  onLongPress: () => void;
  onPressOut?: () => void;
} {
  if (Platform.OS !== 'android') return { onLongPress: () => queueActionSheet.open(request()) };
  return {
    onLongPress: () => {
      held = request();
    },
    onPressOut: () => {
      if (!held) return;
      const next = held;
      held = null;
      queueActionSheet.open(next);
    },
  };
}
