import { Tabs } from 'expo-router';
import { BookmarkIcon, CompassIcon, HomeIcon } from 'lucide-react-native';
import { useChromeHeaderOptions } from '@/components/layout/chrome-header';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, TicketIcon } from '@/components/shared/icons';
import { THEME } from '@/lib/theme';
import { t, useLocale } from '@/lib/i18n';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CHROME_TRANSLUCENT } from '@/hooks/use-tab-chrome';
import { runRouteTransition } from '@/lib/navigation/view-transition';

/**
 * 모바일 탭 구성: 홈 · 둘러보기 · 비교 · 공연 · 레퍼토리.
 * 아티스트와 타임라인은 탭바에 두지 않고 둘러보기에서 들어간다. 데스크톱은 사이드바에 아티스트가 있다.
 */
export function TabsLayout({ hideChrome = false }: { hideChrome?: boolean }) {
  useLocale();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? insets.bottom + 8 : 20;
  const translucent = TAB_CHROME_TRANSLUCENT;
  const blurTint = scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  const header = useChromeHeaderOptions();

  return (
    <Tabs
      // 데스크톱 웹은 셸(SideNav·TopBar)이 크롬을 맡으므로 탭바·헤더를 숨긴다.
      tabBar={hideChrome ? () => null : undefined}
      // 모바일 웹: 탭바 이동은 expo-router 를 거치지 않으므로 여기서 화면 전환으로 감싼다
      screenListeners={
        Platform.OS === 'web'
          ? ({ navigation, route }) => ({
              tabPress: (event) => {
                if (navigation.isFocused()) return;
                event.preventDefault();
                runRouteTransition(() => navigation.navigate(route.name, route.params));
              },
            })
          : undefined
      }
      // 앱: 뒤로(안드로이드)는 지나온 탭 순서대로 돌아간다. 가려진 탭은 다시 그리지 않는다
      backBehavior="history"
      screenOptions={{
        ...header,
        headerShown: !hideChrome,
        sceneStyle: hideChrome ? { backgroundColor: 'transparent' } : undefined,
        freezeOnBlur: Platform.OS !== 'web',
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
          ? () => <BlurView tint={blurTint} intensity={80} style={StyleSheet.absoluteFill} />
          : undefined,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t('홈'),
          tabBarIcon: ({ color }) => <Icon as={HomeIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          // 탭바 5칸을 지키려고 검색 탭이 아티스트·시대·앨범 입구를 겸한다 (기획 C)
          title: t('둘러보기'),
          tabBarIcon: ({ color }) => <Icon as={CompassIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: t('비교'),
          tabBarIcon: ({ color }) => <CompareIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="concerts"
        options={{
          title: t('공연'),
          tabBarIcon: ({ color }) => <TicketIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('레퍼토리'),
          tabBarIcon: ({ color }) => <Icon as={BookmarkIcon} color={color} size={24} />,
        }}
      />
      {/* 탭바에는 없고 둘러보기·사이드바에서 들어가는 화면 */}
      <Tabs.Screen name="artists" options={{ href: null, title: t('아티스트') }} />
      <Tabs.Screen name="timeline" options={{ href: null, title: t('타임라인') }} />
      <Tabs.Screen name="albums" options={{ href: null, title: t('앨범') }} />
    </Tabs>
  );
}
