import { FavoriteButton } from '@/features/library/components/favorite-button';
import { ScrollShelf } from '@/components/shared/shelf';
import { FeaturedPairLink, PerformanceNote, resolveFeaturedPair } from '@/features/compare/components/listening-note';
import { LoudnessSparkline, sharedFloorDb } from '@/features/compare/components/loudness-curve';
import { SectionStaff } from '@/features/compare/components/section-staff';
import { SectorGuide, SectorTypeBadge } from '@/features/compare/components/sector-guide';
import { PieceScreenStrip } from '@/features/film/components/piece-screen-strip';
import { RepertoireMark, RepertoireThumb } from '@/features/library/components/repertoire-badge';
import { countRepertoirePieces, Faces, sortComposersByRepertoire } from '@/features/compare/components/compare-catalog';
import { useRepertoireIds } from '@/features/library/hooks/use-repertoire-ids';
import { repertoireFirst } from '@/features/library/lib/library';
import { MobileFullscreen } from '@/features/compare/components/mobile-fullscreen';
import { PlayerSlot } from '@/features/player/components/player-slot';
import { SwitchModeToggle } from '@/features/compare/components/switch-mode-toggle';
import { useFollowSongNav } from '@/features/player/components/song-nav';
import { compareQueueFor } from '@/lib/player/compare-playlist';
import { useIsFocused } from '@react-navigation/native';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { QueueAddMenu } from '@/features/player/components/queue-add-menu';
import { queueActionSheet } from '@/features/player/lib/queue-actions';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { GenreLink } from '@/features/piece/components/genre-link';
import { PieceArt } from '@/features/piece/components/piece-art';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/shared/icons';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { Scrim } from '@/components/ui/scrim';
import { ServiceLogo } from '@/components/shared/service-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecordRecentPiece } from '@/hooks/use-recent-pieces';
import {
  clipClock,
  clipDurationMs,
  primaryCredit,
  defaultComparisonSector,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/data/comparison';
import { useAuth } from '@/hooks/use-auth';
import {
  useComparableComposers,
  useComparisonPiece,
  useComparisonPieces,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/use-comparison-performances';
import type { ComparisonPerformance, ComparisonPiece, ListeningMoment } from '@/types/models';
import {
  CompareSearchField,
  CompareSearchResults,
  openFirstResult,
  searchComparable,
} from '@/features/compare/components/compare-search';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  SettingsIcon,
} from 'lucide-react-native';
import { GenreTiles, useGenreShelves } from '@/features/compare/components/genre-browse';
import { genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabHeaderInset, useTabScrollInsets } from '@/hooks/use-tab-chrome';

interface CompareMobileCatalogProps {
  onOpenGenre: (genre: PieceGenre) => void;
  onOpenComposer: (composerId: number) => void;
  onOpenPiece: (piece: ComparisonPiece) => void;
}

/** 모바일 비교 첫 화면: 비교할 수 있는 작품이 많은 작곡가부터 목록으로. 위 검색 칸으로 바로 찾는다 */
export function CompareMobileCatalog({ onOpenGenre, onOpenComposer, onOpenPiece }: CompareMobileCatalogProps) {
  const { locale } = useLocale();
  const scrollInsets = useTabScrollInsets();
  const genreCount = useGenreShelves().shelves.length;
  const comparable = useComparableComposers();
  const repertoire = useRepertoireIds();
  const repertoirePieces = React.useMemo(
    () => countRepertoirePieces(comparable.data?.pieces ?? [], repertoire.pieces),
    [comparable.data?.pieces, repertoire.pieces, locale]
  );
  const composers = React.useMemo(
    () => sortComposersByRepertoire(comparable.data?.composers ?? [], repertoire.composers, repertoirePieces),
    [comparable.data?.composers, repertoire.composers, repertoirePieces, locale]
  );
  const [query, setQuery] = React.useState('');
  const searching = query.trim().length > 0;
  const result = React.useMemo(
    () => searchComparable(comparable.data, query, repertoire),
    [comparable.data, query, repertoire, locale]
  );

  return (
    <ScrollView
      {...scrollInsets}
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-24 pt-2"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={comparable.isRefetching} onRefresh={() => comparable.refetch()} />}>
      <Text variant="title1">{t('비교')}</Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        {t('같은 구간을 연주자마다 비교해요.')}
      </Text>
      <CompareSearchField
        value={query}
        onChange={setQuery}
        onSubmit={() => openFirstResult(result, onOpenComposer, onOpenPiece)}
        className="mt-4"
      />
      {searching && comparable.data ? (
        <CompareSearchResults
          query={query}
          result={result}
          repertoire={repertoire}
          onOpenComposer={onOpenComposer}
          onOpenPiece={onOpenPiece}
          onClear={() => setQuery('')}
        />
      ) : comparable.isLoading ? (
        <View className="mt-5 gap-4">
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} className="flex-row items-center gap-3.5">
              <Skeleton className="size-14 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </View>
            </View>
          ))}
        </View>
      ) : comparable.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title={t('비교할 수 있는 작곡가를 불러오지 못했어요')}
          description={t('잠시 뒤 다시 시도해 주세요.')}
          action={{ label: t('다시 시도'), onPress: () => comparable.refetch() }}
        />
      ) : composers.length === 0 ? (
        <EmptyState
          icon={CompareIcon}
          title={t('아직 비교할 수 있는 작품이 없어요')}
          description={t('연주자 세 명 이상의 영상이 모이면 여기에 나와요.')}
        />
      ) : (
        <View className="mt-6">
          {genreCount > 0 ? (
            <>
              <Text variant="headline">{t('장르로 찾기')}</Text>
              <GenreTiles wide={false} onOpen={onOpenGenre} className="mb-8 mt-3" />
            </>
          ) : null}
          <Text variant="headline" className="mb-1">
            {t('작곡가로 찾기')}
          </Text>
          {composers.map((composer) => {
            const inRepertoire = repertoire.composers.has(composer.composerId);
            const repertoirePieceCount = repertoirePieces.get(composer.composerId) ?? 0;
            return (
              <Pressable
                key={composer.composerId}
                onPress={() => onOpenComposer(composer.composerId)}
                accessibilityRole="link"
                accessibilityLabel={
                  inRepertoire
                    ? t('{name}, 레퍼토리에 있어요, 비교할 수 있는 작품 {count}곡', { name: composer.composerName, count: composer.pieceCount })
                    : t('{name}, 비교할 수 있는 작품 {count}곡', { name: composer.composerName, count: composer.pieceCount })
                }
                className="-mx-2 flex-row items-center gap-3.5 rounded-lg px-2 py-2.5 active:bg-surface-2">
                <RepertoireThumb active={inRepertoire} badgeSize={18}>
                  <EntityThumb name={composer.composerName} image={composer.composerAvatarUrl} shape="circle" size={56} />
                </RepertoireThumb>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1">
                    <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
                      {composer.composerName}
                    </Text>
                    {inRepertoire ? <RepertoireMark /> : null}
                  </View>
                  <Text variant="caption" numberOfLines={1} className="mt-0.5">
                    {t('비교할 수 있는 작품 {count}곡', { count: composer.pieceCount })}
                  </Text>
                  {repertoirePieceCount > 0 ? (
                    <Text variant="caption" numberOfLines={1} className="mt-0.5 font-semibold text-primary">
                      {t('레퍼토리 작품 {count}곡', { count: repertoirePieceCount })}
                    </Text>
                  ) : null}
                </View>
                <Faces
                  performers={composer.performers}
                  max={3}
                  highlightIds={repertoire.artists}
                  ringClassName="border-background"
                />
                <Icon as={ChevronRightIcon} size={18} className="text-foreground-subtle" />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

interface CompareMobileComposerPiecesProps {
  composerId: number;
  onBack: () => void;
  onOpen: (piece: ComparisonPiece) => void;
}

/** 모바일 비교 둘째 단: 한 작곡가의 비교할 수 있는 작품 2열 */
export function CompareMobileComposerPieces({ composerId, onBack, onOpen }: CompareMobileComposerPiecesProps) {
  const { locale } = useLocale();
  const scrollInsets = useTabScrollInsets();
  const catalog = useComparisonPieces(composerId);
  const repertoire = useRepertoireIds();
  // 레퍼토리에 담은 작품을 위로. 나머지는 연주자 많은 순 그대로
  const pieces = React.useMemo(
    () => repertoireFirst(catalog.data?.pages.flat() ?? [], (piece) => repertoire.pieces.has(piece.pieceId)),
    [catalog.data, repertoire.pieces, locale]
  );
  const summary = useComparableComposers().data?.byId.get(composerId);
  const name = summary?.composerName ?? pieces[0]?.composerName;
  const avatar = summary?.composerAvatarUrl ?? pieces[0]?.composerAvatarUrl ?? null;
  const count = summary?.pieceCount ?? (catalog.hasNextPage ? undefined : pieces.length);

  return (
    <ScrollView
      {...scrollInsets}
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-24"
      refreshControl={<RefreshControl refreshing={catalog.isRefetching} onRefresh={() => catalog.refetch()} />}>
      <BackButton onPress={onBack} />
      <View className="mt-4 flex-row items-center gap-4">
        {name ? (
          <RepertoireThumb active={repertoire.composers.has(composerId)} badgeSize={22}>
            <EntityThumb name={name} image={avatar} shape="circle" size={72} />
          </RepertoireThumb>
        ) : (
          <Skeleton className="size-[72px] rounded-full" />
        )}
        <View className="min-w-0 flex-1">
          {name ? (
            <Text variant="title1" numberOfLines={1}>
              {name}
            </Text>
          ) : (
            <Skeleton className="h-7 w-2/3" />
          )}
          {count !== undefined ? (
            <Text variant="caption" className="mt-1">
              {t('비교할 수 있는 작품 {count}곡', { count })}
            </Text>
          ) : null}
        </View>
      </View>
      {catalog.isLoading ? (
        <View className="mt-6 gap-5">
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} className="gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </View>
          ))}
        </View>
      ) : catalog.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title={t('작품 목록을 불러오지 못했어요')}
          description={t('잠시 뒤 다시 시도해 주세요.')}
          action={{ label: t('다시 시도'), onPress: () => catalog.refetch() }}
        />
      ) : pieces.length === 0 ? (
        <EmptyState
          icon={CompareIcon}
          title={t('이 작곡가는 아직 비교할 수 있는 작품이 없어요')}
          description={t('다른 작곡가를 골라 보세요.')}
          action={{ label: t('작곡가 목록 보기'), onPress: onBack }}
        />
      ) : (
        <View className="mt-5 border-t border-border">
          {pieces.map((piece) => (
            <Pressable
              key={piece.pieceId}
              onPress={() => onOpen(piece)}
              onLongPress={() =>
                queueActionSheet.open({ piece, title: piece.pieceTitle, subtitle: piece.composerName })
              }
              accessibilityRole="link"
              accessibilityLabel={
                repertoire.pieces.has(piece.pieceId)
                  ? t('{name} {title}, 레퍼토리에 있어요 비교하기', { name: piece.composerName, title: piece.pieceTitle })
                  : t('{name} {title} 비교하기', { name: piece.composerName, title: piece.pieceTitle })
              }
              className="-mx-2 flex-row items-center gap-3 border-b border-border px-2 py-3.5 active:bg-surface-2">
              <PieceArt coverVideoId={piece.coverVideoId} fallbackImage={piece.composerAvatarUrl} fallbackName={piece.composerName} size={48} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text numberOfLines={2} className="shrink text-body-sm font-semibold text-foreground">
                    {piece.pieceTitle}
                  </Text>
                  {repertoire.pieces.has(piece.pieceId) ? <RepertoireMark /> : null}
                </View>
                <Text variant="caption" numberOfLines={1} className="mt-1">
                  {[
                    t(genreStyle(piece.genre)?.label ?? ''),
                    piece.opusNumber,
                    t('연주자 {count}', { count: piece.performerCount }),
                    t('구간 {count}', { count: piece.sectorCount }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Faces
                performers={piece.performers}
                max={3}
                highlightIds={repertoire.artists}
                ringClassName="border-background"
              />
              <QueueAddMenu piece={piece} title={piece.pieceTitle} subtitle={piece.composerName} />
            </Pressable>
          ))}
          {catalog.hasNextPage ? (
            <Button
              variant="outline"
              className="mt-6 self-center rounded-full"
              disabled={catalog.isFetchingNextPage}
              onPress={() => catalog.fetchNextPage()}>
              <Text>{catalog.isFetchingNextPage ? t('불러오는 중…') : t('더 보기')}</Text>
            </Button>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

interface CompareMobilePieceProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  /** 돌아갈 작곡가. 주소에 작곡가가 없던 딥링크면 연주에서 알아낸 작곡가를 넘긴다 */
  onBack: (composerId?: number) => void;
  onSelectSector: (sectorId: number) => void;
  /** 두 연주자 집중 비교로 (A = 듣던 연주, B = 고른 연주) */
  onFocus?: (a: number, b: number) => void;
}

/**
 * 모바일 작품 비교 (1차 시안 모바일 비교): 구간 칩 → 영상 한 개 → 연주자 목록.
 * 영상은 고른 연주 하나만 불러온다. 웹은 잘라 둔 클립, 네이티브는 YouTube 원본의 그 구간.
 */
export function CompareMobilePiece({ pieceId, composerId, sectorId, onBack, onSelectSector, onFocus }: CompareMobilePieceProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const headerInset = useTabHeaderInset();
  const scrollInsets = useTabScrollInsets();
  const { canEdit } = useAuth();
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data, locale]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? defaultComparisonSector(sectors);
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  // 탭을 옮겨도 이 화면은 뒤에 살아 있다. 재생 바를 따라 구간을 옮기는 건 보일 때만
  const screenFocused = useIsFocused();
  const repertoireIds = useRepertoireIds();
  // 레퍼토리에 담은 연주자를 앞으로
  const performances = React.useMemo(
    () =>
      repertoireFirst(performancesQuery.data ?? [], (performance) =>
        repertoireIds.artists.has(primaryCredit(performance)?.artistId ?? -1)
      ),
    [performancesQuery.data, repertoireIds.artists, locale]
  );
  const first = performancesQuery.data?.[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
  const goBack = () => onBack(composerId ?? first?.composerId);
  const images = React.useMemo(
    () => new Map((pieceInfo?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl])),
    [pieceInfo?.performers, locale]
  );
  const imageOf = (performance: ComparisonPerformance) =>
    primaryCredit(performance)?.imageUrl ?? images.get(primaryCredit(performance)?.artistId ?? 0) ?? null;

  // 고른 연주는 전역 재생 스토어에 둔다. 연주자를 오가도 각자 듣던 위치에서 이어진다
  const current = useComparePlayer((state) => state.current);
  const activeId =
    current && current.pieceId === pieceId && current.sectorId === activeSector?.id ? current.performanceId : null;
  // 1:1 비교 고르기: 지금 연주(A)는 고정, 다른 연주 하나를 고르면 집중 비교로 간다
  const [picking, setPicking] = React.useState(false);
  const canFocus =
    Boolean(onFocus) && activeId !== null && performances.filter(isPlayablePerformance).length >= 2;
  const choose = (performance: ComparisonPerformance) => {
    if (!isPlayablePerformance(performance)) return;
    if (picking) {
      if (performance.id !== activeId && activeId !== null && onFocus) {
        setPicking(false);
        onFocus(activeId, performance.id);
      }
      return;
    }
    if (performance.id === activeId && comparePlayer.togglePlay()) return;
    // 재생 바의 다음 연주자도 이 구간의 재생 가능한 연주를 이 순서로 돈다
    const queue = performances
      .filter(isPlayablePerformance)
      .map((item) => trackFromPerformance(item, imageOf(item)));
    comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), {
      play: true,
      queue,
      ...compareQueueFor(pieceId, sectors, performance.sectorId, performance),
    });
  };
  // 들을 곳: 그 연주를 그 지점부터 튼다
  const playAt = (performance: ComparisonPerformance, moment: ListeningMoment) => {
    if (!isPlayablePerformance(performance)) return;
    setPicking(false);
    const queue = performances
      .filter(isPlayablePerformance)
      .map((item) => trackFromPerformance(item, imageOf(item)));
    comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), {
      play: true,
      queue,
      startAt: moment.offsetMs / 1000,
      ...compareQueueFor(pieceId, sectors, performance.sectorId, performance),
    });
  };
  // 전체 화면의 연주자 칩: 바로 그 연주로 바꾼다(같은 연주면 그대로)
  const pick = (performance: ComparisonPerformance) => {
    if (!isPlayablePerformance(performance) || performance.id === activeId) return;
    const queue = performances
      .filter(isPlayablePerformance)
      .map((item) => trackFromPerformance(item, imageOf(item)));
    comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), {
      play: true,
      queue,
      ...compareQueueFor(pieceId, sectors, performance.sectorId, performance),
    });
  };
  // 재생 바(미니 플레이어)의 이전·다음 곡으로 이 작품의 다른 구간이 재생되면 화면도 그 구간으로 따라간다
  useFollowSongNav(pieceId, activeSector?.id, onSelectSector, screenFocused);
  // 추천 비교: 두 연주가 이 구간에서 모두 재생될 때만 보인다
  const featured = resolveFeaturedPair(activeSector?.featuredPair ?? null, performances.filter(isPlayablePerformance));

  const recordRecent = useRecordRecentPiece();
  React.useEffect(() => {
    if (!first || !activeSector) return;
    void recordRecent({
      pieceId,
      pieceTitle: first.pieceTitle,
      composerId: first.composerId,
      composerName: first.composerName,
      composerAvatarUrl: pieceInfo?.composerAvatarUrl ?? null,
      sectorId: activeSector.id,
      sectorName: activeSector.sectorName,
      genre: pieceInfo?.genre ?? null,
      coverVideoId: pieceInfo?.coverVideoId ?? null,
      names: {
        pieceTitle: first.names?.pieceTitle,
        composerName: first.names?.composerName,
        sectorName: activeSector.names?.sectorName,
      },
    });
  }, [pieceId, first, activeSector, pieceInfo?.composerAvatarUrl, pieceInfo?.genre, pieceInfo?.coverVideoId, recordRecent]);

  const active = performances.find((performance) => performance.id === activeId);
  const preview = active ?? performances.find((performance) => performance.clipStatus === 'ready');
  const longest = Math.max(1, ...performances.map(clipDurationMs));
  // 이 구간의 곡선은 모두 같은 눈금으로 그린다
  const curveFloor = sharedFloorDb(performances.map((performance) => performance.loudness));
  const title = first?.pieceTitle ?? pieceInfo?.pieceTitle;
  const composerIdForLink = first?.composerId ?? pieceInfo?.composerId ?? composerId;

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <View className="flex-1 bg-background px-4" style={{ paddingTop: headerInset }}>
        <BackButton onPress={goBack} />
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title={t('비교를 불러오지 못했어요')}
          description={t('잠시 뒤 다시 시도해 주세요.')}
          action={{
            label: t('다시 시도'),
            onPress: () => {
              void sectorsQuery.refetch();
              void performancesQuery.refetch();
            },
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView {...scrollInsets} className="flex-1 bg-background" contentContainerClassName="px-4 pb-28">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={goBack} />
        <View className="mt-3 flex-row items-center gap-1">
          {canEdit ? (
            <Pressable
              onPress={() => router.push(`/compare-admin?composerId=${composerId ?? first?.composerId ?? ''}&pieceId=${pieceId}` as Href)}
              accessibilityLabel={t('구간·연주 관리')}
              className="size-11 items-center justify-center rounded-full">
              <Icon as={SettingsIcon} size={18} className="text-foreground-muted" />
            </Pressable>
          ) : null}
          {title ? <FavoriteButton kind="pieces" id={pieceId} name={title} className="size-11" /> : null}
        </View>
      </View>

      {/* 머리: 작곡가 사진. 사진이 없으면 대표 연주의 음반 표지(영상 썸네일은 악보 화면일 때가 있다) */}
      <View className="mt-3 flex-row items-end gap-4">
        {title ? (
          <PieceArt
            coverVideoId={pieceInfo?.composerAvatarUrl ? null : pieceInfo?.coverVideoId}
            fallbackImage={pieceInfo?.composerAvatarUrl}
            fallbackName={first?.composerName ?? pieceInfo?.composerName ?? title}
            size={88}
          />
        ) : (
          <Skeleton className="size-[88px] rounded-md" />
        )}
        <View className="min-w-0 flex-1">
          {title ? (
            <>
              <GenreLink genre={pieceInfo?.genre} className="mb-1" />
              <Text className="text-title-2 font-bold text-foreground">{title}</Text>
              {/* 작곡가 이름을 누르면 작곡가 화면으로 간다 */}
              <View className="mt-1 flex-row items-center">
                {composerIdForLink && (first?.composerName ?? pieceInfo?.composerName) ? (
                  <Pressable
                    onPress={() => router.push(`/composer/${composerIdForLink}` as Href)}
                    accessibilityRole="link"
                    accessibilityLabel={t('{name} 작곡가 화면으로', { name: first?.composerName ?? pieceInfo?.composerName ?? '' })}
                    hitSlop={8}>
                    <Text variant="caption" className="font-semibold text-foreground underline">
                      {first?.composerName ?? pieceInfo?.composerName}
                    </Text>
                  </Pressable>
                ) : (
                  <Text variant="caption">{first?.composerName ?? pieceInfo?.composerName ?? ''}</Text>
                )}
                {pieceInfo ? <Text variant="caption">{` · ${t('연주자 {count}', { count: pieceInfo.performerCount })}`}</Text> : null}
              </View>
            </>
          ) : (
            <Skeleton className="h-7 w-3/4" />
          )}
        </View>
      </View>

      <View className="mt-5">
        <SectionStaff
          sectors={sectors}
          activeSectorId={activeSector?.id}
          reference={active ?? preview}
          labels="active"
          onSelect={onSelectSector}
        />
      </View>

      {/* 구간: 줄바꿈하지 않고 가로로 흘린다 (부록 D-13) */}
      <ScrollShelf className="mt-1" gap={8}>
        {sectorsQuery.isLoading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-8 w-24 rounded-full" />)
          : sectors.map((sector) => (
              <Chip
                key={sector.id}
                label={sector.sectorName}
                count={sector.readyPerformanceCount}
                trailing={<SectorTypeBadge sector={sector} />}
                selected={sector.id === activeSector?.id}
                onPress={() => onSelectSector(sector.id)}
              />
            ))}
      </ScrollShelf>

      {activeSector ? (
        <SectorGuide
          sector={activeSector}
          collapsible
          footer={
            featured && activeSector.featuredPair && onFocus ? (
              <FeaturedPairLink
                pair={activeSector.featuredPair}
                a={featured[0]}
                b={featured[1]}
                compact
                onOpen={() => onFocus(featured[0].id, featured[1].id)}
              />
            ) : null
          }
          className="mt-3"
        />
      ) : null}

      {/* 영상: 고른 연주 하나만 */}
      <View className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-surface-3">
        {active && isPlayablePerformance(active) ? (
          // 앱에 하나 둔 영상(웹은 셸의 video, 네이티브는 루트의 YouTube)이 이 자리에 뜬다.
          // 다른 화면으로 가도 미니 플레이어로 옮겨 가며 이어진다
          <PlayerSlot performanceId={active.id} fit="contain" radius={14} controls />
        ) : preview ? (
          <Pressable
            onPress={() => choose(preview)}
            accessibilityRole="button"
            accessibilityLabel={t('{name} 재생', { name: primaryCredit(preview)?.artistName ?? t('fallback::연주') })}
            className="flex-1">
            {youtubeThumbnailUrl(preview) ? (
              <OptimizedImage uri={youtubeThumbnailUrl(preview)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : null}
            <Scrim from="bottom" opacity={0.75} extent={55} />
            <View className="absolute inset-0 items-center justify-center">
              <View className="size-14 items-center justify-center rounded-full bg-primary">
                <Icon as={PlayIcon} size={22} className="ml-1 fill-primary-foreground text-primary-foreground" />
              </View>
            </View>
            {activeSector ? (
              <View className="absolute left-3 top-3">
                <Badge tone="media" label={activeSector.sectorName} />
              </View>
            ) : null}
            <Text className="absolute bottom-3 left-3 text-label font-semibold text-white">
              {primaryCredit(preview)?.artistName ?? ''}
            </Text>
            <Text className="absolute bottom-3 right-3 rounded-xs bg-black/60 px-1.5 py-0.5 font-mono text-caption text-white">
              {clipClock(clipDurationMs(preview))}
            </Text>
          </Pressable>
        ) : performancesQuery.isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="caption">{t('이 구간은 아직 재생할 영상이 없어요')}</Text>
          </View>
        )}
      </View>
      <View className="mt-2 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <SwitchModeToggle compact />
          <Pressable
            onPress={() => setPicking((value) => !value)}
            disabled={!canFocus}
            accessibilityRole="button"
            accessibilityState={{ selected: picking, disabled: !canFocus }}
            accessibilityLabel={picking ? t('1:1 비교 고르기 취소') : t('1:1 비교')}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3',
              picking ? 'border-primary bg-primary-muted' : 'border-border-strong',
              !canFocus && 'opacity-40'
            )}>
            <Text className={cn('text-label', picking ? 'text-primary' : 'text-foreground')}>{picking ? t('취소') : t('1:1 비교')}</Text>
          </Pressable>
        </View>
        {active && youtubeWatchUrl(active) ? (
          <Pressable
            onPress={() => Linking.openURL(youtubeWatchUrl(active) ?? '')}
            accessibilityRole="link"
            className="flex-row items-center gap-1.5">
            <ServiceLogo service="youtube" size={14} />
            <Text variant="caption">{t('YouTube 원본')}</Text>
          </Pressable>
        ) : null}
      </View>

      {picking ? (
        <View className="mt-3 rounded-lg border border-primary bg-primary-muted px-3 py-2.5">
          <Text className="text-body-sm font-semibold text-foreground">
            {active
              ? t('{name} 연주와 견줄 연주자를 한 명 더 고르세요', { name: primaryCredit(active)?.artistName ?? t('fallback::지금 연주') })
              : t('견줄 연주자를 두 명 고르세요')}
          </Text>
        </View>
      ) : null}

      {/* 연주자: 길이는 가장 긴 연주 대비 */}
      <View className="mt-4">
        {performancesQuery.isLoading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="mb-2 h-14 w-full rounded-lg" />)
          : performances.map((performance) => (
              <PerformerRow
                key={performance.id}
                performance={performance}
                image={imageOf(performance)}
                longest={longest}
                active={performance.id === activeId}
                inRepertoire={repertoireIds.artists.has(primaryCredit(performance)?.artistId ?? -1)}
                onPress={() => choose(performance)}
                onQueue={
                  isPlayablePerformance(performance) && performance.id !== activeId
                    ? () =>
                        queueActionSheet.open({
                          track: trackFromPerformance(performance, imageOf(performance)),
                          title: primaryCredit(performance)?.artistName ?? performance.pieceTitle,
                          subtitle: `${performance.pieceTitle} · ${performance.sectorName}`,
                        })
                    : undefined
                }
                onMoment={(moment) => playAt(performance, moment)}
                curveFloor={curveFloor}
              />
            ))}
      </View>

      <PieceScreenStrip pieceId={pieceId} activeSectorId={activeSector?.id} className="mt-10" />
      <MobileFullscreen
        performances={performances.filter(isPlayablePerformance)}
        active={active ?? null}
        sectorName={activeSector?.sectorName ?? null}
        activeId={activeId}
        imageOf={imageOf}
        onPick={pick}
      />
    </ScrollView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  useLocale();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={t('뒤로')}
      className="mt-3 size-11 items-center justify-center rounded-full bg-surface-2">
      <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
    </Pressable>
  );
}

function PerformerRow({
  performance,
  image,
  longest,
  active,
  inRepertoire,
  onPress,
  onQueue,
  onMoment,
  curveFloor,
}: {
  performance: ComparisonPerformance;
  image: string | null;
  longest: number;
  active: boolean;
  inRepertoire: boolean;
  onPress: () => void;
  /** 길게 누르면 이 연주를 대기열에 넣는 시트를 연다 */
  onQueue?: () => void;
  onMoment: (moment: ListeningMoment) => void;
  curveFloor: number;
}) {
  useLocale();
  const credit = primaryCredit(performance);
  const ready = performance.clipStatus === 'ready';
  const duration = clipDurationMs(performance);
  const progress = useComparePlayer((state) => (active ? state.progress : null));
  const playingNow = useComparePlayer((state) => active && state.playing);
  const support = supportingCredits(performance);
  const note = performance.note;
  return (
    <View>
      <Pressable
        onPress={ready ? onPress : undefined}
        onLongPress={onQueue}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: !ready }}
        accessibilityLabel={
          ready
            ? t('{name} 재생', { name: credit?.artistName ?? t('fallback::연주') })
            : t('{name} 준비 중', { name: credit?.artistName ?? t('fallback::연주') })
        }
        className={cn('-mx-2 flex-row items-center gap-3 rounded-lg px-2 py-2.5', active && 'bg-surface-2')}>
        <RepertoireThumb active={inRepertoire} badgeSize={16}>
          <EntityThumb name={credit?.artistName ?? '?'} image={image} shape="circle" size={40} />
        </RepertoireThumb>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className={cn('text-body-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
            {credit?.artistName ?? t('연주자 정보 없음')}
          </Text>
          {support ? (
            <Text variant="caption" numberOfLines={1}>
              {support}
            </Text>
          ) : null}
          <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
            <View
              className={cn('h-full rounded-full', active ? 'bg-primary' : 'bg-foreground-subtle')}
              style={{ width: `${Math.max(4, (duration / longest) * 100)}%` }}
            />
          </View>
        </View>
        {performance.loudness ? (
          <LoudnessSparkline
            loudness={performance.loudness}
            marks={note?.moments.map((moment) => moment.offsetMs)}
            tone={active ? 'a' : 'neutral'}
            playhead={active ? (progress && progress.duration > 0 ? progress.current / progress.duration : 0) : undefined}
            playing={playingNow}
            height={28}
            floorDb={curveFloor}
            className="w-16"
          />
        ) : null}
        {ready ? (
          <Text variant="mono" className="w-11 text-right text-foreground-muted">
            {clipClock(duration)}
          </Text>
        ) : (
          <Badge label={t('준비 중')} />
        )}
      </Pressable>
      {/* 연주 노트: 제목과 첫 줄만 보이고, 이 연주를 고르면 펼쳐 들을 곳까지 보인다 */}
      {note ? (
        <PerformanceNote
          note={note}
          bodyLines={active ? undefined : 1}
          hideMoments={!active}
          onMoment={ready ? onMoment : undefined}
          className="mb-1 ml-[52px] pb-1.5"
        />
      ) : null}
    </View>
  );
}
