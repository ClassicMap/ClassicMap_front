import { Badge } from '@/components/ui/badge';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { OptimizedImage } from '@/components/optimized-image';
import { Scrim } from '@/components/ui/scrim';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  clipClock,
  clipDurationMs,
  primaryCredit,
  sortComparisonSectors,
  youtubeThumbnailUrl,
} from '@/lib/data/comparison';
import {
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, ComparisonPiece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const MAX_PERFORMERS = 4;

export interface TodayComparisonTarget {
  pieceId: number;
  composerId: number;
  sectorId: number;
}

interface TodayComparisonProps {
  piece: ComparisonPiece;
  wide: boolean;
  onOpen: (target: TodayComparisonTarget) => void;
}

interface PerformerLine {
  performance: ComparisonPerformance;
  name: string;
  image: string | null;
  durationMs: number;
}

/**
 * 홈 히어로: 같은 구간을 연주자별로 한 장에 보여 준다 (설계 문서 7.1).
 * 홈에서는 영상을 불러오지 않고 썸네일만 둔다. 누르면 비교 화면에서 바로 재생된다.
 */
export function TodayComparison({ piece, wide, onOpen }: TodayComparisonProps) {
  const sectorsQuery = usePieceComparisonSectors(piece.pieceId);
  const sector = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? [])[0], [sectorsQuery.data]);
  const performancesQuery = useSectorComparisonPerformances(sector?.id);
  const [selected, setSelected] = React.useState(0);

  const lines = React.useMemo<PerformerLine[]>(() => {
    const images = new Map(piece.performers.map((performer) => [performer.artistId, performer.imageUrl]));
    return (performancesQuery.data ?? [])
      .filter((performance) => performance.clipStatus === 'ready')
      .slice(0, MAX_PERFORMERS)
      .map((performance) => {
        const credit = primaryCredit(performance);
        return {
          performance,
          name: credit?.artistName ?? '연주자 정보 없음',
          image: credit ? images.get(credit.artistId) ?? null : null,
          durationMs: clipDurationMs(performance),
        };
      });
  }, [performancesQuery.data, piece.performers]);

  React.useEffect(() => setSelected(0), [sector?.id]);

  const loading = sectorsQuery.isLoading || performancesQuery.isLoading;
  // 구간을 못 불러와도 작품 단위로는 열 수 있게 둔다
  const open = () =>
    onOpen({ pieceId: piece.pieceId, composerId: piece.composerId, sectorId: sector?.id ?? 0 });

  if (loading) return <TodaySkeleton wide={wide} />;

  const current = lines[selected] ?? lines[0];
  const thumbnail = current ? youtubeThumbnailUrl(current.performance) : undefined;
  const longest = Math.max(1, ...lines.map((line) => line.durationMs));
  const title = sector ? `${piece.pieceTitle} · ${sector.sectorName}` : piece.pieceTitle;

  const media = (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title} 비교 듣기`}
      className="group aspect-video w-full overflow-hidden rounded-xl bg-surface-3">
      {thumbnail || piece.composerAvatarUrl ? (
        <OptimizedImage
          uri={thumbnail ?? piece.composerAvatarUrl}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
      <Scrim from="bottom" opacity={0.78} extent={55} />
      {/* 데스크톱은 옆 글에 같은 제목이 있다 */}
      {!wide ? (
        <View className="absolute left-3 top-3">
          <Badge tone="neutral" label="오늘의 비교" className="bg-black/60" />
        </View>
      ) : null}
      {/* 가운데 재생: 누르면 비교 화면에서 바로 재생된다 */}
      <View className="absolute inset-0 items-center justify-center">
        <View className="size-14 items-center justify-center rounded-full bg-black/45 web:transition-colors web:duration-fast web:group-hover:bg-primary">
          <Icon as={PlayIcon} size={24} className="ml-1 fill-white text-white" />
        </View>
      </View>
      {/* 연주자 토글: 고르면 썸네일과 길이가 바뀐다 */}
      <View className="absolute bottom-3 left-3 flex-row items-center gap-1.5">
        {lines.map((line, index) => (
          <Pressable
            key={line.performance.id}
            onPress={() => setSelected(index)}
            onHoverIn={() => setSelected(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: index === selected }}
            accessibilityLabel={`${line.name} 연주 미리 보기`}
            className={cn('rounded-full border-2', index === selected ? 'border-primary' : 'border-transparent')}>
            <EntityThumb name={line.name} image={line.image} shape="circle" size={wide ? 34 : 30} />
          </Pressable>
        ))}
        {current ? (
          <Text numberOfLines={1} className="ml-1.5 text-label font-semibold text-white">
            {current.name}
          </Text>
        ) : null}
      </View>
      {current ? (
        <Text className="absolute bottom-3.5 right-3 rounded-xs bg-black/60 px-1.5 py-0.5 font-mono text-caption text-white">
          {clipClock(current.durationMs)}
        </Text>
      ) : null}
    </Pressable>
  );

  if (!wide) {
    return (
      <View>
        {media}
        <Pressable onPress={open} accessibilityRole="link" className="mt-3">
          <Text numberOfLines={2} className="text-headline font-bold text-foreground">
            {title}
          </Text>
          <Text variant="caption" numberOfLines={1} className="mt-1">
            {lines.map((line) => `${line.name} ${clipClock(line.durationMs)}`).join(' · ') || piece.composerName}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row gap-7 rounded-2xl border border-border bg-surface-2/60 p-5">
      <View className="min-w-0 flex-[1.35]">{media}</View>
      <View className="min-w-0 flex-1 justify-between py-1">
        <View>
          <Text variant="micro" className="uppercase tracking-widest text-primary">
            오늘의 비교
          </Text>
          <Text numberOfLines={2} className="mt-2 text-title-2 font-bold text-foreground">
            {piece.pieceTitle}
          </Text>
          <Text variant="bodySm" numberOfLines={1} className="mt-1 text-foreground-muted">
            {[piece.composerName, sector?.sectorName].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* 연주자별 길이: 같은 구간인데 길이가 다르다는 게 이 제품의 이야기다 */}
        <View className="mt-5 gap-1">
          {lines.map((line, index) => (
            <Pressable
              key={line.performance.id}
              onPress={() => setSelected(index)}
              onHoverIn={() => setSelected(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: index === selected }}
              className={cn('flex-row items-center gap-3 rounded-md px-2 py-1.5', index === selected && 'bg-surface-3')}>
              <EntityThumb name={line.name} image={line.image} shape="circle" size={28} />
              <Text
                numberOfLines={1}
                className={cn(
                  'w-24 text-body-sm font-semibold',
                  index === selected ? 'text-primary' : 'text-foreground'
                )}>
                {line.name}
              </Text>
              <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <View
                  className={cn('h-full rounded-full', index === selected ? 'bg-primary' : 'bg-foreground-subtle')}
                  style={{ width: `${Math.max(6, (line.durationMs / longest) * 100)}%` }}
                />
              </View>
              <Text variant="mono" className="w-11 text-right text-foreground-muted">
                {clipClock(line.durationMs)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-5 flex-row items-center gap-3">
          <Pressable
            onPress={open}
            accessibilityRole="button"
            className="h-11 flex-row items-center gap-2 rounded-full bg-primary px-5 web:transition-opacity web:hover:opacity-90">
            <Icon as={PlayIcon} size={16} className="fill-primary-foreground text-primary-foreground" />
            <Text className="text-label font-bold text-primary-foreground">비교 듣기</Text>
          </Pressable>
          <Text variant="caption">{`연주자 ${piece.performerCount} · 구간 ${piece.sectorCount}`}</Text>
        </View>
      </View>
    </View>
  );
}

function TodaySkeleton({ wide }: { wide: boolean }) {
  if (!wide) {
    return (
      <View>
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="mt-3 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </View>
    );
  }
  return (
    <View className="flex-row gap-7 rounded-2xl border border-border p-5">
      <Skeleton className="aspect-video flex-[1.35] rounded-xl" />
      <View className="flex-1 gap-3 py-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <View className="mt-4 gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </View>
      </View>
    </View>
  );
}
