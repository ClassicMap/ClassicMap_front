import { ComposerFormModal } from '@/features/admin/components/composer-form-modal';
import { PieceFormModal } from '@/features/admin/components/piece-form-modal';
import { FavoriteButton } from '@/features/library/components/favorite-button';
import { ScrollShelf } from '@/components/shared/shelf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { HeroBanner, HeroPlayButton } from '@/components/shared/hero-banner';
import { PhotoCredit } from '@/components/shared/photo-credit';
import { playList, playPiece } from '@/lib/player/play-piece';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { PieceArt } from '@/features/piece/components/piece-art';
import { TrackIndex } from '@/features/piece/components/track-index';
import { GenreLink } from '@/features/piece/components/genre-link';
import { performerNamesLine } from '@/lib/data/comparison';
import { genreStyle } from '@/lib/design/genre-palette';
import { ExpandableText } from '@/components/ui/expandable-text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdminComposerAPI, AdminPieceAPI } from '@/lib/api/admin';
import { ComposerAPI } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { useComparisonPieces } from '@/lib/query/hooks/use-comparison-performances';
import { useComposer } from '@/lib/query/hooks/use-composers';
import { PIECE_QUERY_KEYS, useComposerCatalog } from '@/lib/query/hooks/use-pieces';
import { ComposerHighlights } from '@/features/composer/components/composer-highlights';
import { ComposerWorks } from '@/features/composer/components/composer-works';
import { MoreLink } from '@/components/ui/more-link';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ComparisonPiece,
  ComposerHighlight,
  Piece,
  PiecePart,
  PiecePartKind,
} from '@/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import type { UseQueryResult } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EditIcon,
  ExternalLinkIcon,
  PlusIcon,
  ShuffleIcon,
  TrashIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { formatNumber, t, useLocale } from '@/lib/i18n';
import { scrollInnerView } from '@/features/composer/lib/scroll-inner-view';
import { Linking, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { QueueAddMenu } from '@/features/player/components/queue-add-menu';
import { queueLongPressProps } from '@/features/player/lib/queue-actions';

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

export default function ComposerDetailScreen() {
  const { locale } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const composerId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [starting, setStarting] = React.useState(false);
  // 이 작곡가 곡이 지금 플레이어에 있으면 큰 버튼이 재생·일시정지를 바꾼다
  const playerHere = useComparePlayer((state) => state.current?.composerId === composerId);
  const playingHere = useComparePlayer(
    (state) => state.playing && state.current?.composerId === composerId
  );
  const pausedHere = playerHere && !playingHere;
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const scrollRef = React.useRef<ScrollView>(null);
  const comparableRef = React.useRef<View>(null);
  const [comparableOpen, setComparableOpen] = React.useState(false);

  const [editVisible, setEditVisible] = React.useState(false);
  const [pieceFormVisible, setPieceFormVisible] = React.useState(false);
  const [editingPiece, setEditingPiece] = React.useState<Piece | undefined>();

  const composerQuery = useComposer(Number.isFinite(composerId) ? composerId : undefined);
  const composer = composerQuery.data;
  // 「처음 듣는다면」은 작품 영역과 같은 catalog 응답에 실려 온다(같은 캐시를 쓴다)
  const highlights = useComposerCatalog(composer ? composerId : undefined).data?.highlights ?? [];
  const [worksReveal, setWorksReveal] = React.useState<{ q: string; key: number } | null>(null);
  const showInWorks = (highlight: ComposerHighlight) =>
    setWorksReveal((current) => ({ q: highlight.title, key: (current?.key ?? 0) + 1 }));
  const comparableQuery = useComparisonPieces(composerId, Boolean(composer));
  const refreshPieces = () =>
    queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.byComposer(composerId) });

  const comparable = React.useMemo(
    () => comparableQuery.data?.pages.flat() ?? [],
    [comparableQuery.data, locale]
  );
  const comparableFoldable =
    comparable.length > COMPARABLE_PREVIEW || Boolean(comparableQuery.hasNextPage);
  const shownComparable = comparableOpen ? comparable : comparable.slice(0, COMPARABLE_PREVIEW);
  // 긴 목록 끝에서 접으면 이 칸 머리가 화면 위로 지나가 있어 다른 곳이 보인다.
  // 머리로 스크롤을 옮기고 같이 접는다
  const collapseComparable = () => {
    const scroll = scrollRef.current;
    const viewport = scroll?.getNativeScrollRef();
    const section = comparableRef.current;
    const collapse = () => setComparableOpen(false);
    if (!scroll || !viewport || !section) return collapse();
    section.measureInWindow((_x, sectionTop) => {
      viewport.measureInWindow((_vx, viewportTop) => {
        if (sectionTop >= viewportTop) return collapse();
        section.measureLayout(
          scrollInnerView(scroll),
          (_lx, y) => {
            scroll.scrollTo({ y: Math.max(0, y - 16), animated: false });
            collapse();
          },
          collapse
        );
      });
    });
  };
  const comparableIds = React.useMemo(
    () => new Set(comparable.map((piece) => piece.pieceId)),
    [comparable, locale]
  );
  const performers = React.useMemo(() => collectPerformers(comparable), [comparable, locale]);

  const refresh = () => {
    void composerQuery.refetch();
    void comparableQuery.refetch();
    void refreshPieces();
  };

  const openCompare = (pieceId: number) =>
    router.push(`/compare?composerId=${composerId}&pieceId=${pieceId}` as Href);

  const handleDeleteComposer = () => {
    if (!composer) return;
    Alert.alert(
      t('작곡가 삭제'),
      t('{name}을(를) 삭제할까요? 작품도 함께 삭제돼요.', { name: composer.name }),
      [
        { text: t('취소'), style: 'cancel' },
        {
          text: t('삭제'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminComposerAPI.delete(composer.id);
              router.back();
            } catch {
              Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
            }
          },
        },
      ]
    );
  };

  const handleEditPiece = async (piece: Piece) => {
    try {
      const full = await ComposerAPI.getPieceById(piece.id);
      setEditingPiece(full ?? piece);
      setPieceFormVisible(true);
    } catch {
      Alert.alert(t('작품 정보를 불러오지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
    }
  };

  const handleDeletePiece = (piece: Piece) => {
    Alert.alert(t('작품 삭제'), t('{name}을(를) 삭제할까요?', { name: piece.title }), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('삭제'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminPieceAPI.delete(piece.id);
            void refreshPieces();
          } catch {
            Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
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
          title={t('작곡가 정보를 불러오지 못했어요')}
          description={t('연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.')}
          action={{ label: t('다시 시도'), onPress: () => composerQuery.refetch() }}
        />
      </View>
    );
  }

  const years = `${composer.birthYear}–${composer.deathYear ?? ''}`;
  const meta = [
    years,
    composer.nationality ? t(composer.nationality) : null,
    composer.pieceCount
      ? t('작품 {n}곡', { count: composer.pieceCount, n: formatNumber(composer.pieceCount) })
      : null,
    composer.englishName,
  ].filter(Boolean);
  const styleKeywords = (composer.style ?? '')
    // 괄호 안 쉼표(「피아노 독주곡(녹턴, 발라드)」)에서는 나누지 않는다
    .split(/,(?![^()]*\))/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const firstComparable = comparable[0];
  const listName = t('{name} 작품', { name: composer.name });
  // 머리 재생: 첫 비교 작품을 그 자리에서 튼다. 틀 연주가 없으면 비교 화면으로 간다
  const playFirst = () => {
    if (!firstComparable) return;
    setStarting(true);
    playPiece({ pieceId: firstComparable.pieceId }, comparable, listName)
      .then((played) => !played && openCompare(firstComparable.pieceId))
      .catch(() => openCompare(firstComparable.pieceId))
      .finally(() => setStarting(false));
  };

  const about =
    composer.bio || styleKeywords.length > 0 || composer.influence ? (
      <View className="gap-6">
        {composer.bio ? (
          <View>
            <Text variant="headline" className="mb-2.5">
              {t('소개')}
            </Text>
            <ExpandableText
              text={composer.bio}
              lines={5}
              variant="body"
              className="text-foreground"
            />
          </View>
        ) : null}
        {styleKeywords.length > 0 ? (
          <View>
            <Text variant="headline" className="mb-2.5">
              {t('음악 스타일')}
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
              {t('음악사적 영향')}
            </Text>
            <ExpandableText
              text={composer.influence}
              lines={5}
              variant="bodySm"
              className="text-foreground-muted"
            />
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={composerQuery.isRefetching} onRefresh={refresh} />
        }
        contentContainerClassName={cn('pb-24', wide ? 'px-7' : 'px-4')}>
        {/* 배너 전용 가로 그림이 있으면 폭으로 깔고, 없으면 연주자처럼 초상을 오른쪽에 세운다
            (옛 사진·작은 초상을 폭으로 늘리면 이마와 눈만 크게 남아서) */}
        <HeroBanner
          image={composer.banner?.url ?? composer.avatarUrl}
          focalPoint={composer.banner?.focalPoint}
          imageLayout={composer.banner ? 'cover' : 'side'}
          title={composer.name}
          meta={[composer.period ? t(composer.period) : '', ...meta].filter(Boolean)}
          wide={wide}
          onBack={
            wide
              ? undefined
              : () => (router.canGoBack() ? router.back() : router.push('/timeline' as Href))
          }
        />

        {/* 행동: 재생(첫 비교 작품을 그 자리에서) → 담기 → 관리 */}
        <View className="mt-6 flex-row flex-wrap items-center gap-4">
          {firstComparable ? (
            <HeroPlayButton
              label={t('{title} 바로 듣기', { title: firstComparable.pieceTitle })}
              busy={starting}
              playing={playingHere}
              onPress={playingHere || pausedHere ? () => comparePlayer.togglePlay() : playFirst}
            />
          ) : null}
          {comparable.length > 1 ? (
            <Pressable
              onPress={() => void playList(comparable, { shuffle: true, name: listName })}
              accessibilityRole="button"
              accessibilityLabel={t('{name} 셔플로 듣기', { name: listName })}
              className="size-12 items-center justify-center rounded-full border border-border-strong web:hover:bg-surface-2">
              <Icon as={ShuffleIcon} size={20} className="text-foreground" />
            </Pressable>
          ) : null}
          <FavoriteButton
            kind="composers"
            id={composer.id}
            name={composer.name}
            variant="labeled"
          />
          {canEdit ? (
            <>
              <Button variant="outline" size="sm" onPress={() => setEditVisible(true)}>
                <Icon as={EditIcon} size={14} className="text-foreground" />
                <Text>{t('수정')}</Text>
              </Button>
              <Button variant="outline" size="sm" onPress={handleDeleteComposer}>
                <Icon as={TrashIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">{t('삭제')}</Text>
              </Button>
            </>
          ) : null}
        </View>
        {composer.banner ? (
          <PhotoCredit
            imageUrl={composer.banner.url}
            credit={composer.banner.credit}
            centered={false}
          />
        ) : composer.avatarUrl ? (
          <PhotoCredit
            imageUrl={composer.avatarUrl}
            credit={composer.avatarCredit}
            centered={false}
          />
        ) : null}

        <View className={cn('mt-10', wide ? 'flex-row gap-12' : 'gap-10')}>
          <View className="min-w-0 flex-1 gap-11">
            {/* 처음 듣는다면: 사람이 고른 작품 5곡, '더 보기'로 10곡까지. 고른 곡이 없으면 칸이 없다 */}
            <ComposerHighlights
              highlights={highlights}
              wide={wide}
              onCompare={openCompare}
              onShowInWorks={showInWorks}
            />

            {/* 비교할 수 있는 작품 (1차 시안: 번호 행). 많으면 5곡만 보이고 펼친다 */}
            <View ref={comparableRef}>
              <SectionTitle
                title={t('비교할 수 있는 작품')}
                meta={
                  comparable.length > 0 ? t('{count}곡', { count: comparable.length }) : undefined
                }
              />
              {comparableQuery.isLoading ? (
                <View className="gap-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-lg" />
                  ))}
                </View>
              ) : comparable.length === 0 ? (
                <Text variant="bodySm" className="text-foreground-muted">
                  {t('아직 연주자 세 명 이상이 모인 작품이 없어요. 영상이 모이면 여기에 나와요.')}
                </Text>
              ) : (
                <View>
                  {shownComparable.map((piece, index) => (
                    <ComparableRow
                      key={piece.pieceId}
                      index={index}
                      piece={piece}
                      wide={wide}
                      onPress={() => openCompare(piece.pieceId)}
                      onPlay={() =>
                        void playPiece({ pieceId: piece.pieceId }, comparable, listName)
                          .then((played) => !played && openCompare(piece.pieceId))
                          .catch(() => openCompare(piece.pieceId))
                      }
                    />
                  ))}
                  <View className="mt-1 flex-row gap-4">
                    {!comparableOpen && comparableFoldable ? (
                      <MoreLink
                        label={
                          comparableQuery.hasNextPage
                            ? t('더 보기')
                            : t('{n}곡 모두 보기', {
                                count: comparable.length,
                                n: formatNumber(comparable.length),
                              })
                        }
                        onPress={() => setComparableOpen(true)}
                      />
                    ) : null}
                    {comparableOpen && comparableQuery.hasNextPage ? (
                      <MoreLink
                        label={
                          comparableQuery.isFetchingNextPage ? t('불러오는 중…') : t('더 보기')
                        }
                        onPress={() => comparableQuery.fetchNextPage()}
                        disabled={comparableQuery.isFetchingNextPage}
                      />
                    ) : null}
                    {comparableOpen ? (
                      <MoreLink label={t('접기')} collapse onPress={collapseComparable} />
                    ) : null}
                  </View>
                </View>
              )}
            </View>

            {/* 이 작품들을 연주한 사람: 넓은 화면은 오른쪽 칸, 좁은 화면은 가로 띠 */}
            {!wide && performers.length > 0 ? (
              <View>
                <SectionTitle
                  title={t('이 작품들을 연주한 사람')}
                  meta={t('{count}명', { count: performers.length })}
                />
                <ScrollShelf>
                  {performers.map((performer) => (
                    <PerformerTile
                      key={performer.artistId}
                      performer={performer}
                      onPress={() => router.push(`/artist/${performer.artistId}` as Href)}
                    />
                  ))}
                </ScrollShelf>
              </View>
            ) : null}

            {!wide && about ? about : null}

            {/* 작품 전체: 갈래·형식 묶음과 작곡가 안 검색. 목록은 갈래·형식마다 페이지로 받는다 */}
            <ComposerWorks
              composerId={composer.id}
              composerName={composer.name}
              comparableIds={comparableIds}
              canEdit={canEdit}
              onCompare={openCompare}
              onEdit={handleEditPiece}
              onDelete={handleDeletePiece}
              scrollRef={scrollRef}
              reveal={worksReveal}
              headerAction={
                canEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditingPiece(undefined);
                      setPieceFormVisible(true);
                    }}>
                    <Icon as={PlusIcon} size={14} className="text-foreground" />
                    <Text>{t('작품 추가')}</Text>
                  </Button>
                ) : undefined
              }
            />
          </View>

          {wide && (about || performers.length > 0) ? (
            <View className="w-[340px] gap-10">
              {about}
              {performers.length > 0 ? (
                <PerformerSidebar
                  performers={performers}
                  onOpen={(artistId) => router.push(`/artist/${artistId}` as Href)}
                />
              ) : null}
            </View>
          ) : null}
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
          onSuccess={() => void refreshPieces()}
        />
      ) : null}
    </View>
  );
}

/** 비교할 수 있는 작품을 접어 둘 때 보이는 수(스포티파이 아티스트 '인기' 칸처럼 5곡) */
const COMPARABLE_PREVIEW = 5;

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  useLocale();
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
  onPlay,
}: {
  index: number;
  piece: ComparisonPiece;
  wide: boolean;
  onPress: () => void;
  /** 번호 칸을 누르면 그 자리에서 바로 튼다 */
  onPlay: () => void;
}) {
  useLocale();
  return (
    <Pressable
      onPress={onPress}
      // 앱: 길게 누르면 대기열 동작 시트
      {...(Platform.OS === 'web'
        ? null
        : queueLongPressProps(() => ({
            piece,
            title: piece.pieceTitle,
            subtitle: piece.composerName,
          })))}
      accessibilityRole="link"
      accessibilityLabel={t('{title} 비교하기', { title: piece.pieceTitle })}
      className="group -mx-2 flex-row items-center gap-3 rounded-lg px-2 py-2.5 active:bg-surface-2 web:transition-colors web:duration-instant web:hover:bg-surface-2">
      <TrackIndex index={index + 1} pieceId={piece.pieceId} onPlay={onPlay} />
      <PieceArt
        coverVideoId={piece.coverVideoId}
        fallbackImage={piece.composerAvatarUrl}
        fallbackName={piece.composerName}
        size={40}
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {piece.pieceTitle}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {performerNamesLine(piece.performers, piece.performerCount)}
        </Text>
      </View>
      {/* 넓으면 가운데 칸에 장르·작품번호 (스포티파이 앨범 칸 자리) */}
      {wide ? (
        <View className="w-[200px]">
          <GenreLink genre={piece.genre} />
          {piece.opusNumber ? (
            <Text variant="caption" numberOfLines={1}>
              {piece.opusNumber}
            </Text>
          ) : null}
        </View>
      ) : null}
      {wide ? (
        <Text variant="caption" className="w-14 text-right tabular-nums">
          {t('구간 {count}', { count: piece.sectorCount })}
        </Text>
      ) : null}
      <QueueAddMenu
        piece={piece}
        title={piece.pieceTitle}
        subtitle={piece.composerName}
        hoverOnly
      />
      <FavoriteButton kind="pieces" id={piece.pieceId} name={piece.pieceTitle} />
      {/* 좁으면 ⋯ 가 그 자리를 쓴다 */}
      {wide ? <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" /> : null}
    </Pressable>
  );
}

function PerformerTile({
  performer,
  onPress,
}: {
  performer: PerformerSummary;
  onPress: () => void;
}) {
  useLocale();
  const caption =
    performer.pieces.length > 1
      ? t('{title} 외 {count}곡', {
          title: performer.pieces[0],
          count: performer.pieces.length - 1,
        })
      : performer.pieces[0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={performer.artistName}
      className="w-[104px] items-center web:transition-opacity web:hover:opacity-90">
      <EntityThumb
        name={performer.artistName}
        image={performer.imageUrl}
        shape="circle"
        size={88}
      />
      <Text numberOfLines={1} className="mt-2 text-center text-label font-semibold text-foreground">
        {performer.artistName}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 text-center text-caption text-foreground-muted">
        {caption}
      </Text>
    </Pressable>
  );
}

const SIDEBAR_PERFORMERS = 8;

/** 넓은 화면 오른쪽 칸의 연주자 목록. 여러 작품을 친 사람이 앞에 온다 */
function PerformerSidebar({
  performers,
  onOpen,
}: {
  performers: PerformerSummary[];
  onOpen: (artistId: number) => void;
}) {
  useLocale();
  const [all, setAll] = React.useState(false);
  const shown = all ? performers : performers.slice(0, SIDEBAR_PERFORMERS);
  return (
    <View>
      <View className="mb-2.5 flex-row items-baseline gap-2">
        <Text variant="headline">{t('이 작품들을 연주한 사람')}</Text>
        <Text variant="caption">{t('{count}명', { count: performers.length })}</Text>
      </View>
      <View className="gap-1">
        {shown.map((performer) => {
          const caption =
            performer.pieces.length > 1
              ? t('{title} 외 {count}곡', {
                  title: performer.pieces[0],
                  count: performer.pieces.length - 1,
                })
              : performer.pieces[0];
          return (
            <Pressable
              key={performer.artistId}
              onPress={() => onOpen(performer.artistId)}
              accessibilityRole="link"
              accessibilityLabel={`${performer.artistName}, ${caption}`}
              className="flex-row items-center gap-3 rounded-lg px-1.5 py-1.5 active:bg-surface-2 web:transition-colors web:hover:bg-surface-2">
              <EntityThumb
                name={performer.artistName}
                image={performer.imageUrl}
                shape="circle"
                size={40}
              />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-label font-semibold text-foreground">
                  {performer.artistName}
                </Text>
                <Text numberOfLines={1} className="text-caption text-foreground-muted">
                  {caption}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {performers.length > SIDEBAR_PERFORMERS ? (
        <Pressable
          onPress={() => setAll((value) => !value)}
          hitSlop={6}
          className="mt-2 self-start px-1.5 py-1">
          <Text variant="label" className="text-foreground-muted">
            {all ? t('접기') : t('{count}명 모두 보기', { count: performers.length })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
