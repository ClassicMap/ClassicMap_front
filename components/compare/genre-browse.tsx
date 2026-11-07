import { PieceCard } from '@/components/home/cards';
import { ScrollShelf } from '@/components/home/shelf';
import { OptimizedImage } from '@/components/optimized-image';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { CompareIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  GENRE_STYLES,
  type GenreStyle,
  PIECE_GENRES,
  type PieceGenre,
} from '@/lib/design/genre-palette';
import { usePrefetchOnHover } from '@/lib/navigation/prefetch';
import { useComparableComposers } from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPiece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, ChevronLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Platform, Pressable, ScrollView, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GenreShelf {
  genre: PieceGenre;
  style: GenreStyle;
  /** 연주자 많은 순(목록 응답 순서 그대로) */
  pieces: ComparisonPiece[];
  /** 타일에 비스듬히 얹을 대표 초상 */
  portrait: string | null;
}

/**
 * 비교할 수 있는 작품을 장르별로 묶는다. 비교 탭이 이미 받아 둔 전체 목록(작곡가 묶음과 같은 캐시)을 쓴다.
 * 대표 초상은 장르마다 다른 작곡가가 되게 앞 장르가 쓴 작곡가를 건너뛴다.
 */
export function useGenreShelves() {
  const comparable = useComparableComposers();
  const shelves = React.useMemo<GenreShelf[]>(() => {
    const pieces = comparable.data?.pieces ?? [];
    const used = new Set<number>();
    return PIECE_GENRES.flatMap((genre) => {
      const inGenre = pieces.filter((piece) => piece.genre === genre);
      if (inGenre.length === 0) return [];
      const lead =
        inGenre.find((piece) => piece.composerAvatarUrl && !used.has(piece.composerId)) ??
        inGenre.find((piece) => piece.composerAvatarUrl);
      if (lead) used.add(lead.composerId);
      return [
        {
          genre,
          style: GENRE_STYLES[genre],
          pieces: inGenre,
          portrait: lead?.composerAvatarUrl ?? null,
        },
      ];
    });
  }, [comparable.data?.pieces]);
  return {
    shelves,
    isLoading: comparable.isLoading,
    isError: comparable.isError,
    refetch: comparable.refetch,
  };
}

/** 장르 색 면. 크기를 안 주면 부모를 꽉 채운다 */
function GenreGradient({
  style,
  width,
  height,
}: {
  style: GenreStyle;
  width?: number;
  height?: number;
}) {
  const id = `genre-${React.useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={width ?? '100%'}
      height={height ?? '100%'}
      style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={style.from} />
          <Stop offset="1" stopColor={style.to} />
        </LinearGradient>
      </Defs>
      <Rect width={width ?? '100%'} height={height ?? '100%'} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * 장르 타일 (스포티파이 '모두 둘러보기' 타일 꼴): 장르 색 면, 왼쪽 위 이름, 오른쪽 아래에 비스듬히 얹은 초상.
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
  const art = Math.round(height * 0.62);
  // 장르 화면은 비교 탭과 같은 전체 목록을 쓴다
  const prefetch = usePrefetchOnHover({ kind: 'compare-catalog' });
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${shelf.style.label}, 비교할 수 있는 작품 ${shelf.pieces.length}곡`}
      className="cm-tile overflow-hidden rounded-lg"
      style={{ width, height }}>
      <GenreGradient style={shelf.style} width={width} height={height} />
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
          {shelf.style.label}
        </Text>
        <Text className="mt-0.5 text-caption font-semibold text-white/75">{`${shelf.pieces.length}곡`}</Text>
      </View>
    </Pressable>
  );
}

/** 폭에 맞춰 장르 타일을 한 줄(넓은 화면) 또는 두 줄 격자(좁은 화면)로 깐다 */
export function GenreTiles({
  wide,
  onOpen,
  minTileWidth = 140,
  scroll = false,
  className,
}: {
  wide: boolean;
  onOpen: (genre: PieceGenre) => void;
  minTileWidth?: number;
  /** 좁은 화면에서 격자 대신 가로로 흘린다 (홈 셸프) */
  scroll?: boolean;
  className?: string;
}) {
  const { shelves, isLoading } = useGenreShelves();
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 16 : 10;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (!wide && scroll) {
    return (
      <ScrollShelf gap={10} className={className}>
        {isLoading && shelves.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="rounded-lg" style={{ width: 136, height: 88 }} />
            ))
          : shelves.map((shelf) => (
              <GenreTile key={shelf.genre} shelf={shelf} width={136} height={88} onPress={() => onOpen(shelf.genre)} />
            ))}
      </ScrollShelf>
    );
  }

  if (!wide) {
    // 좁은 화면: 두 칸 격자
    const tileWidth = width > 0 ? Math.floor((width - gap) / 2) : 0;
    return (
      <View onLayout={onLayout} className={cn('flex-row flex-wrap', className)} style={{ gap }}>
        {isLoading && shelves.length === 0
          ? Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="rounded-lg"
                style={{ width: tileWidth || '48%', height: 92 }}
              />
            ))
          : tileWidth > 0
            ? shelves.map((shelf) => (
                <GenreTile
                  key={shelf.genre}
                  shelf={shelf}
                  width={tileWidth}
                  height={92}
                  onPress={() => onOpen(shelf.genre)}
                />
              ))
            : null}
      </View>
    );
  }

  // 넓은 화면: 들어가는 만큼 한 줄 (스포티파이 셸프 규칙)
  const columns = width > 0 ? Math.max(1, Math.floor((width + gap) / (minTileWidth + gap))) : 0;
  const visible = shelves.slice(0, columns);
  // 장르가 칸보다 적으면 있는 만큼 나눠 넓힌다
  const count = Math.max(1, visible.length);
  const tileWidth = columns > 0 ? Math.floor((width - gap * (count - 1)) / count) : 0;
  const tileHeight = Math.round(Math.min(132, Math.max(96, tileWidth * 0.62)));
  return (
    <View onLayout={onLayout} className={cn('flex-row', className)} style={{ gap }}>
      {isLoading && shelves.length === 0
        ? Array.from({ length: Math.max(columns, 4) }, (_, index) => (
            <Skeleton key={index} className="flex-1 rounded-lg" style={{ height: 110 }} />
          ))
        : tileWidth > 0
          ? visible.map((shelf) => (
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
}: {
  genre: PieceGenre;
  wide: boolean;
  onBack: () => void;
  onOpen: (piece: ComparisonPiece) => void;
}) {
  const { shelves, isLoading, isError, refetch } = useGenreShelves();
  const style = GENRE_STYLES[genre];
  const shelf = shelves.find((item) => item.genre === genre);
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 20 : 12;
  const columns =
    width > 0 ? Math.max(2, Math.floor((width + gap) / ((wide ? 176 : 150) + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('pb-16', wide ? 'px-7 pt-2' : 'px-4 pt-2')}>
      <View
        className={cn(
          'relative overflow-hidden rounded-2xl',
          wide ? '-mx-2 px-7 pb-7 pt-5' : 'px-5 pb-6 pt-4'
        )}>
        <GenreGradient style={style} />
        <Scrim from="bottom" opacity={0.35} extent={70} />
        <Pressable
          onPress={onBack}
          accessibilityRole="link"
          className="mb-6 flex-row items-center gap-1 self-start">
          <Icon as={ChevronLeftIcon} size={16} className="text-white/80" />
          <Text variant="caption" className="text-white/80">
            비교
          </Text>
        </Pressable>
        <Text variant="micro" className="uppercase tracking-widest text-white/75">
          장르
        </Text>
        <Text
          className={cn(
            'mt-1 font-extrabold tracking-tight text-white',
            wide ? 'text-[56px] leading-[60px]' : 'text-[40px] leading-[44px]'
          )}>
          {style.label}
        </Text>
        <Text variant="bodySm" className="mt-2 text-white/80">
          {shelf ? `비교할 수 있는 작품 ${shelf.pieces.length}곡` : ' '}
        </Text>
      </View>

      <View className="mt-7" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {isLoading ? (
          <View className="flex-row flex-wrap" style={{ gap }}>
            {Array.from({ length: wide ? 10 : 4 }, (_, index) => (
              <View key={index} style={{ width: itemWidth || 150 }} className="gap-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3 w-4/5" />
              </View>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title="작품 목록을 불러오지 못했어요"
            description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: () => refetch() }}
          />
        ) : !shelf ? (
          <EmptyState
            icon={CompareIcon}
            title={`${style.label} 작품은 아직 비교할 수 없어요`}
            description="다른 장르를 골라 보세요."
            action={{ label: '비교로 돌아가기', onPress: onBack }}
          />
        ) : itemWidth > 0 ? (
          <View className="flex-row flex-wrap" style={{ columnGap: gap, rowGap: gap + 8 }}>
            {shelf.pieces.map((piece) => (
              <View key={piece.pieceId} style={{ width: itemWidth }}>
                <PieceCard piece={piece} width={itemWidth} onPress={() => onOpen(piece)} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
