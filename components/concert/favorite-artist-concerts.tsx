import { ConcertCard } from '@/components/concert/concert-card';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { type FavoriteArtistRef, useFavoriteArtistConcerts } from '@/lib/query/hooks/useConcerts';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

interface FavoriteArtistConcertsProps {
  artists: readonly FavoriteArtistRef[];
  /** 오늘 (YYYY-MM-DD) */
  from: string;
  cardWidth: number;
}

function FeaturingLine({ artists }: { artists: FavoriteArtistRef[] }) {
  const [first, ...rest] = artists;
  return (
    <View className="mt-1.5 flex-row items-center gap-1.5">
      <View className="flex-row">
        {artists.slice(0, 3).map((artist, index) => (
          <View
            key={artist.artistId}
            className="rounded-full border-2 border-background web:border-surface-1"
            style={{ marginLeft: index === 0 ? 0 : -6 }}>
            <EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={18} />
          </View>
        ))}
      </View>
      <Text numberOfLines={1} className="min-w-0 flex-1 text-caption font-medium text-primary">
        {rest.length > 0 ? `${first.name} 외 ${rest.length}명` : first.name}
      </Text>
    </View>
  );
}

/**
 * 찜한 아티스트가 나오는 공연을 필터와 상관없이 목록 위에 따로 모은다.
 * 출연진 이름으로 찾기 때문에 동명이인이 섞일 수 있어, 어떤 아티스트로 찾았는지 카드에 적는다.
 */
export function FavoriteArtistConcerts({ artists, from, cardWidth }: FavoriteArtistConcertsProps) {
  const { items, isLoading, isError, refetch } = useFavoriteArtistConcerts(artists, from);

  if (isLoading && items.length === 0) {
    return (
      <View className="mt-7">
        <Skeleton className="h-5 w-44" />
        <View className="mt-3.5 flex-row gap-[18px]">
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={{ width: cardWidth }} className="gap-2">
              <Skeleton className="w-full rounded-md" style={{ aspectRatio: 4 / 3 }} />
              <Skeleton className="h-3.5 w-4/5" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="mt-7 flex-row items-center gap-3">
        <Text variant="caption">찜한 아티스트 공연을 불러오지 못했어요.</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text className="text-caption font-semibold text-primary">다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View className="mt-7">
      <View className="flex-row items-baseline gap-2.5">
        <Text className="text-[18px] font-bold text-foreground">찜한 아티스트 공연</Text>
        <Text variant="caption">{items.length}개 · 출연진에 이름이 있는 공연이에요</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3.5"
        contentContainerClassName="gap-[18px]">
        {items.map(({ concert, artists: featured }) => (
          <ConcertCard
            key={concert.id}
            concert={concert}
            width={cardWidth}
            showDate
            footer={<FeaturingLine artists={featured} />}
          />
        ))}
      </ScrollView>
    </View>
  );
}
