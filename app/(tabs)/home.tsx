// app/(tabs)/home.tsx
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, FlatList, Image, Pressable } from 'react-native';
import { StarIcon, TrendingUpIcon, CalendarIcon, PlayCircleIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { MOCK_ARTISTS } from '@/lib/data/mockDatabase';
import { getPopularComparisons, getAllPeriods } from '@/lib/data/mockDTO';

// 레거시 형식으로 변환
const ARTISTS = MOCK_ARTISTS.slice(0, 5).map(artist => ({
  id: String(artist.id),
  name: artist.name,
  category: artist.category,
  tier: artist.tier as 'S' | 'Rising',
  rating: artist.rating,
  image: artist.imageUrl || '',
}));

const UPCOMING_CONCERTS = [
  { 
    id: '1', 
    title: '조성진 피아노 리사이틀', 
    date: '2025.03.15', 
    venue: '롯데콘서트홀',
    poster: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&h=1200&fit=crop'
  },
  { 
    id: '2', 
    title: '베를린 필하모닉', 
    date: '2025.04.20', 
    venue: '예술의전당',
    poster: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&h=1200&fit=crop'
  },
  { 
    id: '3', 
    title: '임윤찬과 서울시향', 
    date: '2025.05.10', 
    venue: '롯데콘서트홀',
    poster: 'https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=800&h=1200&fit=crop'
  },
  { 
    id: '4', 
    title: '빈 필하모닉', 
    date: '2025.06.01', 
    venue: '예술의전당',
    poster: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=1200&fit=crop'
  },
];

const POPULAR_COMPARISONS = getPopularComparisons();

const RECOMMENDED_PERIODS = getAllPeriods().map(era => ({
  id: era.id,
  period: era.name,
  emoji: era.emoji,
  composer: era.keyComposers[0],
}));

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-4 pb-20">
        {/* Header */}
        <View className="gap-2">
          <Text variant="h1" className="text-3xl font-bold">
            안녕하세요{user?.firstName ? `, ${user.firstName}님` : ''}! 👋
          </Text>
          <Text className="text-muted-foreground">
            오늘도 클래식과 함께하세요
          </Text>
        </View>

        {/* 추천 아티스트 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">주목받는 아티스트</Text>
            <Button 
              variant="ghost" 
              size="sm"
              onPress={() => router.push('/(tabs)/artists')}
            >
              <Text className="text-sm text-primary">전체보기</Text>
            </Button>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={ARTISTS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ArtistCard artist={item} />}
            ItemSeparatorComponent={() => <View className="w-3" />}
            contentContainerClassName="pr-4"
          />
        </View>

        {/* 다가오는 공연 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">다가오는 공연</Text>
            <Button 
              variant="ghost" 
              size="sm"
              onPress={() => router.push('/(tabs)/concerts')}
            >
              <Text className="text-sm text-primary">전체보기</Text>
            </Button>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={UPCOMING_CONCERTS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConcertCard concert={item} />}
            ItemSeparatorComponent={() => <View className="w-3" />}
            contentContainerClassName="pr-4"
          />
        </View>

        {/* 인기 비교 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">인기 연주 비교</Text>
            <Button 
              variant="ghost" 
              size="sm"
              onPress={() => router.push('/(tabs)/compare')}
            >
              <Text className="text-sm text-primary">전체보기</Text>
            </Button>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={POPULAR_COMPARISONS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ComparisonCard comparison={item} />}
            ItemSeparatorComponent={() => <View className="w-3" />}
            contentContainerClassName="pr-4"
          />
        </View>

        {/* 시대별 탐험 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">시대별 탐험</Text>
            <Button 
              variant="ghost" 
              size="sm"
              onPress={() => router.push('/(tabs)/timeline')}
            >
              <Text className="text-sm text-primary">전체보기</Text>
            </Button>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={RECOMMENDED_PERIODS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PeriodCard period={item} />}
            ItemSeparatorComponent={() => <View className="w-3" />}
            contentContainerClassName="pr-4"
          />
        </View>
      </View>
    </ScrollView>
  );
}

// 아티스트 카드
function ArtistCard({ artist }: { artist: typeof ARTISTS[0] }) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/artist/${artist.id}`);
  };

  return (
    <Pressable onPress={handlePress}>
      <Card className="w-[160px] p-3">
        <View className="gap-2">
          <Avatar alt={artist.name} className="size-16 self-center">
            <AvatarImage source={{ uri: artist.image }} />
            <AvatarFallback>
              <Text>{artist.name[0]}</Text>
            </AvatarFallback>
          </Avatar>
          <View className="gap-1">
            <View className="flex-row items-center gap-1">
              <Text className="flex-1 font-semibold" numberOfLines={1}>
                {artist.name}
              </Text>
              {artist.tier === 'S' ? (
                <View className="rounded bg-amber-500 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">S</Text>
                </View>
              ) : (
                <Icon as={TrendingUpIcon} size={12} className="text-blue-500" />
              )}
            </View>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {artist.category}
            </Text>
            <View className="flex-row items-center gap-1">
              <Icon as={StarIcon} size={10} className="text-amber-500" />
              <Text className="text-xs font-medium">{artist.rating}</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// 공연 카드
function ConcertCard({ concert }: { concert: typeof UPCOMING_CONCERTS[0] }) {
  return (
    <Card className="w-[200px] overflow-hidden p-0">
      <View className="aspect-[3/4] bg-muted">
        <Image 
          source={{ uri: concert.poster }} 
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <View className="gap-3 p-3">
        <View className="gap-1">
          <Text className="font-semibold" numberOfLines={2}>
            {concert.title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon as={CalendarIcon} size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">{concert.date}</Text>
          </View>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {concert.venue}
          </Text>
        </View>
        <Button size="sm">
          <Text className="text-xs">예매</Text>
        </Button>
      </View>
    </Card>
  );
}

// 비교 카드
function ComparisonCard({ comparison }: { comparison: typeof POPULAR_COMPARISONS[0] }) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push({
      pathname: '/(tabs)/compare',
      params: { 
        composerId: String(comparison.composerId),
        pieceId: String(comparison.pieceId)
      }
    });
  };

  return (
    <Card className="w-[180px] gap-2 p-3">
      <View className="gap-1">
        <Text className="text-sm font-semibold" numberOfLines={2}>
          {comparison.piece}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {comparison.artists}
        </Text>
      </View>
      <Button size="sm" variant="outline" onPress={handlePress}>
        <Icon as={PlayCircleIcon} size={14} />
        <Text className="text-xs ml-1">비교 듣기</Text>
      </Button>
    </Card>
  );
}

// 시대 카드
function PeriodCard({ period }: { period: typeof RECOMMENDED_PERIODS[0] }) {
  const colors = {
    '바로크': 'bg-purple-500',
    '고전': 'bg-blue-500',
    '낭만': 'bg-pink-500',
    '근현대': 'bg-green-500',
  };

  return (
    <Card className="w-[140px] overflow-hidden p-0">
      <View className={`${colors[period.period as keyof typeof colors]} p-4`}>
        <Text className="text-center text-4xl">{period.emoji}</Text>
      </View>
      <View className="gap-1 p-3">
        <Text className="text-center font-semibold">{period.period}</Text>
        <Text className="text-center text-xs text-muted-foreground">
          대표: {period.composer}
        </Text>
      </View>
    </Card>
  );
}
