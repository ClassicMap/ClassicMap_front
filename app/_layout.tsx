import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/client';
import { useChromeStackOptions } from '@/components/layout/chrome-header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { setNavigationRef } from '@/lib/navigation/go';
import { RootChrome } from '@/components/layout/root-chrome';
import { setAdminTokenProvider } from '@/lib/api/admin';
import { setTokenProvider } from '@/lib/api/client';
import { useTasteSync } from '@/hooks/use-taste';
import { installRouteTransitions } from '@/lib/navigation/view-transition';
import { LocaleProvider, t, useLocale } from '@/lib/i18n';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

/**
 * 앱: 링크로 상세 화면에 바로 들어와도 루트 스택 맨 아래에 탭 묶음을 깐다. 그래야 밀기·시스템 뒤로가
 * 탭으로 돌아간다(없으면 그 화면 하나뿐이라 돌아갈 곳이 없었다, #82). expo-router 문서
 * router/advanced/router-settings 의 initialRouteName("When deep linking to a route … back button").
 * 웹은 주소로 바로 연 화면 아래에 탭을 그리지 않는다(브라우저 뒤로가 맡는다)
 */
export const unstable_settings = Platform.OS === 'web' ? undefined : { initialRouteName: '(tabs)' };

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  );
}

export default function RootLayout() {
  useLocale();
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
          <LocaleProvider>
            <Routes />
            <PortalHost />
          </LocaleProvider>
        </ThemeProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

SplashScreen.preventAutoHideAsync();
// 웹: 앱 안 이동을 화면 전환으로 감싼다 (네이티브는 아무것도 하지 않는다)
installRouteTransitions();

function Routes() {
  useLocale();
  const { isLoaded, userId, getToken } = useAuth();
  const client = useQueryClient();

  // API 요청에 붙일 토큰 공급자. 자식 화면의 첫 쿼리보다 먼저 있어야 해서 effect가 아니라 렌더 중에 건다
  // (effect는 자식 것이 먼저 돌아 첫 '내 정보' 요청이 토큰 없이 나가 401이 났다)
  const tokenProvider = isLoaded && userId ? getToken : null;
  setTokenProvider(tokenProvider);
  setAdminTokenProvider(tokenProvider);
  const previousUser = React.useRef<string | null | undefined>(undefined);
  // 로그인하면 이 기기에 둔 취향을 서버로 옮긴다
  useTasteSync();

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

  // 앱 안 이동 도우미(lib/navigation/go.ts)가 루트 스택의 지금 상태를 읽게 한다
  const navigationRef = useNavigationContainerRef();
  setNavigationRef(navigationRef);

  // 탭 밖으로 옮긴 탭 성격 화면(비교 단계, 아티스트·타임라인·앨범)은 탭 화면과 같은 머리를 단다.
  // 하단 탭바만 없다. 넓은 웹은 셸(사이드바·상단바)이 크롬을 맡으므로 머리를 숨긴다
  const { nav } = useBreakpoint();
  const hideChrome = Platform.OS === 'web' && nav !== 'tabs';
  const chromeOptions = useChromeStackOptions(hideChrome);
  // 둘러보기에서 여는 화면: 탭바가 없으니 머리에 뒤로 단추를 둔다(주소로 바로 들어오면 둘러보기로)
  const browseOptions = useChromeStackOptions(hideChrome, '/search');

  if (!isLoaded) {
    return null;
  }

  return (
    <RootChrome>
      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        {/* 로그인/회원가입 화면 */}
        <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />

        {/* 모든 화면은 기본적으로 공개 (관리자 기능만 인증 필요) */}
        <Stack.Screen name="index" options={INDEX_SCREEN_OPTIONS} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="composer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="concert/[id]" options={{ headerShown: false }} />
        {/* 앱의 비교 단계. 웹은 비교 탭 주소로 보낸다 (#82) */}
        <Stack.Screen name="compare-step" options={chromeOptions} />
        {/* 둘러보기·사이드바에서 들어가는 모아 보기. 탭바에는 없어서 루트 스택에 쌓는다 (#82) */}
        <Stack.Screen name="artists" options={{ ...browseOptions, title: t('아티스트') }} />
        <Stack.Screen name="timeline" options={{ ...browseOptions, title: t('타임라인') }} />
        <Stack.Screen name="albums" options={{ ...browseOptions, title: t('앨범') }} />
        {/* 모아 보기와 상세는 폴더를 나눈다. 정적 export 에 films/ 폴더가 생기면 nginx 가 /classicmap/films 를 접두사 없는 /films/ 로 돌려보낸다 */}
        <Stack.Screen name="films" options={{ headerShown: false }} />
        <Stack.Screen name="film/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="my-page" options={{ headerShown: false }} />
        <Stack.Screen name="users/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="compare-admin" options={{ title: t('구간·연주 관리') }} />

        {/* Screens accessible to everyone */}
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      </Stack>
    </RootChrome>
  );
}

// iOS 26 부터 기본 앱은 화면 어디서 밀어도 뒤로 간다. 지금 쓰는 react-native-screens 는 기본으로 꺼 두므로
// 직접 켠다(iOS 만 쓰는 값). 앱은 뒤로 단추 대신 이 밀기로 돌아간다
const STACK_SCREEN_OPTIONS = {
  fullScreenGestureEnabled: true,
};

// 첫 진입 화면은 탭 묶음 위에 잠깐 열렸다 바로 빠진다. 빠지는 움직임이 보이지 않게 한다
const INDEX_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'none' as const,
};

const SIGN_IN_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign in',
  gestureEnabled: true,
};

const SIGN_UP_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign up',
};
