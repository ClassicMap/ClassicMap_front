import { RepertoireList } from '@/components/library/repertoire-list';
import { ProfileAvatar, RatingGrid, type RatingSortKey, StatTile } from '@/components/profile/profile-parts';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getFavoriteCount } from '@/lib/data/library';
import { usePublicProfile } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, EyeOffIcon, UserXIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

type Tab = 'ratings' | 'repertoire' | 'collections';

function parseUserId(id: string | string[] | undefined): number | undefined {
  const rawId = Array.isArray(id) ? id[0] : id;
  if (!rawId) return undefined;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** 공개 프로필: 마이페이지와 같은 틀, 본인이 공개한 것만 보인다 */
export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = parseUserId(id);
  const query = usePublicProfile(userId);
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const [tab, setTab] = React.useState<Tab>('ratings');
  const [sort, setSort] = React.useState<RatingSortKey>('recent');

  const profile = query.data;
  const displayName = profile?.displayName || (userId ? `사용자 #${userId}` : '사용자');

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.push('/home' as Href))}
      accessibilityLabel="뒤로"
      className="mt-12 size-11 items-center justify-center rounded-full bg-surface-2">
      <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
    </Pressable>
  );

  if (query.isLoading) {
    return (
      <View className="flex-1 bg-background p-6 web:bg-surface-1">
        <View className="flex-row items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <View className="flex-1 gap-3">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </View>
        </View>
      </View>
    );
  }

  if (query.isError || !profile) {
    return (
      <View className="flex-1 bg-background px-4 web:bg-surface-1">
        {!wide ? back : null}
        <EmptyState
          icon={query.isError ? AlertCircleIcon : UserXIcon}
          tone={query.isError ? 'error' : 'empty'}
          title={query.isError ? '프로필을 불러오지 못했어요' : '프로필을 찾을 수 없어요'}
          description={
            query.isError ? '연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.' : '주소가 맞는지 확인해 주세요.'
          }
          action={query.isError ? { label: '다시 시도', onPress: () => query.refetch() } : undefined}
        />
      </View>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'ratings', label: '평가한 공연', count: profile.ratings?.length },
    { key: 'repertoire', label: '레퍼토리', count: profile.favorites ? getFavoriteCount(profile.favorites) : undefined },
    { key: 'collections', label: '컬렉션', count: profile.collections?.length },
  ];

  const content =
    tab === 'ratings' ? (
      !profile.ratings ? (
        <PrivateState label="평가한 공연" />
      ) : profile.ratings.length === 0 ? (
        <EmptyState compact icon={EyeOffIcon} title="아직 평가한 공연이 없어요" />
      ) : (
        <RatingGrid
          ratings={profile.ratings}
          sortKey={sort}
          onSortChange={setSort}
          minItemWidth={wide ? 150 : 100}
          onOpen={(concertId) => router.push(`/concert/${concertId}` as Href)}
        />
      )
    ) : tab === 'repertoire' ? (
      !profile.favorites ? (
        <PrivateState label="레퍼토리" />
      ) : getFavoriteCount(profile.favorites) === 0 ? (
        <EmptyState compact icon={EyeOffIcon} title="아직 레퍼토리가 비어 있어요" />
      ) : (
        <RepertoireList favorites={profile.favorites} />
      )
    ) : !profile.collections ? (
      <PrivateState label="컬렉션" />
    ) : (
      <View className="flex-row flex-wrap gap-2">
        {profile.collections.map((collection) => (
          <View key={collection.id} className="min-w-[160px] grow rounded-lg bg-surface-2 px-4 py-3">
            <Text className="text-[22px] font-bold tabular-nums text-foreground">{collection.count}</Text>
            <Text variant="caption">{collection.title}</Text>
          </View>
        ))}
      </View>
    );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        contentContainerClassName={cn('pb-24', wide ? 'px-7 pt-3' : 'px-4')}>
        {!wide ? back : null}
        <View className={cn(wide ? 'flex-row gap-11' : 'mt-5 gap-5')}>
          <View className={cn('gap-5', wide && 'w-[300px]')}>
            <View className={cn(wide ? 'gap-5' : 'flex-row items-center gap-4')}>
              <ProfileAvatar name={displayName} uri={profile.avatarUrl} size={wide ? 112 : 64} />
              <View className={cn('min-w-0', !wide && 'flex-1')}>
                <Text variant="micro" className="uppercase tracking-widest">
                  공개 프로필
                </Text>
                <Text className={cn('mt-1 font-bold text-foreground', wide ? 'text-[28px] leading-9' : 'text-title-3')}>
                  {displayName}
                </Text>
                {profile.bio ? (
                  <Text variant="bodySm" className="mt-2 text-foreground-muted">
                    {profile.bio}
                  </Text>
                ) : null}
              </View>
            </View>
            {profile.summary ? (
              <View className="flex-row flex-wrap gap-2">
                <View className="w-[47%] grow">
                  <StatTile value={String(profile.summary.ratingsCount)} label="평가한 공연" />
                </View>
                <View className="w-[47%] grow">
                  <StatTile
                    value={profile.summary.ratingsCount > 0 ? profile.summary.averageRating.toFixed(1) : '–'}
                    label="평균 별점"
                    accent
                  />
                </View>
                <View className="w-[47%] grow">
                  <StatTile value={String(profile.summary.favoritesCount)} label="레퍼토리" />
                </View>
                <View className="w-[47%] grow">
                  <StatTile value={String(profile.summary.collectionsCount)} label="컬렉션" />
                </View>
              </View>
            ) : (
              <Text variant="caption" className="text-foreground-subtle">
                활동 요약은 비공개예요.
              </Text>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row gap-7 border-b border-border" accessibilityRole="tablist">
              {tabs.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === item.key }}
                  className={cn(
                    '-mb-px h-11 flex-row items-center gap-1.5 border-b-2',
                    tab === item.key ? 'border-primary' : 'border-transparent'
                  )}>
                  <Text className={cn('text-body font-semibold', tab === item.key ? 'text-foreground' : 'text-foreground-muted')}>
                    {item.label}
                  </Text>
                  {item.count !== undefined ? (
                    <Text variant="caption" className="tabular-nums">
                      {item.count}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
            <View className="mt-5">{content}</View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PrivateState({ label }: { label: string }) {
  return <EmptyState compact icon={EyeOffIcon} title="비공개예요" description={`이 사용자가 ${label} 목록을 공개하지 않았어요.`} />;
}
