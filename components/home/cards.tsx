import { formatShortDay, shortVenue } from '@/components/concert/concert-parts';
import { RepertoireMark, RepertoireThumb } from '@/components/library/repertoire-badge';
import { OptimizedImage } from '@/components/optimized-image';
import { PieceCover } from '@/components/piece/piece-cover';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import type { RecentPiece } from '@/hooks/use-recent-pieces';
import { getEraColor } from '@/lib/design/era-palette';
import { genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import { type PrefetchTarget, usePrefetchOnHover } from '@/lib/navigation/prefetch';
import type { ComparisonPiece, Concert, Period } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { PlayIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

/**
 * 비교할 수 있는 작품. 작품은 콘텐츠라 사각이고, 장르 색 커버에 작곡가 초상을 녹인다.
 * 웹은 스포티파이 카드처럼 호버하면 바탕이 밝아지고 재생 버튼이 아래에서 올라온다.
 */
export function PieceCard({
  piece,
  width,
  onPress,
  reason,
  onDismiss,
}: {
  piece: ComparisonPiece;
  width: number;
  onPress: () => void;
  /** 추천 이유. 있으면 연주자 수 대신 보인다 */
  reason?: string;
  /** 추천에서 뺀다(관심 없음). 웹은 호버하면 버튼이 뜨고, 앱은 길게 누른다 */
  onDismiss?: () => void;
}) {
  const confirmDismiss = onDismiss
    ? () =>
        Alert.alert('이 곡을 추천에서 뺄까요?', '설정에서 들은 기록을 지우면 다시 보여요.', [
          { text: '취소', style: 'cancel' },
          { text: '관심 없음', style: 'destructive', onPress: onDismiss },
        ])
    : undefined;
  const genre = genreStyle(piece.genre);
  // 데스크톱은 호버, 터치는 누르기 시작할 때 다음 화면 데이터를 미리 받는다
  const prefetch = usePrefetchOnHover({ kind: 'piece', pieceId: piece.pieceId, composerId: piece.composerId });
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      onLongPress={Platform.OS === 'web' ? undefined : confirmDismiss}
      accessibilityRole="link"
      accessibilityLabel={`${piece.composerName} ${piece.pieceTitle}${genre ? `, ${genre.label}` : ''} 비교하기`}
      accessibilityActions={onDismiss ? [{ name: 'dismiss', label: '관심 없음' }] : undefined}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === 'dismiss' && onDismiss?.()}
      className="cm-card group -m-2 rounded-xl p-2 active:bg-surface-2 web:hover:bg-surface-2">
      <View>
        <PieceCover
          title={piece.pieceTitle}
          genre={piece.genre}
          portrait={piece.composerAvatarUrl}
          size={width}
        />
        {onDismiss && Platform.OS === 'web' ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={`${piece.pieceTitle} 관심 없음`}
            hitSlop={6}
            className="absolute right-2 top-2 h-7 flex-row items-center gap-1 rounded-full bg-black/60 px-2 opacity-0 web:transition-opacity web:duration-fast web:focus-visible:opacity-100 web:group-hover:opacity-100">
            <Icon as={XIcon} size={12} className="text-white" />
            <Text className="text-micro font-semibold text-white">관심 없음</Text>
          </Pressable>
        ) : null}
        {/* 데스크톱 호버에서만 드러나는 재생 버튼. 아래에서 올라오며 나타난다 */}
        {Platform.OS === 'web' ? (
          <View className="cm-play-fab absolute bottom-2 right-2 size-11 items-center justify-center rounded-full bg-primary">
            <Icon
              as={PlayIcon}
              size={17}
              className="ml-0.5 fill-primary-foreground text-primary-foreground"
            />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {piece.pieceTitle}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-0.5">
        {reason ? piece.composerName : `${piece.composerName} · 연주자 ${piece.performerCount}`}
      </Text>
      {reason ? (
        <Text numberOfLines={1} className="mt-0.5 text-caption font-semibold text-primary">
          {reason}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** 사람(연주자·작곡가)은 원형 */
export function PersonCard({
  name,
  image,
  caption,
  width,
  onPress,
  inRepertoire = false,
  prefetchTarget,
}: {
  name: string;
  image?: string | null;
  caption?: string;
  width: number;
  onPress: () => void;
  /** 레퍼토리에 담긴 사람이면 사진 모서리 배지와 이름 옆 표시 */
  inRepertoire?: boolean;
  /** 호버·누르기 시작에 미리 받을 다음 화면 */
  prefetchTarget?: PrefetchTarget;
}) {
  const prefetch = usePrefetchOnHover(prefetchTarget);
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={inRepertoire ? `${name}, 레퍼토리에 있어요` : name}
      className="cm-card -m-2 items-center rounded-xl p-2 active:bg-surface-2 web:hover:bg-surface-2">
      <RepertoireThumb active={inRepertoire} badgeSize={Math.max(18, Math.min(30, Math.round(width / 5)))}>
        <EntityThumb name={name} image={image} shape="circle" size={width} />
      </RepertoireThumb>
      <View className="mt-2.5 max-w-full flex-row items-center justify-center gap-1">
        <Text numberOfLines={1} className="shrink text-center text-body-sm font-semibold text-foreground">
          {name}
        </Text>
        {inRepertoire ? <RepertoireMark /> : null}
      </View>
      {caption ? (
        <Text variant="caption" numberOfLines={1} className="mt-0.5 text-center">
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** 공연 포스터. KOPIS 포스터는 세로가 길어 3:4로 자른다 */
export function ConcertCard({ concert, width, onPress }: { concert: Concert; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={concert.title}
      className="cm-card -m-2 rounded-xl p-2 active:bg-surface-2 web:hover:bg-surface-2">
      <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={width} aspect={4 / 3} />
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {concert.title}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-0.5">
        {[formatShortDay(concert.startDate), shortVenue(concert.facilityName)].filter(Boolean).join(' · ')}
      </Text>
    </Pressable>
  );
}

/**
 * 시대로 듣기 타일: 시대 색 면 + 대표 작곡가 초상을 눕혀 깔고 연대 범위를 쓴다.
 * 작곡가 수는 계속 바뀌는 값이라 쓰지 않는다 (설계 문서 7.1).
 */
export function EraTile({
  era,
  portrait,
  height,
  onPress,
}: {
  era: Period;
  portrait?: string | null;
  height: number;
  onPress: () => void;
}) {
  const [width, setWidth] = React.useState(0);
  const tint = getEraColor(era.name)?.base ?? '#555';
  return (
    <Pressable
      onPress={onPress}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="link"
      accessibilityLabel={`${era.name} 시대 타임라인 보기`}
      className="cm-tile overflow-hidden rounded-lg bg-surface-3"
      style={{ height }}>
      {/* 초상은 세로가 길다. 폭에 맞춰 위쪽(얼굴)부터 보이게 깐다 */}
      {portrait && width > 0 ? (
        <OptimizedImage
          uri={portrait}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, width, height: Math.max(height, width * 1.25) }}
        />
      ) : null}
      <View className="absolute inset-0" style={{ backgroundColor: tint, opacity: portrait ? 0.42 : 0.85 }} />
      <Scrim from="bottom" opacity={0.72} extent={80} />
      <View className="flex-1 justify-end p-3">
        <Text className="text-headline font-bold text-white">{era.name}</Text>
        <Text variant="mono" className="mt-0.5 text-white/80">
          {`${era.startYear}–${era.endYear}`}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * 최근 본 작품: 가로로 눕힌 작은 타일 (스포티파이 첫 줄 바로가기).
 * 웹은 호버하면 바탕이 밝아지고 오른쪽에 재생 버튼이 뜬다. 홈 위쪽 색 번짐도 이 작품 색으로 바뀐다
 */
export function RecentTile({
  item,
  onPress,
  onHoverChange,
  className,
}: {
  item: RecentPiece;
  onPress: () => void;
  /** 웹 호버. 들어오면 이 작품 장르(없으면 null), 나가면 undefined. 홈 위쪽 색 번짐을 바꾼다 */
  onHoverChange?: (genre: PieceGenre | null | undefined) => void;
  className?: string;
}) {
  const prefetch = usePrefetchOnHover({
    kind: 'piece',
    pieceId: item.pieceId,
    composerId: item.composerId,
    sectorId: item.sectorId,
  });
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      onHoverIn={() => {
        prefetch.onHoverIn?.();
        onHoverChange?.(item.genre ?? null);
      }}
      onHoverOut={() => {
        prefetch.onHoverOut?.();
        onHoverChange?.(undefined);
      }}
      accessibilityRole="link"
      accessibilityLabel={`${item.composerName} ${item.pieceTitle} 다시 보기`}
      className={cn(
        'cm-card group h-14 flex-row items-center gap-3 overflow-hidden rounded-md bg-surface-2 pr-3 active:bg-surface-3 web:hover:bg-surface-3',
        className
      )}>
      <PieceCover
        title={item.pieceTitle}
        genre={item.genre}
        portrait={item.composerAvatarUrl}
        size={56}
        radius={0}
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-label font-semibold text-foreground">
          {item.pieceTitle}
        </Text>
        <Text numberOfLines={1} className="text-caption text-foreground-muted">
          {item.sectorName ? `${item.composerName} · ${item.sectorName}` : item.composerName}
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        <View className="cm-play-fab size-8 items-center justify-center rounded-full bg-primary">
          <Icon
            as={PlayIcon}
            size={13}
            className="ml-0.5 fill-primary-foreground text-primary-foreground"
          />
        </View>
      ) : null}
    </Pressable>
  );
}
