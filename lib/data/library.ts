import type { FavoriteGroups } from '@/lib/api/client';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';

export type LibraryKind = 'composer' | 'artist' | 'piece' | 'album' | 'concert';

export interface LibraryEntry {
  key: string;
  /** 즐겨찾기 대상 id (kind별 테이블의 id) */
  id: number;
  kind: LibraryKind;
  title: string;
  subtitle: string;
  image?: string | null;
  /** 작품이면 작곡가. 목록에 초상이 없을 때 작곡가 초상을 찾는 데 쓴다 */
  composerId?: number;
  /** 사람은 원, 콘텐츠는 사각 */
  shape: 'circle' | 'square';
  href: string;
  createdAt: string;
}

const KIND_LABEL: Record<LibraryKind, string> = {
  composer: '작곡가',
  artist: '연주자',
  piece: '작품',
  album: '앨범',
  concert: '공연',
};

export function libraryKindLabel(kind: LibraryKind): string {
  return KIND_LABEL[kind];
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return month && day ? `${Number(month)}.${Number(day)}` : date;
}

export function getFavoriteCount(favorites: FavoriteGroups): number {
  return (
    favorites.composers.length +
    favorites.artists.length +
    favorites.pieces.length +
    favorites.concerts.length +
    (favorites.recordings?.length ?? 0)
  );
}

/** 즐겨찾기 묶음(작곡가·연주자·작품·앨범·공연)을 하나의 레퍼토리 목록으로. 최근에 담은 것이 위로 온다. */
export function buildLibraryEntries(favorites: FavoriteGroups): LibraryEntry[] {
  const entries: LibraryEntry[] = [
    ...favorites.composers.map((item) => ({
      key: `composer-${item.composerId}`,
      id: item.composerId,
      kind: 'composer' as const,
      title: item.name,
      // 종류는 묶음 제목이 알려 주니 부제에는 시대를 적는다
      subtitle: item.period || '작곡가',
      image: item.avatarUrl,
      shape: 'circle' as const,
      href: `/composer/${item.composerId}`,
      createdAt: item.createdAt,
    })),
    ...favorites.artists.map((item) => ({
      key: `artist-${item.artistId}`,
      id: item.artistId,
      kind: 'artist' as const,
      title: item.name,
      subtitle: getArtistCategoryLabel(item.category),
      image: item.imageUrl,
      shape: 'circle' as const,
      href: `/artist/${item.artistId}`,
      createdAt: item.createdAt,
    })),
    ...favorites.pieces.map((item) => ({
      key: `piece-${item.pieceId}`,
      id: item.pieceId,
      kind: 'piece' as const,
      title: item.title,
      subtitle: item.composerName,
      image: item.composerAvatarUrl ?? null,
      composerId: item.composerId,
      shape: 'square' as const,
      href: `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}`,
      createdAt: item.createdAt,
    })),
    ...(favorites.recordings ?? []).map((item) => ({
      key: `album-${item.recordingId}`,
      id: item.recordingId,
      kind: 'album' as const,
      title: item.title,
      subtitle: item.artistName,
      image: item.coverUrl ?? null,
      shape: 'square' as const,
      href: `/albums?album=${item.recordingId}`,
      createdAt: item.createdAt,
    })),
    ...favorites.concerts.map((item) => ({
      key: `concert-${item.concertId}`,
      id: item.concertId,
      kind: 'concert' as const,
      title: item.title,
      subtitle: [shortDate(item.startDate), item.facilityName].filter(Boolean).join(' '),
      image: item.posterUrl,
      shape: 'square' as const,
      href: `/concert/${item.concertId}`,
      createdAt: item.createdAt,
    })),
  ];
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 레퍼토리 묶음 순서: 사람(작곡가·연주자) 먼저, 그다음 작품·앨범·공연 */
export const LIBRARY_KIND_ORDER: readonly LibraryKind[] = ['composer', 'artist', 'piece', 'album', 'concert'];

export interface LibrarySection {
  kind: LibraryKind;
  label: string;
  /** 보여 줄 행 (limit 이 있으면 잘린 것) */
  entries: LibraryEntry[];
  /** 이 묶음 전체 개수 */
  total: number;
}

/**
 * 담은 순서 목록을 종류별 묶음으로 나눈다. 묶음 안에서는 받은 순서(최근에 담은 것 먼저)를 지킨다.
 * perSection 을 주면 묶음마다 그만큼만 남긴다. 빈 묶음은 뺀다.
 */
export function groupLibraryEntries(entries: readonly LibraryEntry[], perSection?: number): LibrarySection[] {
  return LIBRARY_KIND_ORDER.map((kind) => {
    const all = entries.filter((entry) => entry.kind === kind);
    return {
      kind,
      label: KIND_LABEL[kind],
      entries: perSection === undefined ? all : all.slice(0, perSection),
      total: all.length,
    };
  }).filter((section) => section.total > 0);
}

export function isLibraryKind(value: string | undefined): value is LibraryKind {
  return value !== undefined && (LIBRARY_KIND_ORDER as readonly string[]).includes(value);
}

/** 종류별로 레퍼토리에 담긴 id. 목록에서 '담긴 것' 표시와 위로 올리기에 쓴다 */
export interface RepertoireIds {
  composers: ReadonlySet<number>;
  artists: ReadonlySet<number>;
  pieces: ReadonlySet<number>;
  concerts: ReadonlySet<number>;
  recordings: ReadonlySet<number>;
}

export const EMPTY_REPERTOIRE_IDS: RepertoireIds = {
  composers: new Set(),
  artists: new Set(),
  pieces: new Set(),
  concerts: new Set(),
  recordings: new Set(),
};

export function toRepertoireIds(favorites: FavoriteGroups | undefined): RepertoireIds {
  if (!favorites) return EMPTY_REPERTOIRE_IDS;
  return {
    composers: new Set(favorites.composers.map((item) => item.composerId)),
    artists: new Set(favorites.artists.map((item) => item.artistId)),
    pieces: new Set(favorites.pieces.map((item) => item.pieceId)),
    concerts: new Set(favorites.concerts.map((item) => item.concertId)),
    recordings: new Set((favorites.recordings ?? []).map((item) => item.recordingId)),
  };
}

/** 레퍼토리에 담긴 것을 앞으로. 나머지 순서는 그대로 둔다 (안정 정렬) */
export function repertoireFirst<T>(items: readonly T[], isInRepertoire: (item: T) => boolean): T[] {
  const picked: T[] = [];
  const rest: T[] = [];
  for (const item of items) (isInRepertoire(item) ? picked : rest).push(item);
  return picked.length === 0 ? [...items] : [...picked, ...rest];
}
