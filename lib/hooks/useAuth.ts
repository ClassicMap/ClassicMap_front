// lib/hooks/useAuth.ts
// 사용자 권한 확인 훅

import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { setAuthToken } from '@/lib/api/client';
import { setAdminAuthToken } from '@/lib/api/admin';

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

  // Clerk 토큰을 가져와서 API 클라이언트에 설정
  useEffect(() => {
    if (!isLoaded) return;

    async function setupAuthToken() {
      try {
        if (user) {
          // Clerk에서 JWT 토큰 가져오기
          const token = await getToken();
          setAuthToken(token);
          setAdminAuthToken(token); // Admin API에도 동일한 토큰 설정
        } else {
          // 로그아웃 시 토큰 제거
          setAuthToken(null);
          setAdminAuthToken(null);
        }
      } catch (error) {
        console.error('토큰 가져오기 실패:', error);
        setAuthToken(null);
        setAdminAuthToken(null);
      }
    }

    setupAuthToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoaded]); // getToken 제거, user?.id만 사용

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    async function loadProfile() {
      if (!user) return;

      try {
        // Authorization 헤더는 authenticatedFetch에서 자동으로 추가됨
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
  }, [user?.id, isLoaded]); // getToken 제거, user?.id만 사용

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
    getToken,
  };
}
