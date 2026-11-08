import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, PerformerKindIcon, TicketIcon } from '@/components/ui/icons';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { buildLibraryEntries, groupLibraryEntries, type LibraryEntry } from '@/lib/data/library';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import { createPrefetchHandlers, type PrefetchTarget, prefetchTargetFromHref } from '@/lib/navigation/prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { useMyRepertoire } from '@/lib/query/hooks/useRecordings';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, Link, usePathname } from 'expo-router';
import { DiscIcon, HomeIcon, SearchIcon } from 'lucide-react-native';
import * as React from 'react';
import { msg, t } from '@/lib/i18n';
import { Pressable, ScrollView, View } from 'react-native';

import { useCommandPalette } from './command-palette-context';
import { Kbd, modKeyLabel } from './kbd';

type NavIconProps = { size: number; className: string };

interface NavItem {
  label: string;
  href: Href;
  /** 이 경로들 중 하나로 시작하면 활성 */
  match: readonly string[];
  /** 호버하면 미리 받을 첫 화면 데이터 */
  prefetch?: PrefetchTarget;
  renderIcon: (props: NavIconProps) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: msg('홈'), href: '/home', match: ['/home'], renderIcon: (p) => <Icon as={HomeIcon} {...p} /> },
  { label: msg('검색'), href: '/search', match: ['/search'], renderIcon: (p) => <Icon as={SearchIcon} {...p} /> },
  {
    label: msg('비교'),
    href: '/compare',
    match: ['/compare'],
    prefetch: { kind: 'compare-catalog' },
    renderIcon: (p) => <CompareIcon {...p} />,
  },
  {
    label: msg('아티스트'),
    href: '/artists',
    match: ['/artists', '/timeline', '/composer', '/artist/'],
    renderIcon: (p) => <PerformerKindIcon {...p} />,
  },
  { label: msg('앨범'), href: '/albums', match: ['/albums'], renderIcon: (p) => <Icon as={DiscIcon} {...p} /> },
  { label: msg('공연'), href: '/concerts', match: ['/concert'], renderIcon: (p) => <TicketIcon {...p} /> },
];

/** 사이드바 레퍼토리는 종류마다 최근 몇 개만. 나머지는 레퍼토리 탭에서 */
const LIBRARY_PER_SECTION = 4;

export function SideNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
  const queryClient = useQueryClient();

  return (
    <View
      className={cn(
        'shrink-0 rounded-[9px] bg-surface-1 py-4',
        collapsed ? 'w-[60px] items-center px-2' : 'w-[232px] px-2.5'
      )}>
      <View className={cn('flex-row items-center gap-2.5 pb-5', collapsed ? 'justify-center' : 'px-2.5')}>
        <BrandLogo size={28} />
        {!collapsed && <Text className="text-[15px] font-bold tracking-tight">ClassicMap</Text>}
      </View>

      {NAV_ITEMS.map((item) => {
        const active = item.match.some((prefix) => pathname.startsWith(prefix));
        return (
          <Link key={item.label} href={item.href} asChild>
            <Pressable
              {...createPrefetchHandlers(queryClient, active ? null : item.prefetch)}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className={cn(
                'h-10 flex-row items-center gap-3.5 rounded-md transition-colors duration-instant',
                collapsed ? 'w-10 justify-center' : 'px-2.5',
                active ? 'bg-surface-3' : 'hover:bg-surface-2'
              )}>
              {item.renderIcon({
                size: 20,
                className: active ? 'text-foreground' : 'text-foreground-muted',
              })}
              {!collapsed && (
                <Text
                  className={cn(
                    'flex-1 text-[13.5px] font-semibold',
                    active ? 'text-foreground' : 'text-foreground-muted'
                  )}>
                  {t(item.label)}
                </Text>
              )}
              {!collapsed && item.href === '/search' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('빠른 검색 열기')}
                  onPress={(event) => {
                    event.preventDefault();
                    setOpen(true);
                  }}>
                  <Kbd>{`${modKeyLabel()}K`}</Kbd>
                </Pressable>
              ) : null}
            </Pressable>
          </Link>
        );
      })}


      {!collapsed && <Library />}
    </View>
  );
}

function Library() {
  const { isSignedIn } = useAuth();
  const favorites = useMyRepertoire(isSignedIn === true);
  const queryClient = useQueryClient();

  const sections = React.useMemo(
    () => (favorites.data ? groupLibraryEntries(buildLibraryEntries(favorites.data), LIBRARY_PER_SECTION) : []),
    [favorites.data]
  );

  return (
    <View className="mt-4 flex-1 border-t border-border pt-4">
      <Text variant="micro" className="px-2.5 pb-2.5 uppercase tracking-widest">
        {t('레퍼토리')}
      </Text>
      {!isSignedIn ? (
        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="rounded-md px-2.5 py-2 hover:bg-surface-2">
            <Text variant="caption" className="text-foreground-muted">
              {t('로그인하면 즐겨찾기한 작곡가·연주자가 여기에 모여요.')}
            </Text>
          </Pressable>
        </Link>
      ) : favorites.isError ? (
        <Pressable className="rounded-md px-2.5 py-2 hover:bg-surface-2" onPress={() => favorites.refetch()}>
          <Text variant="caption" className="text-foreground-muted">
            {t('즐겨찾기를 못 불러왔어요. 눌러서 다시 시도해 주세요.')}
          </Text>
        </Pressable>
      ) : sections.length === 0 && !favorites.isLoading ? (
        <Text variant="caption" className="px-2.5 py-2 text-foreground-muted">
          {t('작곡가나 연주자를 즐겨찾기하면 여기에 모여요.')}
        </Text>
      ) : (
        <ScrollView className="-mx-1" showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <View key={section.kind} className="mb-2.5">
              {/* 사람·작품·공연이 섞이지 않게 종류별로 묶는다. 악기는 연주자 행 부제로 보인다 */}
              <View className="mx-1 flex-row items-baseline gap-1.5 px-2 pb-1 pt-1">
                <Text className="text-[11.5px] font-semibold text-foreground-subtle">{t(section.label)}</Text>
                <Text className="text-[11px] text-foreground-subtle/70">{section.total}</Text>
              </View>
              {section.entries.map((entry) => (
                <Link key={entry.key} href={entry.href as Href} asChild>
                  <Pressable
                    {...createPrefetchHandlers(queryClient, prefetchTargetFromHref(entry.href))}
                    className="mx-1 flex-row items-center gap-3 rounded-md px-2 py-[7px] hover:bg-surface-2">
                    <LibraryThumb entry={entry} />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-[13px] font-semibold">
                        {entry.title}
                      </Text>
                      <Text numberOfLines={1} className="text-[11.5px] text-foreground-muted">
                        {entry.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
              {section.total > section.entries.length ? (
                <Link href={`/library?kind=${section.kind}` as Href} asChild>
                  <Pressable className="mx-1 rounded-md px-2 py-1.5 hover:bg-surface-2">
                    <Text className="text-[12px] text-foreground-muted">
                      {t('{kind} {count}개 더 보기', { kind: t(section.label), count: section.total - section.entries.length })}
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LibraryThumb({ entry }: { entry: LibraryEntry }) {
  const image = useComposerAvatar(entry.composerId, entry.image);
  return <EntityThumb name={entry.title} image={image} shape={entry.shape} size={38} aspect={entry.kind === 'concert' ? 4 / 3 : 1} />;
}
