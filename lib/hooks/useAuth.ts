// lib/hooks/useAuth.ts
// 사용자 권한 확인 훅

import { useUser } from '@clerk/clerk-expo';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    async function loadProfile() {
      if (!user) return;

      try {
        const response = await fetch(`${API_BASE_URL}/users/clerk/${user.id}`);
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
  }, [user, isLoaded]);

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator';
  const canEdit = isAdmin || isModerator;

  return {
    user,
    profile,
    loading,
    isAdmin,
    isModerator,
    canEdit,
  };
}
