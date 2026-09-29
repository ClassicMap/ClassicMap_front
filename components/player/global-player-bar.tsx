import { MiniVideoTarget } from '@/components/player/mini-video-target';
import { compareHrefFor, useSettled } from '@/components/player/player-bar-helpers';
import { VolumeControl } from '@/components/player/volume-control';
import { ScrubBar } from '@/components/shell/compare/scrub-bar';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * 데스크톱 셸 하단 플레이바. 비교 화면 밖에서 듣고 있을 때만 뜬다 (비교 화면 안에서는 그 화면의 재생 바가 맡는다).
 * 연주자·제목을 누르면 그 비교 화면으로 돌아가 같은 자리에서 이어진다.
 */
export function GlobalPlayerBar() {
  const router = useRouter();
  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const restored = useComparePlayer((state) => state.restored);
  const surface = useComparePlayer((state) => state.surface);
  const focus = useComparePlayer((state) => state.focus);
  const queueSize = useComparePlayer((state) => state.queue.length);
  const progress = useComparePlayer((state) => state.progress);
  const [scrub, setScrub] = React.useState<number | null>(null);
  const visible = useSettled(Boolean(current) && surface !== 'slot' && !focus);

  if (!current || !visible) return null;
  const duration = progress.duration || current.durationSec;
  const shownSeconds = scrub !== null ? scrub * duration : progress.current;
  const goToCompare = () => router.navigate(compareHrefFor(current));

  return (
    <View className="h-[76px] flex-row items-center gap-4 border-t border-border bg-surface-1 px-4">
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <Pressable onPress={goToCompare} accessibilityRole="link" accessibilityLabel={`${current.artistName} 비교 화면으로`}>
          <MiniVideoTarget width={96} height={54} />
        </Pressable>
        <Pressable onPress={goToCompare} accessibilityRole="link" className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <EntityThumb name={current.artistName} image={current.artistImageUrl} shape="circle" size={32} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground web:hover:underline">
              {current.artistName}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {restored ? `이어 듣기 · ${current.sectorName} · ${current.pieceTitle}` : `${current.sectorName} · ${current.pieceTitle}`}
            </Text>
          </View>
        </Pressable>
      </View>
      <View className="flex-[1.3] items-center gap-1.5">
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityLabel="이전 연주자"
            disabled={queueSize < 2}
            onPress={() => comparePlayer.step(-1)}
            className={cn('size-8 items-center justify-center rounded-full', queueSize < 2 && 'opacity-40')}>
            <Icon as={SkipBackIcon} size={16} className="fill-foreground-muted text-foreground-muted" />
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? '일시정지' : restored ? '이어 듣기' : '재생'}
            onPress={() => comparePlayer.togglePlay()}
            className="size-9 items-center justify-center rounded-full bg-foreground">
            <Icon as={playing ? PauseIcon : PlayIcon} size={16} className="fill-background text-background" />
          </Pressable>
          <Pressable
            accessibilityLabel="다음 연주자"
            disabled={queueSize < 2}
            onPress={() => comparePlayer.step(1)}
            className={cn('size-8 items-center justify-center rounded-full', queueSize < 2 && 'opacity-40')}>
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
            label="재생 위치"
            valueText={(value) => `${clipClock(value * duration * 1000)} / ${clipClock(duration * 1000)}`}
            step={duration > 0 ? 5 / duration : 0.05}
            disabled={duration <= 0}
            tooltip
          />
          <Text variant="mono" className="w-10 text-foreground-muted">
            {clipClock(duration * 1000)}
          </Text>
        </View>
      </View>
      <View className="flex-1 flex-row items-center justify-end gap-2.5">
        <VolumeControl />
        <Pressable
          onPress={() => comparePlayer.close()}
          accessibilityLabel="플레이어 닫기"
          className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
          <Icon as={XIcon} size={16} className="text-foreground-muted" />
        </Pressable>
      </View>
    </View>
  );
}
