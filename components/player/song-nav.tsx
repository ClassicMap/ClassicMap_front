import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { relocalize, t, useLocale } from '@/lib/i18n';
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
    Boolean(
      state.current && state.playlist && state.playlist.index < state.playlist.items.length - 1
    )
  );
  const sections = useComparePlayer((state) => state.playlist?.kind === 'compare');
  return {
    hasNext,
    prevLabel: sections ? t('이전 구간') : t('이전 곡'),
    nextLabel: sections ? t('다음 구간') : t('다음 곡'),
  };
}

/** 연주자 묶음에 한 번에 보일 얼굴 수. 더 많으면 지금 연주자 둘레만 보이고 「2/8」을 붙인다 */
const MAX_FACES = 5;
const MAX_FACES_COMPACT = 3;

/** 지금 연주자가 가운데 오도록 보일 얼굴 범위를 고른다 */
function faceWindow(size: number, position: number, max: number): [number, number] {
  if (size <= max) return [0, size];
  const start = Math.max(0, Math.min(size - max, Math.max(0, position) - Math.floor(max / 2)));
  return [start, start + max];
}

/**
 * 같은 곡의 다른 연주로 넘기는 ‹ 얼굴들 › 묶음. 곡 넘기기(⏮ ⏭)와 나눠, 연주자는 여기서만 바꾼다.
 * 연주자 사진을 늘어놓고 지금 연주자에 테를 둘러, 누가 몇 명 있는지 한눈에 보고 사진을 눌러 바로 바꾼다
 */
export function PerformerStepper({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale } = useLocale();
  const queue = useComparePlayer((state) => state.queue);
  const currentId = useComparePlayer((state) => state.current?.performanceId ?? null);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const tracks = React.useMemo(() => queue.map((track) => relocalize(track)), [queue, locale]);
  const size = tracks.length;
  if (size < 2) return null;
  const position = tracks.findIndex((track) => track.performanceId === currentId);
  const label =
    position >= 0
      ? t('연주자 {n}/{total}', { n: position + 1, total: size })
      : t('연주자 {total}명', { total: size });
  const [from, to] = faceWindow(size, position, compact ? MAX_FACES_COMPACT : MAX_FACES);
  const faceSize = compact ? 22 : 24;
  const hoveredName = tracks.find((track) => track.performanceId === hovered)?.artistName;
  return (
    <View
      className={cn(
        'h-8 shrink-0 flex-row items-center rounded-full border border-border-strong',
        className
      )}
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
      <View className="flex-row items-center gap-0.5">
        {tracks.slice(from, to).map((track) => {
          const selected = track.performanceId === currentId;
          return (
            <Pressable
              key={track.performanceId}
              onPress={() => comparePlayer.choosePerformer(track.performanceId)}
              onHoverIn={() => setHovered(track.performanceId)}
              onHoverOut={() =>
                setHovered((value) => (value === track.performanceId ? null : value))
              }
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={
                selected
                  ? t('지금 연주자 {name}', { name: track.artistName })
                  : t('{name} 연주로 바꾸기', { name: track.artistName })
              }
              className={cn(
                'rounded-full border-2 web:transition-opacity web:duration-fast',
                selected ? 'border-primary' : 'border-transparent opacity-55 web:hover:opacity-100'
              )}>
              <EntityThumb
                name={track.artistName}
                image={track.artistImageUrl}
                shape="circle"
                size={faceSize}
              />
            </Pressable>
          );
        })}
      </View>
      {to - from < size && position >= 0 ? (
        <Text variant="mono" className="pl-1 text-caption text-foreground-muted">
          {`${position + 1}/${size}`}
        </Text>
      ) : null}
      <Pressable
        onPress={() => comparePlayer.stepPerformer(1)}
        accessibilityRole="button"
        accessibilityLabel={t('다음 연주자')}
        hitSlop={4}
        className="h-full w-7 items-center justify-center rounded-r-full web:hover:bg-surface-2">
        <Icon as={ChevronRightIcon} size={15} className="text-foreground" />
      </Pressable>
      {/* 사진에 마우스를 올리면 그 연주자 이름을 묶음 위에 띄운다 */}
      {hoveredName ? (
        <View
          className="absolute bottom-full left-[-64px] right-[-64px] mb-2 items-center"
          style={{ pointerEvents: 'none' }}>
          <View className="rounded-md bg-foreground px-2 py-1">
            <Text numberOfLines={1} className="text-caption font-semibold text-background">
              {hoveredName}
            </Text>
          </View>
        </View>
      ) : null}
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
    if (!enabled || navigation.pieceId !== pieceId || navigation.sectorId === activeSectorId)
      return;
    onSelectSector(navigation.sectorId);
  }, [navigation, pieceId, activeSectorId, onSelectSector, enabled]);
}
