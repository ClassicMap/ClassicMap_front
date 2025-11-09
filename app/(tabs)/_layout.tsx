import { Tabs } from 'expo-router';
import { HomeIcon, MusicIcon, CalendarIcon, PlayCircleIcon, ClockIcon, MoonStarIcon, SunIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';

export default function TabsLayout() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const ThemeToggle = () => (
    <Button onPress={toggleColorScheme} size="icon" variant="ghost" className="rounded-full">
      <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} className="size-6" />
    </Button>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
        headerLeft: () => (
          <View className="ml-4 mb-2">
            <ThemeToggle />
          </View>
        ),
        headerRight: () => (
          <View className="mr-4 mb-2">
            <UserMenu />
          </View>
        ),
        headerTitle: '',
        headerShadowVisible: false,
        headerStatusBarHeight: 52,
        tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#666',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
          borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
          paddingTop: 8,
          paddingBottom: 32,
          height: 90,
        },
        // 탭 전환 시 화면 언마운트 방지 (상태 유지)
        unmountOnBlur: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon as={HomeIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="artists"
        options={{
          title: '아티스트',
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon as={MusicIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="concerts"
        options={{
          title: '공연',
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon as={CalendarIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: '비교',
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon as={PlayCircleIcon} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: '타임라인',
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon as={ClockIcon} color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
