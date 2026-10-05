import { ScrollShelf } from '@/components/home/shelf';
import { episodeText, SCREEN_KIND_LABELS } from '@/components/screen/labels';
import { ScreenPoster } from '@/components/screen/screen-poster';
import { Text } from '@/components/ui/text';
import { usePieceScreenCues, usePrefetchScreenTitle } from '@/lib/query/hooks/useScreen';
import type { PieceScreenCue } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const CARD_WIDTH = 96;

/** 같은 작품이 여러 큐로 나와도 띠에는 작품 하나로 모은다. 지금 구간과 같은 대목이면 앞에 둔다 */
function groupByTitle(cues: PieceScreenCue[], activeSectorId: number | undefined) {
  const titles = new Map<number, { cue: PieceScreenCue; sameSector: boolean }>();
  for (const cue of cues) {
    const sameSector = activeSectorId !== undefined && cue.sectorId === activeSectorId;
    const existing = titles.get(cue.titleId);
    if (!existing || (sameSector && !existing.sameSector)) titles.set(cue.titleId, { cue, sameSector });
  }
  return [...titles.values()].sort((a, b) => Number(b.sameSector) - Number(a.sameSector));
}

/** 비교 화면 아래 '이 곡이 나온 작품'. 나온 작품이 없으면 그리지 않는다 */
export function PieceScreenStrip({
  pieceId,
  activeSectorId,
  className,
}: {
  pieceId: number;
  activeSectorId?: number;
  className?: string;
}) {
  const router = useRouter();
  const prefetch = usePrefetchScreenTitle();
  const { data } = usePieceScreenCues(pieceId);
  const items = React.useMemo(() => groupByTitle(data ?? [], activeSectorId), [data, activeSectorId]);
  if (items.length === 0) return null;

  return (
    <View className={cn('gap-2.5', className)}>
      <View className="flex-row items-baseline justify-between">
        <Text variant="headline">이 곡이 나온 작품</Text>
        <Pressable onPress={() => router.push('/films' as Href)} accessibilityRole="link" hitSlop={8}>
          <Text variant="caption">영화 속 클래식</Text>
        </Pressable>
      </View>
      <ScrollShelf gap={12}>
        {items.map(({ cue, sameSector }) => (
          <Pressable
            key={cue.titleId}
            onHoverIn={() => prefetch(cue.titleId)}
            onPressIn={() => prefetch(cue.titleId)}
            onPress={() => router.push(`/film/${cue.titleId}` as Href)}
            accessibilityRole="link"
            accessibilityLabel={`${cue.titleKo}, ${SCREEN_KIND_LABELS[cue.kind]}`}
            style={{ width: CARD_WIDTH }}
            className="gap-1.5">
            <ScreenPoster
              title={cue.titleKo}
              posterPath={cue.posterPath}
              posterUrl={cue.posterUrl}
              coverVideoId={cue.coverVideoId}
              coverThumbs={cue.coverThumbs}
              width={CARD_WIDTH}
            />
            <Text numberOfLines={1} className="text-label font-semibold text-foreground">
              {cue.titleKo}
            </Text>
            <Text variant="micro" numberOfLines={1}>
              {sameSector
                ? '이 구간이 나와요'
                : [cue.releaseYear, cue.partLabel ?? episodeText(cue.episodeLabel)].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        ))}
      </ScrollShelf>
      {items.some(({ cue }) => cue.posterUrl) ? <Text variant="micro">포스터: 한국영상자료원 KMDb</Text> : null}
    </View>
  );
}
