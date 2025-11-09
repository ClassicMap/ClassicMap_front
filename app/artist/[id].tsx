// app/artist/[id].tsx
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, Image, FlatList, TouchableOpacity } from 'react-native';
import { 
  ArrowLeftIcon, 
  StarIcon, 
  MapPinIcon, 
  CalendarIcon,
  AwardIcon,
  TrendingUpIcon,
  MusicIcon,
  MoonStarIcon,
  SunIcon
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';

// Mock 데이터
const ARTIST_DETAILS: Record<string, any> = {
  '1': {
    id: '1',
    name: '조성진',
    englishName: 'Seong-Jin Cho',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    birthYear: '1994',
    nationality: '대한민국',
    bio: '2015년 쇼팽 콩쿠르 우승자로, 섬세하고 깊이 있는 해석으로 전 세계 클래식 음악 팬들의 사랑을 받고 있습니다. 특히 쇼팽, 드뷔시 작품에서 탁월한 연주를 선보입니다.',
    specialty: ['쇼팽', '드뷔시', '라벨', '모차르트'],
    awards: [
      { year: '2015', name: '쇼팽 국제 피아노 콩쿠르 1위' },
      { year: '2011', name: '차이콥스키 국제 콩쿠르 3위' },
      { year: '2009', name: '하마마쓰 국제 피아노 콩쿠르 1위' },
    ],
    upcomingConcerts: [
      { 
        id: '1', 
        title: '조성진 피아노 리사이탈', 
        date: '2025.03.15', 
        venue: '롯데콘서트홀',
        program: '쇼팽 발라드 전곡'
      },
      { 
        id: '2', 
        title: '조성진 & 서울시향', 
        date: '2025.05.20', 
        venue: '예술의전당',
        program: '라흐마니노프 피아노 협주곡 2번'
      },
    ],
    recordings: [
      {
        id: '1',
        title: '쇼팽: 발라드 전곡',
        year: '2016',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop'
      },
      {
        id: '2',
        title: '드뷔시: 전주곡집',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'
      },
      {
        id: '3',
        title: '모차르트: 피아노 협주곡',
        year: '2018',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'
      },
    ],
    style: '섬세하고 시적인 표현, 명료한 터치, 깊이 있는 음악성',
    stats: {
      concerts: 120,
      countries: 35,
      albums: 8
    }
  },
  '2': {
    id: '2',
    name: '임윤찬',
    englishName: 'Yunchan Lim',
    category: '피아니스트',
    tier: 'Rising Star',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    birthYear: '2004',
    nationality: '대한민국',
    bio: '2022년 반 클라이번 콩쿠르 최연소 우승자. 압도적인 테크닉과 성숙한 음악성으로 클래식 음악계의 새로운 전설을 쓰고 있습니다.',
    specialty: ['라흐마니노프', '리스트', '베토벤', '쇼팽'],
    awards: [
      { year: '2022', name: '반 클라이번 국제 피아노 콩쿠르 1위' },
      { year: '2018', name: '클리블랜드 국제 피아노 콩쿠르 주니어 1위' },
    ],
    upcomingConcerts: [
      { 
        id: '1', 
        title: '임윤찬과 서울시향', 
        date: '2025.05.10', 
        venue: '롯데콘서트홀',
        program: '라흐마니노프 피아노 협주곡 3번'
      },
    ],
    recordings: [
      {
        id: '1',
        title: '반 클라이번 콩쿠르 실황',
        year: '2022',
        label: 'Harmonia Mundi',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop'
      },
      {
        id: '2',
        title: '리스트: 초절기교 연습곡',
        year: '2023',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'
      },
    ],
    style: '압도적인 테크닉, 열정적인 표현, 드라마틱한 해석',
    stats: {
      concerts: 85,
      countries: 22,
      albums: 3
    }
  },
  '3': {
    id: '3',
    name: '안네-소피 무터',
    englishName: 'Anne-Sophie Mutter',
    category: '바이올리니스트',
    tier: 'S',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    birthYear: '1963',
    nationality: '독일',
    bio: '세계 최고의 바이올리니스트 중 한 명. 카라얀의 인정을 받아 13세에 데뷔한 이후 50년 가까이 정상급 연주를 이어가고 있습니다.',
    specialty: ['베토벤', '브람스', '모차르트', '현대음악'],
    awards: [
      { year: '2019', name: '그래미상 평생 공로상' },
      { year: '1998', name: '그래미상 (베스트 솔로이스트)' },
      { year: '2008', name: '에른스트 폰 지멘스 음악상' },
    ],
    upcomingConcerts: [
      { 
        id: '1', 
        title: '무터 & 베를린 필', 
        date: '2025.04.20', 
        venue: '예술의전당',
        program: '베토벤 바이올린 협주곡'
      },
    ],
    recordings: [
      {
        id: '1',
        title: '베토벤: 바이올린 협주곡',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop'
      },
      {
        id: '2',
        title: '브람스: 바이올린 소나타',
        year: '2020',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'
      },
    ],
    style: '완벽한 테크닉, 깊이 있는 음악성, 우아하고 강렬한 표현',
    stats: {
      concerts: 450,
      countries: 60,
      albums: 50
    }
  },
  '4': {
    id: '4',
    name: '요요 마',
    englishName: 'Yo-Yo Ma',
    category: '첼리스트',
    tier: 'S',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
    birthYear: '1955',
    nationality: '미국 (중국계)',
    bio: '세계에서 가장 유명한 첼리스트. 클래식을 넘어 다양한 장르를 넘나들며 음악의 경계를 허물고 있습니다.',
    specialty: ['바흐', '드보르작', '엘가', '월드뮤직'],
    awards: [
      { year: '2011', name: '그래미상 (19회 수상)' },
      { year: '2006', name: '아비뉴상' },
      { year: '2001', name: '내셔널 메달 오브 아츠' },
    ],
    upcomingConcerts: [
      { 
        id: '1', 
        title: '요요 마 첼로 리사이탈', 
        date: '2025.06.15', 
        venue: '롯데콘서트홀',
        program: '바흐 무반주 첼로 모음곡'
      },
    ],
    recordings: [
      {
        id: '1',
        title: '바흐: 무반주 첼로 모음곡',
        year: '2018',
        label: 'Sony',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop'
      },
      {
        id: '2',
        title: '드보르작: 첼로 협주곡',
        year: '2017',
        label: 'Sony',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'
      },
    ],
    style: '따뜻하고 인간적인 소리, 폭넓은 레퍼토리, 소통하는 음악',
    stats: {
      concerts: 600,
      countries: 75,
      albums: 90
    }
  },
  '5': {
    id: '5',
    name: '다니엘 바렌보임',
    englishName: 'Daniel Barenboim',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    birthYear: '1942',
    nationality: '아르헨티나/이스라엘',
    bio: '20세기 후반부터 현재까지 활동하는 전설적인 피아니스트이자 지휘자. 베토벤, 모차르트, 브람스 해석의 대가로 알려져 있으며, 베를린 슈타츠카펠레의 음악감독을 역임했습니다.',
    specialty: ['베토벤', '모차르트', '브람스', '바그너'],
    awards: [
      { year: '2002', name: '에른스트 폰 지멘스 음악상' },
      { year: '2007', name: '울프 예술상' },
      { year: '2012', name: '빌바오 음악상' },
    ],
    upcomingConcerts: [
      { 
        id: '1', 
        title: '바렌보임 베토벤 소나타', 
        date: '2025.07.10', 
        venue: '예술의전당',
        program: '베토벤 후기 소나타'
      },
      { 
        id: '2', 
        title: '바렌보임 & 베를린 슈타츠카펠레', 
        date: '2025.09.05', 
        venue: '롯데콘서트홀',
        program: '브람스 피아노 협주곡 2번'
      },
    ],
    recordings: [
      {
        id: '1',
        title: '베토벤: 피아노 소나타 전곡',
        year: '2020',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop'
      },
      {
        id: '2',
        title: '모차르트: 피아노 협주곡',
        year: '2018',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'
      },
      {
        id: '3',
        title: '브람스: 피아노 작품집',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'
      },
    ],
    style: '웅장하고 지적인 해석, 깊이 있는 구조적 이해, 서정성과 드라마의 균형',
    stats: {
      concerts: 800,
      countries: 85,
      albums: 120
    }
  },
};

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const artist = ARTIST_DETAILS[id as string];

  if (!artist) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text>아티스트를 찾을 수 없습니다</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Cover Image with overlays */}
        <View className="relative h-64">
          <Image 
            source={{ uri: artist.coverImage }} 
            className="h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
          
          {/* Theme and User Menu overlay at top */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pt-12 pb-3">
            <TouchableOpacity
              onPress={toggleColorScheme}
              className="size-10 items-center justify-center rounded-full bg-black/30"
            >
              <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={24} color="white" />
            </TouchableOpacity>
            <View className="items-center justify-center rounded-full bg-black/30">
              <UserMenu iconColor="white" />
            </View>
          </View>
          
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4 bottom-4 rounded-full bg-black/50 p-2"
          >
            <Icon as={ArrowLeftIcon} size={24} color="white" />
          </TouchableOpacity>
        </View>

      <View className="gap-6 p-4 pb-20">
        {/* Profile Section */}
        <View className="items-center gap-3 -mt-12">
          <Avatar alt={artist.name} className="size-24 border-4 border-background">
            <AvatarImage source={{ uri: artist.image }} />
            <AvatarFallback>
              <Text className="text-2xl">{artist.name[0]}</Text>
            </AvatarFallback>
          </Avatar>
          
          <View className="items-center gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold">{artist.name}</Text>
              {artist.tier === 'S' ? (
                <View className="rounded bg-amber-500 px-2 py-1">
                  <Text className="text-xs font-bold text-white">S</Text>
                </View>
              ) : (
                <View className="rounded bg-blue-500 px-2 py-1">
                  <Icon as={TrendingUpIcon} size={14} color="white" />
                </View>
              )}
            </View>
            <Text className="text-muted-foreground">{artist.englishName}</Text>
            <View className="flex-row items-center gap-1">
              <Icon as={StarIcon} size={16} className="text-amber-500" />
              <Text className="text-lg font-semibold">{artist.rating}</Text>
            </View>
          </View>
        </View>

        {/* Basic Info */}
        <Card className="p-4">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Icon as={MusicIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm font-medium">{artist.category}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={MapPinIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">{artist.nationality}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">{artist.birthYear}년생</Text>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <View className="flex-row gap-3">
          <Card className="flex-1 items-center gap-1 p-4">
            <Text className="text-2xl font-bold">{artist.stats.concerts}+</Text>
            <Text className="text-xs text-muted-foreground">공연</Text>
          </Card>
          <Card className="flex-1 items-center gap-1 p-4">
            <Text className="text-2xl font-bold">{artist.stats.countries}+</Text>
            <Text className="text-xs text-muted-foreground">국가</Text>
          </Card>
          <Card className="flex-1 items-center gap-1 p-4">
            <Text className="text-2xl font-bold">{artist.stats.albums}+</Text>
            <Text className="text-xs text-muted-foreground">앨범</Text>
          </Card>
        </View>

        {/* Bio */}
        <View className="gap-3">
          <Text className="text-xl font-bold">소개</Text>
          <Card className="p-4">
            <Text className="leading-6 text-muted-foreground">{artist.bio}</Text>
          </Card>
        </View>

        {/* Specialty */}
        <View className="gap-3">
          <Text className="text-xl font-bold">전문 레퍼토리</Text>
          <View className="flex-row flex-wrap gap-2">
            {artist.specialty.map((item: string, index: number) => (
              <View key={index} className="rounded-full border border-border bg-muted px-3 py-1.5">
                <Text className="text-sm">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Style */}
        <View className="gap-3">
          <Text className="text-xl font-bold">연주 스타일</Text>
          <Card className="p-4">
            <Text className="leading-6 text-muted-foreground">{artist.style}</Text>
          </Card>
        </View>

        {/* Awards */}
        <View className="gap-3">
          <Text className="text-xl font-bold">주요 수상</Text>
          <View className="gap-2">
            {artist.awards.map((award: any, index: number) => (
              <Card key={index} className="p-4">
                <View className="flex-row items-center gap-3">
                  <Icon as={AwardIcon} size={20} className="text-amber-500" />
                  <View className="flex-1">
                    <Text className="font-semibold">{award.name}</Text>
                    <Text className="text-sm text-muted-foreground">{award.year}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Recordings */}
        <View className="gap-3">
          <Text className="text-xl font-bold">대표 음반</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={artist.recordings}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: any) => (
              <Card className="w-[160px] overflow-hidden p-0">
                <View className="aspect-square bg-muted">
                  <Image 
                    source={{ uri: item.cover }} 
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="gap-1 p-3">
                  <Text className="text-sm font-semibold" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {item.year} • {item.label}
                  </Text>
                </View>
              </Card>
            )}
            ItemSeparatorComponent={() => <View className="w-3" />}
            contentContainerClassName="pr-4"
          />
        </View>

        {/* Upcoming Concerts */}
        <View className="gap-3">
          <Text className="text-xl font-bold">다가오는 공연</Text>
          <View className="gap-2">
            {artist.upcomingConcerts.map((concert: any) => (
              <Card key={concert.id} className="p-4">
                <View className="gap-2">
                  <Text className="text-lg font-semibold">{concert.title}</Text>
                  <View className="flex-row items-center gap-2">
                    <Icon as={CalendarIcon} size={14} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">{concert.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Icon as={MapPinIcon} size={14} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">{concert.venue}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Icon as={MusicIcon} size={14} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">{concert.program}</Text>
                  </View>
                  <Button size="sm" className="mt-2">
                    <Text className="text-sm">예매하기</Text>
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
