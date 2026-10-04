import { ConcertCard, EraTile, PersonCard, PieceCard, RecentTile } from '@/components/home/cards';
import { TasteInviteCard } from '@/components/home/taste-invite-card';
import { Grid, ScrollShelf, ShelfHeader, ShelfRow } from '@/components/home/shelf';
import { TodayComparison, type TodayComparisonTarget } from '@/components/home/today-comparison';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonMedia } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { type RecentPiece, useRecentPieces } from '@/hooks/use-recent-pieces';
import { daysLeft } from '@/components/concert/concert-parts';
import { pickDailyPiece } from '@/lib/data/comparison';
import { PERIODS } from '@/lib/data/periods';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { PREFERENCE_ERAS, SOUND_OPTIONS, soundOfArtistCategory } from '@/lib/data/taste-labels';
import { useTaste } from '@/lib/hooks/useTaste';
import { useArtists } from '@/lib/query/hooks/useArtists';
import { useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useRecommendedComposers } from '@/lib/query/hooks/useComposers';
import { useConcerts } from '@/lib/query/hooks/useConcerts';
import { useHomeRecommendations } from '@/lib/query/hooks/useHomeRecommendations';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import type { Artist, Composer, Concert, RecommendationShelfKey, TasteSound } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';

/** 이번 실행에서 취향 묻기를 이미 열었는지. 뒤로 나가도 같은 실행 안에서는 다시 열지 않는다 */
let onboardingOpened = false;

const SHELF_TITLES: Record<RecommendationShelfKey, string> = {
  taste: '취향에 맞춘 비교',
  known: '아는 곡, 다르게 듣기',
  starter: '처음 듣기 좋은 비교',
};

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

/**
 * 홈은 큐레이션 존: 이미지가 있는 연주자만 올린다 (1차 시안 메모).
 * 담아 둔 연주자 → 고른 소리의 S·A급 → 나머지 S·A급 → 이미지 있는 나머지 순
 */
function curateArtists(
  artists: readonly Artist[],
  favoriteIds: ReadonlySet<number>,
  sounds: readonly TasteSound[]
): Artist[] {
  const withImage = artists.filter((artist) => Boolean(artist.imageUrl));
  const rank = (artist: Artist): number => {
    if (favoriteIds.has(Number(artist.id))) return 0;
    const top = artist.tier === 'S' || artist.tier === 'A';
    const sound = soundOfArtistCategory(artist.category);
    if (top && sound && sounds.includes(sound)) return 1;
    return top ? 2 : 3;
  };
  return withImage
    .map((artist, index) => ({ artist, index }))
    .sort((a, b) => rank(a.artist) - rank(b.artist) || a.index - b.index)
    .map(({ artist }) => artist)
    .slice(0, SHELF_ARTISTS);
}

/** 고른 곡·담아 둔 작곡가 → 좋아하는 시대 작곡가 → 나머지(추천 순 그대로) */
function curateComposers(
  composers: readonly Composer[],
  favoritePeriods: readonly string[],
  preferredIds: ReadonlySet<number>
): Composer[] {
  const withImage = composers.filter((composer) => Boolean(composer.avatarUrl));
  const rank = (composer: Composer): number =>
    preferredIds.has(composer.id) ? 0 : favoritePeriods.includes(composer.period) ? 1 : 2;
  return withImage
    .map((composer, index) => ({ composer, index }))
    .sort((a, b) => rank(a.composer) - rank(b.composer) || a.index - b.index)
    .map(({ composer }) => composer)
    .slice(0, SHELF_COMPOSERS);
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
  const taste = useTaste();
  const favoritePeriods = taste.answers.favoritePeriods;

  // 가입하고 처음 들어온 사람에게 취향 묻기를 한 번 연다. 닫거나 끝내면 다시 열지 않는다
  React.useEffect(() => {
    if (!taste.ready || !taste.signedIn || taste.onboardingStatus !== null || onboardingOpened) return;
    onboardingOpened = true;
    router.push('/onboarding' as Href);
  }, [router, taste.onboardingStatus, taste.ready, taste.signedIn]);

  const catalog = useComparisonPieces();
  const composersQuery = useRecommendedComposers();
  const artistsQuery = useArtists();
  const concertsQuery = useConcerts();
  const recentPieces = useRecentPieces().data ?? [];

  const reco = useHomeRecommendations();
  const recoToday = reco.data?.today ?? null;
  const recoShelves = React.useMemo(() => reco.data?.shelves ?? [], [reco.data]);
  const favorites = useMyFavorites(taste.signedIn);

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

  // 추천이 있으면 추천의 오늘의 비교, 없으면(답을 못 읽었거나 추천이 실패하면) 예전처럼 고른다
  const todayPiece = recoToday ?? today;
  const shelfPieces = React.useMemo(
    () => pieces.filter((piece) => piece.pieceId !== todayPiece?.pieceId),
    [pieces, todayPiece?.pieceId]
  );

  const favoriteArtistIds = React.useMemo(
    () =>
      new Set(
        taste.signedIn ? (favorites.data?.artists ?? []).map((item) => item.artistId) : taste.guest.favoriteArtistIds
      ),
    [favorites.data, taste.guest.favoriteArtistIds, taste.signedIn]
  );
  const preferredComposerIds = React.useMemo(() => {
    const favoriteComposers = taste.signedIn
      ? (favorites.data?.composers ?? []).map((item) => item.composerId)
      : taste.guest.favoriteComposerIds;
    const known = recoShelves.find((shelf) => shelf.key === 'known')?.items.map((item) => item.composerId) ?? [];
    return new Set([...favoriteComposers, ...known]);
  }, [favorites.data, recoShelves, taste.guest.favoriteComposerIds, taste.signedIn]);

  const artists = React.useMemo(
    () => curateArtists(artistsQuery.data?.pages[0] ?? [], favoriteArtistIds, taste.answers.sounds),
    [artistsQuery.data, favoriteArtistIds, taste.answers.sounds]
  );
  const featuredComposers = React.useMemo(
    () => curateComposers(composers, favoritePeriods, preferredComposerIds),
    [composers, favoritePeriods, preferredComposerIds]
  );
  const soundMeta = taste.answers.sounds
    .map((sound) => SOUND_OPTIONS.find((option) => option.key === sound)?.label)
    .filter(Boolean)
    .join(' · ');
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
    catalog.isRefetching ||
    reco.isRefetching ||
    composersQuery.isRefetching ||
    artistsQuery.isRefetching ||
    concertsQuery.isRefetching;
  const refresh = () => {
    void catalog.refetch();
    void reco.refetch();
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
    taste.ready && taste.onboardingStatus === null ? (
      <TasteInviteCard
        onStart={() => router.push('/onboarding' as Href)}
        onDismiss={() => taste.save(taste.answers, { onboarding: 'skipped' }).catch(() => undefined)}
      />
    ) : null;

  const todaySection = catalog.isLoading || reco.isLoading ? (
    <SkeletonMedia className={wide ? 'h-[300px]' : 'aspect-video'} />
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
  ) : todayPiece ? (
    <TodayComparison
      piece={todayPiece}
      wide={wide}
      onOpen={openToday}
      sectorId={recoToday?.sectorId}
      reasons={recoToday?.reasons}
    />
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
          {/* 칸 폭을 고정한다. 늘려 채우면 홀수 개일 때 마지막 칸만 한 줄을 다 차지한다 */}
          <Grid
            items={recentPieces.slice(0, wide ? 6 : 4)}
            columns={wide ? 3 : 2}
            gap={wide ? 12 : 8}
            rowGap={wide ? 12 : 8}
            keyOf={(item) => item.pieceId}
            renderItem={(item) => <RecentTile item={item} onPress={() => openRecent(item)} />}
          />
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

      {recoShelves.map((shelf) => (
        <Section
          key={shelf.key}
          wide={wide}
          title={SHELF_TITLES[shelf.key]}
          meta={shelf.key === 'taste' && soundMeta ? soundMeta : undefined}>
          {wide ? (
            <ShelfRow
              items={shelf.items}
              minItemWidth={168}
              gap={gap}
              keyOf={(piece) => piece.pieceId}
              renderItem={(piece, width) => (
                <PieceCard piece={piece} width={width} reason={piece.reasons[0]} onPress={() => openPiece(piece)} />
              )}
            />
          ) : (
            <Grid
              items={shelf.items.slice(0, 6)}
              columns={3}
              gap={gap}
              keyOf={(piece) => piece.pieceId}
              renderItem={(piece, width) => (
                <PieceCard piece={piece} width={width} reason={piece.reasons[0]} onPress={() => openPiece(piece)} />
              )}
            />
          )}
        </Section>
      ))}

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

      <Section wide={wide} title="연주자" onAction={() => router.push('/artists?type=artist' as Href)}>
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

