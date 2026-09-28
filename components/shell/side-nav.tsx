import { FallbackArt } from '@/components/ui/fallback-art';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, EraIcon, PerformerKindIcon, TicketIcon } from '@/components/ui/icons';
import { OptimizedImage } from '@/components/optimized-image';
import { Text } from '@/components/ui/text';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils/image';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, Link, usePathname } from 'expo-router';
import { HomeIcon, SearchIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useCommandPalette } from './command-palette-context';
import { Kbd, modKeyLabel } from './kbd';

type NavIconProps = { size: number; className: string };

interface NavItem {
  label: string;
  href: Href;
  /** 이 경로로 시작하면 활성 */
  match: string;
  renderIcon: (props: NavIconProps) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: '홈', href: '/home', match: '/home', renderIcon: (p) => <Icon as={HomeIcon} {...p} /> },
  { label: '비교', href: '/compare', match: '/compare', renderIcon: (p) => <CompareIcon {...p} /> },
  {
    label: '아티스트',
    href: '/artists',
    match: '/artist',
    renderIcon: (p) => <PerformerKindIcon {...p} />,
  },
  { label: '공연', href: '/concerts', match: '/concert', renderIcon: (p) => <TicketIcon {...p} /> },
  { label: '타임라인', href: '/timeline', match: '/timeline', renderIcon: (p) => <EraIcon {...p} /> },
];

/** 레퍼토리 목록에 올릴 즐겨찾기 최대 수 */
const LIBRARY_LIMIT = 12;

interface LibraryEntry {
  key: string;
  title: string;
  subtitle: string;
  image?: string | null;
  shape: 'circle' | 'square';
  href: Href;
}

export function SideNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();

  return (
    <View
      className={cn(
        'shrink-0 rounded-[9px] bg-surface-1 py-4',
        collapsed ? 'w-[60px] items-center px-2' : 'w-[232px] px-2.5'
      )}>
      <View className={cn('flex-row items-center gap-2.5 pb-5', collapsed ? 'justify-center' : 'px-2.5')}>
        <View className="size-7 items-center justify-center rounded-sm bg-primary">
          <CompareIcon size={16} className="text-primary-foreground" />
        </View>
        {!collapsed && <Text className="text-[15px] font-bold tracking-tight">ClassicMap</Text>}
      </View>

      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.match);
        return (
          <Link key={item.label} href={item.href} asChild>
            <Pressable
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
                    'text-[13.5px] font-semibold',
                    active ? 'text-foreground' : 'text-foreground-muted'
                  )}>
                  {item.label}
                </Text>
              )}
            </Pressable>
          </Link>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="검색 열기"
        onPress={() => setOpen(true)}
        className={cn(
          'h-10 flex-row items-center gap-3.5 rounded-md hover:bg-surface-2',
          collapsed ? 'w-10 justify-center' : 'px-2.5'
        )}>
        <Icon as={SearchIcon} size={20} className="text-foreground-muted" />
        {!collapsed && (
          <>
            <Text className="flex-1 text-[13.5px] font-semibold text-foreground-muted">검색</Text>
            <Kbd>{`${modKeyLabel()}K`}</Kbd>
          </>
        )}
      </Pressable>

      {!collapsed && <Library />}
    </View>
  );
}

function Library() {
  const { isSignedIn } = useAuth();
  const favorites = useMyFavorites(isSignedIn === true);

  const entries: LibraryEntry[] = React.useMemo(() => {
    const data = favorites.data;
    if (!data) return [];
    const list: (LibraryEntry & { createdAt: string })[] = [
      ...data.composers.map((item) => ({
        key: `c-${item.composerId}`,
        title: item.name,
        subtitle: '작곡가',
        image: item.avatarUrl,
        shape: 'circle' as const,
        href: `/composer/${item.composerId}` as Href,
        createdAt: item.createdAt,
      })),
      ...data.artists.map((item) => ({
        key: `a-${item.artistId}`,
        title: item.name,
        subtitle: getArtistCategoryLabel(item.category),
        image: item.imageUrl,
        shape: 'circle' as const,
        href: `/artist/${item.artistId}` as Href,
        createdAt: item.createdAt,
      })),
      ...data.pieces.map((item) => ({
        key: `p-${item.pieceId}`,
        title: item.title,
        subtitle: item.composerName,
        shape: 'square' as const,
        href: `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}` as Href,
        createdAt: item.createdAt,
      })),
      ...data.concerts.map((item) => ({
        key: `k-${item.concertId}`,
        title: item.title,
        subtitle: [item.startDate, item.facilityName].filter(Boolean).join(' '),
        image: item.posterUrl,
        shape: 'square' as const,
        href: `/concert/${item.concertId}` as Href,
        createdAt: item.createdAt,
      })),
    ];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIBRARY_LIMIT);
  }, [favorites.data]);

  return (
    <View className="mt-4 flex-1 border-t border-border pt-4">
      <Text variant="micro" className="px-2.5 pb-2.5 uppercase tracking-widest">
        레퍼토리
      </Text>
      {!isSignedIn ? (
        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="rounded-md px-2.5 py-2 hover:bg-surface-2">
            <Text variant="caption" className="text-foreground-muted">
              로그인하면 즐겨찾기한 작곡가·연주자가 여기에 모여요.
            </Text>
          </Pressable>
        </Link>
      ) : favorites.isError ? (
        <Pressable className="rounded-md px-2.5 py-2 hover:bg-surface-2" onPress={() => favorites.refetch()}>
          <Text variant="caption" className="text-foreground-muted">
            즐겨찾기를 못 불러왔어요. 눌러서 다시 시도해 주세요.
          </Text>
        </Pressable>
      ) : entries.length === 0 && !favorites.isLoading ? (
        <Text variant="caption" className="px-2.5 py-2 text-foreground-muted">
          작곡가나 연주자를 즐겨찾기하면 여기에 모여요.
        </Text>
      ) : (
        <ScrollView className="-mx-1" showsVerticalScrollIndicator={false}>
          {entries.map((entry) => (
            <Link key={entry.key} href={entry.href} asChild>
              <Pressable className="mx-1 flex-row items-center gap-3 rounded-md px-2 py-[7px] hover:bg-surface-2">
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
        </ScrollView>
      )}
    </View>
  );
}

function LibraryThumb({ entry }: { entry: LibraryEntry }) {
  const radius = entry.shape === 'circle' ? 19 : 4;
  const fallback = <FallbackArt name={entry.title} shape={entry.shape} size={38} />;
  if (!entry.image) return fallback;
  return (
    <OptimizedImage
      uri={getImageUrl(entry.image)}
      fallbackComponent={fallback}
      style={{ width: 38, height: 38, borderRadius: radius }}
    />
  );
}
