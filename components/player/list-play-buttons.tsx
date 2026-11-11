import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import type { PlaylistItem } from '@/lib/player/compare-player-store';
import { playList } from '@/lib/player/play-piece';
import type { ListPiece } from '@/lib/player/playlist';
import { cn } from '@/lib/utils';
import { PlayIcon, ShuffleIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * 목록 화면 머리의 「처음부터 듣기 · 셔플로 듣기」. 이 목록이 대기열의 「이어서 재생」이 되고,
 * 목록이 끝나면 자동 재생이 취향에 맞춘 곡을 이어 튼다
 */
export function ListPlayButtons({
  items,
  name,
  className,
}: {
  items: readonly ListPiece[] | readonly PlaylistItem[];
  name: string;
  className?: string;
}) {
  useLocale();
  const [busy, setBusy] = React.useState<'play' | 'shuffle' | null>(null);
  if (items.length === 0) return null;
  const start = (shuffle: boolean) => {
    if (busy) return;
    setBusy(shuffle ? 'shuffle' : 'play');
    void playList(items, { shuffle, name }).finally(() => setBusy(null));
  };
  return (
    <View className={cn('flex-row flex-wrap items-center gap-2', className)}>
      <Pressable
        onPress={() => start(false)}
        accessibilityRole="button"
        accessibilityLabel={t('{name} 처음부터 듣기', { name })}
        className={cn(
          'h-9 flex-row items-center gap-1.5 rounded-full bg-primary px-4 web:hover:opacity-90',
          busy === 'play' && 'opacity-60'
        )}>
        <Icon as={PlayIcon} size={14} className="fill-primary-foreground text-primary-foreground" />
        <Text className="text-label font-semibold text-primary-foreground">
          {t('처음부터 듣기')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => start(true)}
        accessibilityRole="button"
        accessibilityLabel={t('{name} 셔플로 듣기', { name })}
        className={cn(
          'h-9 flex-row items-center gap-1.5 rounded-full border border-border-strong px-4 web:hover:bg-surface-2',
          busy === 'shuffle' && 'opacity-60'
        )}>
        <Icon as={ShuffleIcon} size={14} className="text-foreground" />
        <Text className="text-label font-semibold text-foreground">{t('셔플로 듣기')}</Text>
      </Pressable>
    </View>
  );
}
