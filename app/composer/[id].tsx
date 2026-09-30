import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { PieceFormModal } from '@/components/admin/PieceFormModal';
import { FavoriteButton } from '@/components/favorite-button';
import { ScrollShelf } from '@/components/home/shelf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
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
import { useComposerPieces } from '@/lib/query/hooks/usePieces';
import type { ComparisonPiece, Piece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
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

function listenLinks(piece: Piece): { label: string; url: string }[] {
  return [
    piece.appleMusicUrl ? { label: 'Apple Music', url: piece.appleMusicUrl } : null,
    piece.spotifyUrl ? { label: 'Spotify', url: piece.spotifyUrl } : null,
    piece.youtubeMusicUrl ? { label: 'YouTube Music', url: piece.youtubeMusicUrl } : null,
  ].filter((link): link is { label: string; url: string } => link !== null);
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
  const [bioExpanded, setBioExpanded] = React.useState(false);

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
            <Text variant="body" numberOfLines={bioExpanded ? undefined : 5} className="text-foreground">
              {composer.bio}
            </Text>
            {composer.bio.length > 180 ? (
              <Pressable onPress={() => setBioExpanded((value) => !value)} className="mt-2 self-start" hitSlop={8}>
                <Text variant="label" className="text-foreground-muted">
                  {bioExpanded ? '접기' : '더 보기'}
                </Text>
              </Pressable>
            ) : null}
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
  onEdit,
  onDelete,
}: {
  piece: Piece;
  comparable: boolean;
  canEdit: boolean;
  onCompare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const links = listenLinks(piece);
  const detail = [piece.opusNumber, piece.compositionYear ? `${piece.compositionYear}` : null].filter(Boolean).join(' · ');
  return (
    <View className="flex-row items-center gap-3 border-b border-border py-3">
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
            {piece.title}
          </Text>
        </View>
        {detail || piece.titleEn ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {[detail, piece.titleEn].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {links.length > 0 ? (
          <View className="mt-1.5 flex-row flex-wrap gap-3">
            {links.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => Linking.openURL(link.url)}
                accessibilityRole="link"
                accessibilityLabel={`${piece.title} ${link.label}에서 듣기`}
                hitSlop={6}
                className="flex-row items-center gap-1">
                <Icon as={ExternalLinkIcon} size={11} className="text-foreground-subtle" />
                <Text className="text-micro text-foreground-subtle">{link.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
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
  );
}
