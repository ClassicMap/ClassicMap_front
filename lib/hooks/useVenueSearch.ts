import { useQuery } from '@tanstack/react-query';
import { VenueAPI } from '@/lib/api/client';
import { useDebounce } from './useDebounce';

export function useVenueSearch(query: string, enabled: boolean = true) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['venues', 'search', debouncedQuery],
    queryFn: () => VenueAPI.search({ q: debouncedQuery, limit: 20 }),
    enabled: enabled && debouncedQuery.length > 0,
    staleTime: 30000, // 30초 캐싱
  });
}
