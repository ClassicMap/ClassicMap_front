import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * 재생 바의 이전·다음 곡. 어느 화면의 재생 바든 같은 뜻이다(재생 목록을 따라 곡을 넘긴다).
 * 비교 화면에서 튼 곡은 그 작품의 구간들이 목록이라 이름만 「구간」으로 부른다
 */
export function useSongNav() {
  useLocale();
  const hasNext = useComparePlayer((state) =>
    Boolean(state.current && state.playlist && state.playlist.index < state.playlist.items.length - 1)
  );
  const sections = useComparePlayer((state) => state.playlist?.kind === 'compare');
  return {
    hasNext,
    prevLabel: sections ? t('이전 구간') : t('이전 곡'),
    nextLabel: sections ? t('다음 구간') : t('다음 곡'),
  };
}

/**
 * 같은 곡의 다른 연주로 넘기는 ‹ 연주자 2/3 › 묶음. 곡 넘기기(⏮ ⏭)와 나눠, 연주자는 여기서만 바꾼다
 */
export function PerformerStepper({ compact = false, className }: { compact?: boolean; className?: string }) {
  useLocale();
  const size = useComparePlayer((state) => state.queue.length);
  const position = useComparePlayer((state) => {
    const id = state.current?.performanceId;
    return id === undefined ? -1 : state.queue.findIndex((track) => track.performanceId === id);
  });
  if (size < 2) return null;
  const label = position >= 0 ? t('연주자 {n}/{total}', { n: position + 1, total: size }) : t('연주자 {total}명', { total: size });
  return (
    <View
      className={cn('h-8 shrink-0 flex-row items-center rounded-full border border-border-strong', className)}
      accessibilityRole="toolbar"
      accessibilityLabel={label}>
      <Pressable
        onPress={() => comparePlayer.stepPerformer(-1)}
        accessibilityRole="button"
        accessibilityLabel={t('이전 연주자')}
        hitSlop={4}
        className="h-full w-7 items-center justify-center rounded-l-full web:hover:bg-surface-2">
        <Icon as={ChevronLeftIcon} size={15} className="text-foreground" />
      </Pressable>
      {compact ? null : (
        <Text numberOfLines={1} className="px-0.5 text-label text-foreground">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => comparePlayer.stepPerformer(1)}
        accessibilityRole="button"
        accessibilityLabel={t('다음 연주자')}
        hitSlop={4}
        className="h-full w-7 items-center justify-center rounded-r-full web:hover:bg-surface-2">
        <Icon as={ChevronRightIcon} size={15} className="text-foreground" />
      </Pressable>
    </View>
  );
}

/**
 * 재생 바의 이전·다음 곡으로 이 작품의 다른 구간이 재생되면 비교 화면도 그 구간으로 따라간다.
 * 구간 칩을 눌러 다른 구간을 보는 건 그대로 둔다(재생은 바뀌지 않으니 따라가지 않는다)
 */
export function useFollowSongNav(
  pieceId: number,
  activeSectorId: number | undefined,
  onSelectSector: (sectorId: number) => void,
  enabled: boolean
) {
  const navigation = useComparePlayer((state) => state.navigation);
  const seen = React.useRef(navigation.seq);
  React.useEffect(() => {
    if (navigation.seq === seen.current) return;
    seen.current = navigation.seq;
    if (!enabled || navigation.pieceId !== pieceId || navigation.sectorId === activeSectorId) return;
    onSelectSector(navigation.sectorId);
  }, [navigation, pieceId, activeSectorId, onSelectSector, enabled]);
}
