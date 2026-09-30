import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  ArtistAPI,
  type FavoriteGroups,
  type FavoriteRecordingItem,
  isApiUnavailable,
  MyPageAPI,
  RecordingAPI,
  type RecordingListItem,
  type RecordingSort,
} from '@/lib/api/client';
import { MY_PAGE_QUERY_KEYS, useMyFavorites } from '@/lib/query/hooks/useMyPage';

export const ALBUM_PAGE_SIZE = 24;
const NEW_ALBUM_DAYS = 90;
const NEW_ALBUM_LIMIT = 30;
const LABEL_LIMIT = 40;

export const RECORDING_QUERY_KEYS = {
  browse: (filters: AlbumBrowseFilters) => ['recordings', 'browse', filters] as const,
  labels: ['recordings', 'labels'] as const,
  // '내 정보' 캐시(['me'])와 같이 로그아웃 때 지워지게 me 아래에 둔다
  newForMe: ['me', 'recordings', 'new', NEW_ALBUM_DAYS] as const,
  favorites: [...MY_PAGE_QUERY_KEYS.favorites, 'recordings'] as const,
  detail: (id: number) => ['recordings', 'detail', id] as const,
};

/** 레퍼토리 연주자만 볼 때 한 번에 묻는 연주자 수 */
const REPERTOIRE_ARTIST_LIMIT = 12;

export interface AlbumBrowseFilters {
  label?: string;
  year?: number;
  q?: string;
  sort: RecordingSort;
}

/** 배포 전 백엔드가 모르는 경로면 다시 시도해도 같으니 재시도하지 않는다 */
function retryUnlessUnavailable(failureCount: number, error: unknown): boolean {
  return !isApiUnavailable(error) && failureCount < 1;
}

/** 앨범 찾기: 24개씩 이어 붙인다 */
export function useAlbumBrowse(filters: AlbumBrowseFilters) {
  return useInfiniteQuery({
    queryKey: RECORDING_QUERY_KEYS.browse(filters),
    queryFn: ({ pageParam }) =>
      RecordingAPI.browse({
        label: filters.label,
        year: filters.year,
        q: filters.q,
        sort: filters.sort,
        offset: pageParam,
        limit: ALBUM_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < ALBUM_PAGE_SIZE ? undefined : pages.length * ALBUM_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: 5 * 60_000,
    retry: retryUnlessUnavailable,
  });
}

export function useAlbumLabels() {
  return useQuery({
    queryKey: RECORDING_QUERY_KEYS.labels,
    queryFn: () => RecordingAPI.labels(LABEL_LIMIT),
    staleTime: 30 * 60_000,
    retry: retryUnlessUnavailable,
  });
}

/** 레퍼토리에 담은 연주자의 최근 90일 앨범 (예약 앨범 포함) */
export function useNewAlbumsForMe(enabled: boolean) {
  return useQuery({
    queryKey: RECORDING_QUERY_KEYS.newForMe,
    queryFn: () => RecordingAPI.newForMe({ days: NEW_ALBUM_DAYS, offset: 0, limit: NEW_ALBUM_LIMIT }),
    enabled,
    staleTime: 10 * 60_000,
    retry: retryUnlessUnavailable,
  });
}

/** 앨범 레퍼토리. 백엔드가 아직 모르면 빈 목록으로 조용히 넘어간다 */
export function useMyFavoriteRecordings(enabled: boolean) {
  return useQuery<FavoriteRecordingItem[]>({
    queryKey: RECORDING_QUERY_KEYS.favorites,
    queryFn: async () => {
      try {
        return await MyPageAPI.getFavoriteRecordings();
      } catch (error) {
        if (isApiUnavailable(error)) return [];
        throw error;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

/**
 * 레퍼토리 전체: /me/favorites 네 묶음에 앨범 묶음을 합친다.
 * 앨범을 못 불러와도 나머지 레퍼토리는 그대로 보인다.
 */
export function useMyRepertoire(enabled: boolean) {
  const favorites = useMyFavorites(enabled);
  const recordings = useMyFavoriteRecordings(enabled);
  const data = React.useMemo<FavoriteGroups | undefined>(
    () => (favorites.data ? { ...favorites.data, recordings: recordings.data ?? [] } : undefined),
    [favorites.data, recordings.data]
  );
  return {
    data,
    isLoading: favorites.isLoading,
    isError: favorites.isError,
    isRefetching: favorites.isRefetching || recordings.isRefetching,
    refetch: () => {
      void recordings.refetch();
      return favorites.refetch();
    },
  };
}

/**
 * 레퍼토리 연주자만: 서버에 연주자 여러 명을 한 번에 거는 조건이 없어 연주자마다 첫 페이지를 받아 합친다.
 * 연주자는 앞에서부터 12명까지만 묻는다.
 */
export function useRepertoireArtistAlbums(artistIds: readonly number[], filters: AlbumBrowseFilters, enabled: boolean) {
  const targets = artistIds.slice(0, REPERTOIRE_ARTIST_LIMIT);
  const results = useQueries({
    queries: targets.map((artist) => ({
      queryKey: [...RECORDING_QUERY_KEYS.browse(filters), 'artist', artist] as const,
      queryFn: () =>
        RecordingAPI.browse({
          artist,
          label: filters.label,
          year: filters.year,
          q: filters.q,
          sort: filters.sort,
          offset: 0,
          limit: ALBUM_PAGE_SIZE,
        }),
      enabled,
      staleTime: 5 * 60_000,
      retry: retryUnlessUnavailable,
    })),
  });
  const data = results.flatMap((result) => result.data ?? []);
  const seen = new Set<number>();
  const albums = data
    .filter((album) => (seen.has(album.id) ? false : (seen.add(album.id), true)))
    .sort((a, b) =>
      filters.sort === 'title'
        ? a.title.localeCompare(b.title)
        : (b.releaseDate ?? b.year ?? '').localeCompare(a.releaseDate ?? a.year ?? '')
    );
  const firstError = results.find((result) => result.error)?.error ?? null;
  return {
    albums,
    isLoading: enabled && results.some((result) => result.isLoading),
    error: results.every((result) => result.isError) && results.length > 0 ? firstError : null,
    truncated: artistIds.length > targets.length,
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}

/**
 * 주소로 바로 연 앨범(?album=). 목록 응답 모양으로 맞추려고 앨범과 연주자를 따로 불러 합친다.
 */
export function useAlbumById(id: number | undefined) {
  return useQuery<RecordingListItem | null>({
    queryKey: RECORDING_QUERY_KEYS.detail(id ?? 0),
    queryFn: async () => {
      const recording = await RecordingAPI.getById(id ?? 0);
      if (!recording) return null;
      const artist = await ArtistAPI.getById(recording.artistId).catch(() => null);
      return {
        id: recording.id,
        title: recording.title,
        year: recording.year,
        releaseDate: recording.releaseDate ?? null,
        label: recording.label ?? null,
        coverUrl: recording.coverUrl ?? null,
        trackCount: recording.trackCount ?? null,
        isSingle: recording.isSingle ?? null,
        isCompilation: recording.isCompilation ?? null,
        isPreRelease: null,
        appleMusicUrl: recording.appleMusicUrl ?? null,
        spotifyUrl: recording.spotifyUrl ?? null,
        youtubeMusicUrl: recording.youtubeMusicUrl ?? null,
        artistId: recording.artistId,
        artistName: artist?.name ?? '연주자',
        artistEnglishName: artist?.englishName ?? null,
        artistImageUrl: artist?.imageUrl ?? null,
        artistCategory: artist?.category ?? null,
      };
    },
    enabled: (id ?? 0) > 0,
    staleTime: 10 * 60_000,
  });
}
