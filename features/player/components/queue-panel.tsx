import { EntityThumb } from '@/components/shared/entity-thumb';
import { Equalizer } from '@/features/player/components/equalizer';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { relocalize, t, useLocale } from '@/lib/i18n';
import { shell, useShell } from '@/lib/layout/shell-state';
import {
  comparePlayer,
  type ComparePlayerTrack,
  type PlaylistItem,
  type QueueEntry,
  useComparePlayer,
} from '@/lib/player/compare-player-store';
import { findCachedComparisonPiece } from '@/lib/query/hooks/use-comparison-performances';
import { useComposerAvatar } from '@/lib/query/hooks/use-composers';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  InfinityIcon,
  ListMusicIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

/** 재생 바의 대기열 버튼. 셸의 오른쪽 대기열 패널을 열고 닫는다 */
export function QueueButton() {
  useLocale();
  const active = useShell((state) => state.queueOpen);
  // 곡을 대기열에 넣으면 단추가 한 번 통통 튄다(들어갔다는 표시)
  const queued = useComparePlayer((state) => state.forward.length);
  const seen = React.useRef(queued);
  const [bump, setBump] = React.useState(0);
  React.useEffect(() => {
    if (queued > seen.current) setBump((value) => value + 1);
    seen.current = queued;
  }, [queued]);
  return (
    <Pressable
      onPress={() => shell.toggleQueue()}
      accessibilityRole="button"
      aria-expanded={active}
      accessibilityLabel={t('재생 대기열')}
      className={cn(
        'cm-press size-8 shrink-0 items-center justify-center rounded-full',
        active && 'bg-primary-muted'
      )}>
      <View key={bump} className={bump ? 'cm-pop' : undefined}>
        <Icon
          as={ListMusicIcon}
          size={16}
          className={active ? 'text-primary' : 'text-foreground-muted'}
        />
      </View>
    </Pressable>
  );
}

/** 재생 바 가운데의 셔플 단추 */
export function ShuffleButton() {
  useLocale();
  const on = useComparePlayer((state) => state.shuffle);
  return (
    <Pressable
      onPress={() => comparePlayer.setShuffle(!on)}
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityLabel={t('셔플')}
      className="cm-press size-8 items-center justify-center rounded-full">
      <Icon as={ShuffleIcon} size={15} className={on ? 'text-primary' : 'text-foreground-muted'} />
    </Pressable>
  );
}

/** 재생 바 가운데의 반복 단추. 누를 때마다 끔 → 전체 → 한 곡 */
export function RepeatButton() {
  useLocale();
  const repeat = useComparePlayer((state) => state.repeat);
  return (
    <Pressable
      onPress={() => comparePlayer.cycleRepeat()}
      accessibilityRole="button"
      accessibilityLabel={repeatLabel(repeat)}
      className="cm-press size-8 items-center justify-center rounded-full">
      <Icon
        as={repeat === 'one' ? Repeat1Icon : RepeatIcon}
        size={15}
        className={repeat === 'off' ? 'text-foreground-muted' : 'text-primary'}
      />
    </Pressable>
  );
}

function repeatLabel(repeat: 'off' | 'all' | 'one'): string {
  if (repeat === 'all') return t('반복: 전체');
  if (repeat === 'one') return t('반복: 한 곡');
  return t('반복: 끔');
}

/** 마우스가 있는 화면인가. 없으면(손가락) 빼기 단추를 늘 보인다 */
function useCanHover(): boolean {
  return React.useMemo(
    () =>
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(hover: hover)').matches),
    []
  );
}

/** 줄이 사라지는 애니메이션 길이(ms). 이만큼 기다렸다가 실제로 뺀다 */
const LEAVE_MS = 180;
/** 다음 곡으로 넘어갈 때 맨 윗줄이 접히는 길이(ms). global.css 의 cm-row-leave 와 같게 둔다 */
const ROW_LEAVE_MS = 320;
/** 대기열 한 줄 높이(px): 그림 44 + 위아래 6 */
const ROW_HEIGHT = 56;
/** 목록에서 자동 재생 줄들 위에 늘 있는 높이(px): 「지금 재생」 머리·줄과 「자동 재생」 머리 */
const LIST_FIXED_HEIGHT = 164;
/** 한 번에 접히는 줄은 이만큼까지만 그린다(멀리 건너뛰어도 화면에 보이는 만큼이면 된다) */
const MAX_LEAVING = 12;
/** 새 줄이 차례로 나타나는 간격(ms)과 그 간격을 주는 줄 수 */
const STAGGER_MS = 35;
const MAX_STAGGER = 10;
/** 새 줄 표시를 이만큼 붙여 둔다(ms). 그사이 다시 그려져도 움직임이 끊기지 않는다 */
const ROW_ENTER_KEEP_MS = 1200;

interface UpcomingRow {
  pieceId: number;
  row: Omit<RowProps, 'label'> & { label: string };
}

interface RowProps {
  title: string;
  subtitle: string;
  image: string | null;
  imageName: string;
  /** 그림이 없으면 이 작곡가 사진을 쓴다 */
  composerId?: number;
  now?: boolean;
  playing?: boolean;
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
}

/**
 * 대기열 한 줄 (스포티파이 대기열과 같은 모양). 마우스를 올리면 바탕이 깔리고 그림 위에 재생 표시,
 * 오른쪽에 빼기 단추가 뜬다. 지금 곡은 제목이 강조색이다
 */
function Row({
  title,
  subtitle,
  image,
  imageName,
  composerId,
  now,
  playing,
  label,
  onPress,
  onRemove,
}: RowProps) {
  const canHover = useCanHover();
  // 빼기 단추는 줄 누름 칸 밖(옆)에 둔다. 안에 두면 빼기를 누를 때 줄의 재생도 같이 눌린다
  const [hoverMain, setHoverMain] = React.useState(false);
  const [hoverRemove, setHoverRemove] = React.useState(false);
  const hovered = hoverMain || hoverRemove;
  const [removing, setRemoving] = React.useState(false);
  // 곡 그림: 연주자 사진(들은 곡·지금 곡) 또는 작곡가 사진, 없으면 대표 영상 그림
  const composerPhoto = useComposerAvatar(composerId, null);
  const picture = composerPhoto ?? image;
  return (
    <View
      className={cn(
        'cm-fade mx-2 flex-row items-center rounded-md',
        hovered && 'bg-surface-2',
        removing && 'cm-row-out'
      )}>
      <Pressable
        onPress={onPress}
        disabled={!onPress || removing}
        onHoverIn={() => setHoverMain(true)}
        onHoverOut={() => setHoverMain(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="min-w-0 flex-1 flex-row items-center gap-3 py-1.5 pl-2 pr-1">
        <View>
          <EntityThumb name={imageName} image={picture} shape="square" size={44} />
          {hovered && onPress && !now ? (
            <View className="absolute inset-0 items-center justify-center rounded bg-black/45">
              <Icon as={PlayIcon} size={16} className="fill-white text-white" />
            </View>
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className={cn('text-body-sm font-semibold', now ? 'text-primary' : 'text-foreground')}>
            {title}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {now ? <Equalizer playing={Boolean(playing)} size={12} /> : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={() => {
            if (removing) return;
            setRemoving(true);
            setTimeout(onRemove, LEAVE_MS);
          }}
          onHoverIn={() => setHoverRemove(true)}
          onHoverOut={() => setHoverRemove(false)}
          accessibilityRole="button"
          accessibilityLabel={t('{title} 대기열에서 빼기', { title })}
          className={cn(
            'mr-1.5 size-7 items-center justify-center rounded-full web:hover:bg-surface-3',
            !hovered && canHover && 'opacity-0'
          )}>
          <Icon as={XIcon} size={14} className="text-foreground-muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 자동 재생을 고르는 동안 보이는 빈 줄 */
function RowSkeleton() {
  return (
    <View className="mx-2 flex-row items-center gap-3 px-2 py-1.5">
      <Skeleton className="size-11 rounded" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </View>
    </View>
  );
}

function trackRow(track: ComparePlayerTrack): Omit<RowProps, 'label'> & { label: string } {
  const local = relocalize(track);
  return {
    title: local.pieceTitle,
    subtitle: `${local.artistName} · ${local.sectorName}`,
    image: local.artistImageUrl,
    imageName: local.artistName,
    label: `${local.pieceTitle} ${local.artistName}`,
  };
}

/** 목록 줄. 카드가 준 작품 정보가 없으면(옛 세션) 받아 둔 카탈로그에서 찾는다 */
function useItemRow() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (item: PlaylistItem): Omit<RowProps, 'label'> & { label: string } => {
      if (item.meta) {
        const subtitle = item.meta.reason
          ? `${item.meta.composer} · ${item.meta.reason}`
          : item.meta.composer;
        return {
          title: item.meta.title,
          subtitle,
          image: item.meta.image,
          imageName: item.meta.composer || item.meta.title,
          composerId: item.meta.composerId,
          label: `${item.meta.title} ${subtitle}`,
        };
      }
      const cached = findCachedComparisonPiece(queryClient, item.pieceId)?.piece;
      const title = cached?.pieceTitle ?? t('곡 정보를 불러오지 못했어요');
      return {
        title,
        subtitle: cached?.composerName ?? '',
        image: cached?.composerAvatarUrl ?? null,
        imageName: cached?.composerName ?? title,
        composerId: cached?.composerId,
        label: title,
      };
    },
    [queryClient]
  );
}

/** 같은 곡이 목록에 두 번 있어도 줄 열쇠가 겹치지 않게 작품·구간·몇 번째로 만든다 */
function stableKeys(
  items: readonly { pieceId: number; sectorId: number | null }[],
  prefix: string
): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = `${prefix}-${item.pieceId}-${item.sectorId ?? 0}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return `${base}-${count}`;
  });
}

/** 구역 머리: 굵은 제목, 아래에 출처 한 줄, 오른쪽에 동작 하나 (애플 뮤직 「이어서 재생 · ~에서 · 비우기」) */
function Section({
  title,
  detail,
  action,
  children,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="pt-4">
      <View className="flex-row items-start justify-between gap-3 px-4 pb-1.5">
        <View className="min-w-0 flex-1">
          <Text className="text-body font-bold text-foreground">{title}</Text>
          {detail ? (
            <Text variant="caption" numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <Text className="px-4 py-1 text-caption text-foreground-subtle">{children}</Text>;
}

/** 자동 재생 켜고 끄기 스위치 */
function AutoplaySwitch({ on }: { on: boolean }) {
  return (
    <Pressable
      onPress={() => comparePlayer.setAutoplay(!on)}
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityLabel={t('자동 재생')}
      hitSlop={6}
      className="flex-row items-center gap-2 pt-0.5">
      <Icon as={InfinityIcon} size={15} className={on ? 'text-primary' : 'text-foreground-muted'} />
      <View
        className={cn(
          'cm-tint h-5 w-9 justify-center rounded-full px-0.5',
          on ? 'bg-primary' : 'bg-surface-3'
        )}>
        <View
          className="cm-turn size-4 rounded-full bg-white"
          style={{ transform: [{ translateX: on ? 16 : 0 }] }}
        />
      </View>
    </Pressable>
  );
}

type QueueTab = 'queue' | 'history';

/**
 * 재생 대기열 (스포티파이·애플 뮤직의 오른쪽 대기열과 같은 짜임).
 * 「대기열」 탭: 지금 재생 → 다음에 재생(⏮로 미룬 곡) → 이어서 재생(재생을 누른 목록) → 자동 재생.
 * 「최근 재생」 탭: 들은 곡(최근 것부터). 줄을 누르면 그 곡부터 튼다. 셔플·반복은 재생 바에 있다
 */
export function QueuePanel({ onClose }: { onClose?: () => void }) {
  useLocale();
  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const history = useComparePlayer((state) => state.history);
  const forward = useComparePlayer((state) => state.forward);
  const playlist = useComparePlayer((state) => state.playlist);
  const autoplay = useComparePlayer((state) => state.autoplay);
  const autoplayItems = useComparePlayer((state) => state.autoplayItems);
  const autoplayStatus = useComparePlayer((state) => state.autoplayStatus);
  const shuffle = useComparePlayer((state) => state.shuffle);
  const repeat = useComparePlayer((state) => state.repeat);
  const [tab, setTab] = React.useState<QueueTab>('queue');
  // 자동 재생 줄 수는 패널 한 화면에 딱 들어가는 만큼으로 맞춘다(마지막 줄이 잘리지 않게).
  // 곡이 넘어가면 끝에 하나가 채워져 늘 같은 길이다. 직접 넣은 곡·목록은 그 위에 더해져 길어진다
  const [fitRows, setFitRows] = React.useState(0);
  const onListLayout = React.useCallback((height: number) => {
    const rows = Math.floor((height - LIST_FIXED_HEIGHT) / ROW_HEIGHT);
    if (rows <= 0) return;
    setFitRows(rows);
    comparePlayer.setAutoplayTarget(rows);
  }, []);
  const itemRow = useItemRow();
  const remaining = playlist ? playlist.items.slice(playlist.index + 1) : [];
  const remainingKeys = stableKeys(remaining, 's');
  const autoplayKeys = stableKeys(autoplayItems, 'a');
  const repeatAll = repeat === 'all' && Boolean(playlist?.items.length);
  const sourceName = playlist?.name ?? t('재생 목록');

  const forwardKeys = stableKeys(
    forward.map((entry) => ({ pieceId: entry.track.performanceId, sectorId: null })),
    'f'
  );
  const autoplayShown = autoplay && !repeatAll ? autoplayItems : [];

  // 다음 곡으로 넘어가거나 아래 줄을 눌러 건너뛰면, 지금 곡이 된 줄과 그 위에 있던 줄들을 잠깐 남겨 접히게 한다.
  // 그래서 아래 줄들이 따라 올라온다
  const upcoming: UpcomingRow[] = [
    ...forward.map((entry) => ({ pieceId: entry.track.pieceId, row: trackRow(entry.track) })),
    ...remaining.map((item) => ({ pieceId: item.pieceId, row: itemRow(item) })),
    ...autoplayShown.map((item) => ({ pieceId: item.pieceId, row: itemRow(item) })),
  ];
  const upcomingRef = React.useRef(upcoming);
  const currentIdRef = React.useRef(current?.performanceId ?? null);
  const [leaving, setLeaving] = React.useState<{ id: number; rows: UpcomingRow[] } | null>(null);
  React.useEffect(() => {
    const previous = upcomingRef.current;
    const currentId = current?.performanceId ?? null;
    const changed = current !== null && currentIdRef.current !== null && currentIdRef.current !== currentId;
    currentIdRef.current = currentId;
    upcomingRef.current = upcoming;
    if (!changed || !current) return;
    const at = previous.findIndex((row) => row.pieceId === current.pieceId);
    if (at < 0) return;
    setLeaving({ id: current.performanceId, rows: previous.slice(Math.max(0, at + 1 - MAX_LEAVING), at + 1) });
  });
  React.useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), ROW_LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);
  const leavingRows = leaving
    ? leaving.rows.map((item, index) => (
        <View key={`leave-${leaving.id}-${index}`} className="cm-row-leave" aria-hidden>
          <Row {...item.row} />
        </View>
      ))
    : null;
  // 접히는 줄은 보이는 첫 칸 맨 위에 둔다
  const leavingAt: 'forward' | 'source' | 'autoplay' = forward.length
    ? 'forward'
    : remaining.length
      ? 'source'
      : 'autoplay';

  // 새로 들어온 줄(대기열에 넣은 곡, 다시 채워진 자동 재생)은 아래에서 차례로 올라오며 나타난다.
  // 패널을 처음 열 때는 패널 전체가 나타나므로 줄마다 따로 움직이지 않는다
  const knownKeys = React.useRef<Set<string> | null>(null);
  const freshKeys = React.useRef(new Map<string, { delay: number; at: number }>());
  const allKeys = [...forwardKeys, ...remainingKeys, ...stableKeys(autoplayShown, 'a')];
  const now = Date.now();
  let freshCount = 0;
  if (knownKeys.current) {
    for (const key of allKeys) {
      if (knownKeys.current.has(key)) continue;
      freshKeys.current.set(key, { delay: Math.min(freshCount, MAX_STAGGER) * STAGGER_MS, at: now });
      freshCount += 1;
    }
  }
  knownKeys.current = new Set(allKeys);
  for (const [key, fresh] of freshKeys.current) {
    if (now - fresh.at > ROW_ENTER_KEEP_MS) freshKeys.current.delete(key);
  }
  // 직접 넣은 곡은 아래에서 올라오고, 채워지는 줄은 빈 줄 모양이 있던 자리에서 내용만 나타난다
  const entering = (key: string, how: 'insert' | 'fill') => {
    const fresh = freshKeys.current.get(key);
    return fresh
      ? {
          className: how === 'insert' ? 'cm-row-in' : 'cm-row-fill',
          style: { animationDelay: `${fresh.delay}ms` } as object,
        }
      : {};
  };
  // 자동 재생을 이어 붙이는 동안 남은 줄 아래에 채워질 만큼 빈 줄 모양을 깔아 둔다
  const fillingRows =
    autoplayStatus === 'loading' && autoplayItems.length > 0
      ? Math.max(0, fitRows - autoplayItems.length)
      : 0;

  const tabs: { key: QueueTab; label: string }[] = [
    { key: 'queue', label: t('대기열') },
    { key: 'history', label: t('최근 재생') },
  ];

  // 「이어서 재생」은 남은 목록 곡이 있을 때만 보이고, 비우기 단추는 보이는 첫 칸(다음에 재생 또는 이어서 재생)에 둔다
  const showSource = remaining.length > 0 || repeatAll;
  const clearAction = (
    <Pressable
      onPress={() => comparePlayer.clearQueue()}
      accessibilityRole="button"
      accessibilityLabel={t('대기열 비우기')}
      className="rounded-full px-1 py-0.5">
      <Text className="text-label font-semibold text-foreground-muted web:hover:text-foreground">
        {t('비우기')}
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-surface-1">
      <View className="flex-row items-center gap-5 px-4 pb-1 pt-4">
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            accessibilityRole="tab"
            aria-selected={tab === item.key}
            className="py-1">
            <Text
              className={cn(
                'cm-tint text-[15px] font-bold',
                tab === item.key
                  ? 'text-foreground'
                  : 'text-foreground-subtle web:hover:text-foreground-muted'
              )}>
              {item.label}
            </Text>
          </Pressable>
        ))}
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('대기열 닫기')}
            className="ml-auto size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
            <Icon as={XIcon} size={16} className="text-foreground-muted" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        key={tab}
        className="cm-reveal flex-1"
        contentContainerClassName="pb-6"
        onLayout={(event) => onListLayout(event.nativeEvent.layout.height)}>
        {tab === 'history' ? (
          history.length ? (
            <View className="pt-2">
              {[...history].reverse().map((entry: QueueEntry, reversedIndex) => {
                const index = history.length - 1 - reversedIndex;
                return (
                  <Row
                    key={`h-${index}-${entry.track.performanceId}`}
                    {...trackRow(entry.track)}
                    onPress={() => comparePlayer.playFromQueue('history', index)}
                  />
                );
              })}
            </View>
          ) : (
            <View className="pt-3">
              <Note>{t('아직 들은 곡이 없어요.')}</Note>
            </View>
          )
        ) : (
          <>
            <Section title={t('지금 재생')}>
              {current ? (
                <View key={current.performanceId} className="cm-row-in">
                  <Row {...trackRow(current)} now playing={playing} />
                </View>
              ) : (
                <Note>{t('재생 중인 곡이 없어요.')}</Note>
              )}
            </Section>

            {forward.length ? (
              <Section title={t('다음에 재생')} action={showSource ? undefined : clearAction}>
                {leavingAt === 'forward' ? leavingRows : null}
                {forward.map((entry, index) => (
                  <View key={forwardKeys[index]} {...entering(forwardKeys[index], 'insert')}>
                    <Row
                      {...trackRow(entry.track)}
                      onPress={() => comparePlayer.playFromQueue('forward', index)}
                      onRemove={() => comparePlayer.removeFromQueue('forward', index)}
                    />
                  </View>
                ))}
              </Section>
            ) : null}

            {/* 다음에 나올 목록 곡이 있을 때만 보인다(스포티파이 「다음: ~」). 끝난 목록은 남기지 않는다 */}
            {showSource ? (
              <Section
                title={shuffle ? t('이어서 재생 · 셔플') : t('이어서 재생')}
                detail={playlist ? t('{name}에서', { name: sourceName }) : undefined}
                action={remaining.length || forward.length ? clearAction : undefined}>
                {leavingAt === 'source' ? leavingRows : null}
                {remaining.length ? (
                  remaining.map((item, index) => (
                    <View key={remainingKeys[index]} {...entering(remainingKeys[index], 'fill')}>
                      <Row
                        {...itemRow(item)}
                        onPress={() => comparePlayer.playFromQueue('source', index)}
                        onRemove={() => comparePlayer.removeFromQueue('source', index)}
                      />
                    </View>
                  ))
                ) : (
                  <Note>{t('반복(전체): 끝나면 목록 처음으로 돌아가요.')}</Note>
                )}
              </Section>
            ) : null}

            <Section
              title={t('자동 재생')}
              detail={t('취향에 맞춘 비슷한 곡이 이어져요')}
              action={<AutoplaySwitch on={autoplay} />}>
              {leavingAt === 'autoplay' ? leavingRows : null}
              {!autoplay ? (
                <Note>{t('꺼져 있어요. 목록이 끝나면 멈춰요.')}</Note>
              ) : repeatAll ? (
                <Note>{t('반복(전체)이 켜져 있어 자동 재생은 쉬어요.')}</Note>
              ) : autoplayItems.length ? (
                <>
                  {autoplayItems.map((item, index) => (
                    <View key={autoplayKeys[index]} {...entering(autoplayKeys[index], 'fill')}>
                      <Row
                        {...itemRow(item)}
                        onPress={() => comparePlayer.playFromQueue('autoplay', index)}
                        onRemove={() => comparePlayer.removeFromQueue('autoplay', index)}
                      />
                    </View>
                  ))}
                  {Array.from({ length: fillingRows }, (_, index) => (
                    <RowSkeleton key={`filling-${index}`} />
                  ))}
                </>
              ) : autoplayStatus === 'empty' ? (
                <View className="flex-row flex-wrap items-center gap-x-2 px-4 py-1">
                  <Text className="text-caption text-foreground-subtle">
                    {t('비슷한 곡을 찾지 못했어요.')}
                  </Text>
                  <Pressable
                    onPress={() => comparePlayer.retryAutoplay()}
                    accessibilityRole="button">
                    <Text className="text-caption font-semibold text-primary">
                      {t('다시 시도')}
                    </Text>
                  </Pressable>
                </View>
              ) : current ? (
                <View accessibilityLabel={t('비슷한 곡을 고르는 중이에요.')}>
                  <RowSkeleton />
                  <RowSkeleton />
                  <RowSkeleton />
                </View>
              ) : (
                <Note>{t('곡을 틀면 비슷한 곡이 이어져요.')}</Note>
              )}
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}
