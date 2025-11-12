import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  View,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { Alert } from '@/lib/utils/alert';
import {
  ArrowLeftIcon,
  StarIcon,
  MapPinIcon,
  CalendarIcon,
  AwardIcon,
  TrendingUpIcon,
  MusicIcon,
  MoonStarIcon,
  SunIcon,
  TrashIcon,
  EditIcon,
  Disc3Icon,
  PlusIcon,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ArtistAPI, RecordingAPI, ConcertAPI } from '@/lib/api/client';
import { AdminArtistAPI, AdminRecordingAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Artist, Recording, Concert } from '@/lib/types/models';
import { getImageUrl } from '@/lib/utils/image';
import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import { RecordingFormModal } from '@/components/admin/RecordingFormModal';
import { prefetchImages } from '@/components/optimized-image';

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
    coverImage:
      'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
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
        program: '쇼팽 발라드 전곡',
      },
      {
        id: '2',
        title: '조성진 & 서울시향',
        date: '2025.05.20',
        venue: '예술의전당',
        program: '라흐마니노프 피아노 협주곡 2번',
      },
    ],
    recordings: [
      {
        id: '1',
        title: '쇼팽: 발라드 전곡',
        year: '2016',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
      },
      {
        id: '2',
        title: '드뷔시: 전주곡집',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
      },
      {
        id: '3',
        title: '모차르트: 피아노 협주곡',
        year: '2018',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
      },
    ],
    style: '섬세하고 시적인 표현, 명료한 터치, 깊이 있는 음악성',
    stats: {
      concerts: 120,
      countries: 35,
      albums: 8,
    },
  },
  '2': {
    id: '2',
    name: '임윤찬',
    englishName: 'Yunchan Lim',
    category: '피아니스트',
    tier: 'Rising Star',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    coverImage:
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
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
        program: '라흐마니노프 피아노 협주곡 3번',
      },
    ],
    recordings: [
      {
        id: '1',
        title: '반 클라이번 콩쿠르 실황',
        year: '2022',
        label: 'Harmonia Mundi',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
      },
      {
        id: '2',
        title: '리스트: 초절기교 연습곡',
        year: '2023',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
      },
    ],
    style: '압도적인 테크닉, 열정적인 표현, 드라마틱한 해석',
    stats: {
      concerts: 85,
      countries: 22,
      albums: 3,
    },
  },
  '3': {
    id: '3',
    name: '안네-소피 무터',
    englishName: 'Anne-Sophie Mutter',
    category: '바이올리니스트',
    tier: 'S',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    coverImage:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
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
        program: '베토벤 바이올린 협주곡',
      },
    ],
    recordings: [
      {
        id: '1',
        title: '베토벤: 바이올린 협주곡',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
      },
      {
        id: '2',
        title: '브람스: 바이올린 소나타',
        year: '2020',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
      },
    ],
    style: '완벽한 테크닉, 깊이 있는 음악성, 우아하고 강렬한 표현',
    stats: {
      concerts: 450,
      countries: 60,
      albums: 50,
    },
  },
  '4': {
    id: '4',
    name: '요요 마',
    englishName: 'Yo-Yo Ma',
    category: '첼리스트',
    tier: 'S',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    coverImage:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
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
        program: '바흐 무반주 첼로 모음곡',
      },
    ],
    recordings: [
      {
        id: '1',
        title: '바흐: 무반주 첼로 모음곡',
        year: '2018',
        label: 'Sony',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
      },
      {
        id: '2',
        title: '드보르작: 첼로 협주곡',
        year: '2017',
        label: 'Sony',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
      },
    ],
    style: '따뜻하고 인간적인 소리, 폭넓은 레퍼토리, 소통하는 음악',
    stats: {
      concerts: 600,
      countries: 75,
      albums: 90,
    },
  },
  '5': {
    id: '5',
    name: '다니엘 바렌보임',
    englishName: 'Daniel Barenboim',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    coverImage:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
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
        program: '베토벤 후기 소나타',
      },
      {
        id: '2',
        title: '바렌보임 & 베를린 슈타츠카펠레',
        date: '2025.09.05',
        venue: '롯데콘서트홀',
        program: '브람스 피아노 협주곡 2번',
      },
    ],
    recordings: [
      {
        id: '1',
        title: '베토벤: 피아노 소나타 전곡',
        year: '2020',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
      },
      {
        id: '2',
        title: '모차르트: 피아노 협주곡',
        year: '2018',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop',
      },
      {
        id: '3',
        title: '브람스: 피아노 작품집',
        year: '2019',
        label: 'DG',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
      },
    ],
    style: '웅장하고 지적인 해석, 깊이 있는 구조적 이해, 서정성과 드라마의 균형',
    stats: {
      concerts: 800,
      countries: 85,
      albums: 120,
    },
  },
};

// Recording Cover Component with error handling (small)
function RecordingCover({ coverUrl }: { coverUrl?: string | null }) {
  const [imageError, setImageError] = React.useState(false);

  if (!coverUrl || imageError) {
    return (
      <View className="h-20 w-20 items-center justify-center rounded bg-muted">
        <Icon as={Disc3Icon} size={32} className="text-muted-foreground" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: getImageUrl(coverUrl) }}
      className="h-20 w-20 rounded"
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
}

// Recording Cover Component with error handling (large for horizontal scroll)
function RecordingCoverLarge({ coverUrl }: { coverUrl?: string | null }) {
  const [imageError, setImageError] = React.useState(false);

  if (!coverUrl || imageError) {
    return (
      <View className="aspect-square w-full items-center justify-center rounded-lg bg-muted">
        <Icon as={Disc3Icon} size={64} className="text-muted-foreground" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: getImageUrl(coverUrl) }}
      className="aspect-square w-full rounded-lg"
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
}

// Concert Poster Component with error handling
function ConcertPoster({ posterUrl }: { posterUrl?: string | null }) {
  const [imageError, setImageError] = React.useState(false);

  if (!posterUrl || imageError) {
    return (
      <View
        className="w-full items-center justify-center rounded-lg bg-muted"
        style={{ aspectRatio: 3 / 4, minHeight: 240 }}>
        <Icon as={CalendarIcon} size={64} className="text-muted-foreground" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: getImageUrl(posterUrl) }}
      className="w-full rounded-lg"
      style={{ aspectRatio: 3 / 4 }}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [artist, setArtist] = React.useState<Artist | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [coverImageLoaded, setCoverImageLoaded] = React.useState(false);
  const coverImageOpacity = React.useRef(new Animated.Value(0)).current;
  const { canEdit } = useAuth();
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [recordingFormVisible, setRecordingFormVisible] = React.useState(false);
  const [selectedRecording, setSelectedRecording] = React.useState<Recording | undefined>();
  const [concerts, setConcerts] = React.useState<Concert[]>([]);

  React.useEffect(() => {
    if (id) {
      loadArtist();
    }
  }, [id]);

  const loadArtist = async () => {
    setLoading(true);
    setImagesLoaded(false);
    setError(null);
    try {
      const data = await ArtistAPI.getById(Number(id));
      setArtist(data);

      // 녹음 목록 로드
      let recordingData: Recording[] = [];
      try {
        recordingData = await RecordingAPI.getByArtist(Number(id));
        setRecordings(recordingData);
      } catch (error) {
        console.error('Failed to fetch recordings:', error);
      }

      // 공연 목록 로드
      let concertData: Concert[] = [];
      try {
        concertData = await ConcertAPI.getByArtist(Number(id));
        setConcerts(concertData);
      } catch (error) {
        console.error('Failed to fetch concerts:', error);
      }

      // 이미지 프리페치
      const imagesToLoad = [
        data.imageUrl,
        data.coverImageUrl,
        ...recordingData.map((r) => r.coverUrl),
        ...concertData.map((c) => c.posterUrl),
      ].filter(Boolean);
      await prefetchImages(imagesToLoad);
      setImagesLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load artist:', err);
      setError('아티스트 정보를 불러오는데 실패했습니다.');
      setLoading(false);
      setImagesLoaded(true);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await ArtistAPI.getById(Number(id));
      setArtist(data);

      // 녹음 목록 새로고침
      let recordingData: Recording[] = [];
      try {
        recordingData = await RecordingAPI.getByArtist(Number(id));
        setRecordings(recordingData);
      } catch (error) {
        console.error('Failed to fetch recordings:', error);
      }

      // 공연 목록 새로고침
      let concertData: Concert[] = [];
      try {
        concertData = await ConcertAPI.getByArtist(Number(id));
        setConcerts(concertData);
      } catch (error) {
        console.error('Failed to fetch concerts:', error);
      }

      // 이미지 프리페치
      const imagesToLoad = [
        data.imageUrl,
        data.coverImageUrl,
        ...recordingData.map((r) => r.coverUrl),
        ...concertData.map((c) => c.posterUrl),
      ].filter(Boolean);
      await prefetchImages(imagesToLoad);

      setError(null);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to refresh artist:', err);
      setError('아티스트 정보를 불러오는데 실패했습니다.');
      setRefreshing(false);
    }
  }, [id]);

  const handleCoverImageLoad = () => {
    setCoverImageLoaded(true);
    Animated.timing(coverImageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCoverImageError = () => {
    setCoverImageLoaded(true);
    Animated.timing(coverImageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleDeleteArtist = () => {
    if (!artist) return;
    Alert.alert('아티스트 삭제', `${artist.name}을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminArtistAPI.delete(artist.id);
            Alert.alert('성공', '아티스트가 삭제되었습니다.');
            router.back();
          } catch (error) {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleDeleteRecording = (recordingId: number) => {
    Alert.alert('앨범 삭제', '정말 이 앨범을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminRecordingAPI.delete(recordingId);
            Alert.alert('성공', '앨범이 삭제되었습니다.');
            loadArtist();
          } catch (error) {
            Alert.alert('오류', '앨범 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (loading || !imagesLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-center text-muted-foreground">
          {loading ? '아티스트 정보를 불러오는 중...' : '이미지를 불러오는 중...'}
        </Text>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <Text className="mb-4 text-center text-destructive">
            {error || '아티스트를 찾을 수 없습니다'}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            <Text>뒤로 가기</Text>
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Cover Image with overlays */}
        <View className="relative h-64">
          {!coverImageLoaded && (
            <View className="h-full w-full items-center justify-center bg-muted">
              <ActivityIndicator size="large" />
            </View>
          )}
          {artist.coverImageUrl ? (
            Platform.OS === 'web' ? (
              <Image
                source={{ uri: getImageUrl(artist.coverImageUrl) }}
                className="h-full w-full"
                style={{ opacity: coverImageLoaded ? 1 : 0 }}
                resizeMode="cover"
                onLoad={handleCoverImageLoad}
                onError={handleCoverImageError}
              />
            ) : (
              <Animated.Image
                source={{ uri: getImageUrl(artist.coverImageUrl) }}
                className="h-full w-full"
                style={{ opacity: coverImageOpacity }}
                resizeMode="cover"
                onLoad={handleCoverImageLoad}
                onError={handleCoverImageError}
              />
            )
          ) : (
            <View
              className="h-full w-full items-center justify-center bg-muted"
              onLayout={handleCoverImageLoad}>
              <Icon as={MusicIcon} size={64} className="text-muted-foreground" />
            </View>
          )}
          <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

          {/* Theme and User Menu overlay at top */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pb-3 pt-12">
            <TouchableOpacity
              onPress={toggleColorScheme}
              className="size-10 items-center justify-center rounded-full bg-black/30">
              <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={24} color="white" />
            </TouchableOpacity>
            <View className="items-center justify-center rounded-full bg-black/30">
              <UserMenu iconColor="white" />
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute bottom-4 left-4 rounded-full bg-black/50 p-2">
            <Icon as={ArrowLeftIcon} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="gap-6 p-4 pb-20">
          {/* Profile Section */}
          <View className="-mt-12 items-center gap-3">
            <Avatar alt={artist.name} className="size-24 border-4 border-background">
              <AvatarImage source={{ uri: getImageUrl(artist.imageUrl) }} />
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
                ) : artist.tier === 'Rising' ? (
                  <View className="rounded bg-blue-500 px-2 py-1">
                    <Icon as={TrendingUpIcon} size={14} color="white" />
                  </View>
                ) : null}
              </View>
              <Text className="text-muted-foreground">{artist.englishName}</Text>
              <Text className="text-sm text-muted-foreground">{artist.category}</Text>
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
              {artist.birthYear && (
                <View className="flex-row items-center gap-2">
                  <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                  <Text className="text-sm">{artist.birthYear}년생</Text>
                </View>
              )}
            </View>
            {canEdit && (
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => setEditModalVisible(true)}>
                  <Icon as={EditIcon} size={16} className="mr-2" />
                  <Text>수정</Text>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={handleDeleteArtist}>
                  <Icon as={TrashIcon} size={16} className="mr-2" />
                  <Text>삭제</Text>
                </Button>
              </View>
            )}
          </Card>

          {/* Stats */}
          <View className="flex-row gap-3">
            <Card className="flex-1 items-center gap-1 p-4">
              <Text className="text-2xl font-bold">{artist.concertCount}+</Text>
              <Text className="text-xs text-muted-foreground">공연</Text>
            </Card>
            <Card className="flex-1 items-center gap-1 p-4">
              <Text className="text-2xl font-bold">{artist.countryCount}+</Text>
              <Text className="text-xs text-muted-foreground">국가</Text>
            </Card>
            <Card className="flex-1 items-center gap-1 p-4">
              <Text className="text-2xl font-bold">{artist.albumCount}+</Text>
              <Text className="text-xs text-muted-foreground">앨범</Text>
            </Card>
          </View>

          {/* Biography */}
          {artist.bio && (
            <Card className="p-4">
              <Text className="mb-2 text-lg font-bold">소개</Text>
              <Text className="leading-6 text-muted-foreground">{artist.bio}</Text>
            </Card>
          )}

          {/* Style Keywords */}
          {artist.style && (
            <Card className="p-4">
              <Text className="mb-3 text-lg font-bold">연주 스타일</Text>
              <View className="flex-row flex-wrap gap-2">
                {artist.style.split(',').map((keyword, index) => (
                  <View key={index} className="rounded-full bg-primary/10 px-3 py-1.5">
                    <Text className="text-sm text-primary">{keyword.trim()}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Awards */}
          {artist.awards && (
            <Card className="p-4">
              <Text className="mb-3 text-lg font-bold">주요 수상</Text>
              <View className="gap-3">
                {artist.awards.split('|').map((award, index) => {
                  const [year, name] = award.split(':');
                  return (
                    <View key={index} className="flex-row items-start gap-3">
                      <Icon as={AwardIcon} size={18} className="mt-1 text-amber-500" />
                      <View className="flex-1">
                        <Text className="font-semibold">{name}</Text>
                        <Text className="text-sm text-muted-foreground">{year}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          {/* Recordings/Albums */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-4">
              <View className="flex-row items-center gap-2">
                <Icon as={Disc3Icon} size={20} className="text-primary" />
                <Text className="text-lg font-bold">앨범</Text>
              </View>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setSelectedRecording(undefined);
                    setRecordingFormVisible(true);
                  }}>
                  <Icon as={PlusIcon} size={16} />
                </Button>
              )}
            </View>

            {recordings.length === 0 ? (
              <Card className="mx-4 p-6">
                <Text className="text-center text-muted-foreground">
                  아직 등록된 앨범이 없습니다.
                </Text>
              </Card>
            ) : (
              <FlatList
                horizontal
                data={recordings}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item: recording }) => (
                  <View className="w-48">
                    <Card className="p-3" style={{ minHeight: 420 }}>
                      <View className="flex-1 gap-3">
                        <RecordingCoverLarge coverUrl={recording.coverUrl} />
                        <View className="gap-1.5" style={{ minHeight: 80 }}>
                          <Text className="text-base font-semibold" numberOfLines={2}>
                            {recording.title}
                          </Text>
                          <Text className="text-sm text-muted-foreground">{recording.year}</Text>
                          {recording.label && (
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                              {recording.label}
                            </Text>
                          )}
                        </View>
                        {(recording.spotifyUrl ||
                          recording.appleMusicUrl ||
                          recording.youtubeMusicUrl ||
                          recording.externalUrl) && (
                          <View className="flex-row flex-wrap gap-2">
                            {recording.spotifyUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.spotifyUrl!)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-green-600">
                                <Text className="text-xs font-bold text-white">S</Text>
                              </TouchableOpacity>
                            )}
                            {recording.appleMusicUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.appleMusicUrl!)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-pink-600">
                                <Text className="text-xs font-bold text-white">A</Text>
                              </TouchableOpacity>
                            )}
                            {recording.youtubeMusicUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.youtubeMusicUrl!)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-red-600">
                                <Text className="text-xs font-bold text-white">Y</Text>
                              </TouchableOpacity>
                            )}
                            {recording.externalUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.externalUrl!)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                                <Icon
                                  as={ArrowLeftIcon}
                                  size={14}
                                  color="white"
                                  className="rotate-[-45deg]"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                        <View className="flex-1" />
                        {canEdit && (
                          <View className="flex-row gap-2 border-t border-border pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onPress={() => {
                                setSelectedRecording(recording);
                                setRecordingFormVisible(true);
                              }}>
                              <Icon as={EditIcon} size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onPress={() => handleDeleteRecording(recording.id)}>
                              <Icon as={TrashIcon} size={14} className="text-destructive" />
                            </Button>
                          </View>
                        )}
                      </View>
                    </Card>
                  </View>
                )}
              />
            )}
          </View>

          {/* Recent Concerts */}
          <View className="gap-3">
            <Text className="px-4 text-lg font-bold">최근 공연</Text>
            {concerts.length === 0 ? (
              <Card className="mx-4 p-6">
                <Text className="text-center text-muted-foreground">등록된 공연이 없습니다.</Text>
              </Card>
            ) : (
              <FlatList
                horizontal
                data={concerts}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item: concert }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/concert/${concert.id}` as any)}
                  >
                    <View className="w-56">
                      <Card className="p-3" style={{ minHeight: 440 }}>
                        <View className="gap-3">
                          <ConcertPoster posterUrl={concert.posterUrl} />
                        <View className="gap-2" style={{ minHeight: 100 }}>
                          <Text className="text-base font-semibold" numberOfLines={2}>
                            {concert.title}
                          </Text>
                          {concert.composerInfo && (
                            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                              {concert.composerInfo}
                            </Text>
                          )}
                          <View className="flex-row items-center gap-2">
                            <Icon as={CalendarIcon} size={14} className="text-muted-foreground" />
                            <Text className="text-xs text-muted-foreground">
                              {concert.concertDate}
                            </Text>
                          </View>
                          {concert.status && (
                            <View
                              className={`self-start rounded-full px-2 py-1 ${
                                concert.status === 'upcoming'
                                  ? 'bg-blue-500/20'
                                  : concert.status === 'completed'
                                    ? 'bg-gray-500/20'
                                    : concert.status === 'ongoing'
                                      ? 'bg-green-500/20'
                                      : 'bg-red-500/20'
                              }`}>
                              <Text
                                className={`text-xs font-medium ${
                                  concert.status === 'upcoming'
                                    ? 'text-blue-600'
                                    : concert.status === 'completed'
                                      ? 'text-gray-600'
                                      : concert.status === 'ongoing'
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                }`}>
                                {concert.status === 'upcoming'
                                  ? '예정'
                                  : concert.status === 'completed'
                                    ? '완료'
                                    : concert.status === 'ongoing'
                                      ? '진행중'
                                      : '취소'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </Card>
                  </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {artist && (
        <ArtistFormModal
          visible={editModalVisible}
          artist={artist}
          onClose={() => setEditModalVisible(false)}
          onSuccess={() => {
            loadArtist();
          }}
        />
      )}

      {/* Recording Form Modal */}
      <RecordingFormModal
        visible={recordingFormVisible}
        artistId={Number(id)}
        recording={selectedRecording}
        onClose={() => setRecordingFormVisible(false)}
        onSuccess={() => {
          setRecordingFormVisible(false);
          loadArtist();
        }}
      />
    </View>
  );
}
