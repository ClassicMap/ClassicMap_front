import { FavoriteButton } from '@/components/favorite-button';
import { PieceCard } from '@/components/home/cards';
import { Grid, ScrollShelf } from '@/components/home/shelf';
import { SectionStaff } from '@/components/compare/section-staff';
import { PerformanceVideoPlayer } from '@/components/performance-video-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/ui/icons';
import { OptimizedImage } from '@/components/optimized-image';
import { Scrim } from '@/components/ui/scrim';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecordRecentPiece } from '@/hooks/use-recent-pieces';
import {
  clipClock,
  clipDurationMs,
  primaryCredit,
  sortComparisonSectors,
  supportingCredits,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/data/comparison';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useComparisonPiece,
  useComparisonPieces,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, ComparisonPiece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon, PlayIcon, SettingsIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabHeaderInset, useTabScrollInsets } from '@/components/navigation/tab-chrome';

/** 모바일 비교 첫 화면: 비교할 수 있는 작품만 2열로 */
export function CompareMobileCatalog({ onOpen }: { onOpen: (piece: ComparisonPiece) => void }) {
  const scrollInsets = useTabScrollInsets();
  const catalog = useComparisonPieces();
  const pieces = React.useMemo(() => catalog.data?.pages.flat() ?? [], [catalog.data]);

  return (
    <ScrollView
      {...scrollInsets}
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-24 pt-2"
      refreshControl={<RefreshControl refreshing={catalog.isRefetching} onRefresh={() => catalog.refetch()} />}>
      <Text variant="title1">비교</Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        같은 구간을 연주자별로 들어 봐요. 연주자가 많은 작품부터 보여요.
      </Text>
      {catalog.isLoading ? (
        <View className="mt-6 flex-row gap-3">
          <Skeleton className="aspect-square flex-1 rounded-lg" />
          <Skeleton className="aspect-square flex-1 rounded-lg" />
        </View>
      ) : catalog.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="비교할 수 있는 작품을 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => catalog.refetch() }}
        />
      ) : pieces.length === 0 ? (
        <EmptyState
          icon={CompareIcon}
          title="아직 비교할 수 있는 작품이 없어요"
          description="연주자 세 명 이상의 영상이 모이면 여기에 나와요."
        />
      ) : (
        <View className="mt-6">
          <Grid
            items={pieces}
            columns={2}
            gap={14}
            keyOf={(piece) => piece.pieceId}
            renderItem={(piece, width) => <PieceCard piece={piece} width={width} onPress={() => onOpen(piece)} />}
          />
          {catalog.hasNextPage ? (
            <Button
              variant="outline"
              className="mt-6 self-center rounded-full"
              disabled={catalog.isFetchingNextPage}
              onPress={() => catalog.fetchNextPage()}>
              <Text>{catalog.isFetchingNextPage ? '불러오는 중…' : '더 보기'}</Text>
            </Button>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

interface CompareMobilePieceProps {
  pieceId: number;
  composerId?: number;
  sectorId?: number;
  onBack: () => void;
  onSelectSector: (sectorId: number) => void;
}

/**
 * 모바일 작품 비교 (1차 시안 모바일 비교): 구간 칩 → 영상 한 개 → 연주자 목록.
 * 영상은 고른 연주 하나만 불러온다. 웹은 잘라 둔 클립, 네이티브는 YouTube 원본의 그 구간.
 */
export function CompareMobilePiece({ pieceId, composerId, sectorId, onBack, onSelectSector }: CompareMobilePieceProps) {
  const router = useRouter();
  const headerInset = useTabHeaderInset();
  const scrollInsets = useTabScrollInsets();
  const { canEdit } = useAuth();
  const sectorsQuery = usePieceComparisonSectors(pieceId);
  const sectors = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? []), [sectorsQuery.data]);
  const activeSector = sectors.find((sector) => sector.id === sectorId) ?? sectors[0];
  const performancesQuery = useSectorComparisonPerformances(activeSector?.id);
  const performances = React.useMemo(() => performancesQuery.data ?? [], [performancesQuery.data]);
  const first = performances[0];
  const pieceInfo = useComparisonPiece(pieceId, composerId ?? first?.composerId).data;
  const images = React.useMemo(
    () => new Map((pieceInfo?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl])),
    [pieceInfo?.performers]
  );
  const [activeId, setActiveId] = React.useState<number | null>(null);

  React.useEffect(() => setActiveId(null), [activeSector?.id]);

  const recordRecent = useRecordRecentPiece();
  React.useEffect(() => {
    if (!first || !activeSector) return;
    void recordRecent({
      pieceId,
      pieceTitle: first.pieceTitle,
      composerId: first.composerId,
      composerName: first.composerName,
      composerAvatarUrl: pieceInfo?.composerAvatarUrl ?? null,
      sectorId: activeSector.id,
      sectorName: activeSector.sectorName,
    });
  }, [pieceId, first, activeSector, pieceInfo?.composerAvatarUrl, recordRecent]);

  const active = performances.find((performance) => performance.id === activeId);
  const preview = active ?? performances.find((performance) => performance.clipStatus === 'ready');
  const longest = Math.max(1, ...performances.map(clipDurationMs));
  const title = first?.pieceTitle ?? pieceInfo?.pieceTitle;

  if (sectorsQuery.isError || performancesQuery.isError) {
    return (
      <View className="flex-1 bg-background px-4" style={{ paddingTop: headerInset }}>
        <BackButton onPress={onBack} />
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="비교를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{
            label: '다시 시도',
            onPress: () => {
              void sectorsQuery.refetch();
              void performancesQuery.refetch();
            },
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView {...scrollInsets} className="flex-1 bg-background" contentContainerClassName="px-4 pb-28">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={onBack} />
        <View className="mt-3 flex-row items-center gap-1">
          {canEdit ? (
            <Pressable
              onPress={() => router.push(`/compare-admin?composerId=${composerId ?? first?.composerId ?? ''}&pieceId=${pieceId}` as Href)}
              accessibilityLabel="구간·연주 관리"
              className="size-11 items-center justify-center rounded-full">
              <Icon as={SettingsIcon} size={18} className="text-foreground-muted" />
            </Pressable>
          ) : null}
          {title ? <FavoriteButton kind="pieces" id={pieceId} name={title} className="size-11" /> : null}
        </View>
      </View>

      {/* 머리: 작품은 사각. 음반 연결이 없어 작곡가 초상을 쓴다 */}
      <View className="mt-3 flex-row items-end gap-4">
        {title ? (
          <EntityThumb name={title} image={pieceInfo?.composerAvatarUrl} shape="square" size={88} />
        ) : (
          <Skeleton className="size-[88px] rounded-md" />
        )}
        <View className="min-w-0 flex-1">
          {title ? (
            <>
              <Text className="text-title-2 font-bold text-foreground">{title}</Text>
              <Text variant="caption" numberOfLines={1} className="mt-1">
                {[first?.composerName ?? pieceInfo?.composerName, pieceInfo ? `연주자 ${pieceInfo.performerCount}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </>
          ) : (
            <Skeleton className="h-7 w-3/4" />
          )}
        </View>
      </View>

      <View className="mt-5">
        <SectionStaff
          sectors={sectors}
          activeSectorId={activeSector?.id}
          reference={active ?? preview}
          labels="active"
          onSelect={onSelectSector}
        />
      </View>

      {/* 구간: 줄바꿈하지 않고 가로로 흘린다 (부록 D-13) */}
      <ScrollShelf className="mt-1" gap={8}>
        {sectorsQuery.isLoading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-8 w-24 rounded-full" />)
          : sectors.map((sector) => (
              <Chip
                key={sector.id}
                label={sector.sectorName}
                count={sector.readyPerformanceCount}
                selected={sector.id === activeSector?.id}
                onPress={() => onSelectSector(sector.id)}
              />
            ))}
      </ScrollShelf>

      {/* 영상: 고른 연주 하나만 */}
      <View className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-surface-3">
        {active && active.clipStatus === 'ready' ? (
          <PerformanceVideoPlayer
            key={active.id}
            clipUrl={active.clipUrl}
            videoId={active.videoId}
            startTime={Math.floor(active.startMs / 1000)}
            endTime={Math.ceil(active.endMs / 1000)}
          />
        ) : preview ? (
          <Pressable
            onPress={() => setActiveId(preview.id)}
            accessibilityRole="button"
            accessibilityLabel={`${primaryCredit(preview)?.artistName ?? '연주'} 재생`}
            className="flex-1">
            {youtubeThumbnailUrl(preview) ? (
              <OptimizedImage uri={youtubeThumbnailUrl(preview)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : null}
            <Scrim from="bottom" opacity={0.75} extent={55} />
            <View className="absolute inset-0 items-center justify-center">
              <View className="size-14 items-center justify-center rounded-full bg-primary">
                <Icon as={PlayIcon} size={22} className="ml-1 fill-primary-foreground text-primary-foreground" />
              </View>
            </View>
            {activeSector ? (
              <View className="absolute left-3 top-3">
                <Badge label={activeSector.sectorName} className="bg-black/60" />
              </View>
            ) : null}
            <Text className="absolute bottom-3 left-3 text-label font-semibold text-white">
              {primaryCredit(preview)?.artistName ?? ''}
            </Text>
            <Text className="absolute bottom-3 right-3 rounded-xs bg-black/60 px-1.5 py-0.5 font-mono text-caption text-white">
              {clipClock(clipDurationMs(preview))}
            </Text>
          </Pressable>
        ) : performancesQuery.isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="caption">이 구간은 아직 재생할 수 있는 영상이 없어요</Text>
          </View>
        )}
      </View>
      {active && youtubeWatchUrl(active) ? (
        <Pressable
          onPress={() => Linking.openURL(youtubeWatchUrl(active) ?? '')}
          accessibilityRole="link"
          className="mt-2 flex-row items-center gap-1 self-end">
          <Text variant="caption">YouTube 원본</Text>
          <Icon as={ExternalLinkIcon} size={12} className="text-foreground-subtle" />
        </Pressable>
      ) : null}

      {/* 연주자: 길이는 가장 긴 연주 대비 */}
      <View className="mt-4">
        {performancesQuery.isLoading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="mb-2 h-14 w-full rounded-lg" />)
          : performances.map((performance) => (
              <PerformerRow
                key={performance.id}
                performance={performance}
                image={primaryCredit(performance)?.imageUrl ?? images.get(primaryCredit(performance)?.artistId ?? 0) ?? null}
                longest={longest}
                active={performance.id === activeId}
                onPress={() => setActiveId(performance.id)}
              />
            ))}
      </View>
    </ScrollView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="뒤로"
      className="mt-3 size-11 items-center justify-center rounded-full bg-surface-2">
      <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
    </Pressable>
  );
}

function PerformerRow({
  performance,
  image,
  longest,
  active,
  onPress,
}: {
  performance: ComparisonPerformance;
  image: string | null;
  longest: number;
  active: boolean;
  onPress: () => void;
}) {
  const credit = primaryCredit(performance);
  const ready = performance.clipStatus === 'ready';
  const duration = clipDurationMs(performance);
  const support = supportingCredits(performance);
  return (
    <Pressable
      onPress={ready ? onPress : undefined}
      disabled={!ready}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !ready }}
      accessibilityLabel={`${credit?.artistName ?? '연주'} ${ready ? '재생' : '준비 중'}`}
      className={cn('-mx-2 flex-row items-center gap-3 rounded-lg px-2 py-2.5', active && 'bg-surface-2')}>
      <EntityThumb name={credit?.artistName ?? '?'} image={image} shape="circle" size={40} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={cn('text-body-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
          {credit?.artistName ?? '연주자 정보 없음'}
        </Text>
        {support ? (
          <Text variant="caption" numberOfLines={1}>
            {support}
          </Text>
        ) : null}
        <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <View
            className={cn('h-full rounded-full', active ? 'bg-primary' : 'bg-foreground-subtle')}
            style={{ width: `${Math.max(4, (duration / longest) * 100)}%` }}
          />
        </View>
      </View>
      {ready ? (
        <Text variant="mono" className="w-11 text-right text-foreground-muted">
          {clipClock(duration)}
        </Text>
      ) : (
        <Badge label="준비 중" />
      )}
    </Pressable>
  );
}
