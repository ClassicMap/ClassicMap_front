import { formatShortDay, shortVenue } from '@/features/concert/components/concert-parts';
import { RepertoireMark, RepertoireThumb } from '@/features/library/components/repertoire-badge';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { PieceArt } from '@/features/piece/components/piece-art';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RecentPiece } from '@/hooks/use-recent-pieces';
import { getEraColor } from '@/lib/design/era-palette';
import { genreStyle } from '@/lib/design/genre-palette';
import { t, useLocale } from '@/lib/i18n';
import { type PrefetchTarget, usePrefetchOnHover } from '@/lib/navigation/prefetch';
import type { ComparisonPiece, Concert, Period } from '@/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { playPiece } from '@/lib/player/play-piece';
import { PauseIcon, PlayIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { QueueAddMenu } from '@/features/player/components/queue-add-menu';
import { queueLongPressProps } from '@/features/player/lib/queue-actions';

/** 웹 전용 움직임 클래스(global.css 카드·커버 움직임). 같은 규칙이 네이티브로도 컴파일돼서 웹에서만 단다 */
const WEB_CARD = Platform.OS === 'web' ? 'cm-card' : undefined;
const WEB_TILE = Platform.OS === 'web' ? 'cm-tile' : undefined;

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
  hideGenre = false,
  list,
  listName,
}: {
  piece: ComparisonPiece;
  width: number;
  onPress: () => void;
  /** 추천 이유. 있으면 연주자 수 대신 보인다 */
  reason?: string;
  /** 추천에서 뺀다(관심 없음). 웹은 호버하면 버튼이 뜨고, 앱은 길게 눌러 뜨는 시트에 있다 */
  onDismiss?: () => void;
  /** 한 장르만 모인 화면에서는 부제에 장르 대신 연주자 수를 쓴다 */
  hideGenre?: boolean;
  /** 이 카드가 놓인 목록(선반). 재생하면 이 목록이 재생 목록이 되어 다음 곡으로 이어진다 */
  list?: readonly ComparisonPiece[];
  /** 대기열 패널에 보일 그 목록 이름(선반 제목) */
  listName?: string;
}) {
  useLocale();
  const confirmDismiss = onDismiss
    ? () =>
        Alert.alert(t('이 곡을 추천에서 뺄까요?'), t('설정에서 들은 기록을 지우면 다시 보여요.'), [
          { text: t('취소'), style: 'cancel' },
          { text: t('관심 없음'), style: 'destructive', onPress: onDismiss },
        ])
    : undefined;
  const genre = genreStyle(piece.genre);
  const isCurrent = useComparePlayer((state) => state.current?.pieceId === piece.pieceId);
  const playing = useComparePlayer((state) => state.playing && state.current?.pieceId === piece.pieceId);
  // 그 자리에서 바로 튼다(영상은 하단 플레이바). 틀 연주가 없으면 비교 화면을 연다
  const playHere = () => {
    playPiece({ pieceId: piece.pieceId }, list, listName)
      .then((played) => !played && onPress())
      .catch(() => onPress());
  };
  // 데스크톱은 호버, 터치는 누르기 시작할 때 다음 화면 데이터를 미리 받는다
  const prefetch = usePrefetchOnHover({ kind: 'piece', pieceId: piece.pieceId, composerId: piece.composerId });
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      // 앱: 길게 누르면 대기열 동작 시트(추천 카드면 「관심 없음」도 함께)
      {...(Platform.OS === 'web'
        ? null
        : queueLongPressProps(() => ({
            piece,
            title: piece.pieceTitle,
            subtitle: piece.composerName,
            onDismiss: confirmDismiss,
          })))}
      accessibilityRole="link"
      accessibilityLabel={t('{title} 비교하기', {
        title: `${piece.composerName} ${piece.pieceTitle}${genre ? `, ${t(genre.label)}` : ''}`,
      })}
      accessibilityActions={onDismiss ? [{ name: 'dismiss', label: t('관심 없음') }] : undefined}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === 'dismiss' && onDismiss?.()}
      className={cn(WEB_CARD, 'group -m-1.5 rounded-xl p-1.5 active:bg-surface-2 web:hover:bg-surface-2')}>
      <View>
        <PieceArt
          coverVideoId={piece.coverVideoId}
          performers={piece.performers}
          fallbackImage={piece.composerAvatarUrl}
          fallbackName={piece.composerName}
          size={width}
        />
        {onDismiss && Platform.OS === 'web' ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('{title} 관심 없음', { title: piece.pieceTitle })}
            hitSlop={6}
            className="absolute right-2 top-2 h-7 flex-row items-center gap-1 rounded-full bg-black/60 px-2 opacity-0 web:transition-opacity web:duration-fast web:focus-visible:opacity-100 web:group-hover:opacity-100">
            <Icon as={XIcon} size={12} className="text-white" />
            <Text className="text-micro font-semibold text-white">{t('관심 없음')}</Text>
          </Pressable>
        ) : null}
        {/* 데스크톱 호버에서 재생 버튼과 함께 뜨는 ⋯: 다음에 재생·대기열에 추가 */}
        {Platform.OS === 'web' ? (
          <QueueAddMenu
            piece={piece}
            title={piece.pieceTitle}
            tone="onArt"
            className="cm-play-fab absolute bottom-2 left-2"
            openClassName="cm-play-fab-on"
          />
        ) : (
          // 앱: 표지 오른쪽 위에 늘 보이는 ⋯ (길게 누르기와 같은 시트). 아래쪽은 연주자 얼굴이 쓴다
          <QueueAddMenu
            piece={piece}
            title={piece.pieceTitle}
            subtitle={piece.composerName}
            onDismiss={confirmDismiss}
            tone="onArt"
            className="absolute right-1.5 top-1.5 size-7"
          />
        )}
        {/* 데스크톱 호버에서 아래에서 올라오는 재생 버튼. 그 자리에서 바로 튼다.
            지금 듣는 작품이면 일시정지 버튼으로 늘 떠 있다 */}
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={isCurrent ? () => comparePlayer.togglePlay() : playHere}
            accessibilityRole="button"
            accessibilityLabel={
              playing
                ? t('{title} 일시정지', { title: piece.pieceTitle })
                : t('{title} 바로 듣기', { title: piece.pieceTitle })
            }
            className={cn(
              'cm-play-fab absolute bottom-2 right-2 size-11 items-center justify-center rounded-full bg-primary web:shadow-lg web:shadow-black/40',
              isCurrent && 'cm-play-fab-on'
            )}>
            <Icon
              as={playing ? PauseIcon : PlayIcon}
              size={17}
              className={cn('fill-primary-foreground text-primary-foreground', !playing && 'ml-0.5')}
            />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {piece.pieceTitle}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-0.5">
        {[
          piece.composerName,
          (!hideGenre && genre && t(genre.label)) || t('연주자 {count}', { count: piece.performerCount }),
        ].join(' · ')}
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
  useLocale();
  const prefetch = usePrefetchOnHover(prefetchTarget);
  return (
    <Pressable
      {...prefetch}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={inRepertoire ? t('{name}, 레퍼토리에 있어요', { name }) : name}
      className={cn(WEB_CARD, '-m-1.5 items-center rounded-xl p-1.5 active:bg-surface-2 web:hover:bg-surface-2')}>
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
  useLocale();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={concert.title}
      className={cn(WEB_CARD, '-m-1.5 rounded-xl p-1.5 active:bg-surface-2 web:hover:bg-surface-2')}>
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
 * 시대로 듣기 타일: 장르 타일과 같은 꼴(단색 면 + 왼쪽 위 이름 + 오른쪽 아래 비스듬한 초상).
 * 초상에 시대 색을 덧칠하던 꼴은 걷었다. 작곡가 수는 계속 바뀌는 값이라 쓰지 않는다 (설계 문서 7.1).
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
  useLocale();
  const color = getEraColor(era.name)?.tile ?? '#4A4540';
  const art = Math.round(height * 0.66);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={t('{name} 시대 타임라인 보기', { name: t(era.name) })}
      className={cn(WEB_TILE, 'overflow-hidden rounded-lg')}
      style={{ height, backgroundColor: color }}>
      {portrait ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: art,
            height: art,
            right: -Math.round(art * 0.14),
            bottom: -Math.round(art * 0.08),
            transform: [{ rotate: '25deg' }],
            borderRadius: 4,
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? { boxShadow: '0 4px 14px rgba(0,0,0,0.38)' } : null),
          }}>
          <OptimizedImage uri={portrait} resizeMode="cover" style={{ width: art, height: art }} />
        </View>
      ) : null}
      <View className="p-3">
        <Text className="text-headline font-extrabold text-white">{t(era.name)}</Text>
        <Text className="mt-0.5 text-caption font-semibold text-white/75">{`${era.startYear}–${era.endYear}`}</Text>
      </View>
    </Pressable>
  );
}

/**
 * 최근 본 작품: 가로로 눕힌 작은 타일 (스포티파이 첫 줄 바로가기).
 * 웹은 호버하면 바탕이 밝아지고 오른쪽에 재생 버튼이 뜬다
 */
export function RecentTile({
  item,
  onPress,
  className,
}: {
  item: RecentPiece;
  onPress: () => void;
  className?: string;
}) {
  useLocale();
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
      accessibilityRole="link"
      accessibilityLabel={t('{title} 다시 보기', { title: `${item.composerName} ${item.pieceTitle}` })}
      className={cn(
        WEB_CARD,
        'group h-14 flex-row items-center gap-3 overflow-hidden rounded-md bg-surface-2 pr-3 active:bg-surface-3 web:hover:bg-surface-3',
        className
      )}>
      <PieceArt coverVideoId={item.coverVideoId} fallbackImage={item.composerAvatarUrl} fallbackName={item.composerName} size={56} radius={0} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-label font-semibold text-foreground">
          {item.pieceTitle}
        </Text>
        <Text numberOfLines={1} className="text-caption text-foreground-muted">
          {item.sectorName ? `${item.composerName} · ${item.sectorName}` : item.composerName}
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        <View className="cm-play-fab size-8 items-center justify-center rounded-full bg-primary web:shadow-md web:shadow-black/30">
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
