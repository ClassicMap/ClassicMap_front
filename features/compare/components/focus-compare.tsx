import { isTypingTarget } from '@/lib/utils/is-typing-target';
import { FeaturedPairNote, PerformanceNote } from '@/features/compare/components/listening-note';
import { type Performer, PerformerMark, performerOf } from '@/features/compare/components/performer-mark';
import { LoudnessMeasures, LoudnessOverlay } from '@/features/compare/components/loudness-curve';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { PlayerSlot } from '@/features/player/components/player-slot';
import { SELECTED_SHADOW } from '@/features/compare/components/switch-mode-toggle';
import { VolumeControl } from '@/features/player/components/volume-control';
import { PlayerBarPortal } from '@/features/player/components/player-bar-portal';
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
  defaultComparisonSector,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
} from '@/lib/data/comparison';
import { compareQueueFor } from '@/lib/player/compare-playlist';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { crossfade, type Fade, fadeSeconds, type SwitchCause } from '@/lib/player/crossfade';
import { type AlignedClip, fineClock, followRate, sameMoment } from '@/lib/player/focus-align';
import { ScrubBar } from '@/features/player/components/scrub-bar';
import { isPlayablePerformance, trackFromPerformance } from '@/lib/player/compare-track';
import {
  useAllSectorPerformances,
  useComparisonPiece,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/use-comparison-performances';
import type { ComparisonPerformance, FeaturedPair } from '@/types/models';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  AlertCircleIcon,
  ArrowLeftRightIcon,
  ChevronLeftIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RotateCcwIcon,
  RotateCwIcon,
  XIcon,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

type Side = 'a' | 'b';
/** 전환할 때 어디서 이어 들을지. 집중 비교는 같은 대목을 번갈아 듣는 게 핵심이라 '같은 지점'이 기본이다 */
type FocusMode = 'align' | 'resume';
/** 동시 재생에서 이만큼 어긋나면 소리 안 나는 쪽을 그 자리로 옮긴다 */
const TOGETHER_DRIFT_SEC = 0.25;
/** 1:1 로 넘겨받을 때 이 화면 영상이 이 안에 소리를 못 내면 앱 플레이어만 멈춘다 */
const TAKEOVER_TIMEOUT_MS = 6000;
/** 넘겨받는 순간 앱 플레이어 위치와 이만큼 어긋나 있으면 그 자리로 맞춘다 */
const TAKEOVER_DRIFT_SEC = 0.3;
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
  const { locale } = useLocale();
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data, locale]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? defaultComparisonSector(sectors);
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  const performances = React.useMemo(() => performancesQuery.data ?? [], [performancesQuery.data, locale]);
  const first = performances[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
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
  }, [a, b, sectors, allSectors, locale]);

  // 집중 비교가 보이는 동안 셸 영상은 이 화면에 재생을 넘기고 미니 플레이어도 숨는다.
  // 탭 화면은 떠나도 뒤에 살아 있으므로 마운트가 아니라 화면 포커스를 따른다
  const screenFocused = useIsFocused();
  React.useEffect(() => {
    if (!screenFocused) return;
    comparePlayer.setFocus({ a: focus[0], b: focus[1] });
    return () => comparePlayer.setFocus(null);
  }, [focus, screenFocused]);

  // 구간을 바꿔 무대를 새로 그려도 듣던 쪽과 재생 여부를 잇는다
  const carry = React.useRef<FocusStart | null>(null);
  // 뒤로 가기·다른 화면 링크처럼 나가기 버튼을 거치지 않고 이 화면이 사라져도 듣던 쪽을 앱 플레이어에 넘긴다.
  // 레이아웃 정리 단계라 아직 두 영상이 문서에 붙어 있어 위치를 읽을 수 있다. 구간을 바꿀 때(무대만 바뀜)는 넘기지 않는다
  const handOffRef = React.useRef<(() => void) | null>(null);
  React.useLayoutEffect(
    () => () => {
      if (Platform.OS === 'web') handOffRef.current?.();
    },
    []
  );

  // 이 구간을 듣다가 들어왔으면 연주자마다 듣던 자리에서 잇고, 다른 곡을 듣다가(또는 아무것도 안 듣다가)
  // 들어왔으면 두 연주 모두 처음부터 튼다. 영상이 위치를 읽기 전에 정해 둔다
  const aId = a?.id;
  const bId = b?.id;
  const focusSectorId = a?.sectorId;
  React.useLayoutEffect(() => {
    if (aId === undefined || bId === undefined) return;
    if (comparePlayer.getState().current?.sectorId === focusSectorId) return;
    comparePlayer.rememberPosition(aId, 0);
    comparePlayer.rememberPosition(bId, 0);
  }, [aId, bId, focusSectorId]);

  // 두 연주를 그릴 수 없으면(불러오기 실패·비교할 수 없는 쌍) 넘겨받을 영상이 없으니 셸 영상을 멈춘다.
  // 이 화면에서는 재생 바가 숨어 있어 소리만 남기 때문이다
  const loading = sectorsQuery.isLoading || performancesQuery.isLoading;
  const blocked =
    sectorsQuery.isError ||
    performancesQuery.isError ||
    (!loading && (!a || !b || !isPlayablePerformance(a) || !isPlayablePerformance(b)));
  React.useEffect(() => {
    if (Platform.OS === 'web' && screenFocused && blocked) comparePlayer.pause();
  }, [blocked, screenFocused]);

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        tone="error"
        title={t('집중 비교를 불러오지 못했어요')}
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
        title={t('이 두 연주는 함께 비교할 수 없어요')}
        description={t('비교 화면에서 연주자를 다시 골라 주세요.')}
        action={{ label: t('비교 화면으로'), onPress: onExit }}
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
      carry={carry}
      handOffRef={handOffRef}
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

/** 무대를 열 때 어느 쪽을 틀고 있을지 */
interface FocusStart {
  playing: boolean;
  side: Side;
}

interface FocusStageProps {
  a: ComparisonPerformance;
  b: ComparisonPerformance;
  imageOf: (performance: ComparisonPerformance) => string | null;
  /** 앞 무대(같은 1:1 의 다른 구간)에서 듣던 쪽과 재생 여부. 처음 연 무대면 null */
  carry: React.MutableRefObject<FocusStart | null>;
  /** 화면이 사라질 때 부를 넘기기 함수를 여기에 걸어 둔다 */
  handOffRef: React.MutableRefObject<(() => void) | null>;
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
  /** `cause` 는 크로스페이드 길이를 정한다 (자동 전환은 간격에 맞춰 짧게) */
  switchTo: (side: Side, cause?: SwitchCause) => void;
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
  useLocale();
  const { a, b, imageOf, screenFocused, sectors, activeSectorId, rows, onExit, onChangeSector, queue, featuredPair } = props;
  const { nav } = useBreakpoint();
  const narrow = nav === 'tabs';
  const [mode, setMode] = React.useState<FocusMode>('align');
  const [auto, setAuto] = React.useState<AutoInterval>(0);
  const [loop, setLoop] = React.useState<LoopRange | null>(null);
  const [editingLoop, setEditingLoop] = React.useState(false);
  // 동시 재생(웹만): 두 영상을 같은 지점에서 함께 틀고 소리는 한쪽만 낸다
  const [together, setTogether] = React.useState(false);
  // 앱 플레이어에서 듣던 연주가 이 둘 가운데 하나면 그쪽부터, 듣던 중이었으면 이어서 튼다
  const [start] = React.useState<FocusStart>(() => {
    if (props.carry.current) return props.carry.current;
    const player = comparePlayer.getState();
    return {
      // 막 고른 연주가 아직 싣는 중이어도 틀려던 것으로 본다
      playing: player.playing || player.playIntent !== null,
      side: player.current?.performanceId === b.id ? 'b' : 'a',
    };
  });

  const web = useWebFocusEngine(props, start, mode, loop, auto, together);
  const native = useNativeFocusEngine(props, start, mode, loop);
  const engine = Platform.OS === 'web' ? web.engine : native;
  const active = engine.side === 'a' ? a : b;
  // 위치가 바뀔 때마다 새 engine이 오므로 타이머·단축키는 최신 engine을 ref로 본다
  const engineRef = React.useRef(engine);
  engineRef.current = engine;
  const webRef = React.useRef(web);
  webRef.current = web;

  // 구간을 바꿔 새 무대를 열면 이 무대에서 듣던 쪽·재생 여부로 시작한다(처음 그린 값은 아직 아무것도 안 튼 상태라 건너뛴다)
  const reported = React.useRef(false);
  React.useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      return;
    }
    props.carry.current = { playing: engine.playing, side: engine.side };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.playing, engine.side]);

  /**
   * 이 무대가 재생을 맡고 있다. 앱 플레이어에 넘기면 false, 화면에 돌아와 다시 맡으면 true.
   * 다른 화면 아래에 깔린 채 그려지면(로그인 화면으로 가며 셸이 바뀔 때) 맡지 않고 앱 플레이어가 잇는다
   */
  const ownsPlayback = React.useRef(screenFocused);

  // 두 연주의 위치를 스토어에 남기고, 듣던 쪽 연주를 앱 플레이어에 넘긴다. 한 번 떠날 때 한 번만 넘긴다
  // (넘긴 뒤 앱 플레이어가 다른 곡으로 넘어갔으면 그걸 되돌리지 않는다)
  const handOff = React.useCallback(() => {
    if (!ownsPlayback.current) return;
    ownsPlayback.current = false;
    const latest = engineRef.current;
    const positions = latest.positions();
    const current = latest.side === 'a' ? a : b;
    const other = latest.side === 'a' ? b : a;
    // 떠나 있는 동안 앱 플레이어가 다른 곡으로 넘어갔어도 듣던 쪽은 듣던 자리에서 넘긴다.
    // 다른 곡에서 넘어오면 스토어가 이 곡의 옛 위치를 버리므로, 소리 안 나던 쪽 위치는 넘긴 뒤에 적는다
    comparePlayer.select(trackFromPerformance(current, imageOf(current)), {
      // 이 화면 영상이 아직 소리를 내기 전(앱 플레이어가 잇고 있는 중)이면 그대로 재생 중으로 넘긴다
      play: latest.playing || (Platform.OS === 'web' && webRef.current.takingOver()),
      startAt: latest.side === 'a' ? positions.a : positions.b,
      queue: queue.map((performance) => trackFromPerformance(performance, imageOf(performance))),
      ...compareQueueFor(current.pieceId, sectors, current.sectorId, current),
    });
    comparePlayer.rememberPosition(other.id, latest.side === 'a' ? positions.b : positions.a, clipDurationMs(other) / 1000);
    // 넘긴 뒤에는 이 화면 영상이 앱 플레이어를 멈추지 않는다
    if (Platform.OS === 'web') webRef.current.suspend();
  }, [a, b, imageOf, queue, sectors]);

  const { handOffRef } = props;
  React.useLayoutEffect(() => {
    handOffRef.current = handOff;
    return () => {
      if (handOffRef.current === handOff) handOffRef.current = null;
    };
  }, [handOff, handOffRef]);

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
      ownsPlayback.current = true;
      web.resume();
    } else {
      handOff();
    }
    // 포커스가 바뀔 때만 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenFocused]);

  // 자동 번갈아 듣기: 재생 중일 때만 간격마다 넘긴다
  React.useEffect(() => {
    if (auto === 0 || !engine.playing) return;
    const timer = setTimeout(() => {
      const latest = engineRef.current;
      latest.switchTo(latest.side === 'a' ? 'b' : 'a', 'auto');
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
      if (isTypingTarget(target)) return;
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

  const focusBar = {
    engine,
    performers: { a: performerOf(a, imageOf), b: performerOf(b, imageOf) },
    active,
    loop,
    editingLoop,
    onLoopChange: (range: LoopRange | null) => {
      setLoop(range);
      setEditingLoop(false);
    },
    onExit: exit,
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName={cn(narrow ? 'px-4 pb-10 pt-3' : 'px-7 pb-10')}>
        <Pressable onPress={exit} accessibilityRole="button" className="mb-3 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
          <Text variant="caption" className="text-foreground-muted">
            {t('{title} 비교로 돌아가기', { title: a.pieceTitle })}
          </Text>
        </Pressable>
        <View className={cn('gap-3', !narrow && 'flex-row items-end justify-between')}>
          <View className="min-w-0 flex-1">
            <Text variant="micro" className="uppercase tracking-widest text-primary">
              {t('1:1 집중 비교')}
            </Text>
            <Text className={cn('font-extrabold tracking-tight text-foreground', narrow ? 'mt-1 text-[24px]' : 'mt-1.5 text-[32px] leading-[36px]')}>
              {`${primaryCredit(a)?.artistName ?? 'A'}  ·  ${primaryCredit(b)?.artistName ?? 'B'}`}
            </Text>
            <Text variant="caption" className="mt-1">
              {`${a.composerName} · ${a.pieceTitle}`}
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            {Platform.OS === 'web' ? (
              <SwitchToggle
                on={together}
                onChange={setTogether}
                label={t('동시 재생')}
                hint={t('켜면 두 영상이 같은 지점에서 함께 움직이고, 소리는 고른 쪽만 나요')}
              />
            ) : null}
            {/* 동시 재생 중에는 늘 같은 지점이라 전환 방식(같은 지점·이어서)을 쓰지 않는다. 크로스페이드는 소리만 겹쳐 넘긴다 */}
            <View pointerEvents={together ? 'none' : 'auto'} className={cn('flex-row items-center gap-2', together && 'opacity-40')}>
              <Segmented
                label={t('전환')}
                value={mode}
                options={[
                  { value: 'align', label: t('같은 지점') },
                  { value: 'resume', label: t('이어서') },
                ]}
                onChange={setMode}
              />
            </View>
            <Segmented
              label={t('자동 전환')}
              value={auto}
              options={AUTO_OPTIONS.map((value) => ({ value, label: value === 0 ? t('끔') : t('{n}초', { n: value }) }))}
              onChange={setAuto}
            />
            {Platform.OS === 'web' ? (
              <CrossfadeToggle />
            ) : null}
            {Platform.OS !== 'web' ? (
              <NativeLoopButton loop={loop} progress={engine.progress} onChange={setLoop} />
            ) : (
              <Pressable
                onPress={toggleLoop}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(loop) || editingLoop }}
                accessibilityLabel={loop ? t('구간 반복 해제') : t('구간 반복 지정')}
                className={cn(
                  'h-8 flex-row items-center gap-1.5 rounded-full border px-3',
                  loop || editingLoop ? 'border-primary bg-primary-muted' : 'border-border-strong web:hover:bg-surface-2'
                )}>
                <Icon as={RepeatIcon} size={14} className={loop || editingLoop ? 'text-primary' : 'text-foreground'} />
                <Text className={cn('text-label', loop || editingLoop ? 'text-primary' : 'text-foreground')}>
                  {loop ? t('반복 해제') : editingLoop ? t('진행바를 끌어 지정') : t('구간 반복')}
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
                label={available || row.loading ? row.sector.sectorName : t('{name} · 없음', { name: row.sector.sectorName })}
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
                  accessibilityLabel={on ? t('{name} 재생·일시정지', { name: performer.name }) : t('{name} 연주로 바꾸기', { name: performer.name })}
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
                      <Text className="text-micro font-bold text-primary">{engine.playing ? t('재생 중') : t('status::일시정지')}</Text>
                    </View>
                  ) : together ? (
                    <View className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5">
                      <Text className="text-micro font-bold text-white/80">{t('소리 끔 · 같은 지점')}</Text>
                    </View>
                  ) : null}
                </Pressable>
                <View className="mt-3 flex-row items-center gap-3">
                  <PerformerMark performer={performer} tone={side} size={40} dim={!on} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className={cn('text-body font-bold', on ? 'text-primary' : 'text-foreground')}>
                      {primaryCredit(performance)?.artistName ?? t('연주자 정보 없음')}
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
              <Text className="text-body font-bold text-foreground">{t('음량 곡선')}</Text>
              <Text variant="caption">{t('가로는 구간 진행률이에요')}</Text>
            </View>
            <LoudnessOverlay
              a={{ loudness: a.loudness, durationMs: clipDurationMs(a) }}
              b={{ loudness: b.loudness, durationMs: clipDurationMs(b) }}
              active={engine.side}
              playing={engine.playing}
              positions={{
                a: engine.sideProgress.a.duration > 0 ? engine.sideProgress.a.current / engine.sideProgress.a.duration : undefined,
                b: engine.sideProgress.b.duration > 0 ? engine.sideProgress.b.current / engine.sideProgress.b.duration : undefined,
              }}
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

      {/* 넓은 웹은 셸 재생 바 자리에 그린다(바가 늘 같은 자리에 있다). 이 화면이 뒤에 깔려 있으면 그리지 않는다 */}
      {Platform.OS === 'web' && !narrow ? (
        screenFocused ? (
          <PlayerBarPortal>
            <FocusBar {...focusBar} inShell />
          </PlayerBarPortal>
        ) : null
      ) : (
        <FocusBar {...focusBar} />
      )}
    </View>
  );
}

// ─── 웹: 두 클립을 미리 불러 두고 소리 나는 쪽만 튼다 ──────────────────────

function useWebFocusEngine(
  props: FocusStageProps,
  start: FocusStart,
  mode: FocusMode,
  loop: LoopRange | null,
  auto: AutoInterval,
  together: boolean
) {
  const { a, b } = props;
  const refs = React.useRef<Record<Side, HTMLVideoElement | null>>({ a: null, b: null });
  const [side, setSide] = React.useState<Side>(start.side);
  const [playing, setPlaying] = React.useState(false);
  const [sideProgress, setSideProgress] = React.useState<Record<Side, SideProgress>>({
    a: { current: 0, duration: clipDurationMs(a) / 1000 },
    b: { current: 0, duration: clipDurationMs(b) / 1000 },
  });
  const progress = sideProgress[side];
  const sideRef = React.useRef<Side>(start.side);
  sideRef.current = side;

  /**
   * 넘겨받기: 이 화면 영상이 소리를 내기 시작할 때까지 앱 플레이어(셸 영상)가 그대로 울리고, 소리가 나는 순간
   * 같은 자리로 맞춘 뒤 앱 플레이어를 멈춘다. 그래서 1:1 로 들어가도 소리가 끊기지 않는다.
   * 이 화면 영상이 끝내 소리를 못 내면(느린 망·재생 거절) 잠시 뒤 앱 플레이어만 멈춘다
   */
  const takeover = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseShell = React.useCallback(() => {
    if (takeover.current === null) return;
    clearTimeout(takeover.current);
    takeover.current = null;
    comparePlayer.pause();
  }, []);
  const holdShell = React.useCallback(() => {
    if (takeover.current !== null) clearTimeout(takeover.current);
    takeover.current = setTimeout(releaseShell, TAKEOVER_TIMEOUT_MS);
  }, [releaseShell]);
  /** 넘겨받기를 그만둔다. 앱 플레이어는 건드리지 않는다(재생을 앱 플레이어에 넘겼을 때) */
  const dropTakeover = React.useCallback(() => {
    if (takeover.current !== null) clearTimeout(takeover.current);
    takeover.current = null;
  }, []);

  React.useEffect(() => {
    // 보이지 않는 채 그려졌으면 넘겨받지 않는다. 화면이 보이게 되면 resume 이 넘겨받는다
    if (Platform.OS !== 'web' || !props.screenFocused) return dropTakeover;
    if (start.playing) holdShell();
    else comparePlayer.pause();
    return dropTakeover;
    // 무대를 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 지금 소리 나는 쪽 영상이 소리를 내기 시작했다. 넘겨받는 중이면 앱 플레이어 자리로 맞추고 멈춘다 */
  const onSideSounding = (key: Side, video: HTMLVideoElement) => {
    if (key !== sideRef.current || takeover.current === null) return;
    const live = comparePlayer.livePosition(performancesRef.current[key].id);
    if (live !== null && Math.abs(live - video.currentTime) > TAKEOVER_DRIFT_SEC && live < video.duration) {
      video.currentTime = live;
    }
    releaseShell();
  };
  const loopRef = React.useRef(loop);
  loopRef.current = loop;
  const volume = useComparePlayer((state) => state.volume);
  const muted = useComparePlayer((state) => state.muted);
  // 크로스페이드 중에는 두 영상 소리를 페이드가 맡는다
  const fadeRef = React.useRef<Fade | null>(null);
  const autoRef = React.useRef(auto);
  autoRef.current = auto;
  const finishFade = () => fadeRef.current?.finish();
  const togetherRef = React.useRef(together);
  togetherRef.current = together;
  // 동시 재생에서 손으로 맞춘 어긋남(초). B가 A의 같은 지점보다 이만큼 앞에 있게 붙인다
  const offsetRef = React.useRef(0);

  const performancesRef = React.useRef({ a, b });
  performancesRef.current = { a, b };
  /** 같은 지점을 찾을 연주: 길이는 영상이 알려 준 길이, 지도는 API 가 준 정렬 지도 */
  const clipOf = (key: Side): AlignedClip | null => {
    const video = refs.current[key];
    const performance = performancesRef.current[key];
    if (!video || !(video.duration > 0)) return null;
    return { id: performance.id, lengthSec: video.duration, alignment: performance.alignment };
  };
  /** `from` 쪽 `seconds` 와 같은 마디인 `to` 쪽 시점. 정렬 지도가 없으면 비율로 */
  const momentAcross = (from: Side, to: Side, seconds: number): number => {
    const fromClip = clipOf(from);
    const toClip = clipOf(to);
    return fromClip && toClip ? sameMoment(seconds, fromClip, toClip) : 0;
  };

  /** 소리 나는 쪽 위치에 맞춰 다른 쪽이 있어야 할 자리 */
  const followTarget = (lead: HTMLVideoElement): number => {
    const offset = offsetRef.current;
    return sideRef.current === 'a'
      ? momentAcross('a', 'b', lead.currentTime) + offset
      : momentAcross('b', 'a', lead.currentTime - offset);
  };

  /**
   * 동시 재생: 소리 안 나는 쪽을 소리 나는 쪽의 같은 마디(정렬 지도, 없으면 구간 안 비율)에 붙인다.
   * 듣는 쪽은 원래 빠르기 그대로 두고, 다른 쪽 빠르기를 앞 2초의 같은 지점 변화만큼 바꿔 따라가게 한다.
   * 어긋남이 쌓이면(반복 구간·되감기 포함) 그 자리로 옮긴다
   */
  const follow = React.useCallback(() => {
    const leadSide = sideRef.current;
    const otherSide = leadSide === 'a' ? 'b' : 'a';
    const lead = refs.current[leadSide];
    const other = refs.current[otherSide];
    const leadClip = clipOf(leadSide);
    const otherClip = clipOf(otherSide);
    if (!lead || !other || !leadClip || !otherClip) return;
    lead.playbackRate = 1;
    const target = Math.max(0, Math.min(other.duration - 0.1, followTarget(lead)));
    const drift = target - other.currentTime;
    if (Math.abs(drift) > TOGETHER_DRIFT_SEC) other.currentTime = target;
    // 작은 어긋남은 옮기지 않고 빠르기를 조금 더하거나 빼서 메운다. 옮기면 화면이 잠깐 멈춘다
    const nudge = Math.max(-0.05, Math.min(0.05, drift * 0.5));
    other.playbackRate = Math.max(0.5, Math.min(2, followRate(lead.currentTime, leadClip, otherClip) * (1 + nudge)));
    if (!lead.paused && other.paused && !lead.ended) void other.play().catch(() => undefined);
    else if (lead.paused && !other.paused) other.pause();
  }, []);

  // 동시 재생을 켜면 바로 붙이고, 끄면 다른 쪽을 멈추고 빠르기를 되돌린다
  React.useEffect(() => {
    offsetRef.current = 0;
    if (together) {
      follow();
      return;
    }
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      if (!video) return;
      video.playbackRate = 1;
      if (key !== sideRef.current) video.pause();
    });
  }, [together, follow]);

  // 소리는 지금 쪽만. 볼륨·음소거는 앱 플레이어 설정을 그대로 따른다
  React.useEffect(() => {
    if (fadeRef.current) return;
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
        if (togetherRef.current) follow();
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
  }, [follow]);

  const engine = React.useMemo<FocusEngine>(() => {
    const get = (key: Side) => refs.current[key];
    return {
      side,
      playing,
      progress,
      togglePlay: () => {
        finishFade();
        // 넘겨받는 중에 직접 조작하면 앱 플레이어는 바로 멈추고 이 화면이 맡는다
        releaseShell();
        const video = get(sideRef.current);
        if (!video) return;
        if (video.paused) void video.play().then(() => togetherRef.current && follow()).catch(() => setPlaying(false));
        else {
          video.pause();
          if (togetherRef.current) follow();
        }
      },
      switchTo: (target: Side, cause: SwitchCause = 'manual') => {
        finishFade();
        releaseShell();
        const from = get(sideRef.current);
        const to = get(target);
        if (!from || !to || target === sideRef.current) return;
        const wasPlaying = !from.paused;
        // 동시 재생: 둘 다 이미 같은 지점에 있으니 소리만 넘긴다. 크로스페이드를 켰으면 소리만 겹쳐 넘긴다
        if (togetherRef.current) {
          sideRef.current = target;
          setSide(target);
          follow();
          const player = comparePlayer.getState();
          if (wasPlaying && player.crossfade && !player.muted && player.volume > 0) {
            const fade = crossfade(
              from,
              to,
              fadeSeconds(cause, autoRef.current),
              player.volume,
              () => {
                fadeRef.current = null;
                from.muted = true;
                to.muted = comparePlayer.getState().muted;
              },
              { keepFromPlaying: true }
            );
            if (fade) {
              fadeRef.current = fade;
              return;
            }
          }
          from.muted = true;
          to.muted = player.muted;
          return;
        }
        if (mode === 'align' && from.duration > 0 && to.duration > 0) {
          to.currentTime = momentAcross(sideRef.current, target, from.currentTime);
        }
        sideRef.current = target;
        setSide(target);
        const player = comparePlayer.getState();
        // 크로스페이드: 재생 중이고 소리가 날 때만 두 소리를 겹쳐 넘긴다. 못 겹치는 환경이면 바로 바꾼다
        if (wasPlaying && player.crossfade && !player.muted && player.volume > 0) {
          const fade = crossfade(from, to, fadeSeconds(cause, autoRef.current), player.volume, () => {
            fadeRef.current = null;
            from.muted = true;
            to.muted = comparePlayer.getState().muted;
          });
          if (fade) {
            fadeRef.current = fade;
            return;
          }
        }
        from.pause();
        from.muted = true;
        to.muted = player.muted;
        if (wasPlaying) void to.play().catch(() => setPlaying(false));
      },
      seekRatio: (ratio: number) => {
        const video = get(sideRef.current);
        if (video && video.duration > 0) video.currentTime = Math.max(0, Math.min(1, ratio)) * video.duration;
        if (togetherRef.current) follow();
      },
      seekBy: (seconds: number) => {
        const video = get(sideRef.current);
        if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
        if (togetherRef.current) follow();
      },
      positions: () => ({ a: get('a')?.currentTime ?? 0, b: get('b')?.currentTime ?? 0 }),
      sideProgress,
      seekSide: (key: Side, seconds: number) => {
        const video = get(key);
        if (!video) return;
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        // 동시 재생에서 소리 안 나는 쪽을 옮기면 두 연주 사이 어긋남으로 기억해 그대로 붙여 간다
        const a = get('a');
        const b = get('b');
        if (togetherRef.current && key !== sideRef.current && a && b && a.duration > 0 && b.duration > 0) {
          offsetRef.current =
            key === 'b'
              ? seconds - momentAcross('a', 'b', a.currentTime)
              : b.currentTime - momentAcross('a', 'b', seconds);
        }
        video.currentTime = Math.max(0, duration > 0 ? Math.min(duration - 0.05, seconds) : seconds);
        setSideProgress((prev) => ({ ...prev, [key]: { current: video.currentTime, duration: duration || prev[key].duration } }));
      },
      playAt: (target: Side, seconds: number) => {
        finishFade();
        releaseShell();
        const from = get(sideRef.current);
        const to = get(target);
        if (!to) return;
        if (from && from !== to) {
          if (!togetherRef.current) from.pause();
          from.muted = true;
        }
        const duration = Number.isFinite(to.duration) && to.duration > 0 ? to.duration : 0;
        to.currentTime = Math.max(0, duration > 0 ? Math.min(duration - 0.05, seconds) : seconds);
        to.muted = comparePlayer.getState().muted;
        sideRef.current = target;
        setSide(target);
        void to
          .play()
          .then(() => togetherRef.current && follow())
          .catch(() => setPlaying(false));
      },
    };
  }, [side, playing, progress, sideProgress, mode, follow]);

  /** 화면을 떠날 때: 두 영상을 멈춘다 (재생은 앱 플레이어가 이어 간다) */
  const suspend = React.useCallback(() => {
    dropTakeover();
    fadeRef.current?.finish();
    (['a', 'b'] as const).forEach((key) => refs.current[key]?.pause());
  }, [dropTakeover]);

  /** 돌아왔을 때: 앱 플레이어가 이어 간 연주·위치에서 다시 이 화면 영상으로 넘겨받는다 */
  const resume = React.useCallback(() => {
    const state = comparePlayer.getState();
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      const id = key === 'a' ? a.id : b.id;
      const position = comparePlayer.livePosition(id) ?? comparePlayer.positionFor(id);
      if (!video || !(position > 0)) return;
      if (!Number.isFinite(video.duration) || position < video.duration) video.currentTime = position;
    });
    const currentId = state.current?.performanceId;
    const target: Side | null = currentId === a.id ? 'a' : currentId === b.id ? 'b' : null;
    // 떠나 있는 동안 다른 연주로 넘어갔으면 소리 쪽은 그대로 두고 틀지 않는다(앱 플레이어는 이 화면에서 쉰다)
    if (!target || !state.playing) {
      comparePlayer.pause();
      if (target) {
        sideRef.current = target;
        setSide(target);
      }
      return;
    }
    sideRef.current = target;
    setSide(target);
    (['a', 'b'] as const).forEach((key) => {
      const video = refs.current[key];
      if (video) video.muted = key === target ? state.muted : true;
    });
    holdShell();
    void refs.current[target]?.play().catch(() => {
      setPlaying(false);
      releaseShell();
    });
  }, [a.id, b.id, dropTakeover, holdShell, releaseShell]);

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
          // 앱 플레이어에서 지금 나오는 연주면 그 자리, 아니면 비교 화면에서 듣던 자리에서 시작한다
          const resume = comparePlayer.livePosition(performance.id) ?? comparePlayer.positionFor(performance.id);
          if (resume > 0 && resume < video.duration) video.currentTime = resume;
          if (key === start.side && start.playing && sideRef.current === key && takeover.current !== null) {
            void video.play().catch(() => {
              setPlaying(false);
              releaseShell();
            });
          }
        }}
        onPlaying={(event) => onSideSounding(key, event.currentTarget)}
        onError={() => key === sideRef.current && releaseShell()}
        onPlay={() => key === sideRef.current && setPlaying(true)}
        onPause={() => key === sideRef.current && setPlaying(false)}
        onEnded={() => key === sideRef.current && setPlaying(false)}
      />
    );
  };

  /** 아직 넘겨받는 중이다(앱 플레이어가 소리를 잇고 있다) */
  const takingOver = React.useCallback(() => takeover.current !== null, []);

  return { engine, renderVideo, suspend, resume, takingOver };
}

// ─── 네이티브: 플레이어 하나. 전환은 스토어가 위치를 잡아 준다 ──────────────────

function useNativeFocusEngine(
  props: FocusStageProps,
  start: FocusStart,
  mode: FocusMode,
  loop: LoopRange | null
): FocusEngine {
  const { a, b, imageOf, sectors } = props;
  const startPlaying = start.playing;
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
      comparePlayer.select(trackFromPerformance(a, imageOf(a)), {
        play: startPlaying,
        ...compareQueueFor(a.pieceId, sectors, a.sectorId, a),
      });
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
        comparePlayer.select(trackFromPerformance(performance, imageOf(performance)), { play: true, startAt: target });
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
  useLocale();
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
      accessibilityLabel={loop ? t('구간 반복 해제') : start !== null ? t('구간 반복 끝 지점 정하기') : t('구간 반복 시작 지점 정하기')}
      className={cn('h-8 flex-row items-center gap-1.5 rounded-full border px-3', active ? 'border-primary bg-primary-muted' : 'border-border-strong')}>
      <Icon as={RepeatIcon} size={14} className={active ? 'text-primary' : 'text-foreground'} />
      <Text className={cn('text-label', active ? 'text-primary' : 'text-foreground')}>
        {loop ? t('반복 해제') : start !== null ? t('여기까지 반복') : t('구간 반복')}
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
  useLocale();
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
  useLocale();
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
              label={t('{name} 영상 위치', { name })}
              valueText={(value) => `${fineClock(value * duration)} / ${fineClock(duration)}`}
              step={duration > 0 ? 1 / duration : 0.05}
              disabled={duration <= 0}
              fill={on ? 'hsl(var(--primary))' : 'hsl(var(--foreground-muted))'}
              tooltip
            />
          ) : (
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel={t('{name} 영상 위치', { name })}
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
            accessibilityLabel={
              step < 0
                ? t('{name} {n}초 뒤로', { name, n: Math.abs(step) })
                : t('{name} {n}초 앞으로', { name, n: Math.abs(step) })
            }
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
  useLocale();
  const performerA = performerOf(a, imageOf);
  const performerB = performerOf(b, imageOf);
  return (
    <View className="mt-8 rounded-xl border border-border bg-surface-1 p-4">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-body font-bold text-foreground">{t('구간별 길이')}</Text>
        <Text variant="caption">{t('차이: {name} 연주가 길면 +, 짧으면 −', { name: performerB.name })}</Text>
      </View>
      <View className="mt-3 flex-row border-b border-border pb-2">
        <Text variant="caption" className="flex-[1.4] font-semibold text-foreground-subtle">
          {t('col::구간')}
        </Text>
        <LengthHead performer={performerA} tone="a" />
        <LengthHead performer={performerB} tone="b" />
        <Text variant="caption" className="w-16 text-right font-semibold text-foreground-subtle">
          {t('col::차이')}
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
              {row.loading ? '…' : da !== null ? clipClock(da) : t('cell::없음')}
            </Text>
            <Text variant="mono" className="flex-1 text-right text-foreground">
              {row.loading ? '…' : db !== null ? clipClock(db) : t('cell::없음')}
            </Text>
            <Text
              variant="mono"
              className={cn('w-16 text-right', diff === null ? 'text-foreground-subtle' : diff > 0 ? 'text-primary' : 'text-foreground')}>
              {diff === null ? '—' : t('{n}초', { n: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)}` })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 크로스페이드: 켜면 연주자를 바꿀 때 두 소리를 잠깐 겹쳐 넘긴다. 켠 상태는 기억한다 (웹만) */
function CrossfadeToggle() {
  useLocale();
  const on = useComparePlayer((state) => state.crossfade);
  return (
    <SwitchToggle
      on={on}
      onChange={(next) => comparePlayer.setCrossfade(next)}
      label={t('크로스페이드')}
      hint={t('켜면 연주자를 바꿀 때 두 소리를 잠깐 겹쳐서 넘겨요')}
    />
  );
}

function SwitchToggle({ on, onChange, label, hint }: { on: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  useLocale();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      className="h-8 flex-row items-center gap-2 rounded-full px-1.5 web:hover:bg-surface-2">
      <View className={cn('h-5 w-9 justify-center rounded-full px-0.5', on ? 'bg-primary' : 'bg-surface-3')}>
        <View className={cn('size-4 rounded-full', on ? 'translate-x-4 bg-primary-foreground' : 'bg-foreground-subtle')} />
      </View>
      <Text className={cn('text-label', on ? 'font-semibold text-foreground' : 'text-foreground-muted')}>{label}</Text>
    </Pressable>
  );
}

/** 길이 표 머리: 얼굴과 이름 */
function LengthHead({ performer, tone }: { performer: Performer; tone: 'a' | 'b' }) {
  useLocale();
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
  inShell = false,
}: {
  engine: FocusEngine;
  performers: Record<Side, Performer>;
  active: ComparisonPerformance;
  loop: LoopRange | null;
  editingLoop: boolean;
  onLoopChange: (range: LoopRange | null) => void;
  onExit: () => void;
  /** 셸 재생 바 자리에 그린다(넓은 웹). 평소 재생 바와 같은 세 칸 배치를 쓴다 */
  inShell?: boolean;
}) {
  useLocale();
  const { progress } = engine;
  const { nav } = useBreakpoint();
  const narrow = nav === 'tabs';
  const duration = progress.duration || clipDurationMs(active) / 1000;
  const playButton = (
    <Pressable
      onPress={engine.togglePlay}
      accessibilityLabel={engine.playing ? t('일시정지 (스페이스)') : t('재생 (스페이스)')}
      className="size-10 items-center justify-center rounded-full bg-foreground">
      <Icon as={engine.playing ? PauseIcon : PlayIcon} size={17} className="fill-background text-background" />
    </Pressable>
  );
  const other: Side = engine.side === 'a' ? 'b' : 'a';
  // 두 얼굴 사이에 ⇄. 듣는 쪽 얼굴이 크고 밝다
  const swapButton = (
    <Pressable
      onPress={() => engine.switchTo(other)}
      accessibilityLabel={t('{name} 연주로 바꾸기 (Tab)', { name: performers[other].name })}
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
      accessibilityLabel={t('집중 비교 나가기 (Esc)')}
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

  // 셸 재생 바 자리: 왼쪽은 지금 듣는 쪽, 가운데는 재생과 진행바(구간 반복도 여기서 끈다), 오른쪽은 A⇄B·소리·나가기.
  // 곡 넘기기·셔플·대기열은 두 연주만 번갈아 듣는 동안에는 뜻이 없어 두지 않는다
  if (inShell) {
    const on = performers[engine.side];
    return (
      <View className="h-full flex-row items-center gap-4 px-4">
        <View className="min-w-0 flex-1 basis-0 flex-row items-center gap-3">
          <PerformerMark performer={on} tone={engine.side} size={44} />
          <View key={engine.side} className="cm-row-in min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <View className="rounded-xs bg-primary-muted px-1.5 py-0.5">
                <Text className="text-micro font-bold text-primary">{t('1:1 비교')}</Text>
              </View>
              <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
                {on.name}
              </Text>
            </View>
            <Text variant="caption" numberOfLines={1}>
              {`${active.pieceTitle} · ${active.sectorName}`}
            </Text>
          </View>
        </View>
        <View className="w-[400px] shrink items-center gap-1.5">
          {/* 평소 바의 ⏮ ⏭ 자리: 같은 대목을 다시 듣기 쉽게 5초씩 옮긴다 */}
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => engine.seekBy(-SEEK_STEP_SEC)}
              accessibilityRole="button"
              accessibilityLabel={t('5초 뒤로 (⇧←)')}
              className="cm-press size-8 items-center justify-center rounded-full">
              <Icon as={RotateCcwIcon} size={16} className="text-foreground-muted" />
            </Pressable>
            <Pressable
              onPress={engine.togglePlay}
              accessibilityRole="button"
              accessibilityLabel={engine.playing ? t('일시정지 (스페이스)') : t('재생 (스페이스)')}
              className="cm-press-solid size-9 items-center justify-center rounded-full bg-foreground">
              <Icon as={engine.playing ? PauseIcon : PlayIcon} size={16} className="fill-background text-background" />
            </Pressable>
            <Pressable
              onPress={() => engine.seekBy(SEEK_STEP_SEC)}
              accessibilityRole="button"
              accessibilityLabel={t('5초 앞으로 (⇧→)')}
              className="cm-press size-8 items-center justify-center rounded-full">
              <Icon as={RotateCwIcon} size={16} className="text-foreground-muted" />
            </Pressable>
          </View>
          <View className="w-full flex-row">{track}</View>
        </View>
        <View className="min-w-0 flex-1 basis-0 flex-row items-center justify-end gap-2.5">
          {swapButton}
          <VolumeControl width={76} />
          {exitButton}
        </View>
      </View>
    );
  }

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
  useLocale();
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
      aria-label={editing ? t('반복할 구간 끌어서 지정') : t('재생 위치')}
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
