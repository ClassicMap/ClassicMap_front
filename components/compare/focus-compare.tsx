import { FeaturedPairNote, PerformanceNote } from '@/components/compare/listening-note';
import { type Performer, PerformerMark, performerOf } from '@/components/compare/performer-mark';
import { LoudnessMeasures, LoudnessOverlay } from '@/components/compare/loudness-curve';
import { OptimizedImage } from '@/components/optimized-image';
import { PlayerSlot } from '@/components/player/player-slot';
import { SELECTED_SHADOW } from '@/components/compare/switch-mode-toggle';
import { VolumeControl } from '@/components/player/volume-control';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  clipClock,
  clipDurationMs,
  primaryCredit,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
} from '@/lib/data/comparison';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { alignAcross, fineClock } from '@/lib/player/focus-align';
import { ScrubBar } from '@/components/shell/compare/scrub-bar';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import {
  useAllSectorPerformances,
  useComparisonPiece,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, FeaturedPair } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  AlertCircleIcon,
  ArrowLeftRightIcon,
  ChevronLeftIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  XIcon,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

type Side = 'a' | 'b';
/** 전환할 때 어디서 이어 들을지. 집중 비교는 같은 대목을 번갈아 듣는 게 핵심이라 '같은 지점'이 기본이다 */
type FocusMode = 'align' | 'resume';
/** 자동 번갈아 듣기 간격(초). 0은 끔 */
type AutoInterval = 0 | 2 | 4 | 8;
/** 반복 구간. 구간 안 상대 위치(0~1)라 '같은 지점'에서는 두 연주에 같은 대목으로 걸린다 */
interface LoopRange {
  start: number;
  end: number;
}

const AUTO_OPTIONS: AutoInterval[] = [0, 2, 4, 8];
const SEEK_STEP_SEC = 5;
/** 영상별 미세 조정 (초) */
const NUDGE_STEPS = [-5, -1, -0.5, 0.5, 1, 5] as const;
const FINE_STEP_SEC = 0.5;
const MIN_LOOP = 0.01;

export interface FocusCompareProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  /** [A, B] 연주 id. A는 비교 화면에서 듣던 연주 */
  focus: [number, number];
  /** 비교 화면으로 돌아간다 */
  onExit: () => void;
  /** 구간을 바꾸면 같은 두 연주자의 그 구간 연주로 옮긴다 */
  onChangeSector: (sectorId: number, a: number, b: number) => void;
}

/** 주소의 focus=A,B 를 읽는다 */
export function parseFocusParam(value: string | string[] | undefined): [number, number] | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const [a, b] = raw.split(',').map((part) => Number(part));
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a === b) return null;
  return [a, b];
}

function artistKey(performance: ComparisonPerformance): number {
  return primaryCredit(performance)?.artistId ?? -performance.id;
}

/**
 * 두 연주자 집중 비교 (기획 A). 두 영상을 나란히 크게 두고 같은 대목을 바로 넘나든다.
 * 웹은 두 클립만 미리 불러 두고 소리 나는 쪽만 튼다. 네이티브는 플레이어 하나로 전환한다.
 */
export function FocusCompare({ pieceId, composerId, sectorId, focus, onExit, onChangeSector }: FocusCompareProps) {
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? sectors[0];
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  const performances = React.useMemo(() => performancesQuery.data ?? [], [performancesQuery.data]);
  const first = performances[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
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
  const a = performances.find((performance) => performance.id === focus[0]);
  const b = performances.find((performance) => performance.id === focus[1]);

  // 구간별 길이 비교: 같은 두 연주자의 모든 구간 연주
  const allSectors = useAllSectorPerformances(sectors.map((sector) => sector.id));
  const rows = React.useMemo(() => {
    if (!a || !b) return [];
    return sectors.map((sector, index) => {
      const list = allSectors[index]?.data ?? [];
      const pa = list.find((performance) => artistKey(performance) === artistKey(a));
      const pb = list.find((performance) => artistKey(performance) === artistKey(b));
      return { sector, a: pa, b: pb, loading: allSectors[index]?.isLoading ?? false };
    });
  }, [a, b, sectors, allSectors]);

  // 집중 비교가 보이는 동안 셸 영상은 쉬고 미니 플레이어도 숨는다.
  // 탭 화면은 떠나도 뒤에 살아 있으므로 마운트가 아니라 화면 포커스를 따른다
  const screenFocused = useIsFocused();
  const wasPlaying = React.useRef(comparePlayer.getState().playing);
  React.useEffect(() => {
    if (!screenFocused) return;
    comparePlayer.setFocus({ a: focus[0], b: focus[1] });
    return () => comparePlayer.setFocus(null);
  }, [focus, screenFocused]);

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        tone="error"
        title="집중 비교를 불러오지 못했어요"
        description="잠시 뒤 다시 시도해 주세요."
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
  if (sectorsQuery.isLoading || performancesQuery.isLoading) {
    return (
      <View className="flex-1 gap-5 px-7 pt-6">
        <Skeleton className="h-8 w-1/3" />
        <View className="flex-row gap-4">
          <Skeleton className="aspect-video flex-1 rounded-xl" />
          <Skeleton className="aspect-video flex-1 rounded-xl" />
        </View>
      </View>
    );
  }
  if (!a || !b || !isPlayablePerformance(a) || !isPlayablePerformance(b)) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        title="이 두 연주는 함께 비교할 수 없어요"
        description="비교 화면에서 연주자를 다시 골라 주세요."
        action={{ label: '비교 화면으로', onPress: onExit }}
      />
    );
  }

  // 이 두 연주가 구간의 추천 비교 쌍이면 큐레이터 노트를 먼저 보인다 (A·B 순서는 상관없다)
  const pair = activeSector?.featuredPair ?? null;
  const featuredPair = pair && pair.performanceIds.includes(a.id) && pair.performanceIds.includes(b.id) ? pair : null;

  return (
    <FocusStage
      key={`${a.id}-${b.id}`}
      featuredPair={featuredPair}
      a={a}
      b={b}
      imageOf={imageOf}
      startPlaying={wasPlaying.current}
      screenFocused={screenFocused}
      sectors={sectors}
      activeSectorId={activeSector?.id}
      rows={rows}
      onExit={onExit}
      onChangeSector={onChangeSector}
      queue={performances.filter(isPlayablePerformance)}
    />
  );
}

interface SectorRow {
  sector: { id: number; sectorName: string };
  a: ComparisonPerformance | undefined;
  b: ComparisonPerformance | undefined;
  loading: boolean;
}

interface FocusStageProps {
  a: ComparisonPerformance;
  b: ComparisonPerformance;
  imageOf: (performance: ComparisonPerformance) => string | null;
  startPlaying: boolean;
  /** 이 화면이 지금 보이는지. 탭을 옮기거나 위에 다른 화면이 쌓이면 false */
  screenFocused: boolean;
  sectors: { id: number; sectorName: string }[];
  activeSectorId: number | undefined;
  rows: SectorRow[];
  onExit: () => void;
  onChangeSector: (sectorId: number, a: number, b: number) => void;
  queue: ComparisonPerformance[];
  /** 두 연주가 이 구간의 추천 비교 쌍일 때만 */
  featuredPair: FeaturedPair | null;
}

/** 재생 조작 손잡이. 웹은 두 <video>, 네이티브는 스토어 미디어로 구현한다 */
interface FocusEngine {
  side: Side;
  playing: boolean;
  /** 지금 소리 나는 연주의 위치(초)·길이(초) */
  progress: { current: number; duration: number };
  togglePlay: () => void;
  switchTo: (side: Side) => void;
  seekRatio: (ratio: number) => void;
  seekBy: (seconds: number) => void;
  /** 떠날 때 두 연주의 위치 */
  positions: () => { a: number; b: number };
  /** 두 영상 각각의 위치(초)·길이(초). 소리 안 나는 쪽도 따로 맞출 수 있다 */
  sideProgress: Record<Side, SideProgress>;
  /** 한쪽 영상만 옮긴다. 소리 안 나는 쪽은 멈춘 채 위치만 바뀐다 */
  seekSide: (side: Side, seconds: number) => void;
  /** 들을 곳: 그쪽으로 바꾸고 그 지점부터 튼다 */
  playAt: (side: Side, seconds: number) => void;
}

interface SideProgress {
  current: number;
  duration: number;
}

function FocusStage(props: FocusStageProps) {
  const { a, b, imageOf, screenFocused, sectors, activeSectorId, rows, onExit, onChangeSector, queue, featuredPair } = props;
  const { nav } = useBreakpoint();
  const narrow = nav === 'tabs';
  const [mode, setMode] = React.useState<FocusMode>('align');
  const [auto, setAuto] = React.useState<AutoInterval>(0);
  const [loop, setLoop] = React.useState<LoopRange | null>(null);
  const [editingLoop, setEditingLoop] = React.useState(false);

  const web = useWebFocusEngine(props, mode, loop);
  const native = useNativeFocusEngine(props, mode, loop);
  const engine = Platform.OS === 'web' ? web.engine : native;
  const active = engine.side === 'a' ? a : b;
  // 위치가 바뀔 때마다 새 engine이 오므로 타이머·단축키는 최신 engine을 ref로 본다
  const engineRef = React.useRef(engine);
  engineRef.current = engine;

  // 두 연주의 위치를 스토어에 남기고, 듣던 쪽 연주를 앱 플레이어에 넘긴다
  const handOff = React.useCallback(() => {
    const latest = engineRef.current;
    const positions = latest.positions();
    comparePlayer.rememberPosition(a.id, positions.a, clipDurationMs(a) / 1000);
    comparePlayer.rememberPosition(b.id, positions.b, clipDurationMs(b) / 1000);
    const current = latest.side === 'a' ? a : b;
    comparePlayer.select(trackFromPerformance(current, imageOf(current)), {
      play: latest.playing,
      mode: 'resume',
      queue: queue.map((performance) => trackFromPerformance(performance, imageOf(performance))),
    });
  }, [a, b, imageOf, queue]);

  const exit = React.useCallback(() => {
    handOff();
    onExit();
  }, [handOff, onExit]);

  // 탭을 옮기거나 위에 다른 화면이 쌓여도 이 화면은 살아 있다. 떠나면 듣던 쪽을 앱 플레이어에 넘겨
  // 재생 바로 이어 듣게 하고, 돌아오면 앱 플레이어가 이어 간 자리부터 다시 이 화면이 맡는다.
  // 네이티브는 영상이 하나라 자리만 옮기면 되므로 웹만 넘긴다
  const focusedBefore = React.useRef(screenFocused);
  React.useEffect(() => {
    if (focusedBefore.current === screenFocused) return;
    focusedBefore.current = screenFocused;
    if (Platform.OS !== 'web') return;
    if (screenFocused) {
      web.resume();
    } else {
      handOff();
      web.suspend();
    }
    // 포커스가 바뀔 때만 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenFocused]);

  // 자동 번갈아 듣기: 재생 중일 때만 간격마다 넘긴다
  React.useEffect(() => {
    if (auto === 0 || !engine.playing) return;
    const timer = setTimeout(() => {
      const latest = engineRef.current;
      latest.switchTo(latest.side === 'a' ? 'b' : 'a');
    }, auto * 1000);
    return () => clearTimeout(timer);
  }, [auto, engine.playing, engine.side]);

  const exitRef = React.useRef(exit);
  exitRef.current = exit;

  // 단축키: 스페이스 재생 · Tab 전환 · ⇧←→ 5초 · Esc 나가기. 이 화면이 보일 때만 받는다
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !screenFocused) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const engine = engineRef.current;
      if (event.key === ' ') {
        event.preventDefault();
        engine.togglePlay();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        engine.switchTo(engine.side === 'a' ? 'b' : 'a');
      } else if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && event.shiftKey) {
        event.preventDefault();
        engine.seekBy(event.key === 'ArrowRight' ? SEEK_STEP_SEC : -SEEK_STEP_SEC);
      } else if (event.key === ',' || event.key === '.' || event.key === '<' || event.key === '>') {
        // 소리 나는 쪽 미세 조정: , . 는 0.5초, ⇧(< >)는 5초
        event.preventDefault();
        const step = event.key === '<' || event.key === '>' ? SEEK_STEP_SEC : FINE_STEP_SEC;
        const direction = event.key === '.' || event.key === '>' ? 1 : -1;
        engine.seekSide(engine.side, engine.sideProgress[engine.side].current + direction * step);
      } else if (event.key === 'Escape') {
        if (editingLoop) setEditingLoop(false);
        else exitRef.current();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingLoop, screenFocused]);

  const toggleLoop = () => {
    if (loop || editingLoop) {
      setLoop(null);
      setEditingLoop(false);
    } else {
      setEditingLoop(true);
    }
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName={cn(narrow ? 'px-4 pb-10 pt-3' : 'px-7 pb-10')}>
        <Pressable onPress={exit} accessibilityRole="button" className="mb-3 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
          <Text variant="caption" className="text-foreground-muted">
            {`${a.pieceTitle} 비교로 돌아가기`}
          </Text>
        </Pressable>
        <View className={cn('gap-3', !narrow && 'flex-row items-end justify-between')}>
          <View className="min-w-0 flex-1">
            <Text variant="micro" className="uppercase tracking-widest text-primary">
              1:1 집중 비교
            </Text>
            <Text className={cn('font-extrabold tracking-tight text-foreground', narrow ? 'mt-1 text-[24px]' : 'mt-1.5 text-[32px] leading-[36px]')}>
              {`${primaryCredit(a)?.artistName ?? 'A'}  ·  ${primaryCredit(b)?.artistName ?? 'B'}`}
            </Text>
            <Text variant="caption" className="mt-1">
              {`${a.composerName} · ${a.pieceTitle}`}
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Segmented
              label="전환"
              value={mode}
              options={[
                { value: 'align', label: '같은 지점' },
                { value: 'resume', label: '이어서' },
              ]}
              onChange={setMode}
            />
            <Segmented
              label="자동 전환"
              value={auto}
              options={AUTO_OPTIONS.map((value) => ({ value, label: value === 0 ? '끔' : `${value}초` }))}
              onChange={setAuto}
            />
            {Platform.OS !== 'web' ? (
              <NativeLoopButton loop={loop} progress={engine.progress} onChange={setLoop} />
            ) : (
              <Pressable
                onPress={toggleLoop}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(loop) || editingLoop }}
                accessibilityLabel={loop ? '구간 반복 해제' : '구간 반복 지정'}
                className={cn(
                  'h-8 flex-row items-center gap-1.5 rounded-full border px-3',
                  loop || editingLoop ? 'border-primary bg-primary-muted' : 'border-border-strong web:hover:bg-surface-2'
                )}>
                <Icon as={RepeatIcon} size={14} className={loop || editingLoop ? 'text-primary' : 'text-foreground'} />
                <Text className={cn('text-label', loop || editingLoop ? 'text-primary' : 'text-foreground')}>
                  {loop ? '반복 해제' : editingLoop ? '진행바를 끌어 지정' : '구간 반복'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 구간: 두 연주자가 모두 있는 구간만 고를 수 있다 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="gap-2">
          {rows.map((row) => {
            const available = Boolean(row.a && row.b && isPlayablePerformance(row.a) && isPlayablePerformance(row.b));
            return (
              <Chip
                key={row.sector.id}
                label={available || row.loading ? row.sector.sectorName : `${row.sector.sectorName} · 없음`}
                selected={row.sector.id === activeSectorId}
                disabled={!available}
                className={cn(!available && 'opacity-50')}
                onPress={() => {
                  if (row.a && row.b && row.sector.id !== activeSectorId) onChangeSector(row.sector.id, row.a.id, row.b.id);
                }}
              />
            );
          })}
        </ScrollView>

        {featuredPair ? (
          <View className="mt-4">
            <FeaturedPairNote
              pair={featuredPair}
              a={a}
              b={b}
              imageOf={imageOf}
              onMoment={(side, offsetMs) => engine.playAt(side, offsetMs / 1000)}
            />
          </View>
        ) : null}

        <View className={cn('mt-5 gap-4', !narrow && 'flex-row')}>
          {(['a', 'b'] as const).map((side) => {
            const performance = side === 'a' ? a : b;
            const performer = performerOf(performance, imageOf);
            const on = engine.side === side;
            return (
              <View key={side} className="min-w-0 flex-1">
                <Pressable
                  onPress={() => (on ? engine.togglePlay() : engine.switchTo(side))}
                  accessibilityRole="button"
                  accessibilityLabel={on ? `${performer.name} 재생·일시정지` : `${performer.name} 연주로 바꾸기`}
                  // 테두리는 늘 두고 색만 바꾼다. ring(그림자)을 켜고 끄면 NativeWind가 개발 모드에서 컴포넌트를 바꿔 끼우며 오류를 낸다
                  className={cn(
                    'relative aspect-video w-full overflow-hidden rounded-xl border-2 bg-black',
                    on ? 'border-primary' : 'border-transparent opacity-80'
                  )}>
                  {Platform.OS === 'web' ? (
                    web.renderVideo(side)
                  ) : on ? (
                    // 앱 루트의 YouTube 하나가 이 자리에 뜬다. 나가도 같은 플레이어로 이어진다
                    <PlayerSlot performanceId={performance.id} radius={12} />
                  ) : youtubeThumbnailUrl(performance) ? (
                    // 소리 안 나는 쪽은 영상 첫 장면. 누르면 이쪽으로 바꾼다
                    <OptimizedImage
                      uri={youtubeThumbnailUrl(performance)}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : null}
                  {/* 듣는 쪽에만 상태를 띄운다. 누구인지는 아래 얼굴과 이름이 말한다 */}
                  {on ? (
                    <View className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5">
                      <Text className="text-micro font-bold text-primary">{engine.playing ? '재생 중' : '일시정지'}</Text>
                    </View>
                  ) : null}
                </Pressable>
                <View className="mt-3 flex-row items-center gap-3">
                  <PerformerMark performer={performer} tone={side} size={40} dim={!on} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className={cn('text-body font-bold', on ? 'text-primary' : 'text-foreground')}>
                      {primaryCredit(performance)?.artistName ?? '연주자 정보 없음'}
                    </Text>
                    {/* 크레딧이 없다고 독주라는 뜻은 아니다. 없으면 적지 않는다 */}
                    {supportingCredits(performance) ? (
                      <Text variant="caption" numberOfLines={1}>
                        {supportingCredits(performance)}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="mono" className="text-foreground-subtle">
                    {clipClock(clipDurationMs(performance))}
                  </Text>
                </View>
                <SideControls
                  name={performer.name}
                  on={on}
                  progress={engine.sideProgress[side]}
                  onSeek={(seconds) => engine.seekSide(side, seconds)}
                />
                {/* 추천 쌍이면 위 노트가 설명하므로 제목만, 아니면 두 연주의 노트를 나란히 */}
                {performance.note ? (
                  featuredPair ? (
                    <View className="mt-4 flex-row items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
                      <PerformerMark performer={performer} tone={side} size={22} />
                      <Text className="min-w-0 flex-1 text-body font-bold text-foreground">{performance.note.headline}</Text>
                    </View>
                  ) : (
                    <PerformanceNote
                      note={performance.note}
                      tone={side}
                      onMoment={(moment) => engine.playAt(side, moment.offsetMs / 1000)}
                      className="mt-4"
                    />
                  )
                ) : null}
              </View>
            );
          })}
        </View>

        {/* 음량 곡선: 두 연주를 같은 진행률 축에 겹치고 잰 값을 붙인다. 둘 다 곡선이 없으면 그리지 않는다 */}
        {a.loudness || b.loudness ? (
          <View className="mt-8 gap-4 rounded-xl border border-border bg-surface-1 p-4">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="text-body font-bold text-foreground">음량 곡선</Text>
              <Text variant="caption">가로는 구간 진행률이에요</Text>
            </View>
            <LoudnessOverlay
              a={{ loudness: a.loudness, durationMs: clipDurationMs(a) }}
              b={{ loudness: b.loudness, durationMs: clipDurationMs(b) }}
              playhead={engine.progress.duration > 0 ? engine.progress.current / engine.progress.duration : undefined}
            />
            <LoudnessMeasures
              a={{ loudness: a.loudness, durationMs: clipDurationMs(a) }}
              b={{ loudness: b.loudness, durationMs: clipDurationMs(b) }}
              performerA={performerOf(a, imageOf)}
              performerB={performerOf(b, imageOf)}
            />
          </View>
        ) : null}

        <LengthTable a={a} b={b} imageOf={imageOf} rows={rows} activeSectorId={activeSectorId} />
      </ScrollView>

      <FocusBar
        engine={engine}
        performers={{ a: performerOf(a, imageOf), b: performerOf(b, imageOf) }}
        active={active}
        loop={loop}
        editingLoop={editingLoop}
        onLoopChange={(range) => {
          setLoop(range);
          setEditingLoop(false);
        }}
        onExit={exit}
      />
    </View>
  );
}

// ─── 웹: 두 클립을 미리 불러 두고 소리 나는 쪽만 튼다 ──────────────────────

function useWebFocusEngine(props: FocusStageProps, mode: FocusMode, loop: LoopRange | null) {
  const { a, b, startPlaying } = props;
  const refs = React.useRef<Record<Side, HTMLVideoElement | null>>({ a: null, b: null });
  const [side, setSide] = React.useState<Side>('a');
  const [playing, setPlaying] = React.useState(false);
  const [sideProgress, setSideProgress] = React.useState<Record<Side, SideProgress>>({
    a: { current: 0, duration: clipDurationMs(a) / 1000 },
    b: { current: 0, duration: clipDurationMs(b) / 1000 },
  });
  const progress = sideProgress[side];
  const sideRef = React.useRef<Side>('a');
  sideRef.current = side;
  const loopRef = React.useRef(loop);
  loopRef.current = loop;
  const volume = useComparePlayer((state) => state.volume);
  const muted = useComparePlayer((state) => state.muted);

  // 소리는 지금 쪽만. 볼륨·음소거는 앱 플레이어 설정을 그대로 따른다
  React.useEffect(() => {
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      if (!video) return;
      video.volume = volume;
      video.muted = key === side ? muted : true;
    });
  }, [side, volume, muted]);

  // 위치 표시와 반복 구간: 재생 중에는 프레임마다 본다 (timeupdate는 반복 경계가 거칠다)
  React.useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const video = refs.current[sideRef.current];
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const range = loopRef.current;
      if (range && !video.paused) {
        const start = range.start * video.duration;
        const end = range.end * video.duration;
        if (video.currentTime >= end || video.currentTime < start - 0.3) video.currentTime = start;
      }
      if (time - last > 100) {
        last = time;
        // 소리 안 나는 쪽도 조정하면 위치가 바뀌니 둘 다 적는다
        const read = (key: Side, fallback: SideProgress): SideProgress => {
          const element = refs.current[key];
          return element && Number.isFinite(element.duration) && element.duration > 0
            ? { current: element.currentTime, duration: element.duration }
            : fallback;
        };
        setSideProgress((prev) => {
          const nextA = read('a', prev.a);
          const nextB = read('b', prev.b);
          if (
            nextA.current === prev.a.current &&
            nextB.current === prev.b.current &&
            nextA.duration === prev.a.duration &&
            nextB.duration === prev.b.duration
          ) {
            return prev;
          }
          return { a: nextA, b: nextB };
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const engine = React.useMemo<FocusEngine>(() => {
    const get = (key: Side) => refs.current[key];
    return {
      side,
      playing,
      progress,
      togglePlay: () => {
        const video = get(sideRef.current);
        if (!video) return;
        if (video.paused) void video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      switchTo: (target: Side) => {
        const from = get(sideRef.current);
        const to = get(target);
        if (!from || !to || target === sideRef.current) return;
        const wasPlaying = !from.paused;
        if (mode === 'align' && from.duration > 0 && to.duration > 0) {
          to.currentTime = alignAcross(from.currentTime, from.duration, to.duration);
        }
        from.pause();
        from.muted = true;
        to.muted = comparePlayer.getState().muted;
        sideRef.current = target;
        setSide(target);
        if (wasPlaying) void to.play().catch(() => setPlaying(false));
      },
      seekRatio: (ratio: number) => {
        const video = get(sideRef.current);
        if (video && video.duration > 0) video.currentTime = Math.max(0, Math.min(1, ratio)) * video.duration;
      },
      seekBy: (seconds: number) => {
        const video = get(sideRef.current);
        if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
      },
      positions: () => ({ a: get('a')?.currentTime ?? 0, b: get('b')?.currentTime ?? 0 }),
      sideProgress,
      seekSide: (key: Side, seconds: number) => {
        const video = get(key);
        if (!video) return;
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        video.currentTime = Math.max(0, duration > 0 ? Math.min(duration - 0.05, seconds) : seconds);
        setSideProgress((prev) => ({ ...prev, [key]: { current: video.currentTime, duration: duration || prev[key].duration } }));
      },
      playAt: (target: Side, seconds: number) => {
        const from = get(sideRef.current);
        const to = get(target);
        if (!to) return;
        if (from && from !== to) {
          from.pause();
          from.muted = true;
        }
        const duration = Number.isFinite(to.duration) && to.duration > 0 ? to.duration : 0;
        to.currentTime = Math.max(0, duration > 0 ? Math.min(duration - 0.05, seconds) : seconds);
        to.muted = comparePlayer.getState().muted;
        sideRef.current = target;
        setSide(target);
        void to.play().catch(() => setPlaying(false));
      },
    };
  }, [side, playing, progress, sideProgress, mode]);

  /** 화면을 떠날 때: 두 영상을 멈춘다 (재생은 앱 플레이어가 이어 간다) */
  const suspend = React.useCallback(() => {
    (['a', 'b'] as const).forEach((key) => refs.current[key]?.pause());
  }, []);

  /** 돌아왔을 때: 앱 플레이어가 이어 간 연주·위치에서 다시 이 화면 영상으로 튼다 */
  const resume = React.useCallback(() => {
    const state = comparePlayer.getState();
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      const position = comparePlayer.positionFor(key === 'a' ? a.id : b.id);
      if (!video || !(position > 0)) return;
      if (!Number.isFinite(video.duration) || position < video.duration) video.currentTime = position;
    });
    const currentId = state.current?.performanceId;
    const target: Side | null = currentId === a.id ? 'a' : currentId === b.id ? 'b' : null;
    // 떠나 있는 동안 다른 연주로 넘어갔으면 소리 쪽은 그대로 두고 틀지 않는다
    if (!target) return;
    sideRef.current = target;
    setSide(target);
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      if (video) video.muted = key === target ? state.muted : true;
    });
    if (state.playing) void refs.current[target]?.play().catch(() => setPlaying(false));
  }, [a.id, b.id]);

  const renderVideo = (key: Side) => {
    const performance = key === 'a' ? a : b;
    return (
      <video
        ref={(element) => {
          refs.current[key] = element;
        }}
        src={performance.clipUrl}
        playsInline
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          video.muted = key === sideRef.current ? comparePlayer.getState().muted : true;
          video.volume = comparePlayer.getState().volume;
          // 비교 화면에서 듣던 자리에서 시작한다
          const resume = comparePlayer.positionFor(performance.id);
          if (resume > 0 && resume < video.duration) video.currentTime = resume;
          if (key === 'a' && startPlaying && sideRef.current === 'a') {
            void video.play().catch(() => setPlaying(false));
          }
        }}
        onPlay={() => key === sideRef.current && setPlaying(true)}
        onPause={() => key === sideRef.current && setPlaying(false)}
        onEnded={() => key === sideRef.current && setPlaying(false)}
      />
    );
  };

  return { engine, renderVideo, suspend, resume };
}

// ─── 네이티브: 플레이어 하나. 전환은 스토어가 위치를 잡아 준다 ──────────────────

function useNativeFocusEngine(props: FocusStageProps, mode: FocusMode, loop: LoopRange | null): FocusEngine {
  const { a, b, imageOf, startPlaying } = props;
  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const progress = useComparePlayer((state) => state.progress);
  const side: Side = current?.performanceId === b.id ? 'b' : 'a';
  // 소리 안 나는 쪽 위치는 스토어가 조용히 적어서, 조정할 때 다시 그리게 한다
  const [adjusted, bump] = React.useReducer((count: number) => count + 1, 0);
  const idOf = React.useCallback((key: Side) => (key === 'a' ? a.id : b.id), [a.id, b.id]);
  const lengthOf = React.useCallback((key: Side) => clipDurationMs(key === 'a' ? a : b) / 1000, [a, b]);

  // 구간 반복: 네이티브는 위치를 초마다 받아서 끝 지점을 넘으면 시작 지점으로 돌린다 (1초 안팎 오차)
  React.useEffect(() => {
    if (Platform.OS === 'web' || !loop || !playing || progress.duration <= 0) return;
    const ratio = progress.current / progress.duration;
    if (ratio >= loop.end || ratio < loop.start - 0.02) comparePlayer.seek(loop.start * progress.duration);
  }, [loop, playing, progress]);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const state = comparePlayer.getState().current;
    if (state?.performanceId !== a.id && state?.performanceId !== b.id) {
      comparePlayer.select(trackFromPerformance(a, imageOf(a)), { play: startPlaying });
    }
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.useMemo<FocusEngine>(
    () => ({
      side,
      playing,
      progress,
      togglePlay: () => {
        comparePlayer.togglePlay();
      },
      switchTo: (target: Side) => {
        if (target === side) return;
        const performance = target === 'a' ? a : b;
        comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), { play: playing, mode });
      },
      seekRatio: (ratio: number) => comparePlayer.seek(ratio * (progress.duration || 0)),
      seekBy: (seconds: number) => comparePlayer.seekBy(seconds),
      positions: () => ({ a: comparePlayer.positionFor(a.id), b: comparePlayer.positionFor(b.id) }),
      sideProgress: {
        a: side === 'a' ? progress : { current: comparePlayer.positionFor(a.id), duration: lengthOf('a') },
        b: side === 'b' ? progress : { current: comparePlayer.positionFor(b.id), duration: lengthOf('b') },
      },
      seekSide: (key: Side, seconds: number) => {
        const target = Math.max(0, Math.min(lengthOf(key) - 0.05, seconds));
        if (key === side) comparePlayer.seek(target);
        else {
          comparePlayer.rememberPosition(idOf(key), target);
          bump();
        }
      },
      playAt: (key: Side, seconds: number) => {
        const target = Math.max(0, Math.min(lengthOf(key) - 0.05, seconds));
        if (key === side) {
          comparePlayer.seek(target);
          comparePlayer.play();
          return;
        }
        const performance = key === 'a' ? a : b;
        comparePlayer.rememberPosition(performance.id, target);
        comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), { play: true, mode: 'resume' });
      },
    }),
    // adjusted: 소리 안 나는 쪽을 조정하면 그 위치를 다시 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [side, playing, progress, a, b, imageOf, mode, idOf, lengthOf, adjusted]
  );
}

// ─── 조각들 ──────────────────────────────────────────────────

/**
 * 네이티브 구간 반복. 진행바를 끌 수 없어 한 번 누르면 지금 지점이 시작, 한 번 더 누르면 끝이 되고,
 * 세 번째에 풀린다.
 */
function NativeLoopButton({
  loop,
  progress,
  onChange,
}: {
  loop: LoopRange | null;
  progress: { current: number; duration: number };
  onChange: (loop: LoopRange | null) => void;
}) {
  const [start, setStart] = React.useState<number | null>(null);
  const ratio = progress.duration > 0 ? Math.min(1, progress.current / progress.duration) : 0;
  const active = Boolean(loop) || start !== null;
  const onPress = () => {
    if (loop) {
      onChange(null);
      return;
    }
    if (start === null) {
      setStart(ratio);
      return;
    }
    const from = Math.min(start, ratio);
    const to = Math.max(start, ratio);
    setStart(null);
    if (to - from >= 0.02) onChange({ start: from, end: to });
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={loop ? '구간 반복 해제' : start !== null ? '구간 반복 끝 지점 정하기' : '구간 반복 시작 지점 정하기'}
      className={cn('h-8 flex-row items-center gap-1.5 rounded-full border px-3', active ? 'border-primary bg-primary-muted' : 'border-border-strong')}>
      <Icon as={RepeatIcon} size={14} className={active ? 'text-primary' : 'text-foreground'} />
      <Text className={cn('text-label', active ? 'text-primary' : 'text-foreground')}>
        {loop ? '반복 해제' : start !== null ? '여기까지 반복' : '구간 반복'}
      </Text>
    </Pressable>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row items-center gap-2">
      <Text variant="caption" className="text-foreground-subtle">
        {label}
      </Text>
      <View className="h-8 flex-row rounded-full bg-surface-2 p-0.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={selected ? SELECTED_SHADOW : undefined}
              className={cn('h-7 items-center justify-center rounded-full px-2.5', selected && 'bg-surface-1')}>
              <Text className={cn('text-label', selected ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 영상 한쪽 전용 위치 조정: 진행바(웹은 끌기·말풍선, 네이티브는 누른 자리로)와 초 단위 미세 조정.
 * 소리 안 나는 쪽도 멈춘 채 옮길 수 있어, 두 영상을 같은 대목에 맞춰 둘 수 있다.
 */
function SideControls({
  name,
  on,
  progress,
  onSeek,
}: {
  /** 연주자 이름. 접근성 라벨에 쓴다 */
  name: string;
  on: boolean;
  progress: SideProgress;
  onSeek: (seconds: number) => void;
}) {
  const [scrub, setScrub] = React.useState<number | null>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const duration = progress.duration;
  const shown = scrub !== null ? scrub * duration : progress.current;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, progress.current / duration)) : 0;
  return (
    <View className="mt-3 gap-2">
      <View className="flex-row items-center gap-2.5">
        <Text variant="mono" className={cn('w-14 text-right', on ? 'text-foreground' : 'text-foreground-muted')}>
          {fineClock(shown)}
        </Text>
        <View className="min-w-0 flex-1">
          {Platform.OS === 'web' ? (
            <ScrubBar
              value={ratio}
              onScrub={setScrub}
              onCommit={(value) => {
                setScrub(null);
                onSeek(value * duration);
              }}
              label={`${name} 영상 위치`}
              valueText={(value) => `${fineClock(value * duration)} / ${fineClock(duration)}`}
              step={duration > 0 ? 1 / duration : 0.05}
              disabled={duration <= 0}
              fill={on ? 'hsl(var(--primary))' : 'hsl(var(--foreground-muted))'}
              tooltip
            />
          ) : (
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel={`${name} 영상 위치`}
              accessibilityValue={{ text: `${fineClock(progress.current)} / ${fineClock(duration)}` }}
              onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
              onPress={(event) => {
                if (trackWidth > 0 && duration > 0) onSeek((event.nativeEvent.locationX / trackWidth) * duration);
              }}
              className="h-6 justify-center">
              <View className="h-1 overflow-hidden rounded-full bg-surface-3">
                <View className={cn('h-full', on ? 'bg-primary' : 'bg-foreground-muted')} style={{ width: `${ratio * 100}%` }} />
              </View>
            </Pressable>
          )}
        </View>
        <Text variant="mono" className="w-14 text-foreground-subtle">
          {fineClock(duration)}
        </Text>
      </View>
      <View className="flex-row flex-wrap items-center justify-center gap-1.5">
        {NUDGE_STEPS.map((step) => (
          <Pressable
            key={step}
            onPress={() => onSeek(progress.current + step)}
            disabled={duration <= 0}
            accessibilityRole="button"
            accessibilityLabel={`${name} ${Math.abs(step)}초 ${step < 0 ? '뒤로' : '앞으로'}`}
            className="h-7 min-w-11 items-center justify-center rounded-full border border-border-strong px-2 active:bg-surface-2 web:hover:bg-surface-2">
            <Text variant="mono" className="text-caption text-foreground">
              {`${step < 0 ? '−' : '+'}${Math.abs(step)}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** 구간별 길이: 두 연주자의 같은 구간 길이와 차이. 한쪽에 없는 구간은 '없음' */
function LengthTable({
  a,
  b,
  imageOf,
  rows,
  activeSectorId,
}: {
  a: ComparisonPerformance;
  b: ComparisonPerformance;
  imageOf: (performance: ComparisonPerformance) => string | null;
  rows: SectorRow[];
  activeSectorId: number | undefined;
}) {
  const performerA = performerOf(a, imageOf);
  const performerB = performerOf(b, imageOf);
  return (
    <View className="mt-8 rounded-xl border border-border bg-surface-1 p-4">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-body font-bold text-foreground">구간별 길이</Text>
        <Text variant="caption">{`차이: ${performerB.name} 연주가 길면 +, 짧으면 −`}</Text>
      </View>
      <View className="mt-3 flex-row border-b border-border pb-2">
        <Text variant="caption" className="flex-[1.4] font-semibold text-foreground-subtle">
          구간
        </Text>
        <LengthHead performer={performerA} tone="a" />
        <LengthHead performer={performerB} tone="b" />
        <Text variant="caption" className="w-16 text-right font-semibold text-foreground-subtle">
          차이
        </Text>
      </View>
      {rows.map((row) => {
        const da = row.a ? clipDurationMs(row.a) : null;
        const db = row.b ? clipDurationMs(row.b) : null;
        const diff = da && db ? Math.round((db - da) / 1000) : null;
        const current = row.sector.id === activeSectorId;
        return (
          <View key={row.sector.id} className={cn('flex-row items-center border-b border-border py-2.5', current && 'bg-primary-muted/40')}>
            <Text numberOfLines={1} className={cn('flex-[1.4] text-body-sm', current ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
              {row.sector.sectorName}
            </Text>
            <Text variant="mono" className="flex-1 text-right text-foreground">
              {row.loading ? '…' : da !== null ? clipClock(da) : '없음'}
            </Text>
            <Text variant="mono" className="flex-1 text-right text-foreground">
              {row.loading ? '…' : db !== null ? clipClock(db) : '없음'}
            </Text>
            <Text
              variant="mono"
              className={cn('w-16 text-right', diff === null ? 'text-foreground-subtle' : diff > 0 ? 'text-primary' : 'text-foreground')}>
              {diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)}초`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 길이 표 머리: 얼굴과 이름 */
function LengthHead({ performer, tone }: { performer: Performer; tone: 'a' | 'b' }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center justify-end gap-1.5">
      <PerformerMark performer={performer} tone={tone} size={16} />
      <Text variant="caption" numberOfLines={1} className="shrink font-semibold text-foreground-subtle">
        {performer.name}
      </Text>
    </View>
  );
}

function FocusBar({
  engine,
  performers,
  active,
  loop,
  editingLoop,
  onLoopChange,
  onExit,
}: {
  engine: FocusEngine;
  performers: Record<Side, Performer>;
  active: ComparisonPerformance;
  loop: LoopRange | null;
  editingLoop: boolean;
  onLoopChange: (range: LoopRange | null) => void;
  onExit: () => void;
}) {
  const { progress } = engine;
  const { nav } = useBreakpoint();
  const narrow = nav === 'tabs';
  const duration = progress.duration || clipDurationMs(active) / 1000;
  const playButton = (
    <Pressable
      onPress={engine.togglePlay}
      accessibilityLabel={engine.playing ? '일시정지 (스페이스)' : '재생 (스페이스)'}
      className="size-10 items-center justify-center rounded-full bg-foreground">
      <Icon as={engine.playing ? PauseIcon : PlayIcon} size={17} className="fill-background text-background" />
    </Pressable>
  );
  const other: Side = engine.side === 'a' ? 'b' : 'a';
  // 두 얼굴 사이에 ⇄. 듣는 쪽 얼굴이 크고 밝다
  const swapButton = (
    <Pressable
      onPress={() => engine.switchTo(other)}
      accessibilityLabel={`${performers[other].name} 연주로 바꾸기 (Tab)`}
      className="h-10 flex-row items-center gap-1.5 rounded-full border border-border-strong pl-1.5 pr-2 web:hover:bg-surface-2">
      {(['a', 'b'] as const).map((side, index) => (
        <React.Fragment key={side}>
          {index === 1 ? <Icon as={ArrowLeftRightIcon} size={14} className="text-foreground-subtle" /> : null}
          <PerformerMark
            performer={performers[side]}
            tone={side}
            size={engine.side === side ? 26 : 20}
            dim={engine.side !== side}
          />
        </React.Fragment>
      ))}
    </Pressable>
  );
  const exitButton = (
    <Pressable
      onPress={onExit}
      accessibilityLabel="집중 비교 나가기 (Esc)"
      className="size-9 items-center justify-center rounded-full web:hover:bg-surface-2">
      <Icon as={XIcon} size={17} className="text-foreground-muted" />
    </Pressable>
  );
  const track = (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <Text variant="mono" className="w-10 text-right text-foreground-muted">
        {clipClock(progress.current * 1000)}
      </Text>
      <View className="min-w-0 flex-1">
        {Platform.OS === 'web' ? (
          <LoopProgress
            value={duration > 0 ? progress.current / duration : 0}
            loop={loop}
            editing={editingLoop}
            onSeek={engine.seekRatio}
            onLoop={onLoopChange}
            duration={duration}
          />
        ) : (
          <View className="h-1 overflow-hidden rounded-full bg-surface-3">
            <View className="h-full bg-foreground" style={{ width: `${duration > 0 ? (progress.current / duration) * 100 : 0}%` }} />
          </View>
        )}
      </View>
      <Text variant="mono" className="w-10 text-foreground-muted">
        {clipClock(duration * 1000)}
      </Text>
    </View>
  );

  // 좁은 화면은 두 줄: 위는 진행바, 아래는 재생·전환·나가기
  if (narrow) {
    return (
      <View className="gap-2 border-t border-border px-4 pb-3 pt-2">
        {track}
        <View className="flex-row items-center gap-3">
          {playButton}
          {swapButton}
          <View className="flex-1" />
          {exitButton}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 border-t border-border px-4 py-3">
      {playButton}
      {swapButton}
      {track}
      {Platform.OS === 'web' ? <VolumeControl width={64} /> : null}
      {exitButton}
    </View>
  );
}

/**
 * 진행바 (웹). 평소에는 누르거나 끌어 위치를 옮기고, '구간 반복'을 켠 동안에는 끌어서 반복 구간을 잡는다.
 * 반복 구간은 금색 상자로 보인다.
 */
function LoopProgress({
  value,
  loop,
  editing,
  onSeek,
  onLoop,
  duration,
}: {
  value: number;
  loop: LoopRange | null;
  editing: boolean;
  onSeek: (ratio: number) => void;
  onLoop: (range: LoopRange | null) => void;
  duration: number;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = React.useState<{ from: number; to: number } | null>(null);
  const ratioAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };
  const shown = drag && editing ? { start: Math.min(drag.from, drag.to), end: Math.max(drag.from, drag.to) } : loop;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={editing ? '반복할 구간 끌어서 지정' : '재생 위치'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={`${clipClock(clamped * duration * 1000)} / ${clipClock(duration * 1000)}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const ratio = ratioAt(event.clientX);
        setDrag({ from: ratio, to: ratio });
        if (!editing) onSeek(ratio);
      }}
      onPointerMove={(event) => {
        if (!drag) return;
        const ratio = ratioAt(event.clientX);
        setDrag({ from: drag.from, to: ratio });
        if (!editing) onSeek(ratio);
      }}
      onPointerUp={(event) => {
        if (!drag) return;
        const ratio = ratioAt(event.clientX);
        if (editing) {
          const start = Math.min(drag.from, ratio);
          const end = Math.max(drag.from, ratio);
          if (end - start >= MIN_LOOP) {
            onLoop({ start, end });
            onSeek(start);
          }
        }
        setDrag(null);
      }}
      style={{
        position: 'relative',
        height: 22,
        display: 'flex',
        alignItems: 'center',
        cursor: editing ? 'crosshair' : 'pointer',
        touchAction: 'none',
        outline: 'none',
      }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 4, background: 'hsl(var(--surface-3))' }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: `${clamped * 100}%`,
          height: 4,
          borderRadius: 4,
          background: 'hsl(var(--foreground))',
        }}
      />
      {shown ? (
        <div
          data-loop-range=""
          style={{
            position: 'absolute',
            left: `${shown.start * 100}%`,
            width: `${(shown.end - shown.start) * 100}%`,
            top: 2,
            bottom: 2,
            border: '1.5px solid hsl(var(--primary))',
            background: 'hsl(var(--primary) / 0.18)',
            borderRadius: 4,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: `calc(${clamped * 100}% - 6px)`,
          width: 12,
          height: 12,
          borderRadius: 999,
          background: 'hsl(var(--foreground))',
        }}
      />
    </div>
  );
}
