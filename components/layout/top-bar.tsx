import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ChevronRightIcon, MoonStarIcon, SearchIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { t, useLocale } from '@/lib/i18n';
import { Pressable, View } from 'react-native';

import { useCommandPalette } from '@/features/search/components/command-palette-context';
import { Kbd, modKeyLabel } from '@/components/ui/kbd';
import { SHELL } from '@/lib/layout/shell-layout';
import { SidebarTrigger } from './sidebar';

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  useLocale();
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

/** 상단바. 사이드바를 접고 펼 수 있는 창이면 맨 왼쪽에 접기 단추를 둔다(shadcn SidebarTrigger 자리) */
export function TopBar({ sidebarTrigger = false }: { sidebarTrigger?: boolean }) {
  useLocale();
  const router = useRouter();
  const { setOpen } = useCommandPalette();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { locale, setLocale } = useLocale();

  return (
    <View
      className="shrink-0 flex-row items-center gap-2.5 px-5"
      style={{ height: SHELL.topBarHeight }}>
      {sidebarTrigger ? <SidebarTrigger className="-ml-2" /> : null}
      <RoundButton label={t('뒤로')} onPress={() => (router.canGoBack() ? router.back() : router.push('/home'))}>
        <Icon as={ChevronLeftIcon} size={18} className="text-foreground-muted" />
      </RoundButton>
      <RoundButton label={t('앞으로')} onPress={() => window.history.forward()}>
        <Icon as={ChevronRightIcon} size={18} className="text-foreground-muted" />
      </RoundButton>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('검색 열기')}
        onPress={() => setOpen(true)}
        className="ml-2 h-10 w-[360px] max-w-[45%] flex-row items-center gap-2.5 rounded-full border border-transparent bg-surface-2 px-4 transition-colors duration-instant hover:border-border-strong">
        <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
        <Text numberOfLines={1} className="flex-1 text-body-sm text-foreground-subtle">
          {t('무엇을 들어볼까요')}
        </Text>
        <Kbd>{`${modKeyLabel()}K`}</Kbd>
      </Pressable>

      <View className="ml-auto flex-row items-center gap-1.5">
        {/* 로그인하지 않아도 언어를 바꿀 수 있게. 바꿀 언어의 이름을 보인다 */}
        <RoundButton
          label={locale === 'ko' ? t('영어로 보기') : t('한국어로 보기')}
          onPress={() => setLocale(locale === 'ko' ? 'en' : 'ko')}>
          <Text className="text-[11px] font-semibold text-foreground-muted">{locale === 'ko' ? 'EN' : '한'}</Text>
        </RoundButton>
        <RoundButton
          label={colorScheme === 'dark' ? t('라이트 모드로 전환') : t('다크 모드로 전환')}
          onPress={toggleColorScheme}>
          <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={16} className="text-foreground-muted" />
        </RoundButton>
        <UserMenu />
      </View>
    </View>
  );
}
