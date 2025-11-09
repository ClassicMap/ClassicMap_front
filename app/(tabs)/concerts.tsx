import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, Image } from 'react-native';
import { CalendarIcon, MapPinIcon, TicketIcon } from 'lucide-react-native';
import * as React from 'react';

const CONCERTS = [
  {
    id: '1',
    title: '조성진 피아노 리사이틀',
    composer: '쇼팽, 라벨',
    venue: '롯데콘서트홀',
    date: '2025.03.15',
    time: '19:30',
    price: '100,000원~',
    poster: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&h=1200&fit=crop',
  },
  {
    id: '2',
    title: '베를린 필하모닉 내한공연',
    composer: '말러 교향곡 5번',
    venue: '예술의전당 콘서트홀',
    date: '2025.04.20',
    time: '19:00',
    price: '150,000원~',
    poster: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&h=1200&fit=crop',
  },
  {
    id: '3',
    title: '임윤찬과 서울시향',
    composer: '라흐마니노프 피아노 협주곡 2번',
    venue: '롯데콘서트홀',
    date: '2025.05.10',
    time: '20:00',
    price: '80,000원~',
    poster: 'https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=800&h=1200&fit=crop',
  },
];

export default function ConcertsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-4">
        <View className="gap-2">
          <Text variant="h1" className="text-3xl font-bold">
            공연 일정
          </Text>
          <Text className="text-muted-foreground">
            통합된 클래식 공연 정보와 예매
          </Text>
        </View>

        {/* Filter */}
        <View className="flex-row gap-2">
          <Button size="sm" className="rounded-full">
            <Text className="text-sm">전체</Text>
          </Button>
          <Button size="sm" variant="outline" className="rounded-full">
            <Text className="text-sm">이번 달</Text>
          </Button>
          <Button size="sm" variant="outline" className="rounded-full">
            <Text className="text-sm">추천</Text>
          </Button>
        </View>

        {/* Concert List */}
        <View className="gap-4">
          {CONCERTS.map((concert) => (
            <ConcertCard key={concert.id} concert={concert} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ConcertCard({ concert }: { concert: typeof CONCERTS[0] }) {
  return (
    <Card className="overflow-hidden p-0">
      <View className="flex-row">
        <View className="w-32 aspect-[3/4] bg-muted">
          <Image 
            source={{ uri: concert.poster }} 
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1 gap-4 p-4">
          <View className="gap-2">
            <Text className="text-xl font-bold">{concert.title}</Text>
            <Text className="text-muted-foreground">{concert.composer}</Text>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Icon as={MapPinIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">{concert.venue}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">
                {concert.date} {concert.time}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={TicketIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">{concert.price}</Text>
            </View>
          </View>

          <Button>
            <Text>예매하기</Text>
          </Button>
        </View>
      </View>
    </Card>
  );
}
