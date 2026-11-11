import { ScrubBar } from '@/components/shell/compare/scrub-bar';
import { Icon } from '@/components/ui/icon';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 음소거 버튼 + 볼륨 슬라이더 (웹). 값은 이 브라우저에 남는다. width 가 0이면 버튼만 둔다(좁은 재생 바) */
export function VolumeControl({ width = 76 }: { width?: number }) {
  useLocale();
  const volume = useComparePlayer((state) => state.volume);
  const muted = useComparePlayer((state) => state.muted);
  const level = muted ? 0 : volume;
  return (
    <View className="flex-row items-center gap-1.5">
      <Pressable
        onPress={() => comparePlayer.toggleMute()}
        accessibilityLabel={muted ? t('소리 켜기 (M)') : t('음소거 (M)')}
        className="size-8 items-center justify-center rounded-full web:hover:bg-surface-2">
        <Icon
          as={level === 0 ? VolumeXIcon : level < 0.5 ? Volume1Icon : Volume2Icon}
          size={17}
          className="text-foreground-muted"
        />
      </Pressable>
      {width > 0 ? (
        <View className="flex-row" style={{ width }}>
          <ScrubBar
            value={level}
            onScrub={(value) => comparePlayer.setVolume(value)}
            onCommit={(value) => comparePlayer.setVolume(value)}
            label={t('볼륨')}
            valueText={(value) => `${Math.round(value * 100)}%`}
            step={0.1}
            fill="hsl(var(--foreground-muted))"
          />
        </View>
      ) : null}
    </View>
  );
}
