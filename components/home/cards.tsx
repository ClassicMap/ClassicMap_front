import { formatShortDay, shortVenue } from '@/components/concert/concert-parts';
import { RepertoireMark, RepertoireThumb } from '@/components/library/repertoire-badge';
import { OptimizedImage } from '@/components/optimized-image';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import type { RecentPiece } from '@/hooks/use-recent-pieces';
import { getEraColor } from '@/lib/design/era-palette';
import type { ComparisonPiece, Concert, Period } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 비교할 수 있는 작품. 작품은 콘텐츠라 사각이고, 음반 연결이 없어 작곡가 초상을 쓴다 */
export function PieceCard({ piece, width, onPress }: { piece: ComparisonPiece; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${piece.composerName} ${piece.pieceTitle} 비교하기`}
      className="group">
      <View>
        <EntityThumb name={piece.pieceTitle} image={piece.composerAvatarUrl} shape="square" size={width} />
        {/* 데스크톱 호버에서만 드러나는 재생 버튼 (1차 시안 .pbtn) */}
        <View className="absolute bottom-2 right-2 size-10 items-center justify-center rounded-full bg-primary opacity-0 web:transition-opacity web:duration-fast web:group-hover:opacity-100">
          <Icon as={PlayIcon} size={16} className="ml-0.5 fill-primary-foreground text-primary-foreground" />
        </View>
      </View>
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {piece.pieceTitle}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-0.5">
        {`${piece.composerName} · 연주자 ${piece.performerCount}`}
      </Text>
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
}: {
  name: string;
  image?: string | null;
  caption?: string;
  width: number;
  onPress: () => void;
  /** 레퍼토리에 담긴 사람이면 사진 모서리 배지와 이름 옆 표시 */
  inRepertoire?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={inRepertoire ? `${name}, 레퍼토리에 있어요` : name}
      className="items-center rounded-lg web:transition-opacity web:hover:opacity-90">
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
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={concert.title} className="web:hover:opacity-90">
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
      className="overflow-hidden rounded-lg bg-surface-3 web:transition-opacity web:hover:opacity-90"
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

/** 최근 본 작품: 가로로 눕힌 작은 타일 (Spotify 첫 줄 바로가기) */
export function RecentTile({ item, onPress, className }: { item: RecentPiece; onPress: () => void; className?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${item.composerName} ${item.pieceTitle} 다시 보기`}
      className={cn(
        'h-14 flex-row items-center gap-3 overflow-hidden rounded-md bg-surface-2 pr-3 active:bg-surface-3 web:transition-colors web:duration-fast web:hover:bg-surface-3',
        className
      )}>
      <EntityThumb name={item.pieceTitle} image={item.composerAvatarUrl} shape="square" size={56} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-label font-semibold text-foreground">
          {item.pieceTitle}
        </Text>
        <Text numberOfLines={1} className="text-caption text-foreground-muted">
          {item.sectorName ? `${item.composerName} · ${item.sectorName}` : item.composerName}
        </Text>
      </View>
    </Pressable>
  );
}
