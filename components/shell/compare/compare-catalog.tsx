import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { RepertoireMark, RepertoireThumb } from '@/components/library/repertoire-badge';
import { useRepertoireIds } from '@/hooks/use-repertoire-ids';
import { repertoireFirst } from '@/lib/data/library';
import {
  CompareSearchField,
  CompareSearchResults,
  openFirstResult,
  searchComparable,
} from '@/components/compare/compare-search';
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

interface CompareCatalogProps {
  onOpenComposer: (composerId: number) => void;
  onOpenPiece: (piece: ComparisonPiece) => void;
}

/** 비교 탭 첫 화면: 비교할 수 있는 작품이 있는 작곡가를 작품이 많은 순으로 보여 준다. 위 검색 칸으로 바로 찾는다. */
export function CompareCatalog({ onOpenComposer, onOpenPiece }: CompareCatalogProps) {
  const comparable = useComparableComposers();
  const repertoire = useRepertoireIds();
  const repertoirePieces = React.useMemo(
    () => countRepertoirePieces(comparable.data?.pieces ?? [], repertoire.pieces),
    [comparable.data?.pieces, repertoire.pieces]
  );
  const composers = React.useMemo(
    () => sortComposersByRepertoire(comparable.data?.composers ?? [], repertoire.composers, repertoirePieces),
    [comparable.data?.composers, repertoire.composers, repertoirePieces]
  );
  const [query, setQuery] = React.useState('');
  const searching = query.trim().length > 0;
  const result = React.useMemo(
    () => searchComparable(comparable.data, query, repertoire),
    [comparable.data, query, repertoire]
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-7 pb-16 pt-2" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-end justify-between gap-6">
        <View className="min-w-0 flex-1">
          <Text variant="display">비교</Text>
          <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
            같은 구간을 연주자마다 비교해요.
          </Text>
        </View>
        <CompareSearchField
          value={query}
          onChange={setQuery}
          onSubmit={() => openFirstResult(result, onOpenComposer, onOpenPiece)}
          className="w-[340px]"
        />
      </View>

      {searching && comparable.data ? (
        <View className="max-w-[720px]">
          <CompareSearchResults
            query={query}
            result={result}
            repertoire={repertoire}
            onOpenComposer={onOpenComposer}
            onOpenPiece={onOpenPiece}
            onClear={() => setQuery('')}
          />
        </View>
      ) : comparable.isLoading ? (
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
          description="잠시 뒤 다시 시도해 주세요."
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
              inRepertoire={repertoire.composers.has(composer.composerId)}
              repertoirePieceCount={repertoirePieces.get(composer.composerId) ?? 0}
              repertoireArtists={repertoire.artists}
              onPress={() => onOpenComposer(composer.composerId)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** 작곡가별로 레퍼토리에 담은 비교 작품 수 */
export function countRepertoirePieces(
  pieces: readonly ComparisonPiece[],
  repertoirePieces: ReadonlySet<number>
): Map<number, number> {
  const counts = new Map<number, number>();
  if (repertoirePieces.size === 0) return counts;
  for (const piece of pieces) {
    if (repertoirePieces.has(piece.pieceId)) counts.set(piece.composerId, (counts.get(piece.composerId) ?? 0) + 1);
  }
  return counts;
}

/**
 * 레퍼토리에 담은 작곡가를 맨 앞으로, 그다음 담은 작품이 있는 작곡가. 나머지는 원래 순서(작품 많은 순) 그대로
 */
export function sortComposersByRepertoire(
  composers: readonly ComparableComposer[],
  repertoireComposers: ReadonlySet<number>,
  repertoirePieces: ReadonlyMap<number, number>
): ComparableComposer[] {
  const withPieces = repertoireFirst(composers, (composer) => (repertoirePieces.get(composer.composerId) ?? 0) > 0);
  return repertoireFirst(withPieces, (composer) => repertoireComposers.has(composer.composerId));
}

function ComposerCard({
  composer,
  inRepertoire,
  repertoirePieceCount,
  repertoireArtists,
  onPress,
}: {
  composer: ComparableComposer;
  inRepertoire: boolean;
  repertoirePieceCount: number;
  repertoireArtists: ReadonlySet<number>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${composer.composerName}${inRepertoire ? ', 레퍼토리에 있어요' : ''}, 비교할 수 있는 작품 ${composer.pieceCount}곡`}
      className="w-[188px] items-center rounded-lg p-2 -m-2 transition-colors duration-instant web:hover:bg-surface-2">
      {/* 작곡가는 사람이라 원형 */}
      <RepertoireThumb active={inRepertoire} badgeSize={36}>
        <EntityThumb name={composer.composerName} image={composer.composerAvatarUrl} shape="circle" size={172} />
      </RepertoireThumb>
      <View className="mt-3 flex-row items-center gap-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {composer.composerName}
        </Text>
        {inRepertoire ? <RepertoireMark /> : null}
      </View>
      <Text variant="caption" className="mt-0.5">
        비교할 수 있는 작품 {composer.pieceCount}곡
      </Text>
      {repertoirePieceCount > 0 ? (
        <Text variant="caption" className="mt-0.5 font-semibold text-primary">
          레퍼토리 작품 {repertoirePieceCount}곡
        </Text>
      ) : null}
      <Faces performers={composer.performers} highlightIds={repertoireArtists} className="mt-2.5" />
    </Pressable>
  );
}

/**
 * 겹쳐 놓은 연주자 얼굴. 테두리는 놓인 바탕색과 맞춘다.
 * highlightIds(레퍼토리에 담은 연주자)는 맨 앞에 두고 브라스 테두리로 표시한다
 */
export function Faces({
  performers,
  className,
  ringClassName = 'border-surface-1',
  highlightIds,
  max,
}: {
  performers: ComparisonPiecePerformer[];
  className?: string;
  ringClassName?: string;
  highlightIds?: ReadonlySet<number>;
  /** 앞에서부터 이만큼만. 레퍼토리 연주자를 앞으로 옮긴 뒤 자른다 */
  max?: number;
}) {
  if (performers.length === 0) return null;
  const ordered = (
    highlightIds?.size ? repertoireFirst(performers, (performer) => highlightIds.has(performer.artistId)) : performers
  ).slice(0, max ?? performers.length);
  return (
    <View className={cn('flex-row', className)}>
      {ordered.map((performer, index) => (
        <View
          key={performer.artistId}
          accessibilityLabel={highlightIds?.has(performer.artistId) ? `${performer.artistName}, 레퍼토리에 있어요` : undefined}
          className={cn(
            'rounded-full border-2',
            highlightIds?.has(performer.artistId) ? 'z-10 border-primary' : ringClassName
          )}
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
  const repertoire = useRepertoireIds();
  // 레퍼토리에 담은 작품을 위로. 나머지는 연주자 많은 순 그대로
  const pieces = React.useMemo(
    () => repertoireFirst(catalog.data?.pages.flat() ?? [], (piece) => repertoire.pieces.has(piece.pieceId)),
    [catalog.data, repertoire.pieces]
  );
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
          <RepertoireThumb active={repertoire.composers.has(composerId)} badgeSize={30}>
            <EntityThumb name={name} image={avatar} shape="circle" size={136} />
          </RepertoireThumb>
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
          description="잠시 뒤 다시 시도해 주세요."
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
              <PieceRow
                key={piece.pieceId}
                index={index + 1}
                piece={piece}
                inRepertoire={repertoire.pieces.has(piece.pieceId)}
                repertoireArtists={repertoire.artists}
                onPress={() => onOpen(piece)}
              />
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

function PieceRow({
  index,
  piece,
  inRepertoire,
  repertoireArtists,
  onPress,
}: {
  index: number;
  piece: ComparisonPiece;
  inRepertoire: boolean;
  repertoireArtists: ReadonlySet<number>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${piece.composerName} ${piece.pieceTitle}${inRepertoire ? ', 레퍼토리에 있어요' : ''} 비교하기`}
      className="flex-row items-center gap-4 border-b border-border px-3 py-3.5 transition-colors duration-instant web:hover:bg-surface-2">
      <Text variant="mono" className="w-6 text-right text-foreground-subtle">
        {index}
      </Text>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
            {piece.pieceTitle}
          </Text>
          {inRepertoire ? <RepertoireMark /> : null}
        </View>
        {piece.opusNumber ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {piece.opusNumber}
          </Text>
        ) : null}
      </View>
      <Faces performers={piece.performers} max={4} highlightIds={repertoireArtists} />
      <Text variant="caption" className="w-[108px] text-foreground-subtle">
        연주자 {piece.performerCount} · 구간 {piece.sectorCount}
      </Text>
      <Icon as={ChevronRightIcon} size={16} className="text-foreground-subtle" />
    </Pressable>
  );
}
