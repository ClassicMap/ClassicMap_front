import { SectionStaff } from '@/components/compare/section-staff';
import { SwitchModeToggle } from '@/components/compare/switch-mode-toggle';
import { FavoriteButton } from '@/components/favorite-button';
import { PlayerSlot } from '@/components/player/player-slot';
import { VolumeControl } from '@/components/player/volume-control';
import { RepertoireThumb } from '@/components/library/repertoire-badge';
import { ScrubBar } from '@/components/shell/compare/scrub-bar';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, NextSectionIcon, PrevSectionIcon, SwitchTakeIcon } from '@/components/ui/icons';
import { Skeleton, SkeletonMedia } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecordRecentPiece } from '@/hooks/use-recent-pieces';
import { useRepertoireIds } from '@/hooks/use-repertoire-ids';
import {
  useComparisonPiece,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import { useArtist } from '@/lib/query/hooks/useArtists';
import {
  clipClock,
  clipDurationMs,
  primaryCredit,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/data/comparison';
import { comparePlayer, type ComparePlayerTrack, useComparePlayer, usePlayerOverlay } from '@/lib/player/compare-player-store';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import { repertoireFirst } from '@/lib/data/library';
import type { ComparisonPerformance } from '@/lib/types/models';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  RectangleHorizontalIcon,
  SettingsIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Pressable, ScrollView, View } from 'react-native';

interface ComparePieceViewProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  /** 돌아갈 작곡가. 주소에 작곡가가 없던 딥링크면 연주에서 알아낸 작곡가를 넘긴다 */
  onBack: (composerId?: number) => void;
  onSelectSector: (sectorId: number) => void;
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
}: ComparePieceViewProps) {
  const router = useRouter();
  const { canEdit } = useAuth();
  const repertoire = useRepertoireIds();
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? sectors[0];
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  const first = performancesQuery.data?.[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
  const composerAvatar = pieceInfo?.composerAvatarUrl ?? null;
  const backComposerId = composerId ?? first?.composerId;
  const backLabel = first?.composerName ?? pieceInfo?.composerName;
  const goBack = () => onBack(backComposerId);

  // 레퍼토리에 담은 연주자를 앞으로. 나머지는 원래 순서 (재생 순서도 이 순서다)
  const performances = React.useMemo(
    () =>
      repertoireFirst(performancesQuery.data ?? [], (performance) =>
        repertoire.artists.has(primaryCredit(performance)?.artistId ?? -1)
      ),
    [performancesQuery.data, repertoire.artists]
  );

  const images = React.useMemo(
    () => new Map((pieceInfo?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl])),
    [pieceInfo?.performers]
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
    if (!first || !activeSector) return;
    void recordRecent({
      pieceId,
      pieceTitle: first.pieceTitle,
      composerId: first.composerId,
      composerName: first.composerName,
      composerAvatarUrl: composerAvatar,
      sectorId: activeSector.id,
      sectorName: activeSector.sectorName,
    });
  }, [pieceId, first, activeSector, composerAvatar, recordRecent]);

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
  // 재생·전환은 클립이 준비된 연주 안에서만 돈다 (clipStatus !== 'ready'는 재생 UI를 두지 않는다)
  const playable = React.useMemo(() => performances.filter(isPlayablePerformance), [performances]);
  // 크게 보기 무대: 고른 연주, 없으면 첫 재생 가능 연주의 포스터
  const staged = active ?? playable[0];

  // 미니 플레이어의 이전·다음 연주자도 이 구간의 재생 가능한 연주를 이 순서로 돈다
  const queue = React.useMemo<ComparePlayerTrack[]>(
    () => playable.map((performance) => trackFromPerformance(performance, imageOf(performance))),
    [playable, imageOf]
  );
  const choose = React.useCallback(
    (performance: ComparisonPerformance) =>
      comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), { play: true, queue }),
    [imageOf, queue]
  );

  const start = React.useCallback(
    (performance: ComparisonPerformance) => {
      if (!isPlayablePerformance(performance)) return;
      if (performance.id === activeId && comparePlayer.hasMedia()) {
        comparePlayer.togglePlay();
        return;
      }
      choose(performance);
    },
    [activeId, choose]
  );

  const togglePlay = React.useCallback(() => {
    if (activeId !== null && comparePlayer.togglePlay()) return;
    const target = active ?? playable[0];
    if (target) choose(target);
  }, [active, activeId, playable, choose]);

  const switchTake = React.useCallback(
    (direction: 1 | -1) => {
      if (playable.length === 0) return;
      const index = playable.findIndex((performance) => performance.id === activeId);
      choose(playable[(index + direction + playable.length) % playable.length]);
    },
    [activeId, playable, choose]
  );

  const sectorIndex = sectors.findIndex((sector) => sector.id === activeSector?.id);
  const goSector = (direction: 1 | -1) => {
    const next = sectors[sectorIndex + direction];
    if (next) onSelectSector(next.id);
  };

  // 전체 화면: 셸 영상을 통째로 띄운다. 연주자를 바꿔도 같은 영상이라 전체 화면이 풀리지 않는다
  const toggleFullscreen = React.useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    // 아직 고른 연주가 없으면 무대의 연주를 틀면서 띄운다
    if (activeId === null && staged && isPlayablePerformance(staged)) choose(staged);
    comparePlayer.requestFullscreen();
  }, [activeId, staged, choose]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // 슬라이더는 제 화살표를 스스로 처리하고 전파를 끊으므로 여기서는 입력 칸만 비킨다
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (event.key === ' ') {
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
  }, [togglePlay, switchTake, toggleFullscreen]);

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        tone="error"
        title="비교 구간을 불러오지 못했어요"
        description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
        action={{
          label: '다시 시도',
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
        title="이 작품은 아직 비교할 수 없어요"
        description="연주자 세 명 이상의 영상이 모이면 비교할 수 있어요."
        action={{ label: '비교할 수 있는 작품 보기', onPress: goBack }}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="px-7 pb-10">
        <Pressable onPress={goBack} className="mb-4 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
          <Text variant="caption" className="text-foreground-muted">
            {backLabel ? `${backLabel}의 비교 작품` : '비교할 수 있는 작품'}
          </Text>
        </Pressable>

        {/* 머리: 작품은 사각. 크게 보기에서는 영상에 자리를 내주려 줄인다 */}
        <View className="flex-row items-end gap-6">
          {first ? (
            // 앨범 연결(B22)이 없어 작품 사각에는 작곡가 초상을 쓴다 (1차 시안과 같음)
            <EntityThumb name={first.pieceTitle} image={composerAvatar} shape="square" size={theater ? 72 : 136} />
          ) : (
            <Skeleton className={cn('rounded-md', theater ? 'size-[72px]' : 'size-[136px]')} />
          )}
          <View className="min-w-0 flex-1 pb-1">
            {!theater ? (
              <Text variant="micro" className="uppercase tracking-widest">
                비교
              </Text>
            ) : null}
            {first ? (
              <>
                <Text
                  className={cn(
                    'font-extrabold tracking-tight text-foreground',
                    theater ? 'text-[28px] leading-[32px]' : 'mt-2 text-[44px] leading-[46px]'
                  )}>
                  {first.pieceTitle}
                </Text>
                <View className={cn('flex-row items-center gap-2', theater ? 'mt-1.5' : 'mt-3')}>
                  <Text variant="bodySm" className="text-foreground-muted">
                    <Text className="font-semibold text-foreground">{first.composerName}</Text>
                    {[pieceInfo?.opusNumber, `연주자 ${pieceInfo?.performerCount ?? first.credits.length}`, `구간 ${sectors.length}`]
                      .filter(Boolean)
                      .map((part) => `  ·  ${part}`)
                      .join('')}
                  </Text>
                  <FavoriteButton kind="pieces" id={pieceId} name={first.pieceTitle} />
                  {canEdit ? (
                    <Pressable
                      onPress={() => router.push(`/compare-admin?composerId=${first.composerId}&pieceId=${pieceId}` as Href)}
                      accessibilityLabel="구간·연주 관리"
                      className="h-9 flex-row items-center gap-1.5 rounded-full px-3 web:hover:bg-surface-3">
                      <Icon as={SettingsIcon} size={15} className="text-foreground-muted" />
                      <Text variant="label" className="text-foreground-muted">
                        구간·연주 관리
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

        <View className={cn('max-w-[880px]', theater ? 'mt-5' : 'mt-8')}>
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
                selected={sector.id === activeSector?.id}
                onPress={() => onSelectSector(sector.id)}
              />
            ))}
          </ScrollView>
          <SwitchModeToggle />
          <Pressable
            onPress={() => comparePlayer.setTheater(!theater)}
            accessibilityRole="button"
            accessibilityLabel={theater ? '모아 보기 (T)' : '크게 보기 (T)'}
            className="h-8 flex-row items-center gap-1.5 rounded-full border border-border-strong px-3 web:hover:bg-surface-2">
            <Icon as={theater ? LayoutGridIcon : RectangleHorizontalIcon} size={14} className="text-foreground" />
            <Text className="text-label text-foreground">{theater ? '모아 보기' : '크게 보기'}</Text>
          </Pressable>
        </View>

        {performancesQuery.isLoading ? (
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
          <View className="mt-6 flex-row items-start gap-6">
            <View className="min-w-0 flex-1">
              <View className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {staged && active && staged.id === active.id ? (
                  <PlayerSlot performanceId={active.id} fit="contain" radius={14} />
                ) : staged ? (
                  <Poster performance={staged} onPlay={() => start(staged)} large />
                ) : (
                  <View className="absolute inset-0 items-center justify-center">
                    <Text variant="caption" className="text-white/70">
                      이 구간은 아직 재생할 수 있는 영상이 없어요
                    </Text>
                  </View>
                )}
              </View>
              {staged ? (
                <StageCaption performance={staged} image={imageOf(staged)} active={staged.id === activeId} inRepertoire={repertoire.artists.has(primaryCredit(staged)?.artistId ?? -1)} />
              ) : null}
            </View>
            <View className="w-[300px] gap-1">
              <Text variant="caption" className="mb-1.5 font-semibold text-foreground-subtle">
                {`연주자 ${performances.length}`}
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
                  onPress={() => start(performance)}
                />
              ))}
            </View>
          </View>
        ) : (
          // 슬롯: 연주자 한 명 = 한 열
          <View className="mt-6 flex-row flex-wrap gap-5">
            {performances.map((performance) => (
              <Slot
                key={performance.id}
                performance={performance}
                image={imageOf(performance)}
                longest={longest}
                active={performance.id === activeId}
                inRepertoire={repertoire.artists.has(primaryCredit(performance)?.artistId ?? -1)}
                onPlay={() => start(performance)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {overlay && fullscreen ? (
        createPortal(
          <FullscreenOverlay
            performances={playable}
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
            aria-label="전체 화면 (F)"
            title="전체 화면 (F)"
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
        canPrevSector={sectorIndex > 0}
        canNextSector={sectorIndex >= 0 && sectorIndex < sectors.length - 1}
        onPrevSector={() => goSector(-1)}
        onNextSector={() => goSector(1)}
        onTogglePlay={togglePlay}
        onNextTake={() => switchTake(1)}
        canSwitch={playable.length >= 2}
        onFullscreen={toggleFullscreen}
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
  const credit = primaryCredit(performance);
  const thumbnail = youtubeThumbnailUrl(performance);
  const canPlay = isPlayablePerformance(performance);
  return (
    <Pressable
      onPress={canPlay ? onPlay : undefined}
      disabled={!canPlay}
      accessibilityLabel={`${credit?.artistName ?? '연주'} 재생`}
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
          <Text className="rounded-xs bg-black/60 px-1.5 py-0.5 text-micro text-white">준비 중</Text>
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

interface SlotProps {
  performance: ComparisonPerformance;
  image: string | null;
  longest: number;
  active: boolean;
  inRepertoire: boolean;
  onPlay: () => void;
}

function Slot({ performance, image, longest, active, inRepertoire, onPlay }: SlotProps) {
  const credit = primaryCredit(performance);
  const photo = useArtistImage(credit?.artistId, image);
  const duration = clipDurationMs(performance);
  const lengthPercent = Math.max(4, (duration / longest) * 100);
  const support = supportingCredits(performance);

  return (
    <View className="min-w-[280px] flex-1">
      <View
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-lg bg-surface-3',
          active && 'ring-2 ring-primary'
        )}>
        {active && isPlayablePerformance(performance) ? (
          <PlayerSlot performanceId={performance.id} fit="cover" radius={10} />
        ) : (
          <Poster performance={performance} onPlay={onPlay} />
        )}
      </View>

      {/* 길이 막대: 가장 긴 연주 대비 */}
      <View className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <View
          className={cn('h-full rounded-full', active ? 'bg-primary' : 'bg-foreground-subtle')}
          style={{ width: `${lengthPercent}%` }}
        />
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <RepertoireThumb active={inRepertoire} badgeSize={14}>
          <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={32} />
        </RepertoireThumb>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className={cn('text-body-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
            {credit?.artistName ?? '연주자 정보 없음'}
          </Text>
          {support ? (
            <Text variant="caption" numberOfLines={1}>
              {support}
            </Text>
          ) : null}
        </View>
        <Text variant="mono" className="text-foreground-subtle">
          {clipClock(duration)}
        </Text>
      </View>
    </View>
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
          {credit?.artistName ?? '연주자 정보 없음'}
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
  onPress,
}: {
  performance: ComparisonPerformance;
  image: string | null;
  longest: number;
  active: boolean;
  playing: boolean;
  inRepertoire: boolean;
  onPress: () => void;
}) {
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
      accessibilityLabel={`${credit?.artistName ?? '연주'} ${canPlay ? '재생' : '준비 중'}`}
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
            <Text className="text-micro text-white">준비 중</Text>
          </View>
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <RepertoireThumb active={inRepertoire} badgeSize={12}>
            <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={22} />
          </RepertoireThumb>
          <Text numberOfLines={1} className={cn('min-w-0 flex-1 text-body-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
            {credit?.artistName ?? '연주자 정보 없음'}
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

/** 전체 화면에서 영상 위에 겹치는 조작부: 연주자 바꾸기·재생·위치·나가기 */
function FullscreenOverlay({
  performances,
  activeId,
  imageOf,
  onPick,
  onTogglePlay,
  playing,
  onExit,
}: {
  performances: ComparisonPerformance[];
  activeId: number | null;
  imageOf: (performance: ComparisonPerformance) => string | null;
  onPick: (performance: ComparisonPerformance) => void;
  onTogglePlay: () => void;
  playing: boolean;
  onExit: () => void;
}) {
  const progress = useComparePlayer((state) => state.progress);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
        padding: '48px 32px 24px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onTogglePlay}
          accessibilityLabel={playing ? '일시정지' : '재생'}
          className="size-11 items-center justify-center rounded-full bg-white">
          <Icon as={playing ? PauseIcon : PlayIcon} size={18} className="fill-black text-black" />
        </Pressable>
        <Text variant="mono" className="text-white/80">
          {clipClock(progress.current * 1000)}
        </Text>
        <ScrubBar
          value={progress.duration > 0 ? progress.current / progress.duration : 0}
          onCommit={(value) => comparePlayer.seek(value * progress.duration)}
          label="재생 위치"
          valueText={(value) => clipClock(value * progress.duration * 1000)}
          disabled={progress.duration <= 0}
          tooltip
          fill="#FFFFFF"
        />
        <Text variant="mono" className="text-white/80">
          {clipClock(progress.duration * 1000)}
        </Text>
        <Pressable
          onPress={onExit}
          accessibilityLabel="전체 화면 나가기 (F)"
          className="size-11 items-center justify-center rounded-full bg-white/15">
          <Icon as={MinimizeIcon} size={18} className="text-white" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {performances.map((performance, index) => {
          const credit = primaryCredit(performance);
          const selected = performance.id === activeId;
          return (
            <Pressable
              key={performance.id}
              onPress={() => onPick(performance)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={cn(
                'h-10 flex-row items-center gap-2 rounded-full pl-1 pr-3.5',
                selected ? 'bg-primary' : 'bg-white/15'
              )}>
              <EntityThumb name={credit?.artistName ?? '?'} image={imageOf(performance)} shape="circle" size={32} />
              <Text className={cn('text-label font-semibold', selected ? 'text-primary-foreground' : 'text-white')}>
                {credit?.artistName ?? `연주 ${index + 1}`}
              </Text>
              <Text className={cn('font-mono text-micro', selected ? 'text-primary-foreground/80' : 'text-white/60')}>
                {clipClock(clipDurationMs(performance))}
              </Text>
            </Pressable>
          );
        })}
        <Text variant="caption" className="self-center pl-2 text-white/55">
          ←→ 연주자 · ⇧←→ 5초 · 스페이스 재생
        </Text>
      </View>
    </div>
  );
}

interface PlayerBarProps {
  active: ComparisonPerformance | undefined;
  activeImage: string | null;
  playing: boolean;
  canPrevSector: boolean;
  canNextSector: boolean;
  onPrevSector: () => void;
  onNextSector: () => void;
  onTogglePlay: () => void;
  onNextTake: () => void;
  canSwitch: boolean;
  onFullscreen: () => void;
}

/** 재생 바 (6.5): 이 화면에서 무엇을 듣고 있는지. 왼쪽 사진은 지금 연주하는 사람이다 */
function PlayerBar({
  active,
  activeImage,
  playing,
  canPrevSector,
  canNextSector,
  onPrevSector,
  onNextSector,
  onTogglePlay,
  onNextTake,
  canSwitch,
  onFullscreen,
}: PlayerBarProps) {
  const credit = active ? primaryCredit(active) : undefined;
  const photo = useArtistImage(credit?.artistId, activeImage);
  // 재생 위치는 초마다 바뀌어 바 안에서만 구독한다 (화면 전체가 다시 그려지지 않게)
  const progress = useComparePlayer((state) => state.progress);
  const [scrub, setScrub] = React.useState<number | null>(null);
  const duration = progress.duration || (active ? clipDurationMs(active) / 1000 : 0);
  const shownSeconds = scrub !== null ? scrub * duration : progress.current;

  return (
    <View className="h-[76px] flex-row items-center gap-4 border-t border-border px-4">
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        {active ? (
          <>
            <EntityThumb name={credit?.artistName ?? '?'} image={photo} shape="circle" size={48} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
                {credit?.artistName ?? '연주자 정보 없음'}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {`${active.sectorName} · ${active.pieceTitle}`}
              </Text>
            </View>
          </>
        ) : (
          <Text variant="caption" className="text-foreground-subtle">
            연주를 골라 재생해 보세요. 스페이스 재생 · ←→ 연주자 · ⇧←→ 5초 · T 크게 보기 · F 전체 화면
          </Text>
        )}
      </View>
      <View className="flex-[1.3] items-center gap-1.5">
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityLabel="이전 구간"
            disabled={!canPrevSector}
            onPress={onPrevSector}
            className={cn('size-8 items-center justify-center rounded-full', !canPrevSector && 'opacity-40')}>
            <PrevSectionIcon size={18} className="text-foreground-muted" />
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? '일시정지' : '재생'}
            onPress={onTogglePlay}
            className="size-9 items-center justify-center rounded-full bg-foreground">
            <Icon as={playing ? PauseIcon : PlayIcon} size={16} className="fill-background text-background" />
          </Pressable>
          <Pressable
            accessibilityLabel="다음 구간"
            disabled={!canNextSector}
            onPress={onNextSector}
            className={cn('size-8 items-center justify-center rounded-full', !canNextSector && 'opacity-40')}>
            <NextSectionIcon size={18} className="text-foreground-muted" />
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
            label="재생 위치"
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
      <View className="flex-1 flex-row items-center justify-end gap-2.5">
        <VolumeControl />
        <Pressable
          onPress={onFullscreen}
          accessibilityLabel="전체 화면 (F)"
          className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
          <Icon as={MaximizeIcon} size={16} className="text-foreground-muted" />
        </Pressable>
        {active && youtubeWatchUrl(active) ? (
          <a
            href={youtubeWatchUrl(active)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Icon as={ExternalLinkIcon} size={13} className="text-foreground-subtle" />
            <Text variant="caption" numberOfLines={1} className="text-foreground-subtle">
              YouTube 원본
            </Text>
          </a>
        ) : null}
        <Pressable
          accessibilityLabel="다음 연주자"
          onPress={onNextTake}
          disabled={!canSwitch}
          className="h-8 flex-row items-center gap-1.5 rounded-full border border-border-strong px-3 web:hover:bg-surface-2">
          <SwitchTakeIcon size={15} className="text-foreground" />
          <Text className="text-label text-foreground">다음 연주자</Text>
        </Pressable>
      </View>
    </View>
  );
}
