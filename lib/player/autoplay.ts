import { type PieceGenre, genreStyle, isPieceGenre } from '@/lib/design/genre-palette';
import { t } from '@/lib/i18n';
import type {
  AutoplayPick,
  ComparePlayerTrack,
  PlaylistItem,
  QueueItemMeta,
} from '@/lib/player/compare-player-store';
import { queryClient } from '@/lib/query/client';
import {
  artistComparisonQueryOptions,
  comparisonPiecesQueryOptions,
  genrePiecesQueryOptions,
  genreSummariesQueryOptions,
} from '@/lib/query/hooks/use-comparison-performances';
import type { ComparisonPerformance, ComparisonPiece, TasteSound } from '@/types/models';

/** 취향 묻기의 「끌리는 소리」를 장르로. 이 장르 곡들이 자동 재생의 취향 후보가 된다 */
const SOUND_GENRES: Record<TasteSound, readonly PieceGenre[]> = {
  piano: ['piano'],
  orchestra: ['symphony', 'orchestral'],
  strings: ['concerto', 'chamber'],
  voice: ['vocal', 'stage'],
  ensemble: ['chamber'],
};

/** 고른 소리들에 맞는 장르(겹치지 않게, 많아야 셋) */
export function tasteGenres(sounds: readonly TasteSound[]): PieceGenre[] {
  return [...new Set(sounds.flatMap((sound) => SOUND_GENRES[sound] ?? []))].slice(0, 3);
}

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

/** 후보를 고른 까닭. 위에 있을수록 강하다. 'other' 는 비슷한 곡·취향 추천이 다 떨어졌을 때만 쓰는 다른 편성의 곡 */
type ReasonKind = 'artist' | 'taste' | 'composer' | 'genre' | 'other';
const WEIGHT: Record<ReasonKind, number> = {
  artist: 3,
  taste: 2,
  composer: 2,
  genre: 1,
  other: 0,
};

/** 자동 재생이 고른 쪽: 기준 곡과 비슷한 곡이거나 취향 추천 */
type PickSide = AutoplayPick['side'];

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

/** 자동 재생 목록을 이어 붙일 때 기준이 되는 곡. 장르를 알면 같이 준다(모르면 목록에서 찾는다) */
export type AutoplayBasis = Pick<
  ComparePlayerTrack,
  'pieceId' | 'composerId' | 'artistId' | 'artistName'
> & { genre?: PieceGenre | null };

/**
 * 자동 재생 목록을 만든다(한 번에 길게). 「비슷한 곡 하나 → 취향 추천 둘」 순서로 번갈아 고르고,
 * 같은 작곡가가 세 번 연달아 나오지 않게 한다.
 * - 비슷한 곡: 기준 곡의 연주자가 그 곡에도 있으면 3, 같은 작곡가 2, 같은 장르 1
 * - 취향 추천: 홈 추천과 같은 것(서버가 이 사람의 취향·들은 기록으로 고른 순서 그대로)
 * - 둘 다 떨어지면 다른 편성의 곡으로 잇는다(편성 하나씩, 모자란 만큼만 받는다)
 * 연주·클립은 여기서 부르지 않고(목록 첫 쪽만 본다) 그 곡 차례가 올 때 고른다
 */
export async function pickAutoplay(input: {
  basis: AutoplayBasis;
  exclude: ReadonlySet<number>;
  /** 이미 만들어 둔 목록(이 뒤에 이어 붙는다). 번갈아 고르는 차례와 같은 작곡가 연속 금지를 여기서 잇는다 */
  tail?: readonly PlaylistItem[];
  taste: readonly AutoplayCandidate[];
  /** 취향 묻기에서 고른 소리의 장르. 서버 추천 다음 취향 후보가 된다 */
  genres?: readonly PieceGenre[];
  count: number;
}): Promise<PlaylistItem[]> {
  const { basis, exclude, tail = [], taste, count, genres = [] } = input;
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
    basis.genre ??
    composerPieces.find((piece) => piece.pieceId === basis.pieceId)?.genre ??
    taste.find((candidate) => candidate.pieceId === basis.pieceId)?.genre ??
    null;
  const genre = isPieceGenre(basisGenre) ? basisGenre : null;
  const genrePieces = genre
    ? await firstPage(() => queryClient.fetchInfiniteQuery(genrePiecesQueryOptions(genre)))
    : [];

  // 비슷한 곡: 까닭이 여럿이면 점수를 더하고 가장 강한 까닭을 보인다
  const similar = new Map<number, Scored>();
  const add = (candidate: AutoplayCandidate, kind: ReasonKind, reason: string) => {
    if (exclude.has(candidate.pieceId) || candidate.pieceId === basis.pieceId) return;
    const existing = similar.get(candidate.pieceId);
    if (!existing) {
      similar.set(candidate.pieceId, { candidate, score: WEIGHT[kind], kind, reason });
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
  for (const piece of composerPieces) {
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
  const similarList = [...similar.values()]
    .map((entry) => ({ entry, rank: entry.score + Math.random() * 0.9 }))
    .sort((a, b) => b.rank - a.rank)
    .map(({ entry }) => entry);
  // 취향 후보: 서버가 이 사람에게 고른 순서 그대로 먼저, 그 뒤에 고른 소리의 장르 곡들(섞어서)
  const genreTaste = (
    await Promise.all(
      genres.map((key) =>
        firstPage(() => queryClient.fetchInfiniteQuery(genrePiecesQueryOptions(key)))
      )
    )
  ).flatMap((pieces, index) =>
    pieces.map((piece) =>
      candidateFromPiece(
        piece,
        null,
        t('취향 · {genre}', { genre: t(genreStyle(genres[index])?.label ?? '') })
      )
    )
  );
  const tasteList: Scored[] = [...taste, ...shuffle(genreTaste)]
    .filter((candidate) => !exclude.has(candidate.pieceId) && candidate.pieceId !== basis.pieceId)
    .map((candidate) => ({
      candidate,
      score: WEIGHT.taste,
      kind: 'taste',
      reason: candidate.meta.reason || t('취향 추천'),
    }));

  const used = new Set<number>();
  const picks: Scored[] = [];
  // 다른 편성의 곡: 기준 곡의 편성과 취향 편성은 위에서 이미 후보에 넣었으니 나머지 편성을 섞은 차례로 하나씩 받는다
  const otherList: Scored[] = [];
  let otherGenres: PieceGenre[] | null = null;
  const loadOtherGenre = async (): Promise<boolean> => {
    if (!otherGenres) {
      const loaded = new Set<PieceGenre>([...(genre ? [genre] : []), ...genres]);
      const summaries = await queryClient.fetchQuery(genreSummariesQueryOptions()).catch(() => []);
      otherGenres = shuffle(
        summaries.map((summary) => summary.genre).filter((key) => !loaded.has(key))
      );
    }
    const next = otherGenres.shift();
    if (!next) return false;
    const reason = t('다른 편성 · {genre}', { genre: t(genreStyle(next)?.label ?? '') });
    const pieces = await firstPage(() =>
      queryClient.fetchInfiniteQuery(genrePiecesQueryOptions(next))
    );
    for (const piece of shuffle(pieces)) {
      const candidate = candidateFromPiece(piece, null);
      if (exclude.has(candidate.pieceId) || candidate.pieceId === basis.pieceId) continue;
      otherList.push({ candidate, score: WEIGHT.other, kind: 'other', reason });
    }
    return true;
  };
  // 이미 있는 목록의 끝을 이어받는다: 한 곡씩 이어 붙여도 「비슷한 곡 하나 → 취향 추천 둘」과 작곡가 연속 금지가 이어진다
  const composers: (number | undefined)[] = tail
    .slice(-2)
    .map((item) => item.picked?.composerId ?? item.meta?.composerId);
  const sides: (PickSide | undefined)[] = tail.slice(-2).map((item) => item.picked?.side);
  /** 같은 작곡가가 세 번 연달아 나오지 않는 첫 곡. 없으면 아무 첫 곡 */
  const takeFrom = (list: readonly Scored[]): Scored | null => {
    const [a, b] = composers.slice(-2);
    const repeated = a !== undefined && a === b ? a : null;
    const fresh = list.filter((entry) => !used.has(entry.candidate.pieceId));
    return fresh.find((entry) => entry.candidate.composerId !== repeated) ?? fresh[0] ?? null;
  };
  while (picks.length < count) {
    // 처음이거나 취향 추천이 둘 이어졌으면 비슷한 곡 차례
    const [a, b] = sides.slice(-2);
    const want: PickSide = !sides.length || (a === 'taste' && b === 'taste') ? 'similar' : 'taste';
    const fromTaste = takeFrom(tasteList);
    const fromSimilar = takeFrom(similarList);
    let pick =
      (want === 'taste' ? (fromTaste ?? fromSimilar) : (fromSimilar ?? fromTaste)) ??
      takeFrom(otherList);
    // 비슷한 곡도 취향 추천도 없으면 다른 편성을 하나씩 받아 잇는다
    while (!pick && (await loadOtherGenre())) pick = takeFrom(otherList);
    if (!pick) break;
    used.add(pick.candidate.pieceId);
    picks.push(pick);
    composers.push(pick.candidate.composerId);
    sides.push(pick.kind === 'taste' ? 'taste' : 'similar');
  }
  return picks.map(({ candidate, reason, kind }) => ({
    pieceId: candidate.pieceId,
    sectorId: candidate.sectorId,
    meta: { ...candidate.meta, reason },
    picked: {
      composerId: candidate.composerId,
      genre: candidate.genre,
      side: kind === 'taste' ? 'taste' : 'similar',
    },
  }));
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
