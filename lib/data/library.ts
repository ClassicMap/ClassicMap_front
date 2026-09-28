import type { FavoriteGroups } from '@/lib/api/client';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';

export type LibraryKind = 'composer' | 'artist' | 'piece' | 'concert';

export interface LibraryEntry {
  key: string;
  kind: LibraryKind;
  title: string;
  subtitle: string;
  image?: string | null;
  /** 사람은 원, 콘텐츠는 사각 */
  shape: 'circle' | 'square';
  href: string;
  createdAt: string;
}

const KIND_LABEL: Record<LibraryKind, string> = {
  composer: '작곡가',
  artist: '연주자',
  piece: '작품',
  concert: '공연',
};

export function libraryKindLabel(kind: LibraryKind): string {
  return KIND_LABEL[kind];
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return month && day ? `${Number(month)}.${Number(day)}` : date;
}

/** 즐겨찾기 네 묶음을 하나의 레퍼토리 목록으로. 최근에 담은 것이 위로 온다. */
export function buildLibraryEntries(favorites: FavoriteGroups): LibraryEntry[] {
  const entries: LibraryEntry[] = [
    ...favorites.composers.map((item) => ({
      key: `composer-${item.composerId}`,
      kind: 'composer' as const,
      title: item.name,
      subtitle: '작곡가',
      image: item.avatarUrl,
      shape: 'circle' as const,
      href: `/composer/${item.composerId}`,
      createdAt: item.createdAt,
    })),
    ...favorites.artists.map((item) => ({
      key: `artist-${item.artistId}`,
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
      kind: 'piece' as const,
      title: item.title,
      subtitle: item.composerName,
      image: null,
      shape: 'square' as const,
      href: `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}`,
      createdAt: item.createdAt,
    })),
    ...favorites.concerts.map((item) => ({
      key: `concert-${item.concertId}`,
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
