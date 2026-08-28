import { useInfiniteQuery } from '@tanstack/react-query';

import { ComparisonAPI } from '@/lib/api/comparisons';

const PAGE_SIZE = 10;

export const COMPARISON_QUERY_KEYS = {
  artist: (artistId: number) => ['artists', artistId, 'comparison-performances'] as const,
};

export function useArtistComparisonPerformances(artistId: number) {
  return useInfiniteQuery({
    queryKey: COMPARISON_QUERY_KEYS.artist(artistId),
    queryFn: ({ pageParam }) =>
      ComparisonAPI.getByArtist(artistId, { cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: artistId > 0,
  });
}
