// lib/hooks/useAuth.ts
// 사용자 권한 확인 훅

import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

export interface UserProfile {
  id: number;
  clerkId: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  isFirstVisit: boolean;
  favoriteEra?: string;
}

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clerk가 아직 로드 중이면 로그인 여부를 모르므로 계속 로딩으로 둔다
    // (여기서 끝내면 새로고침 때 로그인한 사용자가 로그인 화면으로 튕긴다)
    if (!isLoaded) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    async function loadProfile() {
      if (!user) return;

      try {
        const response = await fetch(`${API_BASE_URL}/users/clerk/${user.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getToken()}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('프로필 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoaded]);

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator';
  const canEdit = isAdmin || isModerator;
  const isSignedIn = isLoaded && !!user;

  return {
    user,
    profile,
    loading,
    isSignedIn,
    isAdmin,
    isModerator,
    canEdit,
    getToken,
  };
}
