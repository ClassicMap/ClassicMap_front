import { EntityThumb } from '@/components/ui/entity-thumb';
import { Equalizer } from '@/components/ui/equalizer';
import { Icon } from '@/components/ui/icon';
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
  ChevronDownIcon,
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
      accessibilityState={{ selected: active }}
      accessibilityLabel={t('재생 대기열')}
      className={cn(
        'size-8 shrink-0 items-center justify-center rounded-full web:hover:bg-surface-2',
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
      accessibilityState={{ checked: on }}
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
      accessibilityState={role === 'switch' ? { checked: on } : undefined}
      accessibilityLabel={`${label}: ${state}`}
      className={cn(
        'min-w-0 flex-1 items-center gap-0.5 rounded-lg border py-1.5',
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
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
}

function Row({
  title,
  subtitle,
  image,
  imageName,
  reason,
  now,
  past,
  playing,
  label,
  onPress,
  onRemove,
}: RowProps) {
  return (
    <View
      className={cn(
        'flex-row items-center',
        now && 'bg-primary-muted',
        !now && 'web:hover:bg-surface-2'
      )}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
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
          onPress={onRemove}
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

/**
 * 재생 대기열. 위에서부터 들은 곡 → 지금 재생 → 다음에 재생 → 이어서 재생 → 자동 재생.
 * 줄을 누르면 그 곡부터 틀고, 그 사이 곡은 건너뛴다
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
  const shuffle = useComparePlayer((state) => state.shuffle);
  const repeat = useComparePlayer((state) => state.repeat);
  const [showHistory, setShowHistory] = React.useState(false);
  const itemRow = useItemRow();
  const remaining = playlist ? playlist.items.slice(playlist.index + 1) : [];
  const sourceName = playlist?.name ?? t('재생 목록');

  return (
    <View className="flex-1 bg-surface-1">
      <View className="gap-2.5 border-b border-border px-4 pb-3 pt-3.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body font-bold text-foreground">{t('재생 대기열')}</Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => comparePlayer.clearQueue()}
              accessibilityRole="button"
              accessibilityLabel={t('대기열 비우기')}
              className="rounded-full px-2 py-1 web:hover:bg-surface-2">
              <Text className="text-label font-semibold text-primary">{t('비우기')}</Text>
            </Pressable>
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('대기열 닫기')}
                className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
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
            accessibilityState={{ expanded: showHistory }}
            className="flex-row items-center gap-1.5 px-4 pb-1 pt-2.5">
            <Icon
              as={showHistory ? ChevronDownIcon : ChevronRightIcon}
              size={14}
              className="text-foreground-muted"
            />
            <Text className="text-label font-semibold text-foreground-muted">
              {t('들은 곡 {count}', { count: history.length })}
            </Text>
          </Pressable>
        ) : null}
        {showHistory
          ? history.map((entry: QueueEntry, index) => (
              <Row
                key={`h-${index}-${entry.track.performanceId}`}
                {...trackRow(entry.track, { past: true })}
                onPress={() => comparePlayer.playFromQueue('history', index)}
              />
            ))
          : null}

        <SectionTitle title={t('지금 재생')} />
        {current ? (
          <Row {...trackRow(current, { now: true, playing })} />
        ) : (
          <Note>{t('재생 중인 곡이 없어요.')}</Note>
        )}

        {forward.length ? (
          <>
            <SectionTitle title={t('다음에 재생')} />
            {forward.map((entry, index) => (
              <Row
                key={`f-${index}-${entry.track.performanceId}`}
                {...trackRow(entry.track, {})}
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
                key={`s-${index}-${item.pieceId}-${item.sectorId ?? 0}`}
                {...row}
                reason={undefined}
                label={`${row.title} ${row.subtitle}`}
                onPress={() => comparePlayer.playFromQueue('source', index)}
                onRemove={() => comparePlayer.removeFromQueue('source', index)}
              />
            );
          })
        ) : (
          <Note>
            {repeat === 'all' && playlist?.items.length
              ? t('반복(전체): 끝나면 목록 처음으로 돌아가요.')
              : t('목록 끝이에요.')}
          </Note>
        )}

        <SectionTitle title={t('자동 재생 · 취향에 맞춘 곡')} />
        {!autoplay ? (
          <Note>{t('자동 재생이 꺼져 있어요. 목록이 끝나면 멈춰요.')}</Note>
        ) : repeat === 'all' && playlist?.items.length ? (
          <Note>{t('반복(전체)이 켜져 있어 자동 재생은 쉬어요.')}</Note>
        ) : autoplayItems.length ? (
          autoplayItems.map((item, index) => {
            const row = itemRow(item);
            return (
              <Row
                key={`a-${index}-${item.pieceId}`}
                {...row}
                label={`${row.title} ${row.subtitle} ${row.reason ?? ''}`.trim()}
                onPress={() => comparePlayer.playFromQueue('autoplay', index)}
              />
            );
          })
        ) : (
          <Note>
            {current ? t('비슷한 곡을 고르는 중이에요.') : t('곡을 틀면 비슷한 곡이 이어져요.')}
          </Note>
        )}
      </ScrollView>
    </View>
  );
}
