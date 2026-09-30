import { concertClock, daysLeft, formatShortDay, shortVenue } from '@/components/concert/concert-parts';
import { Badge } from '@/components/ui/badge';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Text } from '@/components/ui/text';
import type { Concert } from '@/lib/types/models';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

interface ConcertCardProps {
  concert: Concert;
  width: number;
  /** 날짜별로 묶지 않은 목록에서는 날짜를 카드에 적는다 */
  showDate?: boolean;
  /** 제목 아래에 덧붙는 줄 (찜한 아티스트 표시 등) */
  footer?: React.ReactNode;
}

/** 공연 포스터 카드. 공연 탭 목록과 찜한 아티스트 공연 선반이 같이 쓴다 */
export function ConcertCard({ concert, width, showDate = false, footer }: ConcertCardProps) {
  const router = useRouter();
  const days = daysLeft(concert.startDate);
  const time = concertClock(concert.concertTime);
  if (width <= 0) return null;
  const meta = showDate
    ? [formatShortDay(concert.startDate), shortVenue(concert.facilityName)]
    : [time, shortVenue(concert.facilityName)];
  return (
    <Pressable
      onPress={() => router.push(`/concert/${concert.id}` as Href)}
      accessibilityRole="link"
      style={{ width }}
      className="rounded-md web:hover:opacity-90">
      <View className="relative">
        <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={width} aspect={4 / 3} />
        {days === 0 ? <Badge tone="accent" label="오늘" className="absolute left-2 top-2" /> : null}
        {concert.status === 'cancelled' ? <Badge tone="danger" label="취소" className="absolute left-2 top-2" /> : null}
      </View>
      <Text numberOfLines={2} className="mt-2.5 text-body-sm font-semibold text-foreground">
        {concert.title}
      </Text>
      <Text variant="caption" numberOfLines={1} className="mt-1">
        {meta.filter(Boolean).join(' · ')}
      </Text>
      {footer}
    </Pressable>
  );
}
