import { Tabs } from 'expo-router';
import { BookmarkIcon, HomeIcon, MoonStarIcon, SearchIcon, SunIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, TicketIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 탭 구성 (설계 문서 6.0): 홈 · 검색 · 비교 · 공연 · 레퍼토리.
 * 아티스트 목록과 타임라인은 탭에서 내리고 경로만 남긴다 (검색 둘러보기·홈에서 들어감).
 */
export function TabsLayout({ hideChrome = false }: { hideChrome?: boolean }) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? insets.bottom + 8 : 20;
  const translucent = Platform.OS === 'ios';

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
        headerTransparent: false,
        headerStyle: { backgroundColor: colors.background },
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
        headerStatusBarHeight: 52,
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
              <BlurView
                tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                intensity={80}
                style={StyleSheet.absoluteFill}
              />
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
          title: '검색',
          tabBarIcon: ({ color }) => <Icon as={SearchIcon} color={color} size={24} />,
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
      {/* 탭에서는 내리고 경로만 유지 */}
      <Tabs.Screen name="artists" options={{ href: null, title: '아티스트' }} />
      <Tabs.Screen name="timeline" options={{ href: null, title: '타임라인' }} />
    </Tabs>
  );
}
