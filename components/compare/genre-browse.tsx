import { PieceCard } from '@/components/home/cards';
import { ListPlayButtons } from '@/components/player/list-play-buttons';
import { ScrollShelf } from '@/components/home/shelf';
import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { CompareIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/ui/chip';
import { GENRE_STYLES, type GenreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import { t, useLocale } from '@/lib/i18n';
import { usePrefetchOnHover } from '@/lib/navigation/prefetch';
import { useGenrePieces, useGenreSummaries } from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPiece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, ChevronLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Platform, Pressable, ScrollView, View } from 'react-native';

export interface GenreShelf {
  genre: PieceGenre;
  style: GenreStyle;
  /** 공개 비교 작품 수 */
  pieceCount: number;
  /** 타일에 비스듬히 얹을 대표 초상 */
  portrait: string | null;
}

/**
 * 장르 타일 줄. 서버 장르 요약(/comparison-genres)만 받는다(카탈로그 전체를 받지 않는다).
 * 대표 초상은 장르마다 다른 작곡가가 되게, 서버가 준 후보 중 앞 장르가 쓴 작곡가를 건너뛴다.
 */
export function useGenreShelves() {
  const summaries = useGenreSummaries();
  const shelves = React.useMemo<GenreShelf[]>(() => {
    const used = new Set<number>();
    return (summaries.data ?? []).map((summary) => {
      const lead = summary.portraits.find((portrait) => !used.has(portrait.composerId)) ?? summary.portraits[0];
      if (lead) used.add(lead.composerId);
      return {
        genre: summary.genre,
        style: GENRE_STYLES[summary.genre],
        pieceCount: summary.pieceCount,
        portrait: lead?.avatarUrl ?? null,
      };
    });
  }, [summaries.data]);
  return {
    shelves,
    isLoading: summaries.isLoading,
    isError: summaries.isError,
    refetch: summaries.refetch,
  };
}

/**
 * 장르 타일 (스포티파이 '모두 둘러보기' 타일 꼴): 장르 단색 면, 왼쪽 위 이름, 오른쪽 아래에 비스듬히 얹은 초상.
 */
export function GenreTile({
  shelf,
  width,
  height,
  onPress,
}: {
  shelf: GenreShelf;
  width: number;
  height: number;
  onPress: () => void;
}) {
  useLocale();
  const art = Math.round(height * 0.62);
  const prefetch = usePrefetchOnHover({ kind: 'genre', genre: shelf.genre });
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={t('{genre}, 비교할 수 있는 작품 {count}곡', { genre: t(shelf.style.label), count: shelf.pieceCount })}
      className={cn(Platform.OS === 'web' && 'cm-tile', 'overflow-hidden rounded-lg')}
      style={{ width, height, backgroundColor: shelf.style.color }}>

      {shelf.portrait ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: art,
            height: art,
            right: -Math.round(art * 0.16),
            bottom: -Math.round(art * 0.06),
            transform: [{ rotate: '25deg' }],
            borderRadius: 4,
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? { boxShadow: '0 4px 14px rgba(0,0,0,0.38)' } : null),
          }}>
          <OptimizedImage
            uri={shelf.portrait}
            resizeMode="cover"
            style={{ width: art, height: art }}
          />
        </View>
      ) : null}
      <View className="p-3.5">
        <Text numberOfLines={1} className="text-headline font-extrabold text-white">
          {t(shelf.style.label)}
        </Text>
        <Text className="mt-0.5 text-caption font-semibold text-white/75">{t('{count}곡', { count: shelf.pieceCount })}</Text>
      </View>
    </Pressable>
  );
}

/**
 * 장르 타일 격자 (둘러보기·비교 탭). 넓으면 들어가는 칸 수로 줄마다 고르게(7개면 4+3),
 * 좁으면 두 칸씩 깐다. 장르를 다 보여 줘서 뒤쪽 장르로 못 가는 일이 없게 한다.
 */
export function GenreTiles({
  wide,
  onOpen,
  minTileWidth = 140,
  className,
}: {
  wide: boolean;
  onOpen: (genre: PieceGenre) => void;
  minTileWidth?: number;
  className?: string;
}) {
  useLocale();
  const { shelves, isLoading } = useGenreShelves();
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 16 : 10;
  const count = Math.max(1, shelves.length);
  const maxColumns = wide ? (width > 0 ? Math.max(1, Math.floor((width + gap) / (minTileWidth + gap))) : 0) : 2;
  const rows = maxColumns > 0 ? Math.ceil(count / maxColumns) : 1;
  const columns = wide ? Math.ceil(count / rows) : 2;
  const tileWidth = width > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;
  const tileHeight = wide ? Math.round(Math.min(132, Math.max(96, tileWidth * 0.5))) : 92;
  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      className={cn('flex-row flex-wrap', className)}
      style={{ gap }}>
      {isLoading && shelves.length === 0
        ? Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="rounded-lg" style={{ width: tileWidth || '48%', height: tileHeight }} />
          ))
        : tileWidth > 0
          ? shelves.map((shelf) => (
              <GenreTile
                key={shelf.genre}
                shelf={shelf}
                width={tileWidth}
                height={tileHeight}
                onPress={() => onOpen(shelf.genre)}
              />
            ))
          : null}
    </View>
  );
}

/**
 * 한 장르의 비교할 수 있는 작품. 머리는 장르 색으로 크게 칠하고(스포티파이 장르 화면),
 * 작품은 커버 격자로 보인다.
 */
export function CompareGenrePieces({
  genre,
  wide,
  onBack,
  onOpen,
  onSelectGenre,
}: {
  genre: PieceGenre;
  wide: boolean;
  onBack: () => void;
  onOpen: (piece: ComparisonPiece) => void;
  onSelectGenre: (genre: PieceGenre) => void;
}) {
  const { locale } = useLocale();
  const { shelves } = useGenreShelves();
  const style = GENRE_STYLES[genre];
  const count = shelves.find((item) => item.genre === genre)?.pieceCount;
  // 장르 작품은 서버에서 장르로 걸러 쪽 단위로 받는다
  const query = useGenrePieces(genre);
  const pieces = React.useMemo(() => query.data?.pages.flat() ?? [], [query.data, locale]);
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 20 : 12;
  const columns =
    width > 0 ? Math.max(2, Math.floor((width + gap) / ((wide ? 176 : 150) + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('pb-16', wide ? 'px-7 pt-2' : 'px-4 pt-2')}>
      <Pressable onPress={onBack} accessibilityRole="link" className="mb-5 flex-row items-center gap-1 self-start">
        <Icon as={ChevronLeftIcon} size={16} className="text-foreground-muted" />
        <Text variant="caption" className="text-foreground-muted">
          {t('비교')}
        </Text>
      </Pressable>
      <Text
        className={cn(
          'font-extrabold tracking-tight text-foreground',
          wide ? 'text-[56px] leading-[60px]' : 'text-[40px] leading-[44px]'
        )}>
        {t(style.label)}
      </Text>
      <Text variant="bodySm" className="mt-2 text-foreground-muted">
        {count !== undefined ? t('비교할 수 있는 작품 {count}곡', { count }) : ' '}
      </Text>
      <ListPlayButtons items={pieces} name={t(style.label)} className="mt-4" />
      {/* 다른 장르로 바로 넘어가는 칩 (스포티파이 홈 칩 꼴) */}
      <ScrollShelf gap={8} className="mt-5">
        {shelves.map((item) => (
          <Chip
            key={item.genre}
            label={t(item.style.label)}
            selected={item.genre === genre}
            onPress={() => item.genre !== genre && onSelectGenre(item.genre)}
          />
        ))}
      </ScrollShelf>

      <View className="mt-7" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {query.isLoading ? (
          <View className="flex-row flex-wrap" style={{ gap }}>
            {Array.from({ length: wide ? 10 : 4 }, (_, index) => (
              <View key={index} style={{ width: itemWidth || 150 }} className="gap-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3 w-4/5" />
              </View>
            ))}
          </View>
        ) : query.isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title={t('작품 목록을 불러오지 못했어요')}
            description={t('연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.')}
            action={{ label: t('다시 시도'), onPress: () => query.refetch() }}
          />
        ) : pieces.length === 0 ? (
          <EmptyState
            icon={CompareIcon}
            title={t('{genre} 작품은 아직 비교할 수 없어요', { genre: t(style.label) })}
            description={t('다른 장르를 골라 보세요.')}
            action={{ label: t('비교로 돌아가기'), onPress: onBack }}
          />
        ) : itemWidth > 0 ? (
          <>
            <View className="flex-row flex-wrap" style={{ columnGap: gap, rowGap: gap + 8 }}>
              {pieces.map((piece) => (
                <View key={piece.pieceId} style={{ width: itemWidth }}>
                  <PieceCard
                    piece={piece}
                    width={itemWidth}
                    hideGenre
                    list={pieces}
                    listName={t(style.label)}
                    onPress={() => onOpen(piece)}
                  />
                </View>
              ))}
            </View>
            {query.hasNextPage ? (
              <View className="mt-8 items-center">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onPress={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}>
                  <Text>{query.isFetchingNextPage ? t('불러오는 중…') : t('더 보기')}</Text>
                </Button>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
