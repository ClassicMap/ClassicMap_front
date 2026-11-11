import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MyPageAPI,
  type FavoriteGroups,
  type ProfileVisibility,
  type PublicProfileResponse,
  type RatedConcertListItem,
  type UpdateProfileVisibilityInput,
} from '@/lib/api/client';

export const MY_PAGE_QUERY_KEYS = {
  ratings: ['me', 'ratings'] as const,
  favorites: ['me', 'favorites'] as const,
  profileVisibility: ['me', 'profileVisibility'] as const,
  publicProfile: (userId: number) => ['users', userId, 'publicProfile'] as const,
};

export function useMyRatings(enabled: boolean = true) {
  return useQuery<RatedConcertListItem[]>({
    queryKey: MY_PAGE_QUERY_KEYS.ratings,
    queryFn: () => MyPageAPI.getRatings(),
    enabled,
  });
}

export function useMyFavorites(enabled: boolean = true) {
  return useQuery<FavoriteGroups>({
    queryKey: MY_PAGE_QUERY_KEYS.favorites,
    queryFn: () => MyPageAPI.getFavorites(),
    enabled,
  });
}

export function useProfileVisibility(enabled: boolean = true) {
  return useQuery<ProfileVisibility>({
    queryKey: MY_PAGE_QUERY_KEYS.profileVisibility,
    queryFn: () => MyPageAPI.getProfileVisibility(),
    enabled,
  });
}

export function useUpdateProfileVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileVisibilityInput) => MyPageAPI.updateProfileVisibility(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(MY_PAGE_QUERY_KEYS.profileVisibility, profile);
      queryClient.invalidateQueries({
        queryKey: MY_PAGE_QUERY_KEYS.publicProfile(profile.userId),
      });
    },
  });
}

export function usePublicProfile(userId: number | undefined) {
  return useQuery<PublicProfileResponse | null>({
    queryKey: userId ? MY_PAGE_QUERY_KEYS.publicProfile(userId) : ['users', 'unknown'],
    queryFn: () => MyPageAPI.getPublicProfile(userId!),
    enabled: typeof userId === 'number' && userId > 0,
  });
}
