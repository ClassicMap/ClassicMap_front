import { ConcertCard, EraTile, PersonCard, PieceCard, RecentTile } from '@/components/home/cards';
import { EraPreferenceCard, PREFERENCE_ERAS } from '@/components/home/era-preference-card';
import { Grid, ScrollShelf, ShelfHeader, ShelfRow } from '@/components/home/shelf';
import { TodayComparison, type TodayComparisonTarget } from '@/components/home/today-comparison';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { type RecentPiece, useRecentPieces } from '@/hooks/use-recent-pieces';
import { daysLeft } from '@/components/concert/concert-parts';
import { pickDailyPiece } from '@/lib/data/comparison';
import { PERIODS } from '@/lib/data/periods';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import type { ColorScheme } from '@/lib/design/tokens';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useArtists } from '@/lib/query/hooks/useArtists';
import { useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useRecommendedComposers } from '@/lib/query/hooks/useComposers';
import { useConcerts } from '@/lib/query/hooks/useConcerts';
import type { Artist, Composer, Concert } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/clerk-expo';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';

const SHELF_ARTISTS = 12;
const SHELF_COMPOSERS = 12;
const WEEK_DAYS = 7;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return '좋은 아침이에요';
  if (hour >= 11 && hour < 17) return '좋은 오후예요';
  if (hour >= 17 && hour < 22) return '좋은 저녁이에요';
  return '편안한 밤이에요';
}

/** 홈은 큐레이션 존: 이미지가 있는 S·A급만 올린다. 모자라면 이미지 있는 쪽으로 채운다 (1차 시안 메모) */
function curateArtists(artists: readonly Artist[]): Artist[] {
  const withImage = artists.filter((artist) => Boolean(artist.imageUrl));
  const top = withImage.filter((artist) => artist.tier === 'S' || artist.tier === 'A');
  const rest = withImage.filter((artist) => !top.includes(artist));
  return [...top, ...rest].slice(0, SHELF_ARTISTS);
}

/** 좋아하는 시대를 골랐으면 그 시대 작곡가가 앞에 온다. 나머지 순서는 추천 순 그대로 */
function curateComposers(composers: readonly Composer[], favoritePeriods: readonly string[]): Composer[] {
  const withImage = composers.filter((composer) => Boolean(composer.avatarUrl));
  if (favoritePeriods.length === 0) return withImage.slice(0, SHELF_COMPOSERS);
  const preferred = withImage.filter((composer) => favoritePeriods.includes(composer.period));
  const rest = withImage.filter((composer) => !favoritePeriods.includes(composer.period));
  return [...preferred, ...rest].slice(0, SHELF_COMPOSERS);
}

/** 이번 주 공연. 이번 주에 없으면 가장 가까운 공연으로 채운다 */
function weekConcerts(concerts: readonly Concert[]): { items: Concert[]; thisWeek: boolean } {
  const upcoming = concerts.filter((concert) => daysLeft(concert.startDate) !== null);
  const week = upcoming.filter((concert) => (daysLeft(concert.startDate) ?? WEEK_DAYS) < WEEK_DAYS);
  return week.length >= 3 ? { items: week, thisWeek: true } : { items: upcoming, thisWeek: false };
}

export default function HomeScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { colorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { user } = useUser();
  const { profile, isFirstLogin, completeOnboarding, updatePreferences } = useUserProfile();
  const favoritePeriods = React.useMemo(
    () => profile?.preferences?.favoritePeriods ?? [],
    [profile?.preferences?.favoritePeriods]
  );

  const catalog = useComparisonPieces();
  const composersQuery = useRecommendedComposers();
  const artistsQuery = useArtists();
  const concertsQuery = useConcerts();
  const recentPieces = useRecentPieces().data ?? [];

  const pieces = React.useMemo(() => catalog.data?.pages[0] ?? [], [catalog.data]);
  const composers = React.useMemo(() => composersQuery.data ?? [], [composersQuery.data]);

  const today = React.useMemo(() => {
    // 좋아하는 시대가 있으면 그 시대 작곡가의 작품 중에서 고른다
    const preferredIds = new Set(
      composers.filter((composer) => favoritePeriods.includes(composer.period)).map((composer) => composer.id)
    );
    const preferred = pieces.filter((piece) => preferredIds.has(piece.composerId));
    return pickDailyPiece(preferred.length > 0 ? preferred : pieces, new Date());
  }, [composers, favoritePeriods, pieces]);

  const shelfPieces = React.useMemo(
    () => pieces.filter((piece) => piece.pieceId !== today?.pieceId),
    [pieces, today?.pieceId]
  );
  const artists = React.useMemo(() => curateArtists(artistsQuery.data?.pages[0] ?? []), [artistsQuery.data]);
  const featuredComposers = React.useMemo(
    () => curateComposers(composers, favoritePeriods),
    [composers, favoritePeriods]
  );
  const concerts = React.useMemo(() => weekConcerts(concertsQuery.data?.pages[0] ?? []), [concertsQuery.data]);
  const eras = React.useMemo(
    () =>
      PERIODS.filter((era) => (PREFERENCE_ERAS as readonly string[]).includes(era.name)).map((era) => ({
        era,
        // 시대 대표 초상: 추천 순에서 그 시대 첫 작곡가
        portrait: composers.find((composer) => composer.period === era.name && composer.avatarUrl),
      })),
    [composers]
  );

  const refreshing =
    catalog.isRefetching || composersQuery.isRefetching || artistsQuery.isRefetching || concertsQuery.isRefetching;
  const refresh = () => {
    void catalog.refetch();
    void composersQuery.refetch();
    void artistsQuery.refetch();
    void concertsQuery.refetch();
  };

  const openPiece = (target: { composerId: number; pieceId: number; sectorId?: number | null }) => {
    const params = new URLSearchParams({ composerId: String(target.composerId), pieceId: String(target.pieceId) });
    if (target.sectorId) params.append('sectorId', String(target.sectorId));
    router.push(`/compare?${params.toString()}` as Href);
  };
  const openToday = (target: TodayComparisonTarget) => openPiece(target);
  const openRecent = (item: RecentPiece) => openPiece(item);

  const gap = wide ? 20 : 12;

  const onboarding =
    user && isFirstLogin ? (
      <EraPreferenceCard
        scheme={scheme}
        onSave={async (periods) => {
          await updatePreferences({ favoritePeriods: periods });
          await completeOnboarding();
        }}
        onSkip={completeOnboarding}
      />
    ) : null;

  const todaySection = catalog.isLoading ? (
    <Skeleton className={cn('w-full rounded-xl', wide ? 'h-[300px]' : 'aspect-video')} />
  ) : catalog.isError ? (
    <View className="rounded-xl border border-border">
      <EmptyState
        compact
        icon={AlertCircleIcon}
        tone="error"
        title="비교할 작품을 불러오지 못했어요"
        description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
        action={{ label: '다시 시도', onPress: () => catalog.refetch() }}
      />
    </View>
  ) : today ? (
    <TodayComparison piece={today} wide={wide} onOpen={openToday} />
  ) : null;

  const eraGrid = (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {eras.map(({ era, portrait }) => (
        <View key={era.id} style={{ width: '48%', flexGrow: 1 }}>
          <EraTile
            era={era}
            portrait={portrait?.avatarUrl}
            height={wide ? 116 : 96}
            onPress={() => router.push(`/timeline?era=${era.id}` as Href)}
          />
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      {...scrollInsets}
      className="flex-1 bg-background web:bg-surface-1"
      contentContainerClassName={cn('pb-28', wide ? 'px-7 pt-3' : 'px-4 pt-2')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text variant={wide ? 'display' : 'title1'}>{greeting(new Date())}</Text>

      {onboarding ? <View className="mt-5">{onboarding}</View> : null}

      {/* 최근 본 작품: 데스크톱은 첫 줄 바로가기, 모바일은 2열 타일 */}
      {recentPieces.length > 0 ? (
        <View className={wide ? 'mt-6' : 'mt-5'}>
          {!wide ? <ShelfHeader title="최근 본 작품" wide={false} /> : null}
          <View className="flex-row flex-wrap" style={{ gap: wide ? 12 : 8 }}>
            {recentPieces.slice(0, wide ? 6 : 4).map((item) => (
              <View key={item.pieceId} style={{ width: wide ? '32%' : '48%', flexGrow: 1 }}>
                <RecentTile item={item} onPress={() => openRecent(item)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 오늘의 비교: 데스크톱은 옆에 시대로 듣기를 둔다 (7.1 Bento) */}
      <View className={cn(wide ? 'mt-8 flex-row gap-6' : 'mt-6')}>
        <View className="min-w-0 flex-[2]">{todaySection}</View>
        {wide ? (
          <View className="w-[320px]">
            <ShelfHeader title="시대로 듣기" wide onAction={() => router.push('/timeline' as Href)} actionLabel="타임라인" />
            {eraGrid}
          </View>
        ) : null}
      </View>

      <Section wide={wide} title="비교할 수 있는 작품" onAction={() => router.push('/compare' as Href)}>
        {catalog.isLoading ? (
          <CardSkeletonRow wide={wide} shape="square" />
        ) : shelfPieces.length === 0 ? null : wide ? (
          <ShelfRow
            items={shelfPieces}
            minItemWidth={168}
            gap={gap}
            keyOf={(piece) => piece.pieceId}
            renderItem={(piece, width) => <PieceCard piece={piece} width={width} onPress={() => openPiece(piece)} />}
          />
        ) : (
          <Grid
            items={shelfPieces.slice(0, 6)}
            columns={3}
            gap={gap}
            keyOf={(piece) => piece.pieceId}
            renderItem={(piece, width) => <PieceCard piece={piece} width={width} onPress={() => openPiece(piece)} />}
          />
        )}
      </Section>

      <Section wide={wide} title="연주자" onAction={() => router.push('/artists' as Href)}>
        {artistsQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="circle" />
        ) : artistsQuery.isError ? (
          <InlineError label="연주자를" onRetry={() => artistsQuery.refetch()} />
        ) : wide ? (
          <ShelfRow
            items={artists}
            minItemWidth={150}
            gap={gap}
            keyOf={(artist) => artist.id}
            renderItem={(artist, width) => (
              <PersonCard
                name={artist.name}
                image={artist.imageUrl}
                caption={getArtistCategoryLabel(artist.category)}
                width={width}
                onPress={() => router.push(`/artist/${artist.id}` as Href)}
              />
            )}
          />
        ) : (
          <ScrollShelf>
            {artists.map((artist) => (
              <View key={artist.id} style={{ width: 76 }}>
                <PersonCard
                  name={artist.name}
                  image={artist.imageUrl}
                  width={76}
                  onPress={() => router.push(`/artist/${artist.id}` as Href)}
                />
              </View>
            ))}
          </ScrollShelf>
        )}
      </Section>

      <Section
        wide={wide}
        title="작곡가"
        meta={favoritePeriods.length > 0 ? `${favoritePeriods.join('·')} 먼저` : undefined}
        onAction={() => router.push('/timeline' as Href)}>
        {composersQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="circle" />
        ) : composersQuery.isError ? (
          <InlineError label="작곡가를" onRetry={() => composersQuery.refetch()} />
        ) : wide ? (
          <ShelfRow
            items={featuredComposers}
            minItemWidth={150}
            gap={gap}
            keyOf={(composer) => composer.id}
            renderItem={(composer, width) => (
              <PersonCard
                name={composer.name}
                image={composer.avatarUrl}
                caption={composer.period}
                width={width}
                onPress={() => router.push(`/composer/${composer.id}` as Href)}
              />
            )}
          />
        ) : (
          <ScrollShelf>
            {featuredComposers.map((composer) => (
              <View key={composer.id} style={{ width: 76 }}>
                <PersonCard
                  name={composer.name}
                  image={composer.avatarUrl}
                  width={76}
                  onPress={() => router.push(`/composer/${composer.id}` as Href)}
                />
              </View>
            ))}
          </ScrollShelf>
        )}
      </Section>

      {!wide ? (
        <Section wide={false} title="시대로 듣기" onAction={() => router.push('/timeline' as Href)} actionLabel="타임라인">
          {eraGrid}
        </Section>
      ) : null}

      <Section
        wide={wide}
        title={concerts.thisWeek ? '이번 주 공연' : '다가오는 공연'}
        onAction={() => router.push('/concerts' as Href)}>
        {concertsQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="poster" />
        ) : concertsQuery.isError ? (
          <InlineError label="공연을" onRetry={() => concertsQuery.refetch()} />
        ) : concerts.items.length === 0 ? (
          <Text variant="bodySm" className="text-foreground-muted">
            예정된 공연이 없어요. 공연 탭에서 지역을 바꿔 보세요.
          </Text>
        ) : wide ? (
          <ShelfRow
            items={concerts.items}
            minItemWidth={160}
            gap={gap}
            keyOf={(concert) => concert.id}
            renderItem={(concert, width) => (
              <ConcertCard concert={concert} width={width} onPress={() => router.push(`/concert/${concert.id}` as Href)} />
            )}
          />
        ) : (
          <Grid
            items={concerts.items.slice(0, 6)}
            columns={3}
            gap={gap}
            keyOf={(concert) => concert.id}
            renderItem={(concert, width) => (
              <ConcertCard concert={concert} width={width} onPress={() => router.push(`/concert/${concert.id}` as Href)} />
            )}
          />
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  wide,
  title,
  meta,
  actionLabel,
  onAction,
  children,
}: {
  wide: boolean;
  title: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className={wide ? 'mt-11' : 'mt-9'}>
      <ShelfHeader title={title} meta={meta} actionLabel={actionLabel} onAction={onAction} wide={wide} />
      {children}
    </View>
  );
}

function InlineError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
      <Text variant="bodySm" className="flex-1 text-foreground-muted">
        {`${label} 불러오지 못했어요.`}
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
        <Text variant="label" className="text-primary">
          다시 시도
        </Text>
      </Pressable>
    </View>
  );
}

function CardSkeletonRow({ wide, shape }: { wide: boolean; shape: 'square' | 'circle' | 'poster' }) {
  const count = wide ? 6 : shape === 'circle' ? 4 : 3;
  return (
    <View className="flex-row gap-4 overflow-hidden">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className={cn('gap-2', wide ? 'flex-1' : shape === 'circle' ? 'w-[76px]' : 'flex-1')}>
          <Skeleton
            className={cn(
              'w-full',
              shape === 'circle' ? 'aspect-square rounded-full' : shape === 'poster' ? 'aspect-[3/4] rounded-lg' : 'aspect-square rounded-lg'
            )}
          />
          <Skeleton className="h-3 w-4/5" />
          {wide ? <Skeleton className="h-3 w-1/2" /> : null}
        </View>
      ))}
    </View>
  );
}

