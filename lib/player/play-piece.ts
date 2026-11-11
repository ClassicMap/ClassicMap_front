import { comparePlayer } from '@/lib/player/compare-player-store';
import { pieceListPlaylist, resolvePlaylistItem } from '@/lib/player/playlist';

/**
 * 작품을 그 자리에서 바로 재생한다(스포티파이 카드·머리 재생 버튼). 비교 화면이 처음 여는 구간의 대표 연주부터
 * 처음부터 튼다. `list`를 주면 그 목록이 재생 목록이 되어 재생 바의 이전·다음 곡이 그 순서를 따르고,
 * 곡이 끝나면 다음 곡으로 넘어간다. 영상은 하단 플레이바(미니 플레이어)에 뜬다. 재생할 연주가 없으면 false.
 */
export async function playPiece(
  target: { pieceId: number; sectorId?: number | null },
  list?: readonly { pieceId: number }[]
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
    playlist: pieceListPlaylist(target.pieceId, list),
  });
  return true;
}
