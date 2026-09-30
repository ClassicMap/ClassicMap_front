import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/client';
import { RootChrome } from '@/components/navigation/root-chrome';
import { setAdminTokenProvider } from '@/lib/api/admin';
import { setTokenProvider } from '@/lib/api/client';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  // 악보 글리프(Bravura)는 화면을 막지 않고 불러온다. 로드 전에는 글리프 자리만 빈다
  useFonts({ Bravura: require('@/assets/fonts/Bravura.otf') });

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          {/* 정적 렌더링이 빈 <title>을 넣어 브라우저 탭에 주소가 뜬다. 웹 기본 제목을 둔다 */}
          {Platform.OS === 'web' ? (
            <Head>
              <title>ClassicMap</title>
            </Head>
          ) : null}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Routes />
          <PortalHost />
        </ThemeProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { isLoaded, userId, getToken } = useAuth();
  const client = useQueryClient();

  // API 요청에 붙일 토큰 공급자. 자식 화면의 첫 쿼리보다 먼저 있어야 해서 effect가 아니라 렌더 중에 건다
  // (effect는 자식 것이 먼저 돌아 첫 '내 정보' 요청이 토큰 없이 나가 401이 났다)
  const tokenProvider = isLoaded && userId ? getToken : null;
  setTokenProvider(tokenProvider);
  setAdminTokenProvider(tokenProvider);
  const previousUser = React.useRef<string | null | undefined>(undefined);

  // 로그아웃하거나 계정이 바뀌면 이전 사람의 내 정보(평가·레퍼토리·공개 설정) 캐시를 지운다
  React.useEffect(() => {
    if (!isLoaded) return;
    if (previousUser.current !== undefined && previousUser.current !== userId) {
      client.removeQueries({ queryKey: ['me'] });
    }
    previousUser.current = userId ?? null;
  }, [client, isLoaded, userId]);

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  return (
    <RootChrome>
      <Stack>
        {/* 로그인/회원가입 화면 */}
        <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />

        {/* 모든 화면은 기본적으로 공개 (관리자 기능만 인증 필요) */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="composer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="concert/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="my-page" options={{ headerShown: false }} />
        <Stack.Screen name="users/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
        <Stack.Screen name="compare-admin" options={{ title: '구간·연주 관리' }} />

        {/* Screens accessible to everyone */}
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      </Stack>
    </RootChrome>
  );
}

const SIGN_IN_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign in',
  gestureEnabled: true,
};

const SIGN_UP_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign up',
};
