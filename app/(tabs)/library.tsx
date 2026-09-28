import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  buildLibraryEntries,
  libraryKindLabel,
  type LibraryKind,
} from '@/lib/data/library';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, BookmarkIcon, LogInIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

type Filter = 'all' | LibraryKind;

const FILTERS: Filter[] = ['all', 'composer', 'artist', 'piece', 'concert'];

export default function LibraryScreen() {
  const router = useRouter();
  const { isSignedIn, loading } = useAuth();
  const { layout } = useBreakpoint();
  const isWide = layout === 'desktop' || layout === 'wide';
  const favorites = useMyFavorites(isSignedIn && !loading);
  const [filter, setFilter] = React.useState<Filter>('all');

  const entries = React.useMemo(
    () => (favorites.data ? buildLibraryEntries(favorites.data) : []),
    [favorites.data]
  );
  const counts = React.useMemo(() => {
    const map: Record<Filter, number> = { all: entries.length, composer: 0, artist: 0, piece: 0, concert: 0 };
    for (const entry of entries) map[entry.kind] += 1;
    return map;
  }, [entries]);
  const visible = filter === 'all' ? entries : entries.filter((entry) => entry.kind === filter);

  const container = cn('px-4 pb-16', isWide && 'mx-auto w-full max-w-[880px] px-6');

  if (!loading && !isSignedIn) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon={LogInIcon}
          title="로그인하면 레퍼토리를 모을 수 있어요"
          description="작곡가·연주자·작품·공연의 하트를 누르면 여기에 모여요."
          action={{ label: '로그인', onPress: () => router.push('/(auth)/sign-in') }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={container}
      refreshControl={
        <RefreshControl refreshing={favorites.isRefetching} onRefresh={() => favorites.refetch()} />
      }>
      <Text variant="title1" className="mt-4">
        레퍼토리
      </Text>

      {favorites.isLoading || loading ? (
        <SkeletonList rows={6} className="mt-4" />
      ) : favorites.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="레퍼토리를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => favorites.refetch() }}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="아직 레퍼토리가 비어 있어요"
          description="작곡가·연주자·공연의 하트를 누르면 여기에 모여요."
          action={{ label: '비교할 수 있는 작품 보기', onPress: () => router.push('/compare') }}
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2">
            {FILTERS.filter((key) => key === 'all' || counts[key] > 0).map((key) => (
              <Chip
                key={key}
                label={key === 'all' ? '전체' : libraryKindLabel(key)}
                count={counts[key]}
                selected={filter === key}
                onPress={() => setFilter(key)}
              />
            ))}
          </ScrollView>
          <View className="mt-3">
            {visible.map((entry) => (
              <Pressable
                key={entry.key}
                onPress={() => router.push(entry.href as Href)}
                className="-mx-2 min-h-16 flex-row items-center gap-3 rounded-md px-2 py-2 active:bg-surface-2 web:hover:bg-surface-2">
                <EntityThumb
                  name={entry.title}
                  image={entry.image}
                  shape={entry.shape}
                  size={48}
                  aspect={entry.kind === 'concert' ? 4 / 3 : 1}
                />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-body font-semibold text-foreground">
                    {entry.title}
                  </Text>
                  <Text variant="caption" numberOfLines={1} className="mt-0.5">
                    {entry.kind === 'composer' || entry.kind === 'artist'
                      ? entry.subtitle
                      : `${libraryKindLabel(entry.kind)} · ${entry.subtitle}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
