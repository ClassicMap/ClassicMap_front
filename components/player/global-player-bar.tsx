import { MiniVideoTarget } from '@/components/player/mini-video-target';
import { compareHrefFor, useSettled } from '@/components/player/player-bar-helpers';
import { QueueButton, RepeatButton, ShuffleButton } from '@/components/player/queue-panel';
import { PerformerStepper, useSongNav } from '@/components/player/song-nav';
import { VolumeControl } from '@/components/player/volume-control';
import { ScrubBar } from '@/components/shell/compare/scrub-bar';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Equalizer } from '@/components/ui/equalizer';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import { relocalize, t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * 바 너비에 따라 접는 단계. 가운데 재생 조작은 폭을 고정하고, 오른쪽(연주자·같은 지점·소리·대기열)은 내용만큼,
 * 왼쪽(지금 곡)이 남는 폭을 쓴다. 좁아질수록 연주자 사진 수 → 「같은 지점」 글자 → 셔플·반복 → 소리 막대 → 영상 순서로 접는다
 */
type BarLevel = 'full' | 'medium' | 'narrow' | 'tiny';

function barLevel(width: number): BarLevel {
  if (width === 0 || width >= 1180) return 'full';
  if (width >= 1000) return 'medium';
  if (width >= 760) return 'narrow';
  return 'tiny';
}

const VIDEO_SIZE: Record<BarLevel, { width: number; height: number } | null> = {
  full: { width: 96, height: 54 },
  medium: { width: 80, height: 45 },
  narrow: { width: 64, height: 36 },
  tiny: null,
};

/**
 * 데스크톱 셸 하단 플레이바. 비교 화면 밖에서 듣고 있을 때만 뜬다 (비교 화면 안에서는 그 화면의 재생 바가 맡는다).
 * 연주자·제목을 누르면 그 비교 화면으로 돌아가 같은 자리에서 이어진다.
 * ⏮ ⏭는 재생 목록을 따라 곡을 넘기고, 연주자는 오른쪽 ‹ 연주자 n/m ›로 바꾼다.
 */
export function GlobalPlayerBar() {
  const { locale } = useLocale();
  const router = useRouter();
  const stored = useComparePlayer((state) => state.current);
  // 저장해 둔 곡 이름을 지금 언어로(언어를 바꿔도 재생 중인 곡이 그대로 보이게)
  const current = React.useMemo(() => (stored ? relocalize(stored) : stored), [stored, locale]);
  const playing = useComparePlayer((state) => state.playing);
  const restored = useComparePlayer((state) => state.restored);
  const surface = useComparePlayer((state) => state.surface);
  const focus = useComparePlayer((state) => state.focus);
  const nav = useSongNav();
  const progress = useComparePlayer((state) => state.progress);
  const [scrub, setScrub] = React.useState<number | null>(null);
  // 바가 좁으면(창이 좁거나 대기열 패널을 열면) 차례로 접는다
  const [barWidth, setBarWidth] = React.useState(0);
  const level = barLevel(barWidth);
  const roomy = level === 'full' || level === 'medium';
  const video = VIDEO_SIZE[level];
  const visible = useSettled(Boolean(current) && surface !== 'slot' && !focus);

  if (!current || !visible) return null;
  const duration = progress.duration || current.durationSec;
  const shownSeconds = scrub !== null ? scrub * duration : progress.current;
  const goToCompare = () => router.navigate(compareHrefFor(current));

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      className="cm-rise h-[76px] flex-row items-center gap-4 border-t border-border bg-surface-1 px-4">
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        {video ? (
          <Pressable
            onPress={goToCompare}
            accessibilityRole="link"
            accessibilityLabel={t('{name} 비교 화면으로', { name: current.artistName })}>
            <MiniVideoTarget width={video.width} height={video.height} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={goToCompare}
          accessibilityRole="link"
          className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <EntityThumb
            name={current.artistName}
            image={current.artistImageUrl}
            shape="circle"
            size={32}
          />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Equalizer playing={playing} size={11} />
              <Text
                numberOfLines={1}
                className="shrink text-body-sm font-semibold text-foreground web:hover:underline">
                {current.artistName}
              </Text>
            </View>
            <Text variant="caption" numberOfLines={1}>
              {restored
                ? t('이어 듣기 · {sector} · {title}', {
                    sector: current.sectorName,
                    title: current.pieceTitle,
                  })
                : `${current.sectorName} · ${current.pieceTitle}`}
            </Text>
          </View>
        </Pressable>
      </View>
      <View
        className={cn(
          'shrink-0 items-center gap-1.5',
          roomy ? 'w-[360px]' : level === 'narrow' ? 'w-[300px]' : 'w-[240px]'
        )}>
        <View className="flex-row items-center gap-4">
          {/* 좁으면 셔플·반복은 대기열 패널 위에만 둔다 */}
          {roomy ? <ShuffleButton /> : null}
          {/* 3초 넘게 들었으면 처음으로, 그 안이면 들은 순서의 이전 곡으로 */}
          <Pressable
            accessibilityLabel={nav.prevLabel}
            onPress={() => comparePlayer.previous()}
            className="size-8 items-center justify-center rounded-full">
            <Icon
              as={SkipBackIcon}
              size={16}
              className="fill-foreground-muted text-foreground-muted"
            />
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? t('일시정지') : restored ? t('이어 듣기') : t('재생')}
            onPress={() => comparePlayer.togglePlay()}
            className="size-9 items-center justify-center rounded-full bg-foreground web:transition-transform web:duration-fast web:hover:scale-105 web:active:scale-95">
            <Icon
              as={playing ? PauseIcon : PlayIcon}
              size={16}
              className="fill-background text-background"
            />
          </Pressable>
          <Pressable
            accessibilityLabel={nav.nextLabel}
            disabled={!nav.hasNext}
            onPress={() => comparePlayer.next()}
            className={cn(
              'size-8 items-center justify-center rounded-full',
              !nav.hasNext && 'opacity-40'
            )}>
            <Icon
              as={SkipForwardIcon}
              size={16}
              className="fill-foreground-muted text-foreground-muted"
            />
          </Pressable>
          {roomy ? <RepeatButton /> : null}
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
            valueText={(value) =>
              `${clipClock(value * duration * 1000)} / ${clipClock(duration * 1000)}`
            }
            step={duration > 0 ? 5 / duration : 0.05}
            disabled={duration <= 0}
            tooltip
          />
          <Text variant="mono" className="w-10 text-foreground-muted">
            {clipClock(duration * 1000)}
          </Text>
        </View>
      </View>
      <View className="shrink-0 flex-row items-center justify-end gap-2.5">
        {level === 'tiny' ? null : (
          <PerformerStepper
            compact={level !== 'full'}
            maxFaces={level === 'full' ? 5 : level === 'medium' ? 3 : 0}
          />
        )}
        <VolumeControl width={roomy ? 76 : 0} />
        <QueueButton />
        <Pressable
          onPress={() => comparePlayer.close()}
          accessibilityLabel={t('플레이어 닫기')}
          className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
          <Icon as={XIcon} size={16} className="text-foreground-muted" />
        </Pressable>
      </View>
    </View>
  );
}
