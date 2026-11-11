import { ConcertCard, EraTile, PersonCard, PieceCard, RecentTile } from '@/components/shared/cards';
import { TasteInviteCard } from '@/components/home/taste-invite-card';
import { Grid, ScrollShelf, ShelfHeader, ShelfRow } from '@/components/shared/shelf';
import { TodayComparison, type TodayComparisonTarget } from '@/components/home/today-comparison';
import { useGenreShelves } from '@/components/compare/genre-browse';
import { Chip } from '@/components/ui/chip';
import { usePinnedToday } from '@/hooks/use-pinned-today';
import { GENRE_STYLES, type PieceGenre } from '@/lib/design/genre-palette';
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
import { TasteAPI } from '@/lib/api/taste';
import { TASTE_QUERY_KEYS, useTaste } from '@/lib/hooks/useTaste';
import { useArtists } from '@/lib/query/hooks/useArtists';
import { useComparisonPieces, useGenrePieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useRecommendedComposers } from '@/lib/query/hooks/useComposers';
import { useFilteredConcerts } from '@/lib/query/hooks/useConcerts';
import { DEFAULT_CONCERT_FILTER, periodRange } from '@/lib/data/concert-filters';
import { useHomeRecommendations } from '@/lib/query/hooks/useHomeRecommendations';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import type {
  Artist,
  Composer,
  Concert,
  HomeRecommendations,
  RecommendationShelfKey,
  TasteSound,
} from '@/lib/types/models';
import { msg, t, useLocale } from '@/lib/i18n';
import { Alert } from '@/lib/utils/alert';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabScrollInsets } from '@/components/layout/tab-chrome';

/** 이번 실행에서 취향 묻기를 이미 열었는지. 뒤로 나가도 같은 실행 안에서는 다시 열지 않는다 */
let onboardingOpened = false;

const SHELF_TITLES: Record<RecommendationShelfKey, string> = {
  taste: msg('취향에 맞춘 비교'),
  known: msg('아는 곡, 다르게 듣기'),
  starter: msg('처음 듣기 좋은 비교'),
};

const SHELF_ARTISTS = 12;
const SHELF_COMPOSERS = 12;
const WEEK_DAYS = 7;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return t('좋은 아침이에요');
  if (hour >= 11 && hour < 17) return t('좋은 오후예요');
  if (hour >= 17 && hour < 22) return t('좋은 저녁이에요');
  return t('편안한 밤이에요');
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
  const { locale } = useLocale();
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const taste = useTaste();
  const queryClient = useQueryClient();
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
  // 공연 탭과 같은 기본 필터(클래식, 오늘 이후). 필터 없는 목록은 뮤지컬·국악이 섞여 홈에 어린이 뮤지컬이 먼저 떴다
  const concertRange = React.useMemo(() => periodRange('all'), [locale]);
  const { query: concertsQuery } = useFilteredConcerts(DEFAULT_CONCERT_FILTER, concertRange);
  const recentPieces = useRecentPieces().data ?? [];

  const reco = useHomeRecommendations();
  // 오늘의 비교는 하루 동안 고정한다. 작품을 보고 돌아올 때마다 추천이 다시 계산돼 곡이 바뀌었다
  // 추천을 바꾸는 답만 본다(로그인하면 answers 에 온보딩 상태·기록 설정까지 실려 와서 골라 담는다)
  const { listeningLevel, sounds, instrument, favoritePeriods: periods, seedPieceIds } = taste.answers;
  const todayContext = `${taste.signedIn ? 'user' : 'guest'}:${JSON.stringify([
    listeningLevel,
    sounds,
    instrument,
    periods,
    seedPieceIds,
  ])}`;
  const recoToday = usePinnedToday(reco.data?.today ?? null, todayContext, {
    updatedAt: reco.dataUpdatedAt,
    placeholder: reco.isPlaceholderData,
  });
  const recoShelves = React.useMemo(() => reco.data?.shelves ?? [], [reco.data, locale]);
  const favorites = useMyFavorites(taste.signedIn);

  const pieces = React.useMemo(() => catalog.data?.pages[0] ?? [], [catalog.data, locale]);
  const composers = React.useMemo(() => composersQuery.data ?? [], [composersQuery.data, locale]);

  const today = React.useMemo(() => {
    // 좋아하는 시대가 있으면 그 시대 작곡가의 작품 중에서 고른다
    const preferredIds = new Set(
      composers.filter((composer) => favoritePeriods.includes(composer.period)).map((composer) => composer.id)
    );
    const preferred = pieces.filter((piece) => preferredIds.has(piece.composerId));
    return pickDailyPiece(preferred.length > 0 ? preferred : pieces, new Date());
  }, [composers, favoritePeriods, pieces, locale]);

  // 추천이 있으면 추천의 오늘의 비교, 없으면(답을 못 읽었거나 추천이 실패하면) 예전처럼 고른다
  const todayPiece = recoToday ?? today;

  // '비교할 수 있는 작품' 줄의 장르 칩. 고르면 그 장르 첫 쪽으로 줄을 바꾼다
  const [shelfGenre, setShelfGenre] = React.useState<PieceGenre | null>(null);
  const genreQuery = useGenrePieces(shelfGenre ?? 'symphony', shelfGenre !== null);
  const allShelfPieces = React.useMemo(
    () => pieces.filter((piece) => piece.pieceId !== todayPiece?.pieceId),
    [pieces, todayPiece?.pieceId, locale]
  );
  const shelfPieces = React.useMemo(
    () => (shelfGenre ? (genreQuery.data?.pages[0] ?? []) : allShelfPieces),
    [allShelfPieces, genreQuery.data, shelfGenre, locale]
  );
  const catalogName = shelfGenre
    ? t('비교할 수 있는 작품 · {genre}', { genre: t(GENRE_STYLES[shelfGenre].label) })
    : t('비교할 수 있는 작품');

  const favoriteArtistIds = React.useMemo(
    () =>
      new Set(
        taste.signedIn ? (favorites.data?.artists ?? []).map((item) => item.artistId) : taste.guest.favoriteArtistIds
      ),
    [favorites.data, taste.guest.favoriteArtistIds, taste.signedIn, locale]
  );
  const preferredComposerIds = React.useMemo(() => {
    const favoriteComposers = taste.signedIn
      ? (favorites.data?.composers ?? []).map((item) => item.composerId)
      : taste.guest.favoriteComposerIds;
    const known = recoShelves.find((shelf) => shelf.key === 'known')?.items.map((item) => item.composerId) ?? [];
    return new Set([...favoriteComposers, ...known]);
  }, [favorites.data, recoShelves, taste.guest.favoriteComposerIds, taste.signedIn, locale]);

  const artists = React.useMemo(
    () => curateArtists(artistsQuery.data?.pages[0] ?? [], favoriteArtistIds, taste.answers.sounds),
    [artistsQuery.data, favoriteArtistIds, taste.answers.sounds, locale]
  );
  const featuredComposers = React.useMemo(
    () => curateComposers(composers, favoritePeriods, preferredComposerIds),
    [composers, favoritePeriods, preferredComposerIds, locale]
  );
  const soundMeta = taste.answers.sounds
    .map((sound) => SOUND_OPTIONS.find((option) => option.key === sound)?.label)
    .filter((label): label is string => Boolean(label))
    .map((label) => t(label))
    .join(' · ');
  const concerts = React.useMemo(() => weekConcerts(concertsQuery.data?.pages[0] ?? []), [concertsQuery.data, locale]);
  const eras = React.useMemo(
    () =>
      PERIODS.filter((era) => (PREFERENCE_ERAS as readonly string[]).includes(era.name)).map((era) => ({
        era,
        // 시대 대표 초상: 추천 순에서 그 시대 첫 작곡가
        portrait: composers.find((composer) => composer.period === era.name && composer.avatarUrl),
      })),
    [composers, locale]
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

  // 관심 없음: 화면에서 바로 빼고, 로그인했으면 서버에, 아니면 이 기기에 남긴다
  const dismissPiece = (pieceId: number) => {
    const without = (data: HomeRecommendations | undefined) =>
      data && {
        ...data,
        shelves: data.shelves.map((shelf) => ({
          ...shelf,
          items: shelf.items.filter((item) => item.pieceId !== pieceId),
        })),
      };
    queryClient.setQueriesData<HomeRecommendations>({ queryKey: TASTE_QUERY_KEYS.myRecommendations }, without);
    queryClient.setQueriesData<HomeRecommendations>({ queryKey: TASTE_QUERY_KEYS.guestRecommendations }, without);
    if (taste.signedIn) {
      TasteAPI.sendEvents([{ pieceId, kind: 'not_interested' }])
        .then(() => queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.myRecommendations }))
        .catch(() => {
          void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.myRecommendations });
          Alert.alert(t('추천에서 빼지 못했어요'), t('연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 시도해 주세요.'));
        });
    } else {
      void taste.updateGuest((current) => ({
        ...current,
        notInterestedPieceIds: [...new Set([...current.notInterestedPieceIds, pieceId])],
      }));
    }
  };
  const openRecent = (item: RecentPiece) => openPiece(item);
  const genreShelves = useGenreShelves();

  const gap = wide ? 20 : 12;

  const onboarding =
    taste.ready && taste.onboardingStatus === null ? (
      <TasteInviteCard
        onStart={() => router.push('/onboarding' as Href)}
        onDismiss={() => taste.save(taste.answers, { onboarding: 'skipped' }).catch(() => undefined)}
      />
    ) : null;

  const todaySection = catalog.isLoading || (reco.isLoading && !recoToday) || recoToday === undefined ? (
    <SkeletonMedia className={wide ? 'h-[300px]' : 'aspect-video'} />
  ) : catalog.isError ? (
    <View className="rounded-xl border border-border">
      <EmptyState
        compact
        icon={AlertCircleIcon}
        tone="error"
        title={t('비교할 작품을 불러오지 못했어요')}
        description={t('연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.')}
        action={{ label: t('다시 시도'), onPress: () => catalog.refetch() }}
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
          {!wide ? <ShelfHeader title={t('최근 본 작품')} wide={false} /> : null}
          {/* 칸 폭을 고정한다. 늘려 채우면 홀수 개일 때 마지막 칸만 한 줄을 다 차지한다 */}
          <Grid
            items={recentPieces.slice(0, wide ? 6 : 4)}
            columns={wide ? 3 : 2}
            gap={wide ? 12 : 8}
            rowGap={wide ? 12 : 8}
            keyOf={(item) => item.pieceId}
            renderItem={(item) => (
              <RecentTile item={item} onPress={() => openRecent(item)} />
            )}
          />
        </View>
      ) : null}

      {/* 오늘의 비교: 데스크톱은 옆에 시대로 듣기를 둔다 (7.1 Bento) */}
      <View className={cn(wide ? 'mt-8 flex-row gap-6' : 'mt-6')}>
        <View className="min-w-0 flex-[2]">{todaySection}</View>
        {wide ? (
          <View className="w-[320px]">
            <ShelfHeader title={t('시대로 듣기')} wide onAction={() => router.push('/timeline' as Href)} actionLabel={t('타임라인')} />
            {eraGrid}
          </View>
        ) : null}
      </View>

      {recoShelves.map((shelf) => (
        <Section
          key={shelf.key}
          wide={wide}
          title={t(SHELF_TITLES[shelf.key])}
          meta={shelf.key === 'taste' && soundMeta ? soundMeta : undefined}>
          {wide ? (
            <ShelfRow
              items={shelf.items}
              minItemWidth={168}
              gap={gap}
              keyOf={(piece) => piece.pieceId}
              renderItem={(piece, width) => (
                <PieceCard
                  piece={piece}
                  width={width}
                  reason={piece.reasons[0]}
                  list={shelf.items}
                  listName={t(SHELF_TITLES[shelf.key])}
                  onPress={() => openPiece(piece)}
                  onDismiss={shelf.key === 'known' ? undefined : () => dismissPiece(piece.pieceId)}
                />
              )}
            />
          ) : (
            <Grid
              items={shelf.items.slice(0, 6)}
              columns={3}
              gap={gap}
              keyOf={(piece) => piece.pieceId}
              renderItem={(piece, width) => (
                <PieceCard
                  piece={piece}
                  width={width}
                  reason={piece.reasons[0]}
                  list={shelf.items.slice(0, 6)}
                  listName={t(SHELF_TITLES[shelf.key])}
                  onPress={() => openPiece(piece)}
                  onDismiss={shelf.key === 'known' ? undefined : () => dismissPiece(piece.pieceId)}
                />
              )}
            />
          )}
        </Section>
      ))}

      <Section
        wide={wide}
        title={t('비교할 수 있는 작품')}
        onAction={() => router.push((shelfGenre ? `/compare?genre=${shelfGenre}` : '/compare') as Href)}>
        {/* 장르 칩: 이 줄만 그 장르로 걸러 본다 (스포티파이 홈 칩) */}
        {genreShelves.shelves.length > 0 ? (
          <ScrollShelf gap={8} className="mb-4">
            <Chip label={t('전체')} selected={shelfGenre === null} onPress={() => setShelfGenre(null)} />
            {genreShelves.shelves.map((shelf) => (
              <Chip
                key={shelf.genre}
                label={t(shelf.style.label)}
                selected={shelfGenre === shelf.genre}
                onPress={() => setShelfGenre(shelfGenre === shelf.genre ? null : shelf.genre)}
              />
            ))}
          </ScrollShelf>
        ) : null}
        {catalog.isLoading || (shelfGenre !== null && genreQuery.isLoading) ? (
          <CardSkeletonRow wide={wide} shape="square" />
        ) : shelfPieces.length === 0 ? null : wide ? (
          <ShelfRow
            items={shelfPieces}
            minItemWidth={168}
            gap={gap}
            keyOf={(piece) => piece.pieceId}
            renderItem={(piece, width) => (
              <PieceCard piece={piece} width={width} list={shelfPieces} listName={catalogName} onPress={() => openPiece(piece)} />
            )}
          />
        ) : (
          <Grid
            items={shelfPieces.slice(0, 6)}
            columns={3}
            gap={gap}
            keyOf={(piece) => piece.pieceId}
            renderItem={(piece, width) => (
              <PieceCard piece={piece} width={width} list={shelfPieces.slice(0, 6)} listName={catalogName} onPress={() => openPiece(piece)} />
            )}
          />
        )}
      </Section>

      <Section wide={wide} title={t('연주자')} onAction={() => router.push('/artists?type=artist' as Href)}>
        {artistsQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="circle" />
        ) : artistsQuery.isError ? (
          <InlineError message={t('연주자를 불러오지 못했어요.')} onRetry={() => artistsQuery.refetch()} />
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
                prefetchTarget={{ kind: 'artist', artistId: Number(artist.id) }}
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
                prefetchTarget={{ kind: 'artist', artistId: Number(artist.id) }}
                />
              </View>
            ))}
          </ScrollShelf>
        )}
      </Section>

      <Section
        wide={wide}
        title={t('작곡가')}
        meta={
          favoritePeriods.length > 0
            ? t('{periods} 먼저', { periods: favoritePeriods.map((period) => t(period)).join('·') })
            : undefined
        }
        onAction={() => router.push('/timeline' as Href)}>
        {composersQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="circle" />
        ) : composersQuery.isError ? (
          <InlineError message={t('작곡가를 불러오지 못했어요.')} onRetry={() => composersQuery.refetch()} />
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
                caption={t(composer.period)}
                width={width}
                onPress={() => router.push(`/composer/${composer.id}` as Href)}
                prefetchTarget={{ kind: 'composer', composerId: composer.id }}
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
                prefetchTarget={{ kind: 'composer', composerId: composer.id }}
                />
              </View>
            ))}
          </ScrollShelf>
        )}
      </Section>

      {!wide ? (
        <Section
          wide={false}
          title={t('시대로 듣기')}
          onAction={() => router.push('/timeline' as Href)}
          actionLabel={t('타임라인')}>
          {eraGrid}
        </Section>
      ) : null}

      <Section
        wide={wide}
        title={concerts.thisWeek ? t('이번 주 공연') : t('다가오는 공연')}
        onAction={() => router.push('/concerts' as Href)}>
        {concertsQuery.isLoading ? (
          <CardSkeletonRow wide={wide} shape="poster" />
        ) : concertsQuery.isError ? (
          <InlineError message={t('공연을 불러오지 못했어요.')} onRetry={() => concertsQuery.refetch()} />
        ) : concerts.items.length === 0 ? (
          <Text variant="bodySm" className="text-foreground-muted">
            {t('예정된 공연이 없어요. 공연 탭에서 지역을 바꿔 보세요.')}
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
  useLocale();
  return (
    <View className={wide ? 'mt-11' : 'mt-9'}>
      <ShelfHeader title={title} meta={meta} actionLabel={actionLabel} onAction={onAction} wide={wide} />
      {children}
    </View>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  useLocale();
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
      <Text variant="bodySm" className="flex-1 text-foreground-muted">
        {message}
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
        <Text variant="label" className="text-primary">
          {t('다시 시도')}
        </Text>
      </Pressable>
    </View>
  );
}

function CardSkeletonRow({ wide, shape }: { wide: boolean; shape: 'square' | 'circle' | 'poster' }) {
  useLocale();
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

