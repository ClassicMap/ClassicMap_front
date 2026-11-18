import { Header, type HeaderOptions } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import { ArrowLeftIcon, MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useStackBackButtonVisible } from '@/hooks/use-back-button';
import { TAB_CHROME_TRANSLUCENT } from '@/hooks/use-tab-chrome';
import { withAlpha } from '@/lib/design/tokens';
import { t, useLocale } from '@/lib/i18n';
import { goBackOr } from '@/lib/navigation/go';
import { THEME } from '@/lib/theme';

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <Button
      onPress={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="rounded-full"
      accessibilityLabel={dark ? t('라이트 모드로 전환') : t('다크 모드로 전환')}>
      <Icon as={dark ? SunIcon : MoonStarIcon} className="size-6" />
    </Button>
  );
}

/** 로그인하지 않아도 언어를 바꿀 수 있게(설정 화면은 로그인해야 열린다). 바꿀 언어의 이름을 보인다 */
function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <Button
      onPress={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
      size="icon"
      variant="ghost"
      className="rounded-full"
      accessibilityLabel={locale === 'ko' ? t('영어로 보기') : t('한국어로 보기')}>
      <Text className="text-[13px] font-semibold text-foreground-muted">
        {locale === 'ko' ? 'EN' : '한'}
      </Text>
    </Button>
  );
}

/**
 * 탭 밖 화면의 뒤로 단추. 하단 탭바가 없으니 웹에서는 늘 보이고, 앱은 뒤에 화면이 없을 때만 보인다.
 * 뒤에 화면이 없으면 `fallback` 으로 간다
 */
function HeaderBack({ fallback }: { fallback: string }) {
  const visible = useStackBackButtonVisible();
  if (!visible) return null;
  return (
    <Button
      onPress={() => goBackOr(fallback)}
      size="icon"
      variant="ghost"
      className="rounded-full"
      accessibilityLabel={t('뒤로')}>
      <Icon as={ArrowLeftIcon} className="size-6" />
    </Button>
  );
}

export type ChromeHeaderOptions = Pick<
  HeaderOptions,
  | 'headerTransparent'
  | 'headerStyle'
  | 'headerBackground'
  | 'headerLeft'
  | 'headerRight'
  | 'headerTitle'
  | 'headerShadowVisible'
  | 'headerStatusBarHeight'
>;

/**
 * 탭 화면의 위쪽 크롬(테마·언어 전환, 사용자 메뉴). 하단 탭과, 탭 밖으로 옮긴 화면(비교 단계 …)이 같은 머리를 쓴다.
 * `backFallback` 을 주면 맨 왼쪽에 뒤로 단추를 둔다
 */
export function useChromeHeaderOptions(backFallback?: string): ChromeHeaderOptions {
  useLocale();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const translucent = TAB_CHROME_TRANSLUCENT;
  return {
    // iOS 26: 헤더도 콘텐츠 위에 띄우고 뒤를 흐린다. 화면은 useTabScrollInsets로 헤더 높이만큼 비운다
    headerTransparent: translucent,
    headerStyle: { backgroundColor: translucent ? 'transparent' : colors.background },
    // 배경색을 반쯤 깔아 맨 위에서는 화면과 이어지고, 스크롤하면 지나가는 콘텐츠만 흐리게 비친다
    headerBackground: translucent
      ? () => (
          <BlurView tint={scheme} intensity={60} style={StyleSheet.absoluteFill}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: withAlpha(scheme, 'background', scheme === 'dark' ? 0.8 : 0.72),
                },
              ]}
            />
          </BlurView>
        )
      : undefined,
    headerLeft: () => (
      <View className="mb-2 ml-4 flex-row items-center">
        {backFallback ? <HeaderBack fallback={backFallback} /> : null}
        <ThemeToggle />
        <LanguageToggle />
      </View>
    ),
    headerRight: () => (
      <View className="mb-2 mr-4">
        <UserMenu />
      </View>
    ),
    headerTitle: '',
    headerShadowVisible: false,
    // 웹에는 상태 표시줄이 없다. 네이티브 값을 그대로 쓰면 모바일 웹 맨 위가 52px 비어 보인다
    headerStatusBarHeight: Platform.OS === 'web' ? 0 : 52,
  };
}

/**
 * 루트 스택 화면에 탭 화면과 같은 머리를 붙이는 옵션. 네이티브 스택의 기본 머리 대신 탭이 쓰는 머리를 그린다.
 * `hideChrome` 이면(데스크톱 웹 셸) 머리를 숨긴다. `backFallback` 은 뒤로 단추가 뒤에 화면이 없을 때 갈 곳이다
 */
export function useChromeStackOptions(hideChrome = false, backFallback?: string) {
  const header = useChromeHeaderOptions(backFallback);
  return {
    headerShown: !hideChrome,
    headerTransparent: header.headerTransparent,
    header: () => <Header title="" {...header} />,
  };
}
