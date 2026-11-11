import { comparePlayer, type PlaylistItem } from '@/lib/player/compare-player-store';
import {
  type ListPiece,
  listItems,
  pieceListPlaylist,
  resolvePlaylistItem,
} from '@/lib/player/playlist';

/**
 * 작품을 그 자리에서 바로 재생한다(스포티파이 카드·머리 재생 버튼). 비교 화면이 처음 여는 구간의 대표 연주부터
 * 처음부터 튼다. `list`를 주면 그 목록이 대기열의 「이어서 재생」이 되어 다음 곡이 그 순서를 따른다.
 * `name`은 대기열 패널에 보일 목록 이름이다. 영상은 하단 플레이바(미니 플레이어)에 뜬다. 재생할 연주가 없으면 false.
 */
export async function playPiece(
  target: { pieceId: number; sectorId?: number | null },
  list?: readonly ListPiece[],
  name?: string
): Promise<boolean> {
  const resolved = await resolvePlaylistItem({
    pieceId: target.pieceId,
    sectorId: target.sectorId ?? null,
  });
  if (!resolved) return false;
  comparePlayer.select(resolved.track, {
    play: true,
    queue: resolved.queue,
    startAt: 0,
    playlist: pieceListPlaylist(target.pieceId, list, name),
  });
  return true;
}

/** 틀 연주가 없는 곡을 건너뛰며 찾을 때 이만큼까지만 본다 */
const MAX_TRIES = 5;

/**
 * 목록 화면 머리의 「처음부터 듣기 · 셔플로 듣기」. 셔플이면 셔플을 켜고 아무 곡부터 섞어 튼다.
 * 처음부터면 셔플을 끄고 첫 곡부터 튼다. 튼 곡이 없으면 false
 */
export async function playList(
  list: readonly ListPiece[] | readonly PlaylistItem[],
  options: { shuffle: boolean; name?: string }
): Promise<boolean> {
  const items: PlaylistItem[] = listItems(list);
  if (items.length === 0) return false;
  comparePlayer.setShuffle(options.shuffle);
  const order = options.shuffle ? shuffle(items) : items;
  for (let index = 0; index < order.length && index < MAX_TRIES; index += 1) {
    const resolved = await resolvePlaylistItem(order[index]).catch(() => null);
    if (!resolved) continue;
    comparePlayer.select(resolved.track, {
      play: true,
      queue: resolved.queue,
      startAt: 0,
      playlist: {
        kind: 'list',
        items: order,
        index,
        name: options.name,
        ...(options.shuffle ? { original: items } : null),
      },
    });
    return true;
  }
  return false;
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
