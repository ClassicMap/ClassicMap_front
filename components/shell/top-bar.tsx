import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ChevronRightIcon, MoonStarIcon, SearchIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { useCommandPalette } from './command-palette-context';
import { Kbd, modKeyLabel } from './kbd';

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-8 items-center justify-center rounded-full bg-background/60 hover:bg-surface-3">
      {children}
    </Pressable>
  );
}

export function TopBar() {
  const router = useRouter();
  const { setOpen } = useCommandPalette();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View className="h-14 shrink-0 flex-row items-center gap-2.5 px-5">
      <RoundButton label="뒤로" onPress={() => (router.canGoBack() ? router.back() : router.push('/home'))}>
        <Icon as={ChevronLeftIcon} size={18} className="text-foreground-muted" />
      </RoundButton>
      <RoundButton label="앞으로" onPress={() => window.history.forward()}>
        <Icon as={ChevronRightIcon} size={18} className="text-foreground-muted" />
      </RoundButton>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel="검색 열기"
        onPress={() => setOpen(true)}
        className="ml-2 h-10 w-[360px] max-w-[45%] flex-row items-center gap-2.5 rounded-full border border-transparent bg-surface-2 px-4 transition-colors duration-instant hover:border-border-strong">
        <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
        <Text numberOfLines={1} className="flex-1 text-body-sm text-foreground-subtle">
          무엇을 들어볼까요
        </Text>
        <Kbd>{`${modKeyLabel()}K`}</Kbd>
      </Pressable>

      <View className="ml-auto flex-row items-center gap-1.5">
        <RoundButton
          label={colorScheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          onPress={toggleColorScheme}>
          <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={16} className="text-foreground-muted" />
        </RoundButton>
        <UserMenu />
      </View>
    </View>
  );
}
