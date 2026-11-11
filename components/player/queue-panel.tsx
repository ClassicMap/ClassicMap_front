import { EntityThumb } from '@/components/ui/entity-thumb';
import { Equalizer } from '@/components/ui/equalizer';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { relocalize, t, useLocale } from '@/lib/i18n';
import {
  comparePlayer,
  type ComparePlayerTrack,
  type PlaylistItem,
  type QueueEntry,
  useComparePlayer,
} from '@/lib/player/compare-player-store';
import { findCachedComparisonPiece } from '@/lib/query/hooks/useComparisonPerformances';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRightIcon,
  InfinityIcon,
  ListMusicIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

/** 재생 바의 대기열 버튼. 데스크톱은 오른쪽 패널을 열고 닫는다(모바일은 onPress 로 시트를 연다) */
export function QueueButton({ onPress }: { onPress?: () => void }) {
  useLocale();
  const open = useComparePlayer((state) => state.queueOpen);
  const active = !onPress && open;
  return (
    <Pressable
      onPress={onPress ?? (() => comparePlayer.setQueueOpen(!open))}
      accessibilityRole="button"
      aria-selected={active}
      accessibilityLabel={t('재생 대기열')}
      className={cn(
        'cm-tint size-8 shrink-0 items-center justify-center rounded-full web:hover:bg-surface-2',
        active && 'bg-primary-muted'
      )}>
      <Icon
        as={ListMusicIcon}
        size={16}
        className={active ? 'text-primary' : 'text-foreground-muted'}
      />
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
      className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
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
      className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
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

/** 패널 위의 셔플·반복·자동 재생 */
function ModeButton({
  icon,
  label,
  state,
  on,
  onPress,
  role = 'switch',
}: {
  icon: typeof ShuffleIcon;
  label: string;
  state: string;
  on: boolean;
  onPress: () => void;
  role?: 'switch' | 'button';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      aria-checked={role === 'switch' ? on : undefined}
      accessibilityLabel={`${label}: ${state}`}
      className={cn(
        'cm-tint min-w-0 flex-1 items-center gap-0.5 rounded-lg border py-1.5',
        on ? 'border-primary bg-primary-muted' : 'border-border bg-surface-2 web:hover:bg-surface-3'
      )}>
      <Icon as={icon} size={15} className={on ? 'text-primary' : 'text-foreground-muted'} />
      <Text
        numberOfLines={1}
        className={cn('text-caption font-semibold', on ? 'text-primary' : 'text-foreground-muted')}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className={cn('text-[11px]', on ? 'text-primary' : 'text-foreground-subtle')}>
        {state}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-2 px-4 pb-1 pt-3">
      <Text className="shrink-0 text-[11.5px] font-semibold uppercase tracking-wider text-foreground-subtle">
        {title}
      </Text>
      {detail ? (
        <Text
          numberOfLines={1}
          className="min-w-0 shrink text-right text-caption text-foreground-muted">
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function Note({ children }: { children: string }) {
  return <Text className="px-4 pb-2 pt-0.5 text-caption text-foreground-subtle">{children}</Text>;
}

interface RowProps {
  title: string;
  subtitle: string;
  image: string | null;
  imageName: string;
  reason?: string;
  now?: boolean;
  past?: boolean;
  playing?: boolean;
  /** 흐리게(자동 재생이 꺼졌을 때 골라 둔 곡) */
  dimmed?: boolean;
  /** 나가는 중(빼기·비우기·접기). 옆으로 비켜 사라진다 */
  leaving?: boolean;
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
}

/** 줄이 사라지는 애니메이션 길이(ms). 이만큼 기다렸다가 실제로 뺀다 */
const LEAVE_MS = 180;

function Row({
  title,
  subtitle,
  image,
  imageName,
  reason,
  now,
  past,
  playing,
  dimmed,
  leaving,
  label,
  onPress,
  onRemove,
}: RowProps) {
  const [removing, setRemoving] = React.useState(false);
  const out = leaving || removing;
  return (
    <View
      className={cn(
        'cm-row-in cm-fade flex-row items-center',
        now && 'bg-primary-muted',
        !now && !dimmed && 'web:hover:bg-surface-2',
        dimmed && 'opacity-40',
        out && 'cm-row-out'
      )}>
      <Pressable
        onPress={onPress}
        disabled={!onPress || dimmed || out}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={cn(
          'min-w-0 flex-1 flex-row items-center gap-3 py-1.5 pl-4',
          onRemove ? 'pr-1' : 'pr-4',
          past && 'opacity-55'
        )}>
        <EntityThumb name={imageName} image={image} shape="square" size={40} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {now ? <Equalizer playing={Boolean(playing)} size={10} /> : null}
            <Text
              numberOfLines={1}
              className={cn(
                'min-w-0 shrink text-body-sm font-semibold',
                now ? 'text-primary' : 'text-foreground'
              )}>
              {title}
            </Text>
          </View>
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {reason ? (
          <Text
            numberOfLines={1}
            className="max-w-[118px] shrink-0 rounded bg-primary-muted px-1.5 text-[11px] font-semibold text-primary">
            {reason}
          </Text>
        ) : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={() => {
            if (removing) return;
            setRemoving(true);
            setTimeout(onRemove, LEAVE_MS);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('{title} 대기열에서 빼기', { title })}
          hitSlop={6}
          className="mr-3 size-7 items-center justify-center rounded-full opacity-50 web:hover:bg-surface-3 web:hover:opacity-100">
          <Icon as={XIcon} size={13} className="text-foreground-muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 자동 재생 곡을 고르는 동안 보이는 빈 줄 */
function RowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-1.5">
      <Skeleton className="size-10 rounded-md" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </View>
    </View>
  );
}

function trackRow(
  track: ComparePlayerTrack,
  extra: Partial<RowProps> & { label?: string }
): RowProps {
  const local = relocalize(track);
  return {
    title: local.pieceTitle,
    subtitle: `${local.artistName} · ${local.sectorName}`,
    image: local.artistImageUrl,
    imageName: local.artistName,
    label: extra.label ?? `${local.pieceTitle} ${local.artistName}`,
    ...extra,
  };
}

/** 목록 줄. 카드가 준 작품 정보가 없으면(옛 세션) 받아 둔 카탈로그에서 찾는다 */
function useItemRow() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (
      item: PlaylistItem
    ): Pick<RowProps, 'title' | 'subtitle' | 'image' | 'imageName' | 'reason'> => {
      if (item.meta) {
        return {
          title: item.meta.title,
          subtitle: item.meta.composer,
          image: item.meta.image,
          imageName: item.meta.title,
          reason: item.meta.reason,
        };
      }
      const cached = findCachedComparisonPiece(queryClient, item.pieceId)?.piece;
      const title = cached?.pieceTitle ?? t('곡 정보를 불러오지 못했어요');
      return {
        title,
        subtitle: cached?.composerName ?? '',
        image: cached?.composerAvatarUrl ?? null,
        imageName: title,
      };
    },
    [queryClient]
  );
}

/** 같은 곡이 목록에 두 번 있어도 줄 열쇠가 겹치지 않게(줄이 옮겨 가도 다시 나타나지 않게) 작품·구간·몇 번째로 만든다 */
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

/** 닫힌 뒤에도 잠깐(나가는 애니메이션 동안) 그려 둔다 */
function useLingering(value: boolean, ms: number): boolean {
  const [lingering, setLingering] = React.useState(value);
  React.useEffect(() => {
    if (value) {
      setLingering(true);
      return;
    }
    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return value || lingering;
}

/**
 * 재생 대기열. 위에서부터 들은 곡 → 지금 재생 → 다음에 재생 → 이어서 재생 → 자동 재생.
 * 줄을 누르면 그 곡부터 틀고, 그 사이 곡은 건너뛴다. 줄은 생길 때 살짝 올라오고 뺄 때 옆으로 비켜 사라진다
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
  const [showHistory, setShowHistory] = React.useState(false);
  const historyMounted = useLingering(showHistory, LEAVE_MS);
  const [clearing, setClearing] = React.useState(false);
  const itemRow = useItemRow();
  const remaining = playlist ? playlist.items.slice(playlist.index + 1) : [];
  const remainingKeys = stableKeys(remaining, 's');
  const autoplayKeys = stableKeys(autoplayItems, 'a');
  const sourceName = playlist?.name ?? t('재생 목록');
  const repeatAll = repeat === 'all' && Boolean(playlist?.items.length);
  // 자동 재생이 꺼졌거나 전체 반복이면 골라 둔 곡을 흐리게 남겨 둔다(갑자기 사라지지 않게)
  const autoplayPaused = !autoplay || repeatAll;

  const clear = () => {
    if (clearing) return;
    setClearing(true);
    setTimeout(() => {
      comparePlayer.clearQueue();
      setClearing(false);
    }, LEAVE_MS);
  };

  return (
    <View className="flex-1 bg-surface-1">
      <View className="gap-2.5 border-b border-border px-4 pb-3 pt-3.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body font-bold text-foreground">{t('재생 대기열')}</Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={clear}
              accessibilityRole="button"
              accessibilityLabel={t('대기열 비우기')}
              className="cm-tint rounded-full px-2 py-1 web:hover:bg-surface-2">
              <Text className="text-label font-semibold text-primary">{t('비우기')}</Text>
            </Pressable>
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('대기열 닫기')}
                className="cm-tint size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
                <Icon as={XIcon} size={16} className="text-foreground-muted" />
              </Pressable>
            ) : null}
          </View>
        </View>
        <View className="flex-row gap-1.5">
          <ModeButton
            icon={ShuffleIcon}
            label={t('셔플')}
            state={shuffle ? t('켬') : t('끔')}
            on={shuffle}
            onPress={() => comparePlayer.setShuffle(!shuffle)}
          />
          <ModeButton
            icon={repeat === 'one' ? Repeat1Icon : RepeatIcon}
            label={t('반복')}
            state={repeat === 'all' ? t('전체') : repeat === 'one' ? t('한 곡') : t('끔')}
            on={repeat !== 'off'}
            role="button"
            onPress={() => comparePlayer.cycleRepeat()}
          />
          <ModeButton
            icon={InfinityIcon}
            label={t('자동 재생')}
            state={autoplay ? t('켬') : t('끔')}
            on={autoplay}
            onPress={() => comparePlayer.setAutoplay(!autoplay)}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        {history.length ? (
          <Pressable
            onPress={() => setShowHistory((value) => !value)}
            accessibilityRole="button"
            aria-expanded={showHistory}
            className="cm-tint flex-row items-center gap-1.5 px-4 pb-1 pt-2.5">
            <View
              className="cm-turn"
              style={{ transform: [{ rotate: showHistory ? '90deg' : '0deg' }] }}>
              <Icon as={ChevronRightIcon} size={14} className="text-foreground-muted" />
            </View>
            <Text className="text-label font-semibold text-foreground-muted">
              {t('들은 곡 {count}', { count: history.length })}
            </Text>
          </Pressable>
        ) : null}
        {historyMounted
          ? history.map((entry: QueueEntry, index) => (
              <Row
                key={`h-${index}-${entry.track.performanceId}`}
                {...trackRow(entry.track, { past: true, leaving: !showHistory })}
                onPress={() => comparePlayer.playFromQueue('history', index)}
              />
            ))
          : null}

        <SectionTitle title={t('지금 재생')} />
        {current ? (
          <Row
            key={`now-${current.performanceId}`}
            {...trackRow(current, { now: true, playing })}
          />
        ) : (
          <Note>{t('재생 중인 곡이 없어요.')}</Note>
        )}

        {forward.length ? (
          <>
            <SectionTitle title={t('다음에 재생')} />
            {forward.map((entry, index) => (
              <Row
                key={`f-${entry.track.performanceId}-${index}`}
                {...trackRow(entry.track, { leaving: clearing })}
                onPress={() => comparePlayer.playFromQueue('forward', index)}
                onRemove={() => comparePlayer.removeFromQueue('forward', index)}
              />
            ))}
          </>
        ) : null}

        <SectionTitle
          title={shuffle ? t('이어서 재생 · 셔플') : t('이어서 재생')}
          detail={playlist ? sourceName : undefined}
        />
        {remaining.length ? (
          remaining.map((item, index) => {
            const row = itemRow(item);
            return (
              <Row
                key={remainingKeys[index]}
                {...row}
                reason={undefined}
                leaving={clearing}
                label={`${row.title} ${row.subtitle}`}
                onPress={() => comparePlayer.playFromQueue('source', index)}
                onRemove={() => comparePlayer.removeFromQueue('source', index)}
              />
            );
          })
        ) : (
          <View className="cm-row-in">
            <Note>
              {repeatAll ? t('반복(전체): 끝나면 목록 처음으로 돌아가요.') : t('목록 끝이에요.')}
            </Note>
          </View>
        )}

        <SectionTitle title={t('자동 재생 · 취향에 맞춘 곡')} />
        {autoplayPaused ? (
          <View className="cm-row-in">
            <Note>
              {!autoplay
                ? t('자동 재생이 꺼져 있어요. 목록이 끝나면 멈춰요.')
                : t('반복(전체)이 켜져 있어 자동 재생은 쉬어요.')}
            </Note>
          </View>
        ) : null}
        {autoplayItems.length ? (
          autoplayItems.map((item, index) => {
            const row = itemRow(item);
            return (
              <Row
                key={autoplayKeys[index]}
                {...row}
                dimmed={autoplayPaused}
                label={`${row.title} ${row.subtitle} ${row.reason ?? ''}`.trim()}
                onPress={() => comparePlayer.playFromQueue('autoplay', index)}
              />
            );
          })
        ) : autoplayPaused ? null : autoplayStatus === 'empty' ? (
          <View className="cm-row-in flex-row flex-wrap items-center gap-x-2 px-4 pb-2 pt-0.5">
            <Text className="text-caption text-foreground-subtle">
              {t('비슷한 곡을 찾지 못했어요.')}
            </Text>
            <Pressable
              onPress={() => comparePlayer.retryAutoplay()}
              accessibilityRole="button"
              className="rounded-full px-1.5 py-0.5 web:hover:bg-surface-2">
              <Text className="text-caption font-semibold text-primary">{t('다시 시도')}</Text>
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
      </ScrollView>
    </View>
  );
}
