import { Tabs } from 'expo-router';
import { BookmarkIcon, CompassIcon, HomeIcon, MoonStarIcon, SunIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, TicketIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';
import { THEME } from '@/lib/theme';
import { withAlpha } from '@/lib/design/tokens';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CHROME_TRANSLUCENT } from '@/components/navigation/tab-chrome';

/**
 * 모바일 탭 구성: 홈 · 둘러보기 · 비교 · 공연 · 레퍼토리.
 * 아티스트와 타임라인은 탭바에 두지 않고 둘러보기에서 들어간다. 데스크톱은 사이드바에 아티스트가 있다.
 */
export function TabsLayout({ hideChrome = false }: { hideChrome?: boolean }) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? insets.bottom + 8 : 20;
  const translucent = TAB_CHROME_TRANSLUCENT;
  const blurTint = scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';

  const ThemeToggle = () => (
    <Button
      onPress={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="rounded-full"
      accessibilityLabel={scheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}>
      <Icon as={scheme === 'dark' ? SunIcon : MoonStarIcon} className="size-6" />
    </Button>
  );

  return (
    <Tabs
      // 데스크톱 웹은 셸(SideNav·TopBar)이 크롬을 맡으므로 탭바·헤더를 숨긴다.
      tabBar={hideChrome ? () => null : undefined}
      screenOptions={{
        headerShown: !hideChrome,
        sceneStyle: hideChrome ? { backgroundColor: 'transparent' } : undefined,
        // iOS 26: 헤더도 콘텐츠 위에 띄우고 뒤를 흐린다. 화면은 useTabScrollInsets로 헤더 높이만큼 비운다
        headerTransparent: translucent,
        headerStyle: { backgroundColor: translucent ? 'transparent' : colors.background },
        // 배경색을 반쯤 깔아 맨 위에서는 화면과 이어지고, 스크롤하면 지나가는 콘텐츠만 흐리게 비친다
        headerBackground: translucent
          ? () => (
              <BlurView tint={scheme} intensity={60} style={StyleSheet.absoluteFill}>
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(scheme, 'background', scheme === 'dark' ? 0.8 : 0.72) }]}
                />
              </BlurView>
            )
          : undefined,
        headerLeft: () => (
          <View className="mb-2 ml-4">
            <ThemeToggle />
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
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.foregroundSubtle,
        // iOS 26: 탭바를 콘텐츠 위에 띄우고 뒤를 흐린다. 안드로이드·웹은 불투명 + 윗선 (설계 5.4)
        tabBarStyle: {
          backgroundColor: translucent ? 'transparent' : colors.surface1,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 58 + bottomPadding,
          ...(translucent ? { position: 'absolute' as const } : null),
        },
        tabBarBackground: translucent
          ? () => (
              <BlurView tint={blurTint} intensity={80} style={StyleSheet.absoluteFill} />
            )
          : undefined,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <Icon as={HomeIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          // 탭바 5칸을 지키려고 검색 탭이 아티스트·시대·앨범 입구를 겸한다 (기획 C)
          title: '둘러보기',
          tabBarIcon: ({ color }) => <Icon as={CompassIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: '비교',
          tabBarIcon: ({ color }) => <CompareIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="concerts"
        options={{
          title: '공연',
          tabBarIcon: ({ color }) => <TicketIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '레퍼토리',
          tabBarIcon: ({ color }) => <Icon as={BookmarkIcon} color={color} size={24} />,
        }}
      />
      {/* 탭바에는 없고 둘러보기·사이드바에서 들어가는 화면 */}
      <Tabs.Screen name="artists" options={{ href: null, title: '아티스트' }} />
      <Tabs.Screen name="timeline" options={{ href: null, title: '타임라인' }} />
      <Tabs.Screen name="albums" options={{ href: null, title: '앨범' }} />
    </Tabs>
  );
}
