import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useUser } from '@clerk/clerk-expo';
import { Stack, Redirect } from 'expo-router';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { UserPreferences } from '@/lib/api/mock-db';

const SCREEN_OPTIONS = {
  header: () => (
    <View className="top-safe absolute left-0 right-0 flex-row justify-between px-4 py-2 web:mx-2 z-10">
      <ThemeToggle />
      <UserMenu />
    </View>
  ),
};

export default function Screen() {
  const { user } = useUser();
  const { profile, isFirstLogin, loading, completeOnboarding, updatePreferences } = useUserProfile();

  const handleOnboardingComplete = async (preferences: Partial<UserPreferences>) => {
    await updatePreferences(preferences);
    await completeOnboarding();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 로그인 여부와 관계없이 홈 탭으로 리다이렉트 (모든 콘텐츠 공개)
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      {/* 온보딩 모달은 로그인된 사용자에게만 표시 */}
      {user && (
        <OnboardingModal
          visible={isFirstLogin}
          onComplete={handleOnboardingComplete}
        />
      )}
      <Redirect href="/(tabs)/home" />
    </>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button onPress={toggleColorScheme} size="icon" variant="ghost" className="rounded-full">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-6" />
    </Button>
  );
}
