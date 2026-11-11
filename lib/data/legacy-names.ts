import { ComparisonAPI } from '@/lib/api/comparisons';
import { primaryCredit } from '@/lib/data/comparison';
import type { Bilingual } from '@/lib/i18n';
import type { ComparisonPerformance } from '@/types/models';

/**
 * 구간 연주에서 알아낸 두 언어 이름.
 * 영어판 전에 기기에 저장한 기록(최근 본 작품, 재생 곡)은 한국어 이름만 있어서 언어를 바꿔도 그대로였다.
 * 그런 기록을 처음 읽을 때 한 번 받아 채운다.
 */
export interface SectorNames {
  pieceTitle?: Bilingual;
  composerName?: Bilingual;
  sectorName?: Bilingual;
  /** 연주 id → 대표 연주자 이름 */
  artistByPerformance: Map<number, Bilingual>;
}

const pending = new Map<number, Promise<SectorNames | null>>();

function toNames(performances: ComparisonPerformance[] | null): SectorNames | null {
  const first = performances?.[0];
  if (!performances || !first) return null;
  const artistByPerformance = new Map<number, Bilingual>();
  for (const performance of performances) {
    const name = primaryCredit(performance)?.names?.artistName;
    if (name) artistByPerformance.set(performance.id, name);
  }
  return {
    pieceTitle: first.names?.pieceTitle,
    composerName: first.names?.composerName,
    sectorName: first.names?.sectorName,
    artistByPerformance,
  };
}

/** 구간의 두 언어 이름. 같은 구간은 한 번만 받고, 못 받으면 다음에 다시 받는다 */
export function sectorNames(sectorId: number): Promise<SectorNames | null> {
  const known = pending.get(sectorId);
  if (known) return known;
  const request = ComparisonAPI.getSectorPerformances(sectorId)
    .then(toNames)
    .catch(() => {
      pending.delete(sectorId);
      return null;
    });
  pending.set(sectorId, request);
  return request;
}
