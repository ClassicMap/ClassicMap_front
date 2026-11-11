import { type PieceGenre, genreStyle, isPieceGenre } from '@/lib/design/genre-palette';
import { t } from '@/lib/i18n';
import type {
  ComparePlayerTrack,
  PlaylistItem,
  QueueItemMeta,
} from '@/lib/player/compare-player-store';
import { queryClient } from '@/lib/query/client';
import {
  artistComparisonQueryOptions,
  comparisonPiecesQueryOptions,
  genrePiecesQueryOptions,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, ComparisonPiece } from '@/lib/types/models';

/**
 * 자동 재생 후보 한 곡. 취향 추천(홈 추천)이나 같은 연주자·작곡가·장르 목록에서 온다.
 * 하이라이트(비교 구간)를 취향에 맞춰 끝없이 이어 주는 게 자동 재생의 일이다
 */
export interface AutoplayCandidate {
  pieceId: number;
  sectorId: number | null;
  composerId: number;
  genre: PieceGenre | null;
  meta: QueueItemMeta;
}

/** 후보를 고른 까닭. 위에 있을수록 강하다 */
type ReasonKind = 'artist' | 'taste' | 'composer' | 'genre';
const WEIGHT: Record<ReasonKind, number> = { artist: 3, taste: 2, composer: 2, genre: 1 };

interface Scored {
  candidate: AutoplayCandidate;
  score: number;
  kind: ReasonKind;
  reason: string;
}

function pieceImage(
  piece: Pick<ComparisonPiece, 'coverVideoId' | 'composerAvatarUrl'>
): string | null {
  return piece.coverVideoId
    ? `https://i.ytimg.com/vi/${piece.coverVideoId}/hqdefault.jpg`
    : piece.composerAvatarUrl;
}

/** 비교 작품 카드(홈·장르·작곡가 목록)를 대기열 줄 정보로 */
export function pieceMeta(piece: ComparisonPiece, reason?: string): QueueItemMeta {
  return {
    title: piece.pieceTitle,
    composer: piece.composerName,
    image: pieceImage(piece),
    reason,
  };
}

export function candidateFromPiece(
  piece: ComparisonPiece,
  sectorId: number | null,
  reason?: string
): AutoplayCandidate {
  return {
    pieceId: piece.pieceId,
    sectorId,
    composerId: piece.composerId,
    genre: isPieceGenre(piece.genre) ? piece.genre : null,
    meta: pieceMeta(piece, reason),
  };
}

function candidateFromPerformance(performance: ComparisonPerformance): AutoplayCandidate {
  return {
    pieceId: performance.pieceId,
    sectorId: performance.sectorId,
    composerId: performance.composerId,
    genre: null,
    meta: {
      title: performance.pieceTitle,
      composer: performance.composerName,
      image: performance.videoId
        ? `https://i.ytimg.com/vi/${performance.videoId}/hqdefault.jpg`
        : null,
    },
  };
}

/** 이름이 길면 성(마지막 낱말)만. 한 글자로 줄면(요요 마 → 마) 이름 전체 */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  return parts.length > 1 && last.length >= 2 ? last : name.trim();
}

async function firstPage<T>(load: () => Promise<{ pages: readonly T[][] }>): Promise<readonly T[]> {
  try {
    const data = await load();
    return data.pages[0] ?? [];
  } catch {
    return [];
  }
}

/**
 * 지금 곡 다음에 이어질 곡을 고른다. 점수: 지금 연주자가 그 곡에도 있으면 3, 취향 추천 2, 같은 작곡가 2, 같은 장르 1.
 * 같은 까닭이 세 번 이어지지 않게 섞는다. 연주·클립은 여기서 부르지 않고(목록 첫 쪽만 본다) 튼 차례에 고른다
 */
export async function pickAutoplay(input: {
  basis: ComparePlayerTrack;
  exclude: ReadonlySet<number>;
  taste: readonly AutoplayCandidate[];
  count: number;
}): Promise<PlaylistItem[]> {
  const { basis, exclude, taste, count } = input;
  const [composerPieces, artistPerformances] = await Promise.all([
    firstPage(() => queryClient.fetchInfiniteQuery(comparisonPiecesQueryOptions(basis.composerId))),
    basis.artistId
      ? firstPage(async () => {
          const data = await queryClient.fetchInfiniteQuery({
            ...artistComparisonQueryOptions(basis.artistId ?? 0),
            staleTime: 5 * 60_000,
          });
          return { pages: data.pages.map((page) => page.items) };
        })
      : Promise.resolve([] as readonly ComparisonPerformance[]),
  ]);
  const basisGenre =
    composerPieces.find((piece) => piece.pieceId === basis.pieceId)?.genre ??
    taste.find((candidate) => candidate.pieceId === basis.pieceId)?.genre ??
    null;
  const genre = isPieceGenre(basisGenre) ? basisGenre : null;
  const genrePieces = genre
    ? await firstPage(() => queryClient.fetchInfiniteQuery(genrePiecesQueryOptions(genre)))
    : [];

  const pool = new Map<number, Scored>();
  const add = (candidate: AutoplayCandidate, kind: ReasonKind, reason: string) => {
    if (exclude.has(candidate.pieceId)) return;
    const existing = pool.get(candidate.pieceId);
    if (!existing) {
      pool.set(candidate.pieceId, { candidate, score: WEIGHT[kind], kind, reason });
      return;
    }
    existing.score += WEIGHT[kind];
    // 같은 연주자로 이어지는 곡이면 그 연주자의 구간을 튼다
    if (kind === 'artist')
      existing.candidate = { ...existing.candidate, sectorId: candidate.sectorId };
    if (WEIGHT[kind] > WEIGHT[existing.kind]) {
      existing.kind = kind;
      existing.reason = reason;
    }
  };

  for (const performance of artistPerformances) {
    if (performance.clipStatus !== 'ready') continue;
    add(
      candidateFromPerformance(performance),
      'artist',
      t('같은 연주자 · {name}', { name: shortName(basis.artistName) })
    );
  }
  for (const candidate of taste) add(candidate, 'taste', candidate.meta.reason || t('취향 추천'));
  for (const piece of composerPieces) {
    if (piece.pieceId === basis.pieceId) continue;
    add(
      candidateFromPiece(piece, null),
      'composer',
      t('같은 작곡가 · {name}', { name: piece.composerName })
    );
  }
  const genreLabel = genre ? t(genreStyle(genre)?.label ?? '') : '';
  for (const piece of genrePieces)
    add(
      candidateFromPiece(piece, null),
      'genre',
      t('비슷한 편성 · {genre}', { genre: genreLabel })
    );

  // 점수가 같으면 조금씩 흔들어 매번 같은 곡만 나오지 않게 한다
  const ranked = [...pool.values()].map((entry) => ({
    entry,
    rank: entry.score + Math.random() * 0.9,
  }));
  const picks: Scored[] = [];
  while (picks.length < count && ranked.length) {
    const lastTwo = picks.slice(-2).map((pick) => pick.kind);
    const repeated = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : null;
    let bestIndex = 0;
    let bestRank = -Infinity;
    ranked.forEach(({ entry, rank }, index) => {
      const adjusted = repeated && entry.kind === repeated ? rank - 2 : rank;
      if (adjusted > bestRank) {
        bestRank = adjusted;
        bestIndex = index;
      }
    });
    picks.push(ranked.splice(bestIndex, 1)[0].entry);
  }
  return picks.map(({ candidate, reason }) => ({
    pieceId: candidate.pieceId,
    sectorId: candidate.sectorId,
    meta: { ...candidate.meta, reason },
  }));
}
