// lib/hooks/useUserProfile.ts
// 사용자 프로필 훅 (Clerk + Mock DB 통합)

import { useUser } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import * as MockDB from '@/lib/api/mock-db';

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<MockDB.User | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    async function loadOrCreateProfile() {
      if (!user) return;

      try {
        // Mock DB에서 사용자 찾기
        let userProfile = await MockDB.getUserProfile(user.id);

        if (!userProfile) {
          // 첫 로그인! DB에 사용자 생성
          userProfile = await MockDB.createUser(user);
          setIsFirstLogin(true);
        } else {
          setIsFirstLogin(userProfile.isFirstLogin);
        }

        setProfile(userProfile);
      } catch (error) {
        // 프로필 로드 실패
      } finally {
        setLoading(false);
      }
    }

    loadOrCreateProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoaded]); // user 대신 user?.id 사용

  const completeOnboarding = async () => {
    if (user) {
      await MockDB.completeFirstLogin(user.id);
      setIsFirstLogin(false);
      
      // 프로필 새로고침
      const updated = await MockDB.getUserProfile(user.id);
      setProfile(updated);
    }
  };

  const updatePreferences = async (preferences: Partial<MockDB.UserPreferences>) => {
    if (user) {
      await MockDB.updatePreferences(user.id, preferences);
      
      // 프로필 새로고침
      const updated = await MockDB.getUserProfile(user.id);
      setProfile(updated);
    }
  };

  return {
    profile,
    isFirstLogin,
    loading,
    completeOnboarding,
    updatePreferences,
  };
}
