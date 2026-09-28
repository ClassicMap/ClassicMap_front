import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { CompareIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPiece } from '@/lib/types/models';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

/** 비교 탭 첫 화면: 비교할 수 있는 작품만 보여 준다 (기능 제안 19). */
export function CompareCatalog({ onOpen }: { onOpen: (piece: ComparisonPiece) => void }) {
  const catalog = useComparisonPieces();
  const pieces = React.useMemo(() => catalog.data?.pages.flat() ?? [], [catalog.data]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-7 pb-16 pt-2">
      <Text variant="display">비교</Text>
      <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
        같은 구간을 연주자별로 들어 봐요. 연주자가 많은 작품부터 보여요.
      </Text>

      {catalog.isLoading ? (
        <View className="mt-8 flex-row flex-wrap gap-5">
          {Array.from({ length: 8 }, (_, index) => (
            <View key={index} className="w-[188px] gap-2.5">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </View>
          ))}
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
        <>
          <View className="mt-8 flex-row flex-wrap gap-x-5 gap-y-7">
            {pieces.map((piece) => (
              <CatalogCard key={piece.pieceId} piece={piece} onPress={() => onOpen(piece)} />
            ))}
          </View>
          {catalog.hasNextPage ? (
            <View className="mt-8 items-center">
              <Button
                variant="outline"
                onPress={() => catalog.fetchNextPage()}
                disabled={catalog.isFetchingNextPage}>
                <Text>{catalog.isFetchingNextPage ? '불러오는 중…' : '더 보기'}</Text>
              </Button>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function CatalogCard({ piece, onPress }: { piece: ComparisonPiece; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${piece.composerName} ${piece.pieceTitle} 비교하기`}
      className="group w-[188px] rounded-lg p-2 -m-2 transition-colors duration-instant web:hover:bg-surface-2">
      {/* 작품은 콘텐츠라 사각. 음반 연결(B22)이 없어 작곡가 초상을 작품 그림으로 쓴다 */}
      <EntityThumb name={piece.pieceTitle} image={piece.composerAvatarUrl} shape="square" size={172} />
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {piece.pieceTitle}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-0.5">
        {[piece.composerName, piece.opusNumber].filter(Boolean).join(' · ')}
      </Text>
      <View className="mt-2 flex-row items-center gap-2">
        <View className="flex-row">
          {piece.performers.slice(0, 4).map((performer, index) => (
            <View
              key={performer.artistId}
              className="rounded-full border-2 border-surface-1"
              style={{ marginLeft: index === 0 ? 0 : -8 }}>
              <EntityThumb name={performer.artistName} image={performer.imageUrl} shape="circle" size={22} />
            </View>
          ))}
        </View>
        <Text variant="caption" className="text-foreground-subtle">
          연주자 {piece.performerCount} · 구간 {piece.sectorCount}
        </Text>
      </View>
    </Pressable>
  );
}
