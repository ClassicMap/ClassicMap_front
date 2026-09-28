import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useArtistComparisonPerformances,
  useComparisonPiece,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface PieceGroup {
  pieceId: number;
  composerId: number;
  pieceTitle: string;
  composerName: string;
  supporting: string;
  items: ComparisonPerformance[];
}

function groupByPiece(items: ComparisonPerformance[], artistId: number): PieceGroup[] {
  const groups = new Map<number, PieceGroup>();
  for (const item of items) {
    const existing = groups.get(item.pieceId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const supporting = item.credits
      .filter((credit) => credit.artistId !== artistId && (credit.role === 'conductor' || credit.role === 'orchestra'))
      .map((credit) => (credit.role === 'conductor' ? `${credit.artistName} 지휘` : credit.artistName))
      .join(' · ');
    groups.set(item.pieceId, {
      pieceId: item.pieceId,
      composerId: item.composerId,
      pieceTitle: item.pieceTitle,
      composerName: item.composerName,
      supporting,
      items: [item],
    });
  }
  for (const group of groups.values()) {
    group.items.sort((a, b) => a.startMs - b.startMs);
  }
  // 구간이 많은 곡을 먼저 둔다
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
}

/**
 * "이 아티스트의 연주 비교" (계약 문서 아티스트 상세, 2차 시안).
 * 곡별로 묶고, 각 구간에 함께 비교되는 연주자를 보여 준다.
 */
export function ArtistComparisons({ artistId, wide }: { artistId: number; wide: boolean }) {
  const query = useArtistComparisonPerformances(artistId);
  const items = React.useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const groups = React.useMemo(() => groupByPiece(items, artistId), [items, artistId]);
  const sectorCount = items.length;

  if (query.isLoading) return <SkeletonList rows={4} avatar="none" />;
  if (query.isError) {
    return (
      <EmptyState
        compact
        icon={AlertCircleIcon}
        tone="error"
        title="연주 비교를 불러오지 못했어요"
        description="잠시 뒤 다시 시도해 주세요."
        action={{ label: '다시 시도', onPress: () => query.refetch() }}
      />
    );
  }
  if (items.length === 0) {
    return (
      <Text variant="bodySm" className="text-foreground-muted">
        아직 이 연주자의 비교 구간이 없어요.
      </Text>
    );
  }

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text variant="title3">연주 비교</Text>
        <Text variant="caption">{`${groups.length}곡 · 구간 ${sectorCount}개`}</Text>
      </View>
      {groups.map((group) => (
        <View key={group.pieceId} className="mt-3">
          <GroupHeader group={group} />
          {group.items.map((item) => (
            <SectorRow key={item.id} item={item} artistId={artistId} wide={wide} />
          ))}
        </View>
      ))}
      {query.hasNextPage ? (
        <Pressable onPress={() => query.fetchNextPage()} className="mt-3 self-start py-2">
          <Text variant="label" className="text-foreground-muted">
            {query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GroupHeader({ group }: { group: PieceGroup }) {
  // 비교 데이터에는 작곡가 초상이 없어 카탈로그에서 가져온다
  const piece = useComparisonPiece(group.pieceId, group.composerId).data;
  return (
    <View className="flex-row items-center gap-3 py-2">
      <EntityThumb name={group.composerName} image={piece?.composerAvatarUrl} shape="circle" size={36} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body font-bold text-foreground">
          {group.pieceTitle}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {[group.composerName, group.supporting || '독주'].join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function SectorRow({ item, artistId, wide }: { item: ComparisonPerformance; artistId: number; wide: boolean }) {
  const router = useRouter();
  const peers = useSectorComparisonPerformances(item.sectorId);
  const others = (peers.data ?? [])
    .filter((performance) => !performance.credits.some((credit) => credit.artistId === artistId && credit.isPrimary))
    .map((performance) => performance.credits.find((credit) => credit.isPrimary) ?? performance.credits[0])
    .filter((credit): credit is NonNullable<typeof credit> => Boolean(credit));
  const href = `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}&sectorId=${item.sectorId}` as Href;

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="link"
      accessibilityLabel={`${item.pieceTitle} ${item.sectorName} 비교하기`}
      className="-mx-3 min-h-14 flex-row items-center gap-4 rounded-md px-3 py-2 active:bg-surface-2 web:hover:bg-surface-2">
      <View className="min-w-0 flex-[1.4]">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {item.sectorName}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          원본 영상 <Text variant="mono" className="text-foreground-muted">{`${clock(item.startMs)}–${clock(item.endMs)}`}</Text>
        </Text>
      </View>
      {wide ? (
        <Text variant="caption" numberOfLines={1} className="min-w-0 flex-1">
          {others.length > 0 ? others.map((credit) => credit.artistName).join(' · ') : ' '}
        </Text>
      ) : null}
      <Text variant="mono" className={cn('text-foreground-muted', !wide && 'ml-auto')}>
        {clock(item.endMs - item.startMs)}
      </Text>
      <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" />
    </Pressable>
  );
}
