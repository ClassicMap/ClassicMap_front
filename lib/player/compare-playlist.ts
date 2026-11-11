import { comparePlayer, type Playlist } from '@/lib/player/compare-player-store';
import { sectorPlaylist } from '@/lib/player/playlist';
import type { ComparisonSector } from '@/lib/types/models';

/**
 * 비교 화면에서 연주를 고를 때의 재생 목록. 듣던 곡의 연주자만 바꾸면 지금 목록(예: 영화 페이지의 곡들)을 그대로 두고,
 * 새 곡을 틀면 그 작품의 구간들이 재생 목록이 된다
 */
export function comparePlaylistFor(
  pieceId: number,
  sectors: readonly Pick<ComparisonSector, 'id'>[],
  sectorId: number
): Playlist | undefined {
  if (comparePlayer.getState().current?.sectorId === sectorId) return undefined;
  return sectorPlaylist(pieceId, sectors, sectorId);
}
