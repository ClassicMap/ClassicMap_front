import { formatShortDay, shortVenue } from '@/features/concert/components/concert-parts';
import { Chip } from '@/components/ui/chip';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RatedConcertListItem } from '@/lib/api/client';
import { msg, t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { StarIcon } from 'lucide-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';

export type RatingSortKey = 'recent' | 'highest' | 'lowest' | 'concertDate';

export const RATING_SORTS: { key: RatingSortKey; label: string }[] = [
  { key: 'recent', label: msg('최근 평가순') },
  { key: 'highest', label: msg('높은 별점순') },
  { key: 'lowest', label: msg('낮은 별점순') },
  { key: 'concertDate', label: msg('공연일순') },
];

export function sortRatings(ratings: readonly RatedConcertListItem[], key: RatingSortKey): RatedConcertListItem[] {
  return [...ratings].sort((a, b) => {
    switch (key) {
      case 'highest':
        return b.myRating - a.myRating;
      case 'lowest':
        return a.myRating - b.myRating;
      case 'concertDate':
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      case 'recent':
      default:
        return new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime();
    }
  });
}

export interface RatingStats {
  count: number;
  average: number;
  fiveStars: number;
}

export function ratingStats(ratings: readonly RatedConcertListItem[]): RatingStats {
  const count = ratings.length;
  const average = count > 0 ? Math.round((ratings.reduce((sum, item) => sum + item.myRating, 0) / count) * 10) / 10 : 0;
  return { count, average, fiveStars: ratings.filter((item) => item.myRating >= 5).length };
}

/** 사람은 원형. 사진이 없으면 이름 첫 글자 타일 */
export function ProfileAvatar({ name, uri, size }: { name: string; uri?: string | null; size: number }) {
  useLocale();
  return <EntityThumb name={name} image={uri} shape="circle" size={size} />;
}

export function StatTile({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  useLocale();
  return (
    <View className="flex-1 rounded-lg bg-surface-2 px-3.5 py-3">
      <Text className={cn('text-[24px] font-bold leading-8 tabular-nums', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function RatingStars({ value, size = 13 }: { value: number; size?: number }) {
  useLocale();
  const rounded = Math.round(value);
  return (
    <View className="flex-row gap-px" accessibilityLabel={t('별점 {count}점', { count: value })}>
      {Array.from({ length: 5 }, (_, index) => (
        <Icon
          key={index}
          as={StarIcon}
          size={size}
          className={index < rounded ? 'fill-primary text-primary' : 'fill-surface-3 text-surface-3'}
        />
      ))}
    </View>
  );
}

interface RatingGridProps {
  ratings: readonly RatedConcertListItem[];
  sortKey: RatingSortKey;
  onSortChange: (key: RatingSortKey) => void;
  onOpen: (concertId: number) => void;
  /** 이 폭보다 좁아지지 않게 칸 수를 정한다 */
  minItemWidth: number;
}

/** 평가한 공연: 포스터 그리드 + 별점. 칸 폭은 부모 폭에서 계산한다 */
export function RatingGrid({ ratings, sortKey, onSortChange, onOpen, minItemWidth }: RatingGridProps) {
  const { locale } = useLocale();
  const [width, setWidth] = React.useState(0);
  const gap = 16;
  const columns = width > 0 ? Math.max(2, Math.floor((width + gap) / (minItemWidth + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;
  const sorted = React.useMemo(() => sortRatings(ratings, sortKey), [ratings, sortKey, locale]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {RATING_SORTS.map((option) => (
          <Chip
            key={option.key}
            label={t(option.label)}
            selected={sortKey === option.key}
            onPress={() => onSortChange(option.key)}
          />
        ))}
      </ScrollView>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        className="mt-4 flex-row flex-wrap"
        style={{ columnGap: gap, rowGap: gap + 8 }}>
        {itemWidth > 0
          ? sorted.map((rating) => (
              <Pressable
                key={rating.concertId}
                onPress={() => onOpen(rating.concertId)}
                accessibilityRole="link"
                accessibilityLabel={t('{title} 별점 {count}점', { title: rating.title, count: rating.myRating })}
                style={{ width: itemWidth }}
                className="web:hover:opacity-90">
                <EntityThumb name={rating.title} image={rating.posterUrl} shape="square" size={itemWidth} aspect={4 / 3} />
                <View className="mt-2">
                  <RatingStars value={rating.myRating} />
                </View>
                <Text numberOfLines={2} className="mt-1.5 text-body-sm font-semibold text-foreground">
                  {rating.title}
                </Text>
                <Text variant="caption" numberOfLines={1} className="mt-0.5">
                  {[formatShortDay(rating.startDate), shortVenue(rating.facilityName ?? undefined)].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ))
          : null}
      </View>
    </View>
  );
}
