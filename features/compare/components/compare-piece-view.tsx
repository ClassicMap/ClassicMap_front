import { isTypingTarget } from '@/lib/utils/is-typing-target';
import { FullscreenOverlay } from '@/features/compare/components/fullscreen-overlay';
import { FeaturedPairLink, MomentChip, PerformanceNote, resolveFeaturedPair } from '@/features/compare/components/listening-note';
import { PerformerMark, performerOf } from '@/features/compare/components/performer-mark';
import { LoudnessSparkline, sharedFloorDb } from '@/features/compare/components/loudness-curve';
import { SectionStaff } from '@/features/compare/components/section-staff';
import { SectorGuide, SectorTypeBadge } from '@/features/compare/components/sector-guide';
import { PieceScreenStrip } from '@/features/film/components/piece-screen-strip';
import { SwitchModeToggle } from '@/features/compare/components/switch-mode-toggle';
import { FavoriteButton } from '@/features/library/components/favorite-button';
import { PlayerSlot } from '@/features/player/components/player-slot';
import { VolumeControl } from '@/features/player/components/volume-control';
import { RepertoireThumb } from '@/features/library/components/repertoire-badge';
import { ScrubBar } from '@/features/player/components/scrub-bar';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Equalizer } from '@/features/player/components/equalizer';
import { GenreLink } from '@/features/piece/components/genre-link';
import { PieceArt } from '@/features/piece/components/piece-art';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/shared/icons';
import { PerformerStepper, useFollowSongNav, useSongNav } from '@/features/player/components/song-nav';
import { compareQueueFor } from '@/lib/player/compare-playlist';
import { QueueButton } from '@/features/player/components/queue-panel';
import { ServiceLogo } from '@/components/shared/service-logo';
import { Skeleton, SkeletonMedia } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecordRecentPiece } from '@/hooks/use-recent-pieces';
import { useRepertoireIds } from '@/features/library/hooks/use-repertoire-ids';
import {
  useComparisonPiece,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/use-comparison-performances';
import { useArtist } from '@/lib/query/hooks/use-artists';
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
import { comparePlayer, type ComparePlayerTrack, useComparePlayer, usePlayerOverlay } from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { repertoireFirst } from '@/features/library/lib/library';
import type { ComparisonPerformance, ListeningMoment } from '@/types/models';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useIsFocused } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  Columns2Icon as ColumnsIcon,
  LayoutGridIcon,
  MaximizeIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RectangleHorizontalIcon,
  SettingsIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Pressable, ScrollView, View } from 'react-native';
import { type PrefetchTarget, usePrefetchOnHover } from '@/lib/navigation/prefetch';
import { t, useLocale } from '@/lib/i18n';

interface ComparePieceViewProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  /** 돌아갈 작곡가. 주소에 작곡가가 없던 딥링크면 연주에서 알아낸 작곡가를 넘긴다 */
  onBack: (composerId?: number) => void;
  onSelectSector: (sectorId: number) => void;
  /** 두 연주자 집중 비교로 (A = 듣던 연주, B = 고른 연주) */
  onFocus?: (a: number, b: number) => void;
}

const SEEK_STEP_SEC = 5;

/**
 * 한 작품의 비교 화면 (설계 문서 7.4, 1차 시안 비교 패널).
 * 영상은 고른 연주 하나만 불러오고 나머지는 썸네일로 둔다 (프로젝트 지침).
 * 재생 상태는 전역 스토어(compare-player-store)에 두어 연주자별 위치·볼륨이 화면을 오가도 남는다.
 */
export function ComparePieceView({
  pieceId,
  composerId,
  sectorId,
  onBack,
  onSelectSector,
  onFocus,
}: ComparePieceViewProps) {
  const { locale } = useLocale();
  const router = useRouter();
  // 탭을 옮겨도 이 화면은 뒤에 살아 있다. 단축키는 보일 때만 받는다
  const screenFocused = useIsFocused();
  const { canEdit } = useAuth();
  const repertoire = useRepertoireIds();
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data, locale]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? defaultComparisonSector(sectors);
  // 같은 작품 안에서 구간을 바꾸면 새 연주가 올 때까지 이전 구간 연주를 흐리게 남긴다
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id, { keepPreviousForPiece: pieceId });
  const stale = performancesQuery.isPlaceholderData;
  const first = performancesQuery.data?.[0];
  // 앞 화면 목록에 있던 작품이면 요청을 기다리지 않고 바로 채워진다 (머리가 스켈레톤을 거치지 않는다)
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
  const composerAvatar = pieceInfo?.composerAvatarUrl ?? null;
  const backComposerId = composerId ?? first?.composerId ?? pieceInfo?.composerId;
  const backLabel = pieceInfo?.composerName ?? first?.composerName;
  const pieceTitle = first?.pieceTitle ?? pieceInfo?.pieceTitle;
  const composerName = first?.composerName ?? pieceInfo?.composerName;
  const headerComposerId = first?.composerId ?? pieceInfo?.composerId;
  // 머리 줄에서 연주자·구간을 누르면 이 화면의 그 자리로 부드럽게 내려간다
  const scrollRef = React.useRef<ScrollView>(null);
  const anchors = React.useRef<{ sectors: number; performances: number }>({ sectors: 0, performances: 0 });
  const scrollToAnchor = (anchor: 'sectors' | 'performances') =>
    scrollRef.current?.scrollTo({ y: Math.max(0, anchors.current[anchor] - 16), animated: true });
  const goBack = () => onBack(backComposerId);

  // 레퍼토리에 담은 연주자를 앞으로. 나머지는 원래 순서 (재생 순서도 이 순서다)
  const performances = React.useMemo(
    () =>
      repertoireFirst(performancesQuery.data ?? [], (performance) =>
        repertoire.artists.has(primaryCredit(performance)?.artistId ?? -1)
      ),
    [performancesQuery.data, repertoire.artists, locale]
  );

  const images = React.useMemo(
    () => new Map((pieceInfo?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl])),
    [pieceInfo?.performers, locale]
  );
  const imageOf = React.useCallback(
    (performance: ComparisonPerformance) => {
      const credit = primaryCredit(performance);
      return credit?.imageUrl ?? images.get(credit?.artistId ?? 0) ?? null;
    },
    [images]
  );

  // 홈의 "최근 본 작품"에 남긴다 (이 기기에만)
  const recordRecent = useRecordRecentPiece();
  React.useEffect(() => {
    if (!first || !activeSector || stale) return;
    void recordRecent({
      pieceId,
      pieceTitle: first.pieceTitle,
      composerId: first.composerId,
      composerName: first.composerName,
      composerAvatarUrl: composerAvatar,
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
  }, [pieceId, first, activeSector, composerAvatar, pieceInfo?.genre, pieceInfo?.coverVideoId, recordRecent, stale]);

  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const theater = useComparePlayer((state) => state.theater);
  const fullscreen = useComparePlayer((state) => state.fullscreen);
  // 셸 영상이 이 화면 자리에 떠 있을 때 그 위에 겹칠 자리 (전체 화면 버튼·전체 화면 조작부)
  const overlay = usePlayerOverlay();

  // 지금 이 작품·구간의 연주를 골라 둔 경우에만 그 연주가 활성이다
  const activeId =
    current && current.pieceId === pieceId && current.sectorId === activeSector?.id ? current.performanceId : null;
  const active = performances.find((performance) => performance.id === activeId);
  const longest = Math.max(1, ...performances.map(clipDurationMs));
  // 이 구간의 곡선은 모두 같은 눈금으로 그린다
  const curveFloor = React.useMemo(() => sharedFloorDb(performances.map((performance) => performance.loudness)), [performances, locale]);
  // 재생·전환은 클립이 준비된 연주 안에서만 돈다 (clipStatus !== 'ready'는 재생 UI를 두지 않는다)
  const playable = React.useMemo(() => performances.filter(isPlayablePerformance), [performances, locale]);
  // 크게 보기 무대: 고른 연주, 없으면 첫 재생 가능 연주의 포스터
  const staged = active ?? playable[0];

  // 재생 바의 다음 연주자도 이 구간의 재생 가능한 연주를 이 순서로 돈다
  const queue = React.useMemo<ComparePlayerTrack[]>(
    () => playable.map((performance) => trackFromPerformance(performance, imageOf(performance))),
    [playable, imageOf, locale]
  );
  const choose = React.useCallback(
    (performance: ComparisonPerformance) =>
      comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), {
        play: true,
        queue,
        ...compareQueueFor(pieceId, sectors, performance.sectorId, performance),
      }),
    [imageOf, queue, pieceId, sectors]
  );

  // 1:1 비교 고르기: 지금 연주(A)는 고정, 다른 연주 하나를 고르면 집중 비교로 간다
  const [picking, setPicking] = React.useState(false);
  const canFocus = Boolean(onFocus) && activeId !== null && playable.length >= 2;
  React.useEffect(() => {
    if (!canFocus) setPicking(false);
  }, [canFocus]);

  const start = React.useCallback(
    (performance: ComparisonPerformance) => {
      // 흐리게 남은 이전 구간 연주는 누를 수 없다
      if (stale || !isPlayablePerformance(performance)) return;
      if (picking) {
        if (performance.id !== activeId && activeId !== null && onFocus) {
          setPicking(false);
          onFocus(activeId, performance.id);
        }
        return;
      }
      if (performance.id === activeId && comparePlayer.hasMedia()) {
        comparePlayer.togglePlay();
        return;
      }
      choose(performance);
    },
    [activeId, choose, picking, onFocus, stale]
  );

  // 들을 곳: 그 연주를 그 지점부터 튼다
  const playAt = React.useCallback(
    (performance: ComparisonPerformance, moment: ListeningMoment) => {
      if (!isPlayablePerformance(performance)) return;
      setPicking(false);
      comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), {
        play: true,
        queue,
        startAt: moment.offsetMs / 1000,
        ...compareQueueFor(pieceId, sectors, performance.sectorId, performance),
      });
    },
    [imageOf, queue, pieceId, sectors]
  );

  // 추천 비교: 두 연주가 이 구간에서 모두 재생될 때만 보인다
  const featured = resolveFeaturedPair(activeSector?.featuredPair ?? null, playable);

  const togglePlay = React.useCallback(() => {
    if (activeId !== null && comparePlayer.togglePlay()) return;
    if (stale) return;
    const target = active ?? playable[0];
    if (target) choose(target);
  }, [active, activeId, playable, choose, stale]);

  const switchTake = React.useCallback(
    (direction: 1 | -1) => {
      if (stale || playable.length === 0) return;
      const index = playable.findIndex((performance) => performance.id === activeId);
      choose(playable[(index + direction + playable.length) % playable.length]);
    },
    [activeId, playable, choose, stale]
  );

  // 재생 바의 이전·다음 곡으로 이 작품의 다른 구간이 재생되면 화면도 그 구간으로 따라간다
  useFollowSongNav(pieceId, activeSector?.id, onSelectSector, screenFocused);

  // 전체 화면: 셸 영상을 통째로 띄운다. 연주자를 바꿔도 같은 영상이라 전체 화면이 풀리지 않는다
  const toggleFullscreen = React.useCallback(() => {
    if (comparePlayer.getState().fullscreen) {
      comparePlayer.exitFullscreen();
      return;
    }
    // 아직 고른 연주가 없으면 무대의 연주를 틀면서 띄운다
    if (activeId === null && staged && isPlayablePerformance(staged)) choose(staged);
    comparePlayer.requestFullscreen();
  }, [activeId, staged, choose]);

  React.useEffect(() => {
    if (!screenFocused) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // 슬라이더는 제 화살표를 스스로 처리하고 전파를 끊으므로 여기서는 입력 칸만 비킨다
      if (isTypingTarget(target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (event.key === 'Escape' && picking) {
        setPicking(false);
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        event.preventDefault();
        if (event.shiftKey) comparePlayer.seekBy(direction * SEEK_STEP_SEC);
        else switchTake(direction);
      } else if (key === 'f') {
        toggleFullscreen();
      } else if (key === 't') {
        comparePlayer.setTheater(!comparePlayer.getState().theater);
      } else if (key === 'm') {
        comparePlayer.toggleMute();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, switchTake, toggleFullscreen, picking, screenFocused]);

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        tone="error"
        title={t('비교 구간을 불러오지 못했어요')}
        description={t('잠시 뒤 다시 시도해 주세요.')}
        action={{
          label: t('다시 시도'),
          onPress: () => {
            void sectorsQuery.refetch();
            void performancesQuery.refetch();
          },
        }}
      />
    );
  }
  if (sectorsQuery.data === null || (!sectorsQuery.isLoading && sectors.length === 0)) {
    return (
      <EmptyState
        icon={CompareIcon}
        title={t('이 작품은 아직 비교할 수 없어요')}
        description={t('연주자 세 명 이상의 영상이 모이면 비교할 수 있어요.')}
        action={{ label: t('비교할 수 있는 작품 보기'), onPress: goBack }}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="px-7 pb-10">
        <Pressable onPress={goBack} className="mb-4 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
          <Text variant="caption" className="text-foreground-muted">
            {backLabel ? t('{name}의 비교 작품', { name: backLabel }) : t('비교할 수 있는 작품')}
          </Text>
        </Pressable>

        {/* 머리: 작품은 사각. 크게 보기에서는 영상에 자리를 내주려 줄인다 */}
        <View className="flex-row items-end gap-6">
          {pieceTitle ? (
            // 작품 그림: 작곡가 사진. 사진이 없으면 대표 연주의 음반 표지(영상 썸네일은 악보 화면일 때가 있다)
            <PieceArt
              coverVideoId={composerAvatar ? null : pieceInfo?.coverVideoId}
              fallbackImage={composerAvatar}
              fallbackName={composerName ?? pieceTitle}
              size={theater ? 72 : 136}
              className="web:shadow-xl web:shadow-black/50"
            />
          ) : (
            <Skeleton className={cn('rounded-md', theater ? 'size-[72px]' : 'size-[136px]')} />
          )}
          <View className="min-w-0 flex-1 pb-1">
            {!theater ? (
              <View className="flex-row items-center gap-2.5">
                <Text variant="micro" className="uppercase tracking-widest">
                  {t('비교')}
                </Text>
                <GenreLink genre={pieceInfo?.genre} />
              </View>
            ) : null}
            {pieceTitle ? (
              <>
                <Text
                  className={cn(
                    'font-extrabold tracking-tight text-foreground',
                    theater ? 'text-[28px] leading-[32px]' : 'mt-2 text-[44px] leading-[46px]'
                  )}>
                  {pieceTitle}
                </Text>
                <View className={cn('flex-row items-center gap-2', theater ? 'mt-1.5' : 'mt-3')}>
                  {/* 항목마다 그 내용으로 바로 간다: 작곡가 → 작곡가 화면, 연주자·구간 → 이 화면의 그 자리 */}
                  <View className="flex-row flex-wrap items-center">
                    {composerName && headerComposerId ? (
                      <MetaLink
                        label={composerName}
                        strong
                        accessibilityLabel={t('{name} 작곡가 화면으로', { name: composerName })}
                        prefetch={{ kind: 'composer', composerId: headerComposerId }}
                        onPress={() => router.push(`/composer/${headerComposerId}` as Href)}
                      />
                    ) : composerName ? (
                      <Text variant="bodySm" className="font-semibold text-foreground">
                        {composerName}
                      </Text>
                    ) : null}
                    {pieceInfo?.opusNumber ? (
                      <Text variant="bodySm" className="text-foreground-muted">{`  ·  ${pieceInfo.opusNumber}`}</Text>
                    ) : null}
                    {pieceInfo || first ? (
                      <>
                        <Text variant="bodySm" className="text-foreground-muted">
                          {'  ·  '}
                        </Text>
                        <MetaLink
                          label={t('연주자 {count}', { count: pieceInfo?.performerCount ?? first?.credits.length ?? 0 })}
                          accessibilityLabel={t('연주 칸으로')}
                          onPress={() => scrollToAnchor('performances')}
                        />
                      </>
                    ) : null}
                    <Text variant="bodySm" className="text-foreground-muted">
                      {'  ·  '}
                    </Text>
                    <MetaLink
                      label={t('구간 {count}', { count: sectors.length || (pieceInfo?.sectorCount ?? 0) })}
                      accessibilityLabel={t('구간 고르는 곳으로')}
                      onPress={() => scrollToAnchor('sectors')}
                    />
                  </View>
                  <FavoriteButton kind="pieces" id={pieceId} name={pieceTitle} />
                  {canEdit ? (
                    <Pressable
                      onPress={() => router.push(`/compare-admin?composerId=${headerComposerId ?? ''}&pieceId=${pieceId}` as Href)}
                      accessibilityLabel={t('구간·연주 관리')}
                      className="h-9 flex-row items-center gap-1.5 rounded-full px-3 web:hover:bg-surface-3">
                      <Icon as={SettingsIcon} size={15} className="text-foreground-muted" />
                      <Text variant="label" className="text-foreground-muted">
                        {t('구간·연주 관리')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : (
              <Skeleton className="mt-3 h-10 w-2/3" />
            )}
          </View>
        </View>

        <View
          className={cn('max-w-[880px]', theater ? 'mt-5' : 'mt-8')}
          onLayout={(event) => (anchors.current.sectors = event.nativeEvent.layout.y)}>
          <SectionStaff
            sectors={sectors}
            activeSectorId={activeSector?.id}
            reference={active ?? performances[0]}
            onSelect={onSelectSector}
          />
        </View>

        {/* 구간 선택 + 보기 방식 */}
        <View className="mt-2 flex-row items-center gap-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="min-w-0 flex-1" contentContainerClassName="gap-2">
            {sectors.map((sector) => (
              <Chip
                key={sector.id}
                label={sector.sectorName}
                count={sector.primaryArtistCount}
                trailing={<SectorTypeBadge sector={sector} />}
                selected={sector.id === activeSector?.id}
                onPress={() => onSelectSector(sector.id)}
              />
            ))}
          </ScrollView>
          <SwitchModeToggle />
          <Pressable
            onPress={() => comparePlayer.setTheater(!theater)}
            accessibilityRole="button"
            accessibilityLabel={theater ? t('모아 보기 (T)') : t('크게 보기 (T)')}
            className="h-8 flex-row items-center gap-1.5 rounded-full border border-border-strong px-3 web:hover:bg-surface-2">
            <Icon as={theater ? LayoutGridIcon : RectangleHorizontalIcon} size={14} className="text-foreground" />
            <Text className="text-label text-foreground">{theater ? t('mode::모아 보기') : t('mode::크게 보기')}</Text>
          </Pressable>
        </View>

        {activeSector ? (
          <SectorGuide
            sector={activeSector}
            collapsible={theater}
            footer={
              featured && activeSector.featuredPair && onFocus ? (
                <FeaturedPairLink
                  pair={activeSector.featuredPair}
                  a={featured[0]}
                  b={featured[1]}
                  onOpen={() => onFocus(featured[0].id, featured[1].id)}
                />
              ) : null
            }
            className="mt-4 max-w-[880px]"
          />
        ) : null}

        {picking ? (
          <View className="mt-5 flex-row items-center gap-3 rounded-lg border border-primary bg-primary-muted px-4 py-3">
            {active ? <PerformerMark performer={performerOf(active, imageOf)} tone="a" size={24} /> : null}
            <Text className="min-w-0 flex-1 text-body-sm font-semibold text-foreground">
              {active
                ? t('{name} 연주와 견줄 연주자를 한 명 더 고르세요', { name: performerOf(active).name })
                : t('견줄 연주자를 두 명 고르세요')}
            </Text>
            <Pressable onPress={() => setPicking(false)} accessibilityRole="button" className="rounded-full px-3 py-1.5 web:hover:bg-surface-2">
              <Text className="text-label text-foreground-muted">{t('취소 (Esc)')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View onLayout={(event) => (anchors.current.performances = event.nativeEvent.layout.y)}>
        {sectorsQuery.isLoading || performancesQuery.isLoading ? (
          <View className="mt-6 flex-row flex-wrap gap-5">
            {Array.from({ length: 3 }, (_, index) => (
              <View key={index} className="min-w-[280px] flex-1 gap-3">
                <SkeletonMedia performers={0} className="aspect-video rounded-lg" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </View>
            ))}
          </View>
        ) : theater ? (
          // 스켈레톤 뒤 처음 그릴 때는 나타나고, 구간을 바꾸는 동안은 이전 연주를 흐리게 둔다
          <View className={cn('cm-fade-in cm-settle mt-6 flex-row items-start gap-6', stale && 'cm-stale')}>
            <View className="min-w-0 flex-1">
              <View className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {staged && active && staged.id === active.id ? (
                  <>
                    <PlayerSlot performanceId={active.id} fit="contain" radius={14} />
                    <Pressable
                      onPress={() => start(active)}
                      accessibilityRole="button"
                      accessibilityLabel={t('{name} 재생·일시정지', { name: primaryCredit(active)?.artistName ?? t('fallback::연주') })}
                      className="absolute inset-0"
                    />
                  </>
                ) : staged ? (
                  <Poster performance={staged} onPlay={() => start(staged)} large />
                ) : (
                  <View className="absolute inset-0 items-center justify-center">
                    <Text variant="caption" className="text-white/70">
                      {t('이 구간은 아직 재생할 영상이 없어요')}
                    </Text>
                  </View>
                )}
              </View>
              {staged ? (
                <StageCaption performance={staged} image={imageOf(staged)} active={staged.id === activeId} inRepertoire={repertoire.artists.has(primaryCredit(staged)?.artistId ?? -1)} />
              ) : null}
              {staged?.note ? (
                <PerformanceNote
                  note={staged.note}
                  curve={
                    <PerformanceCurve
                      performance={staged}
                      active={staged.id === activeId}
                      floorDb={curveFloor}
                      onSeek={isPlayablePerformance(staged) ? (offsetMs) => playAt(staged, { offsetMs, label: '' }) : undefined}
                    />
                  }
                  onMoment={(moment) => playAt(staged, moment)}
                  className="mt-3 max-w-[72ch]"
                />
              ) : staged ? (
                <PerformanceCurve
                  performance={staged}
                  active={staged.id === activeId}
                  floorDb={curveFloor}
                  onSeek={isPlayablePerformance(staged) ? (offsetMs) => playAt(staged, { offsetMs, label: '' }) : undefined}
                  className="mt-3 max-w-[72ch]"
                />
              ) : null}
            </View>
            <View className="w-[300px] gap-1">
              <Text variant="caption" className="mb-1.5 font-semibold text-foreground-subtle">
                {t('연주자 {count}', { count: performances.length })}
              </Text>
              {performances.map((performance) => (
                <TheaterRow
                  key={performance.id}
                  performance={performance}
                  image={imageOf(performance)}
                  longest={longest}
                  active={performance.id === activeId}
                  playing={performance.id === activeId && playing}
                  inRepertoire={repertoire.artists.has(primaryCredit(performance)?.artistId ?? -1)}
                  pick={picking ? (performance.id === activeId ? 'anchor' : isPlayablePerformance(performance) ? 'candidate' : undefined) : undefined}
                  onPress={() => start(performance)}
                />
              ))}
            </View>
          </View>
        ) : (
          // 슬롯: 연주자 한 명 = 한 열
          <SlotGrid count={performances.length} stale={stale}>
            {(width) => performances.map((performance) => (
              <Slot
                key={performance.id}
                width={width}
                performance={performance}
                image={imageOf(performance)}
                active={performance.id === activeId}
                inRepertoire={repertoire.artists.has(primaryCredit(performance)?.artistId ?? -1)}
                pick={picking ? (performance.id === activeId ? 'anchor' : isPlayablePerformance(performance) ? 'candidate' : undefined) : undefined}
                onPlay={() => start(performance)}
                onMoment={(moment) => playAt(performance, moment)}
                curveFloor={curveFloor}
              />
            ))}
          </SlotGrid>
        )}
        </View>

        <PieceScreenStrip pieceId={pieceId} activeSectorId={activeSector?.id} className="mt-12 max-w-[880px]" />
      </ScrollView>

      {overlay && fullscreen ? (
        createPortal(
          <FullscreenOverlay
            performances={playable}
            active={active ?? null}
            sectorName={activeSector?.sectorName ?? null}
            activeId={activeId}
            imageOf={imageOf}
            onPick={start}
            onTogglePlay={togglePlay}
            playing={playing}
            onExit={toggleFullscreen}
          />,
          overlay
        )
      ) : overlay && theater ? (
        createPortal(
          <button
            type="button"
            aria-label={t('전체 화면 (F)')}
            title={t('전체 화면 (F)')}
            onClick={toggleFullscreen}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}>
            <Icon as={MaximizeIcon} size={16} className="text-white" />
          </button>,
          overlay
        )
      ) : null}

      {/* 다른 작품을 듣는 중이면 셸의 플레이바가 그 연주를 보여 준다 */}
      {current && !active ? null : (
      <PlayerBar
        active={active}
        activeImage={active ? imageOf(active) : null}
        playing={playing}
        onTogglePlay={togglePlay}
        onFullscreen={toggleFullscreen}
        canFocus={canFocus}
        picking={picking}
        onToggleFocus={() => setPicking((value) => !value)}
      />
      )}
    </View>
  );
}

/** 아직 고르지 않은 연주: YouTube 썸네일 + 재생 버튼. 클립이 준비 안 됐으면 재생 버튼 없이 '준비 중' */
function Poster({
  performance,
  onPlay,
  large = false,
}: {
  performance: ComparisonPerformance;
  onPlay: () => void;
  large?: boolean;
}) {
  useLocale();
  const credit = primaryCredit(performance);
  const thumbnail = youtubeThumbnailUrl(performance);
  const canPlay = isPlayablePerformance(performance);
  return (
    <Pressable
      onPress={canPlay ? onPlay : undefined}
      disabled={!canPlay}
      accessibilityLabel={t('{name} 재생', { name: credit?.artistName ?? t('fallback::연주') })}
      className="group absolute inset-0">
      {thumbnail ? (
        <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : null}
      <View className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 to-transparent" />
      {canPlay ? (
        large ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="size-16 items-center justify-center rounded-full bg-primary">
              <Icon as={PlayIcon} size={26} className="ml-1 fill-primary-foreground text-primary-foreground" />
            </View>
          </View>
        ) : (
          <View className="absolute bottom-3 right-3 size-11 items-center justify-center rounded-full bg-primary opacity-0 transition-opacity duration-fast group-hover:opacity-100 web:hover:opacity-100">
            <Icon as={PlayIcon} size={18} className="fill-primary-foreground text-primary-foreground" />
          </View>
        )
      ) : (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="rounded-xs bg-black/60 px-1.5 py-0.5 text-micro text-white">{t('준비 중')}</Text>
        </View>
      )}
      <Text className="absolute bottom-3 left-3 font-mono text-caption text-white">
        {clipClock(clipDurationMs(performance))}
      </Text>
    </Pressable>
  );
}

function useArtistImage(artistId: number | undefined, known: string | null): string | null {
  // 카탈로그 미리보기에 없는 연주자만 상세로 채운다
  const artist = useArtist(known ? undefined : artistId);
  return known ?? artist.data?.imageUrl ?? null;
}

/** 1:1 비교 고르기에서 이 연주의 처지: 지금 듣는 기준 연주 또는 고를 수 있는 후보 */
type PickState = 'anchor' | 'candidate' | undefined;

/** 고르기 표시: 고를 수 있는 후보에 + 원. 기준 연주는 이름 옆에 '지금 연주'로 밝힌다 */
function PickMark({ pick }: { pick: PickState }) {
  useLocale();
  if (pick !== 'candidate') return null;
  return (
    <View pointerEvents="none" className="absolute left-3 top-3 z-raised">
      <View className="size-7 items-center justify-center rounded-full border-2 border-white bg-black/40">
        <Icon as={PlusIcon} size={14} className="text-white" />
      </View>
    </View>
  );
}

const SLOT_MIN_WIDTH = 280;
const SLOT_GAP = 20;

/**
 * 한 줄에 놓을 슬롯 수. 들어가는 만큼 놓되 줄마다 개수를 고르게 나눈다.
 * 다섯이 한 줄에 넷까지 들어가면 4+1 대신 3+2 로 놓는다
 */
function slotColumns(count: number, width: number): number {
  const fit = Math.max(1, Math.floor((width + SLOT_GAP) / (SLOT_MIN_WIDTH + SLOT_GAP)));
  const rows = Math.ceil(count / Math.min(fit, count));
  return Math.ceil(count / rows);
}

/**
 * 슬롯을 같은 너비로 줄 세운다. flex-1 로 늘리면 마지막 줄에 혼자 남은 슬롯이 한 줄을
 * 다 차지해 영상이 몇 배로 커진다. 너비를 재기 전에는 flex 로 둔다
 */
function SlotGrid({
  count,
  stale = false,
  children,
}: {
  count: number;
  /** 새 구간 연주를 받는 동안 이전 구간 연주를 흐리게 남긴다 */
  stale?: boolean;
  children: (width: number | undefined) => React.ReactNode;
}) {
  useLocale();
  const [width, setWidth] = React.useState(0);
  const columns = width > 0 ? slotColumns(count, width) : 0;
  const slotWidth = columns > 0 ? Math.floor((width - SLOT_GAP * (columns - 1)) / columns) : undefined;
  return (
    <View
      className={cn('cm-fade-in cm-settle mt-6 flex-row flex-wrap gap-5', stale && 'cm-stale')}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {children(slotWidth)}
    </View>
  );
}

interface SlotProps {
  performance: ComparisonPerformance;
  /** 줄에 맞춘 너비. 없으면 남은 폭을 나눠 쓴다 */
  width?: number;
  image: string | null;
  active: boolean;
  inRepertoire: boolean;
  pick?: PickState;
  onPlay: () => void;
  onMoment: (moment: ListeningMoment) => void;
  curveFloor: number;
}

function Slot({ performance, width, image, active, inRepertoire, pick, onPlay, onMoment, curveFloor }: SlotProps) {
  useLocale();
  const credit = primaryCredit(performance);
  const playing = useComparePlayer((state) => state.playing && state.current?.performanceId === performance.id);
  const photo = useArtistImage(credit?.artistId, image);
  const duration = clipDurationMs(performance);
  const support = supportingCredits(performance);
  // 곡선을 눌러 옮기는 것도 재생이라 고르기 중이거나 클립이 없으면 막는다
  const seekable = isPlayablePerformance(performance) && pick === undefined;

  return (
    <View className={cn('flex-col', width === undefined && 'min-w-[280px] flex-1')} style={width === undefined ? undefined : { width }}>
      <View
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-lg bg-surface-3',
          active && 'ring-2 ring-primary'
        )}>
        {active && isPlayablePerformance(performance) ? (
          <>
            <PlayerSlot performanceId={performance.id} fit="cover" radius={10} />
            {/* 셸 영상은 누름을 통과시키므로 자리 위에서 재생·일시정지를 받는다 */}
            <Pressable
              onPress={onPlay}
              accessibilityRole="button"
              accessibilityLabel={t('{name} 재생·일시정지', { name: credit?.artistName ?? t('fallback::연주') })}
              className="absolute inset-0"
            />
          </>
        ) : (
          <Poster performance={performance} onPlay={onPlay} />
        )}
        {pick === 'candidate' ? <PickMark pick={pick} /> : null}
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        {/* 얼굴·이름을 누르면 그 연주자 화면으로 간다 */}
        <ArtistLink artistId={credit?.artistId} name={credit?.artistName}>
          <RepertoireThumb active={inRepertoire} badgeSize={14}>
            <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={32} />
          </RepertoireThumb>
        </ArtistLink>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {/* 고른 연주는 막대를 늘 둔다. 멈추면 낮게 서서 이름이 좌우로 밀리지 않는다 */}
            {active ? <Equalizer playing={playing} size={11} /> : null}
            <ArtistLink artistId={credit?.artistId} name={credit?.artistName} className="shrink">
              <Text
                numberOfLines={1}
                className={cn(
                  'text-body-sm font-semibold web:underline-offset-4 web:group-hover:underline',
                  active ? 'text-primary' : 'text-foreground'
                )}>
                {pick === 'anchor'
                  ? t('{name} · 지금 연주', { name: credit?.artistName ?? t('연주자 정보 없음') })
                  : credit?.artistName ?? t('연주자 정보 없음')}
              </Text>
            </ArtistLink>
          </View>
          {support ? <SupportingCreditLinks performance={performance} /> : null}
        </View>
        <Text variant="mono" className="text-foreground-subtle">
          {clipClock(duration)}
        </Text>
      </View>

      {/* 연주 노트: 확정된 노트가 없는 연주는 이름과 곡선만 둔다 */}
      {performance.note ? <PerformanceNote note={performance.note} hideMoments className="mt-3" /> : null}

      {/* 곡선과 들을 곳은 슬롯 바닥에 붙여, 노트 길이가 달라도 한 줄의 곡선끼리 같은 높이에 둔다 */}
      <View className="mt-auto gap-1.5 pt-3">
        <PerformanceCurve
          performance={performance}
          active={active}
          floorDb={curveFloor}
          onSeek={seekable ? (offsetMs) => onMoment({ offsetMs, label: '' }) : undefined}
        />
        <View className="mt-1 min-h-7 flex-row flex-wrap gap-2">
          {performance.note?.moments.map((moment) => (
            <MomentChip
              key={`${moment.offsetMs}-${moment.label}`}
              moment={moment}
              onPress={isPlayablePerformance(performance) ? () => onMoment(moment) : undefined}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/** 연주의 음량 곡선. 노트의 들을 곳을 점으로 찍는다. 곡선이 없으면 그리지 않는다 */
/**
 * 연주의 음량 곡선이자 재생 바. 지금 듣는 연주는 들은 만큼 칠하고 점이 따라간다.
 * 다른 연주는 이어 들을 자리를 빈 점으로 찍는다. 누르면 그 연주가 그 자리부터 나온다.
 */
function PerformanceCurve({
  performance,
  active,
  floorDb,
  onSeek,
  className,
}: {
  performance: ComparisonPerformance;
  active: boolean;
  floorDb: number;
  /** 누른 자리(클립 안 ms)부터 튼다. 재생할 수 없는 연주는 넘기지 않는다 */
  onSeek?: (offsetMs: number) => void;
  className?: string;
}) {
  useLocale();
  const progress = useComparePlayer((state) => (active ? state.progress : null));
  const playing = useComparePlayer((state) => active && state.playing);
  const saved = useComparePlayer((state) => state.positions[performance.id]);
  if (!performance.loudness) return null;
  const durationMs = clipDurationMs(performance);
  const playhead = progress && progress.duration > 0 ? progress.current / progress.duration : active ? 0 : undefined;
  const resumeAt = !active && saved !== undefined && durationMs > 0 ? (saved * 1000) / durationMs : undefined;
  return (
    <LoudnessSparkline
      loudness={performance.loudness}
      marks={performance.note?.moments.map((moment) => moment.offsetMs)}
      tone={active ? 'a' : 'neutral'}
      floorDb={floorDb}
      playhead={playhead}
      playing={playing}
      resumeAt={resumeAt}
      onSeek={onSeek ? (ratio) => onSeek(ratio * durationMs) : undefined}
      label={primaryCredit(performance)?.artistName}
      height={44}
      className={className}
    />
  );
}

/** 크게 보기 무대 아래: 지금 무대에 오른 연주자 */
function StageCaption({
  performance,
  image,
  active,
  inRepertoire,
}: {
  performance: ComparisonPerformance;
  image: string | null;
  active: boolean;
  inRepertoire: boolean;
}) {
  useLocale();
  const credit = primaryCredit(performance);
  const photo = useArtistImage(credit?.artistId, image);
  const support = supportingCredits(performance);
  return (
    <View className="mt-4 flex-row items-center gap-3.5">
      <RepertoireThumb active={inRepertoire} badgeSize={16}>
        <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={44} />
      </RepertoireThumb>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={cn('text-body font-bold', active ? 'text-primary' : 'text-foreground')}>
          {credit?.artistName ?? t('연주자 정보 없음')}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {[support, `${performance.sectorName} · ${clipClock(clipDurationMs(performance))}`].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

/** 크게 보기 옆 목록: 썸네일·이름·길이. 누르면 무대에 올린다 */
function TheaterRow({
  performance,
  image,
  longest,
  active,
  playing,
  inRepertoire,
  pick,
  onPress,
}: {
  performance: ComparisonPerformance;
  image: string | null;
  longest: number;
  active: boolean;
  playing: boolean;
  inRepertoire: boolean;
  pick?: PickState;
  onPress: () => void;
}) {
  useLocale();
  const credit = primaryCredit(performance);
  const photo = useArtistImage(credit?.artistId, image);
  const canPlay = isPlayablePerformance(performance);
  const thumbnail = youtubeThumbnailUrl(performance);
  const duration = clipDurationMs(performance);
  return (
    <Pressable
      onPress={canPlay ? onPress : undefined}
      disabled={!canPlay}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !canPlay }}
      accessibilityLabel={
        canPlay
          ? t('{name} 재생', { name: credit?.artistName ?? t('fallback::연주') })
          : t('{name} 준비 중', { name: credit?.artistName ?? t('fallback::연주') })
      }
      className={cn(
        '-mx-2 flex-row items-center gap-3 rounded-lg p-2 web:hover:bg-surface-2',
        active && 'bg-surface-2'
      )}>
      <View
        className={cn('relative overflow-hidden rounded-md bg-surface-3', active && 'ring-2 ring-primary')}
        style={{ width: 112, height: 63 }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
        {active ? (
          <View className="absolute inset-0 items-center justify-center bg-black/45">
            <Icon as={playing ? PauseIcon : PlayIcon} size={16} className="fill-white text-white" />
          </View>
        ) : !canPlay ? (
          <View className="absolute inset-0 items-center justify-center bg-black/45">
            <Text className="text-micro text-white">{t('준비 중')}</Text>
          </View>
        ) : null}
        {pick === 'candidate' ? (
          <View pointerEvents="none" className="absolute left-1.5 top-1.5 size-6 items-center justify-center rounded-full border-2 border-white bg-black/40">
            <Text className="text-micro font-bold text-white">B</Text>
          </View>
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <RepertoireThumb active={inRepertoire} badgeSize={12}>
            <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={22} />
          </RepertoireThumb>
          <Text numberOfLines={1} className={cn('min-w-0 flex-1 text-body-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
            {credit?.artistName ?? t('연주자 정보 없음')}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <View
              className={cn('h-full rounded-full', active ? 'bg-primary' : 'bg-foreground-subtle')}
              style={{ width: `${Math.max(4, (duration / longest) * 100)}%` }}
            />
          </View>
          <Text variant="mono" className="text-foreground-subtle">
            {clipClock(duration)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

interface PlayerBarProps {
  active: ComparisonPerformance | undefined;
  activeImage: string | null;
  playing: boolean;
  onTogglePlay: () => void;
  onFullscreen: () => void;
  canFocus: boolean;
  picking: boolean;
  onToggleFocus: () => void;
}

/** 재생 바가 이보다 좁으면 버튼 글자를 접는다 (px) */
const BAR_COMPACT_WIDTH = 1080;
/** 이보다 좁으면 연주자 묶음과 소리 막대도 접는다 (px) */
const BAR_TIGHT_WIDTH = 820;

/**
 * 재생 바 (6.5): 이 화면에서 무엇을 듣고 있는지. 왼쪽 사진은 지금 연주하는 사람이다.
 * 다른 화면의 재생 바와 같은 뜻이다. ⏮ ⏭는 재생 목록을 따라 곡(여기서 틀었으면 이 작품의 구간)을 넘기고,
 * 연주자는 이름 옆 ‹ ›로 바꾼다
 */
function PlayerBar({
  active,
  activeImage,
  playing,
  onTogglePlay,
  onFullscreen,
  canFocus,
  picking,
  onToggleFocus,
}: PlayerBarProps) {
  useLocale();
  const credit = active ? primaryCredit(active) : undefined;
  const photo = useArtistImage(credit?.artistId, activeImage);
  // 재생 위치는 초마다 바뀌어 바 안에서만 구독한다 (화면 전체가 다시 그려지지 않게)
  const progress = useComparePlayer((state) => state.progress);
  const [scrub, setScrub] = React.useState<number | null>(null);
  const duration = progress.duration || (active ? clipDurationMs(active) / 1000 : 0);
  const shownSeconds = scrub !== null ? scrub * duration : progress.current;

  // 좌우를 같은 폭으로 두어 가운데 재생 조작이 정확히 가운데 온다. 좁으면 버튼 글자를 접는다
  const [barWidth, setBarWidth] = React.useState(0);
  const compact = barWidth > 0 && barWidth < BAR_COMPACT_WIDTH;
  // 대기열 패널까지 열어 아주 좁으면 이름 칸을 남기려고 연주자 묶음(위 카드에 있음)과 소리 막대를 접는다
  const tight = barWidth > 0 && barWidth < BAR_TIGHT_WIDTH;

  const focusButton = (
    <Pressable
      accessibilityLabel={picking ? t('1:1 비교 고르기 취소') : t('1:1 비교')}
      accessibilityState={{ selected: picking, disabled: !canFocus }}
      onPress={onToggleFocus}
      disabled={!canFocus}
      className={cn(
        'h-8 shrink-0 flex-row items-center gap-1.5 rounded-full border',
        compact ? 'w-8 justify-center' : 'px-3',
        picking ? 'border-primary bg-primary-muted' : 'border-border-strong web:hover:bg-surface-2',
        !canFocus && 'opacity-40'
      )}>
      <Icon as={ColumnsIcon} size={14} className={picking ? 'text-primary' : 'text-foreground'} />
      {compact ? null : (
        <Text numberOfLines={1} className={cn('text-label', picking ? 'text-primary' : 'text-foreground')}>
          {picking ? t('고르는 중') : t('1:1 비교')}
        </Text>
      )}
    </Pressable>
  );
  const nav = useSongNav();

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      className="h-[76px] flex-row items-center gap-4 border-t border-border px-4">
      {/* 왼쪽: 누구를 듣는지 + 비교 동작 */}
      <View className="min-w-0 flex-1 basis-0 flex-row items-center gap-3">
        {active ? (
          <>
            <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={48} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
                {credit?.artistName ?? t('연주자 정보 없음')}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {`${active.sectorName} · ${active.pieceTitle}`}
              </Text>
            </View>
            <View className="shrink-0 flex-row items-center gap-2">
              {/* 연주자 사진은 바로 위 카드에 다 있으니, 좁으면 이름 칸을 남기려고 ‹ ›만 둔다 */}
              {tight ? null : <PerformerStepper compact={compact} maxFaces={compact ? 0 : 3} spot={false} />}
              {focusButton}
            </View>
          </>
        ) : (
          <View className="min-w-0 gap-0.5">
            <Text variant="caption" numberOfLines={1} className="text-foreground-muted">
              {t('연주를 누르면 재생돼요')}
            </Text>
            <Text variant="caption" numberOfLines={1} className="text-foreground-subtle">
              {t('Space 재생 · ←→ 연주자 · ⇧←→ 5초 · T 크게 보기 · F 전체 화면')}
            </Text>
          </View>
        )}
      </View>
      {/* 가운데: 재생 조작 */}
      <View className={cn('items-center gap-1.5', compact ? 'w-[300px]' : 'w-[380px]')}>
        <View className="flex-row items-center gap-4">
          {/* 3초 넘게 들었으면 처음으로, 그 안이면 재생 목록의 이전 곡(구간)으로 */}
          <Pressable
            accessibilityLabel={nav.prevLabel}
            disabled={!active}
            onPress={() => comparePlayer.previous()}
            className={cn('size-8 items-center justify-center rounded-full', !active && 'opacity-40')}>
            <Icon as={SkipBackIcon} size={16} className="fill-foreground-muted text-foreground-muted" />
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? t('일시정지') : t('재생')}
            onPress={onTogglePlay}
            className="size-9 items-center justify-center rounded-full bg-foreground">
            <Icon as={playing ? PauseIcon : PlayIcon} size={16} className="fill-background text-background" />
          </Pressable>
          <Pressable
            accessibilityLabel={nav.nextLabel}
            disabled={!active || !nav.hasNext}
            onPress={() => comparePlayer.next()}
            className={cn('size-8 items-center justify-center rounded-full', (!active || !nav.hasNext) && 'opacity-40')}>
            <Icon as={SkipForwardIcon} size={16} className="fill-foreground-muted text-foreground-muted" />
          </Pressable>
        </View>
        <View className="w-full flex-row items-center gap-2.5">
          <Text variant="mono" className="w-10 text-right text-foreground-muted">
            {clipClock(shownSeconds * 1000)}
          </Text>
          <ScrubBar
            value={duration > 0 ? progress.current / duration : 0}
            onScrub={setScrub}
            onCommit={(value) => {
              setScrub(null);
              comparePlayer.seek(value * duration);
            }}
            label={t('재생 위치')}
            valueText={(value) => `${clipClock(value * duration * 1000)} / ${clipClock(duration * 1000)}`}
            step={duration > 0 ? 5 / duration : 0.05}
            disabled={!active || duration <= 0}
            tooltip
          />
          <Text variant="mono" className="w-10 text-foreground-muted">
            {active ? clipClock(duration * 1000) : '0:00'}
          </Text>
        </View>
      </View>
      {/* 오른쪽: 소리·화면·원본 */}
      <View className="min-w-0 flex-1 basis-0 flex-row items-center justify-end gap-2.5">
        <VolumeControl width={tight ? 0 : compact ? 56 : 76} />
        <QueueButton />
        <Pressable
          onPress={onFullscreen}
          accessibilityLabel={t('전체 화면 (F)')}
          className="size-8 shrink-0 items-center justify-center rounded-full web:hover:bg-surface-2">
          <Icon as={MaximizeIcon} size={16} className="text-foreground-muted" />
        </Pressable>
        {active && youtubeWatchUrl(active) ? (
          <a
            href={youtubeWatchUrl(active)}
            target="_blank"
            rel="noreferrer"
            aria-label={t('YouTube 원본 새 창으로 보기')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <ServiceLogo service="youtube" size={16} />
            {compact ? null : (
              <Text variant="caption" numberOfLines={1} className="text-foreground-subtle">
                {t('YouTube 원본')}
              </Text>
            )}
          </a>
        ) : null}
      </View>
    </View>
  );
}

/** 작품 머리 줄의 누를 수 있는 항목. 호버하면 밑줄이 생기고, 다음 화면이면 미리 받는다 */
function MetaLink({
  label,
  strong = false,
  accessibilityLabel,
  prefetch,
  onPress,
}: {
  label: string;
  strong?: boolean;
  accessibilityLabel: string;
  prefetch?: PrefetchTarget;
  onPress: () => void;
}) {
  useLocale();
  const handlers = usePrefetchOnHover(prefetch);
  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      className="group rounded-sm">
      <Text
        variant="bodySm"
        className={cn(
          'web:underline-offset-4 web:group-hover:underline',
          strong ? 'font-semibold text-foreground' : 'text-foreground-muted web:group-hover:text-foreground'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 연주자 화면으로 가는 누름 자리. id 가 없으면 그냥 감싸기만 한다 */
function ArtistLink({
  artistId,
  name,
  className,
  children,
}: {
  artistId: number | undefined;
  name: string | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  useLocale();
  const router = useRouter();
  const handlers = usePrefetchOnHover(artistId ? { kind: 'artist', artistId } : null);
  if (!artistId) return <View className={className}>{children}</View>;
  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(`/artist/${artistId}` as Href)}
      accessibilityRole="link"
      accessibilityLabel={name ? t('{name} 화면으로', { name }) : t('연주자 화면으로')}
      className={cn('group', className)}>
      {children}
    </Pressable>
  );
}

/** 지휘자·악단 줄. 사람마다 그 연주자 화면으로 간다 */
function SupportingCreditLinks({ performance }: { performance: ComparisonPerformance }) {
  useLocale();
  const credits = performance.credits.filter(
    (credit) => !credit.isPrimary && (credit.role === 'conductor' || credit.role === 'orchestra')
  );
  return (
    // 한 줄로 두고 넘치면 말줄임한다. 두 줄로 넘어가면 한 줄의 칸끼리 높이가 어긋났다
    <View className="flex-row items-center overflow-hidden">
      {credits.map((credit, index) => (
        <React.Fragment key={`${credit.role}-${credit.artistId}`}>
          {index > 0 ? <Text variant="caption">{' · '}</Text> : null}
          <ArtistLink artistId={credit.artistId} name={credit.artistName} className="min-w-0 shrink">
            <Text
              variant="caption"
              numberOfLines={1}
              className="web:underline-offset-4 web:group-hover:text-foreground web:group-hover:underline">
              {credit.role === 'conductor' ? t('{name} 지휘', { name: credit.artistName }) : credit.artistName}
            </Text>
          </ArtistLink>
        </React.Fragment>
      ))}
    </View>
  );
}
