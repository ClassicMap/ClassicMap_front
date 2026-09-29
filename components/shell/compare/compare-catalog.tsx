import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  type ComparableComposer,
  useComparableComposers,
  useComparisonPieces,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPiece, ComparisonPiecePerformer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

/** 비교 탭 첫 화면: 비교할 수 있는 작품이 있는 작곡가를 작품이 많은 순으로 보여 준다. */
export function CompareCatalog({ onOpenComposer }: { onOpenComposer: (composerId: number) => void }) {
  const comparable = useComparableComposers();
  const composers = comparable.data?.composers ?? [];

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-7 pb-16 pt-2">
      <Text variant="display">비교</Text>
      <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
        작곡가를 고르면 같은 구간을 연주자별로 들어 볼 수 있는 작품이 나와요.
      </Text>

      {comparable.isLoading ? (
        <View className="mt-8 flex-row flex-wrap gap-x-5 gap-y-7">
          {Array.from({ length: 8 }, (_, index) => (
            <View key={index} className="w-[188px] items-center gap-2.5">
              <Skeleton className="size-[172px] rounded-full" />
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </View>
          ))}
        </View>
      ) : comparable.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="비교할 수 있는 작곡가를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => comparable.refetch() }}
        />
      ) : composers.length === 0 ? (
        <EmptyState
          icon={CompareIcon}
          title="아직 비교할 수 있는 작품이 없어요"
          description="연주자 세 명 이상의 영상이 모이면 여기에 나와요."
        />
      ) : (
        <View className="mt-8 flex-row flex-wrap gap-x-5 gap-y-7">
          {composers.map((composer) => (
            <ComposerCard
              key={composer.composerId}
              composer={composer}
              onPress={() => onOpenComposer(composer.composerId)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ComposerCard({ composer, onPress }: { composer: ComparableComposer; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${composer.composerName}, 비교할 수 있는 작품 ${composer.pieceCount}곡`}
      className="w-[188px] items-center rounded-lg p-2 -m-2 transition-colors duration-instant web:hover:bg-surface-2">
      {/* 작곡가는 사람이라 원형 */}
      <EntityThumb name={composer.composerName} image={composer.composerAvatarUrl} shape="circle" size={172} />
      <Text numberOfLines={1} className="mt-3 text-body-sm font-semibold text-foreground">
        {composer.composerName}
      </Text>
      <Text variant="caption" className="mt-0.5">
        비교할 수 있는 작품 {composer.pieceCount}곡
      </Text>
      <Faces performers={composer.performers} className="mt-2.5" />
    </Pressable>
  );
}

/** 겹쳐 놓은 연주자 얼굴. 테두리는 놓인 바탕색과 맞춘다 */
export function Faces({
  performers,
  className,
  ringClassName = 'border-surface-1',
}: {
  performers: ComparisonPiecePerformer[];
  className?: string;
  ringClassName?: string;
}) {
  if (performers.length === 0) return null;
  return (
    <View className={cn('flex-row', className)}>
      {performers.map((performer, index) => (
        <View
          key={performer.artistId}
          className={cn('rounded-full border-2', ringClassName)}
          style={{ marginLeft: index === 0 ? 0 : -8 }}>
          <EntityThumb name={performer.artistName} image={performer.imageUrl} shape="circle" size={22} />
        </View>
      ))}
    </View>
  );
}

interface CompareComposerPiecesProps {
  composerId: number;
  onBack: () => void;
  onOpen: (piece: ComparisonPiece) => void;
}

/** 비교 탭 둘째 단: 한 작곡가의 비교할 수 있는 작품. 연주자가 많은 작품부터 온다. */
export function CompareComposerPieces({ composerId, onBack, onOpen }: CompareComposerPiecesProps) {
  const router = useRouter();
  const catalog = useComparisonPieces(composerId);
  const pieces = React.useMemo(() => catalog.data?.pages.flat() ?? [], [catalog.data]);
  const summary = useComparableComposers().data?.byId.get(composerId);
  const name = summary?.composerName ?? pieces[0]?.composerName;
  const avatar = summary?.composerAvatarUrl ?? pieces[0]?.composerAvatarUrl ?? null;
  const count = summary?.pieceCount ?? (catalog.hasNextPage ? undefined : pieces.length);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-7 pb-16 pt-2">
      <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1 self-start">
        <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
        <Text variant="caption" className="text-foreground-muted">
          비교
        </Text>
      </Pressable>

      <View className="flex-row items-end gap-6">
        {name ? (
          <EntityThumb name={name} image={avatar} shape="circle" size={136} />
        ) : (
          <Skeleton className="size-[136px] rounded-full" />
        )}
        <View className="min-w-0 flex-1 pb-1">
          <Text variant="caption" className="text-foreground-subtle">
            작곡가
          </Text>
          {name ? (
            <Text variant="display" numberOfLines={1} className="mt-1">
              {name}
            </Text>
          ) : (
            <Skeleton className="mt-2 h-10 w-64" />
          )}
          <View className="mt-2 flex-row items-center gap-3">
            {count !== undefined ? (
              <Text variant="bodySm" className="text-foreground-muted">
                비교할 수 있는 작품 {count}곡
              </Text>
            ) : null}
            {name ? (
              <Pressable
                onPress={() => router.push(`/composer/${composerId}` as Href)}
                accessibilityRole="link"
                className="rounded-full px-1 web:hover:opacity-80">
                <Text variant="label" className="text-foreground-muted underline">
                  작곡가 보기
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {catalog.isLoading ? (
        <View className="mt-8 max-w-[960px] gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} className="flex-row items-center gap-4">
              <Skeleton className="h-3.5 w-5" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/5" />
              </View>
            </View>
          ))}
        </View>
      ) : catalog.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="작품 목록을 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => catalog.refetch() }}
        />
      ) : pieces.length === 0 ? (
        <EmptyState
          icon={CompareIcon}
          title="이 작곡가는 아직 비교할 수 있는 작품이 없어요"
          description="다른 작곡가를 골라 보세요."
          action={{ label: '작곡가 목록 보기', onPress: onBack }}
        />
      ) : (
        <>
          {/* 작곡가 초상은 머리에 한 번만. 작품은 음반 트랙 목록처럼 번호 행으로 */}
          <View className="mt-7 max-w-[960px] border-t border-border">
            {pieces.map((piece, index) => (
              <PieceRow key={piece.pieceId} index={index + 1} piece={piece} onPress={() => onOpen(piece)} />
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

function PieceRow({ index, piece, onPress }: { index: number; piece: ComparisonPiece; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${piece.composerName} ${piece.pieceTitle} 비교하기`}
      className="flex-row items-center gap-4 border-b border-border px-3 py-3.5 transition-colors duration-instant web:hover:bg-surface-2">
      <Text variant="mono" className="w-6 text-right text-foreground-subtle">
        {index}
      </Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {piece.pieceTitle}
        </Text>
        {piece.opusNumber ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {piece.opusNumber}
          </Text>
        ) : null}
      </View>
      <Faces performers={piece.performers.slice(0, 4)} />
      <Text variant="caption" className="w-[108px] text-foreground-subtle">
        연주자 {piece.performerCount} · 구간 {piece.sectorCount}
      </Text>
      <Icon as={ChevronRightIcon} size={16} className="text-foreground-subtle" />
    </Pressable>
  );
}
