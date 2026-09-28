import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, NextSectionIcon, PrevSectionIcon, SwitchTakeIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useComparisonPiece,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import { useArtist } from '@/lib/query/hooks/useArtists';
import {
  clipClock,
  primaryCredit,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/data/comparison';
import type { ComparisonPerformance } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

interface ComparePieceViewProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  onBack: () => void;
  onSelectSector: (sectorId: number) => void;
}

/**
 * 한 작품의 비교 화면 (설계 문서 7.4, 1차 시안 비교 패널).
 * 영상은 선택한 슬롯 하나만 불러오고 나머지는 썸네일로 둔다 (프로젝트 지침).
 */
export function ComparePieceView({
  pieceId,
  composerId,
  sectorId,
  onBack,
  onSelectSector,
}: ComparePieceViewProps) {
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? sectors[0];
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  const performances = performancesQuery.data ?? [];
  const first = performances[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
  const composerAvatar = pieceInfo?.composerAvatarUrl ?? null;

  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, duration: 0 });
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  // 연주자를 바꿀 때 같은 비율 지점에서 이어 듣는다
  const resumeRatio = React.useRef<number | null>(null);

  React.useEffect(() => {
    setActiveId(null);
    setPlaying(false);
    setProgress({ current: 0, duration: 0 });
  }, [activeSector?.id]);

  const active = performances.find((performance) => performance.id === activeId);
  const longest = Math.max(1, ...performances.map((p) => p.endMs - p.startMs));

  const start = React.useCallback((performanceId: number, keepPosition: boolean) => {
    const video = videoRef.current;
    resumeRatio.current =
      keepPosition && video && video.duration > 0 ? video.currentTime / video.duration : null;
    setActiveId(performanceId);
    setPlaying(true);
  }, []);

  const togglePlay = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      if (performances[0]) start(performances[0].id, false);
      return;
    }
    if (video.paused) void video.play();
    else video.pause();
  }, [performances, start]);

  const switchTake = React.useCallback(
    (direction: 1 | -1) => {
      if (performances.length === 0) return;
      const index = performances.findIndex((performance) => performance.id === activeId);
      const next = performances[(index + direction + performances.length) % performances.length];
      start(next.id, true);
    },
    [activeId, performances, start]
  );

  const sectorIndex = sectors.findIndex((sector) => sector.id === activeSector?.id);
  const goSector = (direction: 1 | -1) => {
    const next = sectors[sectorIndex + direction];
    if (next) onSelectSector(next.id);
  };

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowRight') {
        switchTake(1);
      } else if (event.key === 'ArrowLeft') {
        switchTake(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, switchTake]);

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
        action={{ label: '비교할 수 있는 작품 보기', onPress: onBack }}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="px-7 pb-10">
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
          <Text variant="caption" className="text-foreground-muted">
            비교할 수 있는 작품
          </Text>
        </Pressable>

        {/* 머리: 작품은 사각 */}
        <View className="flex-row items-end gap-6">
          {first ? (
            // 앨범 연결(B22)이 없어 작품 사각에는 작곡가 초상을 쓴다 (1차 시안과 같음)
            <EntityThumb name={first.pieceTitle} image={composerAvatar} shape="square" size={136} />
          ) : (
            <Skeleton className="size-[136px] rounded-md" />
          )}
          <View className="min-w-0 flex-1 pb-1">
            <Text variant="micro" className="uppercase tracking-widest">
              비교
            </Text>
            {first ? (
              <>
                <Text className="mt-2 text-[44px] font-extrabold leading-[46px] tracking-tight text-foreground">
                  {first.pieceTitle}
                </Text>
                <Text variant="bodySm" className="mt-3 text-foreground-muted">
                  <Text className="font-semibold text-foreground">{first.composerName}</Text>
                  {[pieceInfo?.opusNumber, `연주자 ${pieceInfo?.performerCount ?? first.credits.length}`, `구간 ${sectors.length}`]
                    .filter(Boolean)
                    .map((part) => `  ·  ${part}`)
                    .join('')}
                </Text>
              </>
            ) : (
              <Skeleton className="mt-3 h-10 w-2/3" />
            )}
          </View>
        </View>

        {/* 구간 선택 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-8" contentContainerClassName="gap-2">
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

        {/* 슬롯: 연주자 한 명 = 한 열 */}
        <View className="mt-6 flex-row flex-wrap gap-5">
          {performancesQuery.isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <View key={index} className="min-w-[280px] flex-1 gap-3">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </View>
              ))
            : performances.map((performance) => (
                <Slot
                  key={performance.id}
                  performance={performance}
                  longest={longest}
                  active={performance.id === activeId}
                  onPlay={() => start(performance.id, false)}
                  videoRef={performance.id === activeId ? videoRef : undefined}
                  resumeRatio={resumeRatio}
                  onPlayingChange={setPlaying}
                  onProgress={setProgress}
                  onEnded={() => setPlaying(false)}
                />
              ))}
        </View>
      </ScrollView>

      {/* 재생 바 (6.5): 이 화면에서 무엇을 듣고 있는지 */}
      <View className="h-[76px] flex-row items-center gap-4 border-t border-border px-4">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          {active ? (
            <>
              <EntityThumb name={active.pieceTitle} image={composerAvatar} shape="square" size={48} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
                  {primaryCredit(active)?.artistName ?? '연주자 정보 없음'}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {`${active.sectorName} · ${active.pieceTitle}`}
                </Text>
              </View>
            </>
          ) : (
            <Text variant="caption" className="text-foreground-subtle">
              연주를 골라 재생해 보세요. 스페이스로 재생, ←→로 연주자를 바꿔요.
            </Text>
          )}
        </View>
        <View className="flex-[1.3] items-center gap-1.5">
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityLabel="이전 구간"
              disabled={sectorIndex <= 0}
              onPress={() => goSector(-1)}
              className={cn('size-8 items-center justify-center rounded-full', sectorIndex <= 0 && 'opacity-40')}>
              <PrevSectionIcon size={18} className="text-foreground-muted" />
            </Pressable>
            <Pressable
              accessibilityLabel={playing ? '일시정지' : '재생'}
              onPress={togglePlay}
              className="size-9 items-center justify-center rounded-full bg-foreground">
              <Icon as={playing ? PauseIcon : PlayIcon} size={16} className="fill-background text-background" />
            </Pressable>
            <Pressable
              accessibilityLabel="다음 구간"
              disabled={sectorIndex >= sectors.length - 1}
              onPress={() => goSector(1)}
              className={cn(
                'size-8 items-center justify-center rounded-full',
                sectorIndex >= sectors.length - 1 && 'opacity-40'
              )}>
              <NextSectionIcon size={18} className="text-foreground-muted" />
            </Pressable>
          </View>
          <View className="w-full flex-row items-center gap-2.5">
            <Text variant="mono" className="text-foreground-muted">
              {clipClock(progress.current * 1000)}
            </Text>
            <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <View
                className="h-full rounded-full bg-foreground"
                style={{ width: `${progress.duration > 0 ? (progress.current / progress.duration) * 100 : 0}%` }}
              />
            </View>
            <Text variant="mono" className="text-foreground-muted">
              {active ? clipClock(active.endMs - active.startMs) : '0:00'}
            </Text>
          </View>
        </View>
        <View className="flex-1 flex-row items-center justify-end gap-2">
          {active && youtubeWatchUrl(active) ? (
            <a
              href={youtubeWatchUrl(active)}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <Icon as={ExternalLinkIcon} size={13} className="text-foreground-subtle" />
              <Text variant="caption" className="text-foreground-subtle">
                YouTube 원본
              </Text>
            </a>
          ) : null}
          <Pressable
            accessibilityLabel="다음 연주자"
            onPress={() => switchTake(1)}
            disabled={performances.length < 2}
            className="h-8 flex-row items-center gap-1.5 rounded-full border border-border-strong px-3 web:hover:bg-surface-2">
            <SwitchTakeIcon size={15} className="text-foreground" />
            <Text className="text-label text-foreground">다음 연주자</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface SlotProps {
  performance: ComparisonPerformance;
  longest: number;
  active: boolean;
  onPlay: () => void;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  resumeRatio: React.MutableRefObject<number | null>;
  onPlayingChange: (playing: boolean) => void;
  onProgress: (progress: { current: number; duration: number }) => void;
  onEnded: () => void;
}

function Slot({
  performance,
  longest,
  active,
  onPlay,
  videoRef,
  resumeRatio,
  onPlayingChange,
  onProgress,
  onEnded,
}: SlotProps) {
  const credit = primaryCredit(performance);
  const artist = useArtist(credit?.artistId);
  const duration = performance.endMs - performance.startMs;
  const lengthPercent = Math.max(4, (duration / longest) * 100);
  const thumbnail = youtubeThumbnailUrl(performance);
  const support = supportingCredits(performance);
  const canPlay = performance.clipStatus === 'ready' && Boolean(performance.clipUrl);

  return (
    <View className="min-w-[280px] flex-1">
      <View
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-lg bg-surface-3',
          active && 'ring-2 ring-primary'
        )}>
        {active && canPlay ? (
          <video
            ref={(element) => {
              if (videoRef) videoRef.current = element;
            }}
            src={performance.clipUrl}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (resumeRatio.current !== null && video.duration > 0) {
                video.currentTime = resumeRatio.current * video.duration;
                resumeRatio.current = null;
              }
            }}
            onPlay={() => onPlayingChange(true)}
            onPause={() => onPlayingChange(false)}
            onEnded={onEnded}
            onTimeUpdate={(event) =>
              onProgress({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration || 0 })
            }
          />
        ) : (
          <Pressable
            onPress={canPlay ? onPlay : undefined}
            disabled={!canPlay}
            accessibilityLabel={`${credit?.artistName ?? '연주'} 재생`}
            className="absolute inset-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : null}
            <View className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 to-transparent" />
            {canPlay ? (
              <View className="absolute bottom-3 right-3 size-11 items-center justify-center rounded-full bg-primary opacity-0 transition-opacity duration-fast group-hover:opacity-100 web:hover:opacity-100">
                <Icon as={PlayIcon} size={18} className="fill-primary-foreground text-primary-foreground" />
              </View>
            ) : (
              <View className="absolute inset-0 items-center justify-center">
                <Text className="rounded-xs bg-black/60 px-1.5 py-0.5 text-micro text-white">준비 중</Text>
              </View>
            )}
            <Text className="absolute bottom-3 left-3 font-mono text-caption text-white">{clipClock(duration)}</Text>
          </Pressable>
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
        <EntityThumb name={credit?.artistName ?? '?'} image={artist.data?.imageUrl} shape="circle" size={32} />
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
