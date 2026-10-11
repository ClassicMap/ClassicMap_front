import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { PieceFormModal } from '@/components/admin/PieceFormModal';
import { FavoriteButton } from '@/components/favorite-button';
import { ScrollShelf } from '@/components/home/shelf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { ExpandableText } from '@/components/ui/expandable-text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdminComposerAPI, AdminPieceAPI } from '@/lib/api/admin';
import { ComposerAPI } from '@/lib/api/client';
import { getEraForeground } from '@/lib/design/era-palette';
import { useAuth } from '@/lib/hooks/useAuth';
import { useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import { useComposer } from '@/lib/query/hooks/useComposers';
import { useComposerPieces, usePieceParts } from '@/lib/query/hooks/usePieces';
import type { ComparisonPiece, Piece, PiecePart, PiecePartKind } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import type { UseQueryResult } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EditIcon,
  ExternalLinkIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

interface PerformerSummary {
  artistId: number;
  artistName: string;
  imageUrl: string | null;
  pieces: string[];
}

/** 비교 카탈로그의 연주자 얼굴을 사람 기준으로 모은다. 여러 작품을 친 사람이 앞에 온다 */
function collectPerformers(pieces: readonly ComparisonPiece[]): PerformerSummary[] {
  const byArtist = new Map<number, PerformerSummary>();
  for (const piece of pieces) {
    for (const performer of piece.performers) {
      const current = byArtist.get(performer.artistId) ?? {
        artistId: performer.artistId,
        artistName: performer.artistName,
        imageUrl: performer.imageUrl,
        pieces: [],
      };
      current.pieces.push(piece.pieceTitle);
      byArtist.set(performer.artistId, current);
    }
  }
  return [...byArtist.values()].sort(
    (a, b) => b.pieces.length - a.pieces.length || a.artistName.localeCompare(b.artistName, 'ko')
  );
}

interface ListenLink {
  label: string;
  url: string;
}

interface ListenUrls {
  appleMusicUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeMusicUrl?: string | null;
}

function listenLinks(urls: ListenUrls): ListenLink[] {
  return [
    urls.appleMusicUrl ? { label: 'Apple Music', url: urls.appleMusicUrl } : null,
    urls.spotifyUrl ? { label: 'Spotify', url: urls.spotifyUrl } : null,
    urls.youtubeMusicUrl ? { label: 'YouTube Music', url: urls.youtubeMusicUrl } : null,
  ].filter((link): link is ListenLink => link !== null);
}

/** 묶음 안 곡을 세는 단위. 악장으로 나뉜 작품만 악장이고 나머지는 곡이다 */
function partUnit(kind: PiecePartKind | null | undefined): string {
  return kind === 'movement' ? '악장' : '곡';
}

interface OrderedPart {
  part: PiecePart;
  depth: number;
}

/**
 * 안의 곡을 순서대로 펴고, 하위 곡은 부모 바로 아래에 한 단계 들여 놓는다.
 * 목록에 없는 부모를 가리키면 맨 위로 올리고, 맨 위에 닿지 않는 곡(부모끼리 고리)도 버리지 않고 뒤에 붙인다
 */
function orderParts(parts: readonly PiecePart[]): OrderedPart[] {
  const ids = new Set(parts.map((part) => part.id));
  const childrenOf = new Map<number | null, PiecePart[]>();
  for (const part of parts) {
    const parentId =
      part.parentPartId !== null && part.parentPartId !== part.id && ids.has(part.parentPartId)
        ? part.parentPartId
        : null;
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(part);
    childrenOf.set(parentId, siblings);
  }
  const bySequence = (a: PiecePart, b: PiecePart) => a.sequenceNumber - b.sequenceNumber || a.id - b.id;
  const ordered: OrderedPart[] = [];
  const placed = new Set<number>();
  const visit = (parentId: number | null, depth: number) => {
    for (const part of (childrenOf.get(parentId) ?? []).sort(bySequence)) {
      ordered.push({ part, depth });
      placed.add(part.id);
      visit(part.id, depth + 1);
    }
  };
  visit(null, 0);
  for (const part of parts.filter((item) => !placed.has(item.id)).sort(bySequence)) {
    ordered.push({ part, depth: 0 });
  }
  return ordered;
}

export default function ComposerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const composerId = Number(id);
  const router = useRouter();
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const [editVisible, setEditVisible] = React.useState(false);
  const [pieceFormVisible, setPieceFormVisible] = React.useState(false);
  const [editingPiece, setEditingPiece] = React.useState<Piece | undefined>();

  const composerQuery = useComposer(Number.isFinite(composerId) ? composerId : undefined);
  const composer = composerQuery.data;
  const comparableQuery = useComparisonPieces(composerId, Boolean(composer));
  const piecesQuery = useComposerPieces(composer ? composerId : undefined);

  const comparable = React.useMemo(() => comparableQuery.data?.pages.flat() ?? [], [comparableQuery.data]);
  const comparableIds = React.useMemo(() => new Set(comparable.map((piece) => piece.pieceId)), [comparable]);
  const performers = React.useMemo(() => collectPerformers(comparable), [comparable]);
  const pieces = React.useMemo(() => piecesQuery.data?.pages.flat() ?? [], [piecesQuery.data]);

  const refresh = () => {
    void composerQuery.refetch();
    void comparableQuery.refetch();
    void piecesQuery.refetch();
  };

  const openCompare = (pieceId: number) =>
    router.push(`/compare?composerId=${composerId}&pieceId=${pieceId}` as Href);

  const handleDeleteComposer = () => {
    if (!composer) return;
    Alert.alert('작곡가 삭제', `${composer.name}을(를) 삭제할까요? 작품도 함께 삭제돼요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminComposerAPI.delete(composer.id);
            router.back();
          } catch {
            Alert.alert('삭제하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
          }
        },
      },
    ]);
  };

  const handleEditPiece = async (piece: Piece) => {
    try {
      const full = await ComposerAPI.getPieceById(piece.id);
      setEditingPiece(full ?? piece);
      setPieceFormVisible(true);
    } catch {
      Alert.alert('작품 정보를 불러오지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    }
  };

  const handleDeletePiece = (piece: Piece) => {
    Alert.alert('작품 삭제', `${piece.title}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminPieceAPI.delete(piece.id);
            void piecesQuery.refetch();
          } catch {
            Alert.alert('삭제하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
          }
        },
      },
    ]);
  };

  if (composerQuery.isLoading) {
    return (
      <View className="flex-1 bg-background p-6 web:bg-surface-1">
        <View className={cn('gap-6', wide ? 'flex-row items-end' : 'items-center')}>
          <Skeleton className={cn('rounded-full', wide ? 'size-52' : 'size-36')} />
          <View className={cn('gap-3', wide ? 'flex-1' : 'w-full items-center')}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </View>
        </View>
      </View>
    );
  }

  if (composerQuery.isError || !composer) {
    return (
      <View className="flex-1 bg-background web:bg-surface-1">
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="작곡가 정보를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => composerQuery.refetch() }}
        />
      </View>
    );
  }

  const eraColor = getEraForeground(composer.period, scheme);
  const years = `${composer.birthYear}–${composer.deathYear ?? ''}`;
  const meta = [
    years,
    composer.nationality,
    composer.pieceCount ? `작품 ${composer.pieceCount.toLocaleString('ko-KR')}곡` : null,
    composer.englishName,
  ].filter(Boolean);
  const styleKeywords = (composer.style ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const firstComparable = comparable[0];

  const about =
    composer.bio || styleKeywords.length > 0 || composer.influence ? (
      <View className="gap-6">
        {composer.bio ? (
          <View>
            <Text variant="headline" className="mb-2.5">
              소개
            </Text>
            <ExpandableText text={composer.bio} lines={5} variant="body" className="text-foreground" />
          </View>
        ) : null}
        {styleKeywords.length > 0 ? (
          <View>
            <Text variant="headline" className="mb-2.5">
              음악 스타일
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {styleKeywords.map((keyword) => (
                <Badge key={keyword} tone="outline" label={keyword} className="px-2 py-1" />
              ))}
            </View>
          </View>
        ) : null}
        {composer.influence ? (
          <View>
            <Text variant="headline" className="mb-2.5">
              음악사적 영향
            </Text>
            <Text variant="bodySm" className="text-foreground-muted">
              {composer.influence}
            </Text>
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={composerQuery.isRefetching} onRefresh={refresh} />}
        contentContainerClassName={cn('pb-24', wide ? 'px-7' : 'px-4')}>
        {!wide ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push('/timeline' as Href))}
            accessibilityLabel="뒤로"
            className="mt-12 size-11 items-center justify-center rounded-full bg-surface-2">
            <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
          </Pressable>
        ) : null}

        {/* 머리: 사람은 원형 */}
        <View className={cn('gap-6', wide ? 'mt-6 flex-row items-end gap-8' : 'mt-2 items-center')}>
          <EntityThumb name={composer.name} image={composer.avatarUrl} shape="circle" size={wide ? 208 : 148} />
          <View className={cn('min-w-0', wide ? 'flex-1 pb-2' : 'items-center')}>
            {wide ? (
              <Text variant="micro" className="uppercase tracking-widest">
                작곡가
              </Text>
            ) : null}
            <Text
              className={cn(
                'font-extrabold tracking-tight text-foreground',
                wide ? 'mt-2 text-[64px] leading-[66px]' : 'text-[34px] leading-10'
              )}>
              {composer.name}
            </Text>
            <Text variant="bodySm" className={cn('mt-3 text-foreground-muted', !wide && 'text-center')}>
              <Text className="font-semibold" style={eraColor ? { color: eraColor } : undefined}>
                {composer.period}
              </Text>
              {meta.map((part) => `  ·  ${part}`).join('')}
            </Text>
          </View>
        </View>

        {/* 행동: 바로 듣기가 먼저, 담기는 그다음 */}
        <View className={cn('mt-6 flex-row flex-wrap items-center gap-2.5', !wide && 'justify-center')}>
          {firstComparable ? (
            <Pressable
              onPress={() => openCompare(firstComparable.pieceId)}
              accessibilityRole="button"
              accessibilityLabel={`${firstComparable.pieceTitle} 비교 듣기`}
              className="h-11 flex-row items-center gap-2 rounded-full bg-primary px-5 web:transition-opacity web:hover:opacity-90">
              <Icon as={PlayIcon} size={16} className="fill-primary-foreground text-primary-foreground" />
              <Text className="text-label font-bold text-primary-foreground">비교 듣기</Text>
            </Pressable>
          ) : null}
          <FavoriteButton kind="composers" id={composer.id} name={composer.name} variant="labeled" />
          {canEdit ? (
            <>
              <Button variant="outline" size="sm" onPress={() => setEditVisible(true)}>
                <Icon as={EditIcon} size={14} className="text-foreground" />
                <Text>수정</Text>
              </Button>
              <Button variant="outline" size="sm" onPress={handleDeleteComposer}>
                <Icon as={TrashIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">삭제</Text>
              </Button>
            </>
          ) : null}
        </View>

        <View className={cn('mt-10', wide ? 'flex-row gap-12' : 'gap-10')}>
          <View className="min-w-0 flex-1 gap-11">
            {/* 비교할 수 있는 작품 (1차 시안: 번호 행) */}
            <View>
              <SectionTitle title="비교할 수 있는 작품" meta={comparable.length > 0 ? `${comparable.length}곡` : undefined} />
              {comparableQuery.isLoading ? (
                <View className="gap-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-lg" />
                  ))}
                </View>
              ) : comparable.length === 0 ? (
                <Text variant="bodySm" className="text-foreground-muted">
                  아직 연주자 세 명 이상이 모인 작품이 없어요. 영상이 모이면 여기에 나와요.
                </Text>
              ) : (
                <View>
                  {comparable.map((piece, index) => (
                    <ComparableRow
                      key={piece.pieceId}
                      index={index}
                      piece={piece}
                      wide={wide}
                      onPress={() => openCompare(piece.pieceId)}
                    />
                  ))}
                  {comparableQuery.hasNextPage ? (
                    <Pressable
                      onPress={() => comparableQuery.fetchNextPage()}
                      disabled={comparableQuery.isFetchingNextPage}
                      className="mt-2 self-start px-2 py-1">
                      <Text variant="label" className="text-foreground-muted">
                        {comparableQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            {/* 이 작품들을 연주한 사람: 사람은 원형 */}
            {performers.length > 0 ? (
              <View>
                <SectionTitle title="이 작품들을 연주한 사람" meta={`${performers.length}명`} />
                {wide ? (
                  <View className="flex-row flex-wrap gap-x-4 gap-y-5">
                    {performers.slice(0, 12).map((performer) => (
                      <PerformerTile
                        key={performer.artistId}
                        performer={performer}
                        onPress={() => router.push(`/artist/${performer.artistId}` as Href)}
                      />
                    ))}
                  </View>
                ) : (
                  <ScrollShelf>
                    {performers.map((performer) => (
                      <PerformerTile
                        key={performer.artistId}
                        performer={performer}
                        onPress={() => router.push(`/artist/${performer.artistId}` as Href)}
                      />
                    ))}
                  </ScrollShelf>
                )}
              </View>
            ) : null}

            {!wide && about ? about : null}

            {/* 작품 전체: 페이지로 받는다 */}
            <View>
              <View className="flex-row items-center justify-between">
                <SectionTitle
                  title="작품"
                  meta={composer.pieceCount ? `${composer.pieceCount.toLocaleString('ko-KR')}곡` : undefined}
                />
                {canEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="-mt-3"
                    onPress={() => {
                      setEditingPiece(undefined);
                      setPieceFormVisible(true);
                    }}>
                    <Icon as={PlusIcon} size={14} className="text-foreground" />
                    <Text>작품 추가</Text>
                  </Button>
                ) : null}
              </View>
              {piecesQuery.isLoading ? (
                <View className="gap-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-lg" />
                  ))}
                </View>
              ) : piecesQuery.isError ? (
                <View className="flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
                  <Text variant="bodySm" className="flex-1 text-foreground-muted">
                    작품 목록을 불러오지 못했어요.
                  </Text>
                  <Pressable onPress={() => piecesQuery.refetch()} hitSlop={8}>
                    <Text variant="label" className="text-primary">
                      다시 시도
                    </Text>
                  </Pressable>
                </View>
              ) : pieces.length === 0 ? (
                <Text variant="bodySm" className="text-foreground-muted">
                  아직 등록된 작품이 없어요.
                </Text>
              ) : (
                <View className="border-t border-border">
                  {pieces.map((piece) => (
                    <PieceRow
                      key={piece.id}
                      piece={piece}
                      comparable={comparableIds.has(piece.id)}
                      canEdit={canEdit}
                      onCompare={() => openCompare(piece.id)}
                      onComparePart={openCompare}
                      onEdit={() => handleEditPiece(piece)}
                      onDelete={() => handleDeletePiece(piece)}
                    />
                  ))}
                  {piecesQuery.hasNextPage ? (
                    <View className="mt-4 items-center">
                      <Button
                        variant="outline"
                        onPress={() => piecesQuery.fetchNextPage()}
                        disabled={piecesQuery.isFetchingNextPage}>
                        <Text>
                          {piecesQuery.isFetchingNextPage
                            ? '불러오는 중…'
                            : composer.pieceCount ? `작품 더 보기 (${pieces.length}/${composer.pieceCount.toLocaleString('ko-KR')})` : '작품 더 보기'}
                        </Text>
                      </Button>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {wide && about ? <View className="w-[340px]">{about}</View> : null}
        </View>
      </ScrollView>

      <ComposerFormModal
        visible={editVisible}
        composer={composer}
        onClose={() => setEditVisible(false)}
        onSuccess={() => {
          setEditVisible(false);
          void composerQuery.refetch();
        }}
      />
      {pieceFormVisible ? (
        <PieceFormModal
          visible={pieceFormVisible}
          composerId={composer.id}
          piece={editingPiece}
          onClose={() => {
            setPieceFormVisible(false);
            setEditingPiece(undefined);
          }}
          onSuccess={() => void piecesQuery.refetch()}
        />
      ) : null}
    </View>
  );
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="mb-3.5 flex-row items-baseline gap-2">
      <Text variant="title3">{title}</Text>
      {meta ? <Text variant="caption">{meta}</Text> : null}
    </View>
  );
}

function ComparableRow({
  index,
  piece,
  wide,
  onPress,
}: {
  index: number;
  piece: ComparisonPiece;
  wide: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${piece.pieceTitle} 비교하기`}
      className="-mx-2 flex-row items-center gap-3 rounded-lg px-2 py-2.5 active:bg-surface-2 web:transition-colors web:duration-instant web:hover:bg-surface-2">
      <Text variant="mono" className="w-6 text-center text-foreground-subtle">
        {index + 1}
      </Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {piece.pieceTitle}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {[piece.opusNumber, `구간 ${piece.sectorCount}`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {/* 사람은 원형. 작품마다 다른 얼굴이 이 목록의 차이다 */}
      <View className="flex-row">
        {piece.performers.slice(0, wide ? 4 : 3).map((performer, position) => (
          <View
            key={performer.artistId}
            className="rounded-full border-2 border-background web:border-surface-1"
            style={{ marginLeft: position === 0 ? 0 : -8 }}>
            <EntityThumb name={performer.artistName} image={performer.imageUrl} shape="circle" size={24} />
          </View>
        ))}
      </View>
      {wide ? (
        <Text variant="caption" className="w-16 text-right tabular-nums">
          {`연주자 ${piece.performerCount}`}
        </Text>
      ) : null}
      <FavoriteButton kind="pieces" id={piece.pieceId} name={piece.pieceTitle} />
      <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" />
    </Pressable>
  );
}

function PerformerTile({ performer, onPress }: { performer: PerformerSummary; onPress: () => void }) {
  const caption =
    performer.pieces.length > 1 ? `${performer.pieces[0]} 외 ${performer.pieces.length - 1}곡` : performer.pieces[0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={performer.artistName}
      className="w-[104px] items-center web:transition-opacity web:hover:opacity-90">
      <EntityThumb name={performer.artistName} image={performer.imageUrl} shape="circle" size={88} />
      <Text numberOfLines={1} className="mt-2 text-center text-label font-semibold text-foreground">
        {performer.artistName}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 text-center text-caption text-foreground-muted">
        {caption}
      </Text>
    </Pressable>
  );
}

function PieceRow({
  piece,
  comparable,
  canEdit,
  onCompare,
  onComparePart,
  onEdit,
  onDelete,
}: {
  piece: Piece;
  comparable: boolean;
  canEdit: boolean;
  onCompare: () => void;
  onComparePart: (pieceId: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const partCount = piece.partCount ?? 0;
  const unit = partUnit(piece.partKind);
  const partsQuery = usePieceParts(piece.id, expanded);
  const links = listenLinks(piece);
  const detail = [piece.opusNumber, piece.compositionYear ? `${piece.compositionYear}` : null].filter(Boolean).join(' · ');
  return (
    <View className="border-b border-border">
      <View className="flex-row items-center gap-3 py-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
              {piece.title}
            </Text>
            {partCount > 0 ? (
              <Pressable
                onPress={() => setExpanded((value) => !value)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${piece.title} 안의 ${unit} ${partCount}개 ${expanded ? '접기' : '펼치기'}`}
                hitSlop={8}
                className="shrink-0 flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5 active:bg-surface-2 web:transition-colors web:duration-instant web:hover:bg-surface-2">
                <Text variant="caption" className="tabular-nums">
                  {`${partCount}${unit}`}
                </Text>
                <Icon as={expanded ? ChevronUpIcon : ChevronDownIcon} size={14} className="text-foreground-subtle" />
              </Pressable>
            ) : null}
          </View>
          {detail || piece.titleEn ? (
            <Text variant="caption" numberOfLines={1} className="mt-0.5">
              {[detail, piece.titleEn].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {links.length > 0 ? <ListenLinks name={piece.title} links={links} /> : null}
        </View>
        {comparable ? (
          <Chip size="sm" label="비교 듣기" onPress={onCompare} accessibilityLabel={`${piece.title} 비교 듣기`} />
        ) : null}
        <FavoriteButton kind="pieces" id={piece.id} name={piece.title} />
        {canEdit ? (
          <View className="flex-row">
            <Pressable onPress={onEdit} accessibilityLabel={`${piece.title} 수정`} hitSlop={6} className="size-8 items-center justify-center">
              <Icon as={EditIcon} size={15} className="text-foreground-muted" />
            </Pressable>
            <Pressable onPress={onDelete} accessibilityLabel={`${piece.title} 삭제`} hitSlop={6} className="size-8 items-center justify-center">
              <Icon as={TrashIcon} size={15} className="text-destructive" />
            </Pressable>
          </View>
        ) : null}
      </View>
      {expanded ? (
        <PiecePartList query={partsQuery} partCount={partCount} partKind={piece.partKind} onCompare={onComparePart} />
      ) : null}
    </View>
  );
}

function ListenLinks({ name, links }: { name: string; links: ListenLink[] }) {
  return (
    <View className="mt-1.5 flex-row flex-wrap gap-3">
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={() => Linking.openURL(link.url)}
          accessibilityRole="link"
          accessibilityLabel={`${name} ${link.label}에서 듣기`}
          hitSlop={6}
          className="flex-row items-center gap-1">
          <Icon as={ExternalLinkIcon} size={11} className="text-foreground-subtle" />
          <Text className="text-micro text-foreground-subtle">{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PiecePartList({
  query,
  partCount,
  partKind,
  onCompare,
}: {
  query: UseQueryResult<PiecePart[]>;
  partCount: number;
  partKind: PiecePartKind | null | undefined;
  onCompare: (pieceId: number) => void;
}) {
  const unit = partUnit(partKind);
  const ordered = React.useMemo(() => orderParts(query.data ?? []), [query.data]);

  if (query.isLoading) {
    return (
      <View className="mb-3 ml-1 gap-2 border-l border-border pl-3">
        {Array.from({ length: Math.min(partCount, 3) }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="mb-3 flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
        <Text variant="bodySm" className="flex-1 text-foreground-muted">
          {`안의 ${unit}을 불러오지 못했어요.`}
        </Text>
        <Pressable onPress={() => query.refetch()} disabled={query.isFetching} hitSlop={8}>
          <Text variant="label" className="text-primary">
            {query.isFetching ? '불러오는 중…' : '다시 시도'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (ordered.length === 0) {
    return (
      <View className="mb-3 ml-1 border-l border-border py-1 pl-3">
        <Text variant="caption">{`안의 ${unit} 정보가 아직 없어요.`}</Text>
      </View>
    );
  }

  return (
    <View className="mb-3 ml-1 border-l border-border pl-3">
      {ordered.map(({ part, depth }) => (
        <PiecePartRow key={part.id} part={part} depth={depth} partKind={partKind} onCompare={onCompare} />
      ))}
    </View>
  );
}

function PiecePartRow({
  part,
  depth,
  partKind,
  onCompare,
}: {
  part: PiecePart;
  depth: number;
  partKind: PiecePartKind | null | undefined;
  onCompare: (pieceId: number) => void;
}) {
  // 묶음 안 소나타의 악장처럼 묶음 단위가 곡이어도 악장 번호가 있는 줄은 악장으로 센다
  const movement = partKind === 'movement' || Boolean(part.movementNumber?.trim());
  const linked = part.linkedPiece;
  const links = linked && !linked.comparable ? listenLinks(linked) : [];
  return (
    <View className="flex-row items-center gap-3 py-2" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
      <Text variant="mono" className={cn('text-right text-foreground-subtle', movement ? 'w-11' : 'w-6')}>
        {movement ? `${part.sequenceNumber}악장` : `${part.sequenceNumber}.`}
      </Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-body-sm text-foreground">
          {part.name}
        </Text>
        {links.length > 0 ? <ListenLinks name={part.name} links={links} /> : null}
      </View>
      {linked?.comparable ? (
        <Chip
          size="sm"
          label="비교 듣기"
          onPress={() => onCompare(linked.id)}
          accessibilityLabel={`${part.name} 비교 듣기`}
        />
      ) : null}
    </View>
  );
}
