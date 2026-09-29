import { useQuery, useInfiniteQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { ConcertAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import type { Concert } from '@/lib/types/models';
import {
  type ConcertFilter,
  type DayRange,
  genreValue,
  isSearchableArtistName,
  overlapsRange,
} from '@/lib/data/concert-filters';

/**
 * 쿼리 키 상수
 */
export const CONCERT_QUERY_KEYS = {
  all: ['concerts'] as const,
  filtered: (area?: string) => ['concerts', { area }] as const,
  detail: (id: number) => ['concerts', id] as const,
  areas: ['concerts', 'areas'] as const,
};

/**
 * 모든 공연 조회 훅 (무한 스크롤)
 * - 페이지당 20개씩 로드
 * - 자동 캐싱 (3분 stale)
 * - area 파라미터로 지역 필터링 지원
 */
export function useConcerts(area?: string) {
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: area ? CONCERT_QUERY_KEYS.filtered(area) : CONCERT_QUERY_KEYS.all,
    queryFn: async ({ pageParam = 0 }) => {
      // 지역 필터가 있으면 search API 사용
      if (area) {
        const result = await ConcertAPI.search({
          area: area,
          offset: pageParam,
          limit: PAGE_SIZE,
        });
        return result;
      }

      // 전체 지역이면 getAll API 사용
      const result = await ConcertAPI.getAll({ offset: pageParam, limit: PAGE_SIZE });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      try {
        // 마지막 페이지가 비어있거나 PAGE_SIZE보다 작으면 더 이상 없음
        if (!lastPage || !Array.isArray(lastPage) || lastPage.length < PAGE_SIZE) {
          return undefined;
        }
        // 다음 offset 계산
        const nextOffset = allPages.length * PAGE_SIZE;
        return nextOffset;
      } catch (error) {
        console.error('Error in getNextPageParam:', error);
        return undefined;
      }
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 3, // 3분
    gcTime: 1000 * 60 * 10, // 10분 (캐시 유지)
    refetchOnWindowFocus: false, // 포커스 시 재요청 방지
    refetchOnMount: false, // 마운트 시 재요청 방지
    retry: 1, // 1번만 재시도
  });
}

/**
 * 특정 공연 조회 훅
 * - 예매 상황 등을 고려하여 짧은 staleTime (2분)
 */
export function useConcert(id: number | undefined) {
  return useQuery({
    queryKey: CONCERT_QUERY_KEYS.detail(id!),
    queryFn: () => ConcertAPI.getById(id!),
    enabled: !!id && id > 0,
    staleTime: 1000 * 60 * 2, // 2분 (예매 상황 반영)
  });
}

/**
 * 공연 생성 뮤테이션 훅
 */
export function useCreateConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof AdminConcertAPI.create>[0]) => AdminConcertAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concerts'] });
    },
  });
}

/**
 * 공연 수정 뮤테이션 훅
 */
export function useUpdateConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof AdminConcertAPI.update>[1] }) =>
      AdminConcertAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['concerts'] });
    },
  });
}

/**
 * 공연 삭제 뮤테이션 훅
 */
export function useDeleteConcert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => AdminConcertAPI.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CONCERT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['concerts'] });
    },
  });
}

/**
 * 공연이 있는 지역 목록 조회 훅
 * - 30분 stale (지역은 자주 바뀌지 않음)
 */
export function useAreas() {
  return useQuery({
    queryKey: CONCERT_QUERY_KEYS.areas,
    queryFn: async () => {
      return await ConcertAPI.getAreas();
    },
    staleTime: 1000 * 60 * 30, // 30분
    gcTime: 1000 * 60 * 60, // 1시간
  });
}

const FILTERED_PAGE_SIZE = 20;

/**
 * 공연 탭 목록. 필터를 `/concerts/search`로 넘기고 offset 페이지를 이어 붙인다.
 * 서버가 아직 모르는 조건이 있을 수 있어 화면에서 {@link matchesConcertFilter}로 한 번 더 거른다.
 */
export function useFilteredConcerts(filter: ConcertFilter, range: DayRange) {
  const q = filter.q.trim();
  return useInfiniteQuery({
    queryKey: [
      'concerts',
      'list',
      { genre: filter.genre, area: filter.area, visit: filter.visit, festival: filter.festival, q, ...range },
    ] as const,
    queryFn: ({ pageParam }) =>
      ConcertAPI.search({
        q: q || undefined,
        genre: genreValue(filter.genre),
        area: filter.area,
        from: range.from,
        to: range.to,
        visit: filter.visit || undefined,
        festival: filter.festival || undefined,
        offset: pageParam,
        limit: FILTERED_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < FILTERED_PAGE_SIZE ? undefined : allPages.length * FILTERED_PAGE_SIZE,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export interface FavoriteArtistRef {
  artistId: number;
  name: string;
  imageUrl?: string | null;
}

export interface FavoriteArtistConcert {
  concert: Concert;
  artists: FavoriteArtistRef[];
}

const FAVORITE_ARTIST_LIMIT = 12;

/**
 * 찜한 아티스트가 출연하는 앞으로의 공연.
 * 공연-아티스트 연결이 비어 있어 출연진·제목에 이름이 들어간 공연을 이름으로 찾는다.
 */
export function useFavoriteArtistConcerts(artists: readonly FavoriteArtistRef[], from: string) {
  const targets = artists.filter((artist) => isSearchableArtistName(artist.name)).slice(0, FAVORITE_ARTIST_LIMIT);
  const results = useQueries({
    queries: targets.map((artist) => ({
      queryKey: ['concerts', 'by-artist-name', artist.name.trim(), from] as const,
      queryFn: () => ConcertAPI.search({ q: artist.name.trim(), from, limit: 20 }),
      staleTime: 1000 * 60 * 10,
      retry: 1,
    })),
  });

  const byConcert = new Map<number, FavoriteArtistConcert>();
  results.forEach((result, index) => {
    const artist = targets[index];
    for (const concert of result.data ?? []) {
      if (!overlapsRange(concert, { from })) continue;
      const entry = byConcert.get(concert.id) ?? { concert, artists: [] };
      if (!entry.artists.some((item) => item.artistId === artist.artistId)) entry.artists.push(artist);
      byConcert.set(concert.id, entry);
    }
  });
  const items = [...byConcert.values()].sort(
    (a, b) => a.concert.startDate.localeCompare(b.concert.startDate) || a.concert.id - b.concert.id
  );

  return {
    items,
    isLoading: results.some((result) => result.isLoading),
    isError: targets.length > 0 && results.every((result) => result.isError),
    refetch: () => results.filter((result) => result.isError).forEach((result) => void result.refetch()),
  };
}
