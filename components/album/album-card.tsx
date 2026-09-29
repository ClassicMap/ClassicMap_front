import { RepertoireMark, RepertoireThumb } from '@/components/library/repertoire-badge';
import { Badge } from '@/components/ui/badge';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { RecordingListItem } from '@/lib/api/client';
import * as React from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';

/** 이 기간 안에 나온 앨범은 '새 앨범' 배지를 단다 */
const NEW_ALBUM_DAYS = 30;

/** 2025-05-16 → 2025.5.16 */
export function albumDate(album: Pick<RecordingListItem, 'releaseDate' | 'year'>): string {
  const raw = album.releaseDate ?? '';
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${year}.${Number(month)}.${Number(day)}`;
  return album.year ?? '';
}

function daysSince(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const time = new Date(`${releaseDate}T00:00:00`).getTime();
  if (Number.isNaN(time)) return null;
  return Math.floor((Date.now() - time) / 86_400_000);
}

/** 카드 위 상태 배지: 발매 예정, 최근 30일 안 발매 */
export function albumBadge(album: Pick<RecordingListItem, 'releaseDate' | 'isPreRelease'>): string | null {
  const since = daysSince(album.releaseDate);
  if (album.isPreRelease || (since !== null && since < 0)) return '발매 예정';
  if (since !== null && since <= NEW_ALBUM_DAYS) return '새 앨범';
  return null;
}

interface AlbumCardProps {
  album: RecordingListItem;
  width: number;
  inRepertoire?: boolean;
  onPress: () => void;
}

/** 앨범 카드: 정사각 커버(콘텐츠라 사각), 제목, 연주자, 레이블·발매일 */
export function AlbumCard({ album, width, inRepertoire = false, onPress }: AlbumCardProps) {
  const badge = albumBadge(album);
  const meta = [album.label, albumDate(album)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${album.title}, ${album.artistName}${badge ? `, ${badge}` : ''}. 앨범 정보 보기`}
      style={{ width }}
      className="rounded-md web:transition-opacity web:hover:opacity-90">
      <RepertoireThumb active={inRepertoire} shape="square" badgeSize={Math.max(18, Math.round(width / 8))}>
        <View>
          <EntityThumb name={album.title} image={album.coverUrl} shape="square" size={width} />
          {badge ? (
            <Badge tone={badge === '발매 예정' ? 'info' : 'accent'} label={badge} className="absolute left-2 top-2 bg-background/90" />
          ) : null}
        </View>
      </RepertoireThumb>
      <View className="mt-2.5 flex-row items-start gap-1">
        <Text numberOfLines={2} className="min-w-0 flex-1 text-body-sm font-semibold text-foreground">
          {album.title}
        </Text>
        {inRepertoire ? <RepertoireMark className="mt-1" /> : null}
      </View>
      <Text variant="caption" numberOfLines={1} className="mt-0.5 text-foreground-muted">
        {album.artistName}
      </Text>
      {meta ? (
        <Text variant="caption" numberOfLines={1} className="mt-0.5 text-foreground-subtle">
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface AlbumGridProps {
  albums: readonly RecordingListItem[];
  loading: boolean;
  wide: boolean;
  isInRepertoire: (album: RecordingListItem) => boolean;
  onOpen: (album: RecordingListItem) => void;
}

/** 폭에 맞춰 열 수를 정하는 앨범 그리드 */
export function AlbumGrid({ albums, loading, wide, isInRepertoire, onOpen }: AlbumGridProps) {
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 22 : 14;
  const minItem = wide ? 168 : 140;
  const columns = width > 0 ? Math.max(2, Math.floor((width + gap) / (minItem + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ columnGap: gap, rowGap: gap + 10 }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {loading
        ? Array.from({ length: Math.max(columns, 2) * 2 }, (_, index) => (
            <View key={index} style={{ width: itemWidth || minItem }} className="gap-2">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </View>
          ))
        : itemWidth > 0
          ? albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                width={itemWidth}
                inRepertoire={isInRepertoire(album)}
                onPress={() => onOpen(album)}
              />
            ))
          : null}
    </View>
  );
}

/** 가로 한 줄 앨범 선반 (담은 연주자의 새 앨범 등) */
export function AlbumShelf({
  albums,
  wide,
  isInRepertoire,
  onOpen,
}: Omit<AlbumGridProps, 'loading'>) {
  const size = wide ? 176 : 148;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          width={size}
          inRepertoire={isInRepertoire(album)}
          onPress={() => onOpen(album)}
        />
      ))}
    </ScrollView>
  );
}
