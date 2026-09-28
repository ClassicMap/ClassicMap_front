// lib/hooks/useUserProfile.ts
// 이 기기에만 저장하는 사용자 취향(첫 방문 여부·좋아하는 시대). Clerk 사용자별로 나뉜다.

import { useUser } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import * as MockDB from '@/lib/api/mock-db';

const profileKey = (clerkId: string | undefined) => ['local-profile', clerkId ?? 'guest'] as const;

/**
 * 화면마다 따로 들고 있던 상태를 쿼리 캐시로 옮겼다.
 * 설정에서 시대를 바꾸면 이미 떠 있는 홈에도 바로 반영된다.
 */
export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const key = profileKey(user?.id);

  const query = useQuery({
    queryKey: key,
    enabled: isLoaded && Boolean(user),
    staleTime: Infinity,
    queryFn: async (): Promise<{ profile: MockDB.User; isFirstLogin: boolean } | null> => {
      if (!user) return null;
      const existing = await MockDB.getUserProfile(user.id);
      if (existing) return { profile: existing, isFirstLogin: existing.isFirstLogin };
      // 첫 로그인: 이 기기에 프로필을 만든다
      const created = await MockDB.createUser(user);
      return { profile: created, isFirstLogin: true };
    },
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const updated = await MockDB.getUserProfile(user.id);
    queryClient.setQueryData(key, updated ? { profile: updated, isFirstLogin: updated.isFirstLogin } : null);
    // key는 user.id로만 바뀐다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await MockDB.completeFirstLogin(user.id);
    await refresh();
  }, [refresh, user]);

  const updatePreferences = useCallback(
    async (preferences: Partial<MockDB.UserPreferences>) => {
      if (!user) return;
      await MockDB.updatePreferences(user.id, preferences);
      await refresh();
    },
    [refresh, user]
  );

  return {
    profile: query.data?.profile ?? null,
    isFirstLogin: query.data?.isFirstLogin ?? false,
    loading: !isLoaded || (Boolean(user) && query.isLoading),
    completeOnboarding,
    updatePreferences,
  };
}
