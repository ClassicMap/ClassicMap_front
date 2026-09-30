import { useQuery, useInfiniteQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { ArtistAPI, ConcertAPI, type ConcertArtistOption } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import type { Artist, Concert } from '@/lib/types/models';
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
const ARTIST_DIRECTORY_SIZE = 30;

/**
 * 공연 검색 백엔드가 연주자·편성 조건을 아는지.
 * `/concerts/artists`가 있으면 새 백엔드다. 연주자 후보 목록과 같은 요청이라 따로 부르지 않는다.
 */
export type ConcertSearchSupport = 'modern' | 'legacy';

function useConcertArtistDirectory() {
  return useQuery({
    queryKey: ['concerts', 'artists', ''] as const,
    queryFn: () => ConcertAPI.getArtists({ limit: ARTIST_DIRECTORY_SIZE }),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useConcertSearchSupport(): ConcertSearchSupport | undefined {
  const directory = useConcertArtistDirectory();
  if (directory.isError) return 'legacy';
  if (directory.data === undefined) return undefined;
  return directory.data === null ? 'legacy' : 'modern';
}

interface FilteredConcertsOptions {
  /** 연주자 필터 이름. 배포 전 백엔드는 id를 몰라 이름으로 찾는다 */
  artistName?: string;
  enabled?: boolean;
}

/**
 * 공연 탭 목록. 필터를 `/concerts/search`로 넘기고 offset 페이지를 이어 붙인다.
 * 서버가 아직 모르는 조건이 있을 수 있어 화면에서 {@link selectVisibleConcerts}로 한 번 더 거른다.
 *
 * 연주자 필터는 새 백엔드면 `artist` id로, 배포 전 백엔드면 이름을 검색어로 보낸다.
 * 이때 사용자가 친 검색어는 서버에 못 보내니 `localQuery`로 돌려줘 화면에서 거르게 한다.
 */
export function useFilteredConcerts(filter: ConcertFilter, range: DayRange, options: FilteredConcertsOptions = {}) {
  const support = useConcertSearchSupport();
  const typed = filter.q.trim();
  const artistName = options.artistName?.trim();
  const byName = Boolean(filter.artist) && support === 'legacy';
  // 연주자 필터는 백엔드 종류와 (이름으로 찾을 땐) 이름을 알아야 보낼 수 있다
  const waiting = Boolean(filter.artist) && (support === undefined || (byName && !artistName));
  const q = byName ? artistName : typed || undefined;
  const localQuery = byName && typed ? typed : undefined;

  const query = useInfiniteQuery({
    queryKey: [
      'concerts',
      'list',
      {
        genre: filter.genre,
        area: filter.area,
        visit: filter.visit,
        festival: filter.festival,
        instrument: filter.instrument,
        artist: byName ? undefined : filter.artist,
        q,
        ...range,
      },
    ] as const,
    queryFn: ({ pageParam }) =>
      ConcertAPI.search({
        q,
        genre: genreValue(filter.genre),
        area: filter.area,
        from: range.from,
        to: range.to,
        visit: filter.visit || undefined,
        festival: filter.festival || undefined,
        instrument: filter.instrument,
        artist: byName ? undefined : filter.artist,
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
    enabled: !waiting && options.enabled !== false,
  });

  return { query, localQuery, waiting };
}

export interface ConcertArtistOptions {
  options: ConcertArtistOption[];
  /** 새 백엔드면 공연 수가 붙는다 */
  hasCounts: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function fromArtist(artist: Artist): ConcertArtistOption {
  return {
    artistId: artist.id,
    name: artist.name,
    englishName: artist.englishName,
    imageUrl: artist.imageUrl ?? null,
    category: artist.category,
  };
}

/**
 * 연주자 필터 후보. 새 백엔드는 앞으로 공연이 있는 연주자를 공연 수 순으로 주고,
 * 배포 전 백엔드면 이름을 쳤을 때 전체 아티스트 검색으로 대신한다.
 */
export function useConcertArtistOptions(search: string): ConcertArtistOptions {
  const support = useConcertSearchSupport();
  const directory = useConcertArtistDirectory();
  const q = search.trim();
  const modernSearch = useQuery({
    queryKey: ['concerts', 'artists', q] as const,
    queryFn: () => ConcertAPI.getArtists({ q, limit: 20 }),
    enabled: support === 'modern' && q.length > 0,
    staleTime: 1000 * 60 * 5,
  });
  const legacySearch = useQuery({
    queryKey: ['artists', 'search', 'concert-filter', q] as const,
    queryFn: () => ArtistAPI.search({ q, limit: 12 }),
    // 공연과 이어진 목록이 없으니 이름을 쳤을 때만 전체 아티스트에서 찾는다 (돌아가신 거장이 앞에 오지 않게)
    enabled: support === 'legacy' && q.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  if (support === 'modern') {
    const active = q ? modernSearch : directory;
    return {
      options: active.data ?? [],
      hasCounts: true,
      isLoading: active.isLoading,
      isError: active.isError,
      refetch: () => void active.refetch(),
    };
  }
  return {
    options: (legacySearch.data ?? []).map(fromArtist),
    hasCounts: false,
    isLoading: support === undefined || (q.length > 0 && legacySearch.isLoading),
    isError: legacySearch.isError,
    refetch: () => void legacySearch.refetch(),
  };
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
