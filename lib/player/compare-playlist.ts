import { comparePlayer, type Playlist } from '@/lib/player/compare-player-store';
import { sectorPlaylist } from '@/lib/player/playlist';
import type { ComparisonPerformance, ComparisonSector } from '@/lib/types/models';

/**
 * 비교 화면에서 연주를 고를 때 대기열을 어떻게 할지.
 * - 같은 곡의 연주자만 바꾸면 그대로 둔다
 * - 하던 목록에 있는 곡이면 목록을 그대로 두고 그 자리로 옮긴다
 * - 목록 밖의 곡이면 하던 목록은 두고 이 곡을 끼운다(다음 곡이 꺼지지 않게)
 * - 하던 목록이 없으면 이 작품의 구간들이 목록이 된다
 */
export function compareQueueFor(
  pieceId: number,
  sectors: readonly Pick<ComparisonSector, 'id' | 'sectorName'>[],
  sectorId: number,
  performance?: Pick<ComparisonPerformance, 'pieceTitle' | 'composerName' | 'composerId' | 'videoId'>
): { playlist?: Playlist; insert?: boolean } {
  const { current, playlist } = comparePlayer.getState();
  if (current?.sectorId === sectorId && playlist) return {};
  if (playlist && current) {
    const at = playlist.items.findIndex(
      (item) => item.pieceId === pieceId && (item.sectorId === null || item.sectorId === sectorId)
    );
    if (at >= 0) return { playlist: { ...playlist, index: at } };
    return { insert: true };
  }
  const piece = performance
    ? {
        title: performance.pieceTitle,
        composer: performance.composerName,
        image: performance.videoId
          ? `https://i.ytimg.com/vi/${performance.videoId}/hqdefault.jpg`
          : null,
      }
    : undefined;
  return { playlist: sectorPlaylist(pieceId, sectors, sectorId, piece) };
}
