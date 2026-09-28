import { RepertoireList } from '@/components/library/repertoire-list';
import { ProfileAvatar, RatingGrid, ratingStats, type RatingSortKey, StatTile } from '@/components/profile/profile-parts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getFavoriteCount } from '@/lib/data/library';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyFavorites, useMyRatings, useProfileVisibility } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { type Href, Redirect, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  EyeIcon,
  LogOutIcon,
  SettingsIcon,
  StarIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

type Tab = 'ratings' | 'repertoire';

/** 마이페이지 (3차 시안): 왼쪽은 누구인가와 얼마나 들었나, 오른쪽은 평가한 공연과 레퍼토리 */
export default function MyPageScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerkAuth();
  const { profile: authProfile, loading: authLoading, isSignedIn } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const [tab, setTab] = React.useState<Tab>('ratings');
  const [sort, setSort] = React.useState<RatingSortKey>('recent');

  const enabled = isSignedIn && !authLoading;
  const ratingsQuery = useMyRatings(enabled);
  const favoritesQuery = useMyFavorites(enabled);
  const visibilityQuery = useProfileVisibility(enabled);

  if (!authLoading && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const ratings = ratingsQuery.data ?? [];
  const favorites = favoritesQuery.data;
  const stats = ratingStats(ratings);
  const favoriteCount = favorites ? getFavoriteCount(favorites) : 0;
  const email = user?.emailAddresses[0]?.emailAddress;
  const visibility = visibilityQuery.data;
  const displayName = visibility?.displayName || user?.fullName || email || '사용자';
  const avatarUrl = visibility?.avatarUrl || user?.imageUrl;

  const refreshing = ratingsQuery.isRefetching || favoritesQuery.isRefetching || visibilityQuery.isRefetching;
  const refresh = () => {
    void ratingsQuery.refetch();
    void favoritesQuery.refetch();
    void visibilityQuery.refetch();
  };

  const confirmSignOut = () =>
    Alert.alert('로그아웃할까요?', '레퍼토리와 별점은 계정에 남아 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/home' as Href);
        },
      },
    ]);

  const openPublicProfile = authProfile?.id ? () => router.push(`/users/${authProfile.id}` as Href) : undefined;

  const identity = (
    <View className={cn(wide ? 'gap-5' : 'flex-row items-center gap-4')}>
      <ProfileAvatar name={displayName} uri={avatarUrl} size={wide ? 112 : 64} />
      <View className={cn('min-w-0', !wide && 'flex-1')}>
        <Text numberOfLines={1} className={cn('font-bold text-foreground', wide ? 'text-[28px] leading-9' : 'text-title-3')}>
          {displayName}
        </Text>
        {email ? (
          <Text variant="caption" numberOfLines={1} className="mt-1">
            {email}
          </Text>
        ) : null}
        {wide && visibility?.bio ? (
          <Text variant="bodySm" className="mt-3 text-foreground-muted">
            {visibility.bio}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const statTiles = ratingsQuery.isLoading ? (
    <Skeleton className="h-[72px] w-full rounded-lg" />
  ) : (
    <View className={cn('gap-2', wide ? 'flex-row flex-wrap' : 'flex-row')}>
      <View className={wide ? 'w-[48%] grow' : 'flex-1'}>
        <StatTile value={String(stats.count)} label="평가한 공연" />
      </View>
      <View className={wide ? 'w-[48%] grow' : 'flex-1'}>
        <StatTile value={stats.count > 0 ? stats.average.toFixed(1) : '–'} label="평균 별점" accent />
      </View>
      <View className={wide ? 'w-[48%] grow' : 'flex-1'}>
        <StatTile value={String(favoriteCount)} label="레퍼토리" />
      </View>
      {wide ? (
        <View className="w-[48%] grow">
          <StatTile value={String(stats.fiveStars)} label="별점 5점 공연" />
        </View>
      ) : null}
    </View>
  );

  const tabs = (
    <View className="flex-row gap-7 border-b border-border" accessibilityRole="tablist">
      {(
        [
          { key: 'ratings', label: '평가한 공연', count: stats.count },
          { key: 'repertoire', label: '레퍼토리', count: favoriteCount },
        ] as const
      ).map((item) => (
        <Pressable
          key={item.key}
          onPress={() => setTab(item.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === item.key }}
          className={cn('-mb-px h-11 flex-row items-center gap-1.5 border-b-2', tab === item.key ? 'border-primary' : 'border-transparent')}>
          <Text className={cn('text-body font-semibold', tab === item.key ? 'text-foreground' : 'text-foreground-muted')}>
            {item.label}
          </Text>
          <Text variant="caption" className="tabular-nums">
            {item.count}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const content =
    tab === 'ratings' ? (
      ratingsQuery.isLoading ? (
        <View className="mt-5 flex-row gap-4">
          {Array.from({ length: wide ? 5 : 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[3/4] flex-1 rounded-lg" />
          ))}
        </View>
      ) : ratingsQuery.isError ? (
        <EmptyState
          compact
          icon={AlertCircleIcon}
          tone="error"
          title="평가한 공연을 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => ratingsQuery.refetch() }}
        />
      ) : ratings.length === 0 ? (
        <EmptyState
          compact
          icon={StarIcon}
          title="아직 평가한 공연이 없어요"
          description="다녀온 공연의 상세 화면에서 별점을 남기면 여기에 모여요."
          action={{ label: '공연 보러 가기', onPress: () => router.push('/concerts' as Href) }}
        />
      ) : (
        <View className="mt-5">
          <RatingGrid
            ratings={ratings}
            sortKey={sort}
            onSortChange={setSort}
            minItemWidth={wide ? 150 : 100}
            onOpen={(concertId) => router.push(`/concert/${concertId}` as Href)}
          />
        </View>
      )
    ) : favoritesQuery.isLoading ? (
      <Skeleton className="mt-5 h-40 w-full rounded-lg" />
    ) : favoritesQuery.isError ? (
      <EmptyState
        compact
        icon={AlertCircleIcon}
        tone="error"
        title="레퍼토리를 불러오지 못했어요"
        description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
        action={{ label: '다시 시도', onPress: () => favoritesQuery.refetch() }}
      />
    ) : !favorites || favoriteCount === 0 ? (
      <EmptyState
        compact
        icon={BookmarkIcon}
        title="아직 레퍼토리가 비어 있어요"
        description="작곡가·연주자·작품·공연에서 레퍼토리에 담기를 누르면 여기에 모여요."
        action={{ label: '비교할 수 있는 작품 보기', onPress: () => router.push('/compare' as Href) }}
      />
    ) : (
      <View className="mt-5">
        <RepertoireList favorites={favorites} editable />
      </View>
    );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerClassName={cn('pb-24', wide ? 'px-7 pt-3' : 'px-4')}>
        {!wide ? (
          <View className="mt-12 flex-row items-center justify-between">
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.push('/home' as Href))}
              accessibilityLabel="뒤로"
              className="size-11 items-center justify-center rounded-full bg-surface-2">
              <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
            </Pressable>
            <Text variant="headline">마이페이지</Text>
            <Pressable
              onPress={() => router.push('/settings' as Href)}
              accessibilityLabel="설정"
              className="size-11 items-center justify-center rounded-full bg-surface-2">
              <Icon as={SettingsIcon} size={19} className="text-foreground" />
            </Pressable>
          </View>
        ) : null}

        <View className={cn(wide ? 'flex-row gap-11' : 'mt-5 gap-4')}>
          <View className={cn(wide ? 'w-[300px] gap-5' : 'gap-4')}>
            {identity}
            {wide ? (
              <View className="flex-row gap-2">
                {openPublicProfile ? (
                  <Button variant="outline" size="sm" className="rounded-full" onPress={openPublicProfile}>
                    <Icon as={EyeIcon} size={14} className="text-foreground" />
                    <Text>공개 프로필 보기</Text>
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => router.push('/settings' as Href)}>
                  <Icon as={SettingsIcon} size={14} className="text-foreground" />
                  <Text>설정</Text>
                </Button>
              </View>
            ) : null}
            {statTiles}
            {!wide && openPublicProfile ? (
              <Button variant="outline" className="h-11 rounded-full" onPress={openPublicProfile}>
                <Icon as={EyeIcon} size={15} className="text-foreground" />
                <Text>공개 프로필 보기</Text>
              </Button>
            ) : null}
            {wide ? (
              <View className="-mx-2.5 border-t border-border pt-3">
                <MenuRow icon={CircleHelpIcon} label="도움말" onPress={() => router.push('/help' as Href)} chevron />
                <MenuRow icon={LogOutIcon} label="로그아웃" onPress={confirmSignOut} />
              </View>
            ) : null}
          </View>

          <View className="min-w-0 flex-1">
            {tabs}
            {content}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  chevron = false,
}: {
  icon: typeof LogOutIcon;
  label: string;
  onPress: () => void;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-11 flex-row items-center gap-3 rounded-md px-2.5 web:hover:bg-surface-2">
      <Icon as={icon} size={18} className="text-foreground-muted" />
      <Text className="flex-1 text-body-sm text-foreground">{label}</Text>
      {chevron ? <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" /> : null}
    </Pressable>
  );
}
