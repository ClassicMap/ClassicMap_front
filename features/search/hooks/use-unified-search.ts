import { ArtistAPI, ComposerAPI, ConcertAPI, PieceAPI } from '@/lib/api/client';
import { ScreenAPI } from '@/lib/api/screen';
import { useQuery } from '@tanstack/react-query';

/**
 * 작곡가·작품·아티스트·공연·영화 검색을 병렬로 부른다 (통합 검색 API가 없어서, B1).
 * 팔레트(⌘K)와 검색 화면이 같이 쓴다. 한 종류가 실패해도 나머지는 보여 준다.
 */
export function useUnifiedSearch(query: string, options: { enabled?: boolean; limit?: number } = {}) {
  const q = query.trim();
  const limit = options.limit ?? 5;
  const active = (options.enabled ?? true) && q.length > 0;
  const common = { enabled: active, staleTime: 60_000 } as const;

  const composers = useQuery({
    queryKey: ['search', 'composers', q, limit],
    queryFn: () => ComposerAPI.search({ q, limit }),
    ...common,
  });
  const pieces = useQuery({
    queryKey: ['search', 'pieces', q, limit],
    queryFn: () => PieceAPI.search({ q, limit }),
    ...common,
  });
  const artists = useQuery({
    queryKey: ['search', 'artists', q, limit],
    queryFn: () => ArtistAPI.search({ q, limit }),
    ...common,
  });
  const concerts = useQuery({
    queryKey: ['search', 'concerts', q, limit],
    queryFn: () => ConcertAPI.search({ q, limit }),
    ...common,
  });

  const screenTitles = useQuery({
    queryKey: ['search', 'screen-titles', q, limit],
    queryFn: async () => (await ScreenAPI.search({ q, limit })).items,
    ...common,
  });

  const all = [composers, pieces, artists, concerts, screenTitles];
  return {
    query: q,
    composers: composers.data ?? [],
    pieces: pieces.data ?? [],
    artists: artists.data ?? [],
    concerts: concerts.data ?? [],
    screenTitles: screenTitles.data ?? [],
    isFetching: all.some((item) => item.isFetching),
    isLoading: active && all.every((item) => item.isLoading),
    failedCount: all.filter((item) => item.isError).length,
    retry: () => all.filter((item) => item.isError).forEach((item) => item.refetch()),
  };
}
