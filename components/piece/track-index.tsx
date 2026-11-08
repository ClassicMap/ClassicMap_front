import { Equalizer } from '@/components/ui/equalizer';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import { PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

/**
 * 목록 줄 앞 번호 칸 (스포티파이 곡 목록). 평소엔 번호, 줄에 호버하면 재생 아이콘, 지금 듣는 작품이면
 * 이퀄라이저. 누르면 그 자리에서 재생하고, 이미 듣는 작품이면 재생·일시정지를 바꾼다.
 * 줄(부모 Pressable)에 group 클래스가 있어야 호버 아이콘이 뜬다.
 */
export function TrackIndex({ index, pieceId, onPlay }: { index: number; pieceId: number; onPlay: () => void }) {
  useLocale();
  const isCurrent = useComparePlayer((state) => state.current?.pieceId === pieceId);
  const playing = useComparePlayer((state) => state.playing && state.current?.pieceId === pieceId);
  return (
    <Pressable
      onPress={isCurrent ? () => comparePlayer.togglePlay() : onPlay}
      accessibilityRole="button"
      accessibilityLabel={playing ? t('일시정지') : t('바로 듣기')}
      hitSlop={6}
      className="w-6 items-center justify-center">
      {playing ? (
        <Equalizer playing size={12} />
      ) : (
        <>
          <Text
            variant="mono"
            className={cn(
              'text-center',
              Platform.OS === 'web' && 'web:group-hover:hidden',
              isCurrent ? 'text-primary' : 'text-foreground-subtle'
            )}>
            {index}
          </Text>
          {Platform.OS === 'web' ? (
            <View className="hidden web:group-hover:flex">
              <Icon as={PlayIcon} size={14} className="fill-foreground text-foreground" />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
