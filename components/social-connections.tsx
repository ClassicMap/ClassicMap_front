import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useSSO, type StartSSOFlowParams } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, Platform, Pressable, View, type ImageSourcePropType } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type SocialConnectionStrategy = Extract<
  StartSSOFlowParams['strategy'],
  'oauth_google' | 'oauth_apple'
>;

const SOCIAL_CONNECTION_STRATEGIES: {
  type: SocialConnectionStrategy;
  label: string;
  source: ImageSourcePropType;
  useTint?: boolean;
}[] = [
  {
    type: 'oauth_apple',
    label: 'Apple로 계속하기',
    source: { uri: 'https://img.clerk.com/static/apple.png?width=160' },
    useTint: true,
  },
  {
    type: 'oauth_google',
    label: 'Google로 계속하기',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
  },
];

/**
 * 웹 소셜 로그인 팝업이 돌아올 앱 안 주소.
 * makeRedirectUri()는 웹에서 도메인 루트(https://kang1027.com)를 줘서, /classicmap 아래에 있는 앱이 아니라
 * 루트 사이트로 돌아간 팝업이 닫히지 않고 멈췄다. 돌아온 팝업의 경로가 이 주소와 정확히 같아야
 * maybeCompleteAuthSession()이 결과를 넘기고 창이 닫힌다. 기본 경로는 expo-router처럼 개발 서버에서는 붙이지 않는다.
 */
function webRedirectUrl(): string {
  const baseUrl = process.env.NODE_ENV !== 'development' ? (process.env.EXPO_BASE_URL ?? '') : '';
  return new URL(`${baseUrl.replace(/\/+$/, '')}/sign-in`, window.location.origin).toString();
}

export function SocialConnections() {
  useWarmUpBrowser();
  const { colorScheme } = useColorScheme();
  const { startSSOFlow } = useSSO();

  function onSocialLoginPress(strategy: SocialConnectionStrategy) {
    return async () => {
      try {
        // 앱은 경로를 붙인다. classicmap-front:// 만 주면 Clerk 가 classicmap-front:?… 로 돌려보내
        // 안드로이드 expo-web-browser 가 로그인 링크로 못 알아보고 닫힘으로 끝낸다. 라우터는 app/+native-intent 가 막는다
        const redirectUrl =
          Platform.OS === 'web'
            ? webRedirectUrl()
            : AuthSession.makeRedirectUri({ scheme: 'classicmap-front', path: 'sso-callback' });

        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl,
        });

        // 세션 활성화 (화면 이동은 sign-in/sign-up의 useEffect에서 처리)
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (err) {
        console.error('SSO error:', JSON.stringify(err, null, 2));
      }
    };
  }

  return (
    <View className="gap-2.5">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        return (
          <Pressable
            key={strategy.type}
            accessibilityRole="button"
            onPress={onSocialLoginPress(strategy.type)}
            className="h-12 flex-row items-center justify-center gap-2.5 rounded-full border border-border-strong active:bg-surface-2 web:transition-colors web:duration-fast web:hover:bg-surface-2">
            <Image
              className={cn('size-[18px]', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
              tintColor={Platform.select({
                native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
              })}
              source={strategy.source}
            />
            <Text className="text-body-sm font-semibold text-foreground">{strategy.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useWarmUpBrowser = Platform.select({
  web: () => {},
  default: () => {
    React.useEffect(() => {
      // Preloads the browser for Android devices to reduce authentication load time
      // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
      void WebBrowser.warmUpAsync();
      return () => {
        // Cleanup: closes browser when component unmounts
        void WebBrowser.coolDownAsync();
      };
    }, []);
  },
});
