// app/(tabs)/home.tsx
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, FlatList, Image, Pressable, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import { TrendingUpIcon, CalendarIcon, PlayCircleIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { ArtistAPI, ConcertAPI, ComposerAPI } from '@/lib/api/client';
import { getAllPeriods } from '@/lib/data/mockDTO';
import type { Artist } from '@/lib/types/models';
import { OptimizedImage, prefetchImages } from '@/components/optimized-image';
import { getImageUrl } from '@/lib/utils/image';
import { useComposers } from '@/lib/query/hooks/useComposers';
import { useArtists } from '@/lib/query/hooks/useArtists';
import { useConcerts } from '@/lib/query/hooks/useConcerts';
import { TicketVendorsModal } from '@/components/ticket-vendors-modal';
import { Alert } from '@/lib/utils/alert';

// 레거시 형식으로 변환 (타입 호환성 유지)
interface LegacyArtist {
  id: string;
  name: string;
  category: string;
  tier: 'S' | 'Rising';
  image: string;
}

interface LegacyConcert {
  id: string;
  title: string;
  date: string;
  venue: string;
  poster: string;
}

interface LegacyComparison {
  id: string;
  piece: string;
  artists: string;
  composerId: number;
  pieceId: number;
}

const RECOMMENDED_PERIODS = getAllPeriods().map(era => ({
  id: era.id,
  period: era.name,
  emoji: era.emoji,
  composer: era.keyComposers[0],
}));

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const waveAnim = React.useRef(new Animated.Value(0)).current;
  const [showGreeting, setShowGreeting] = React.useState(true);

  // React Query로 병렬 데이터 로드 (자동 캐싱)
  const {
    data: artistsQueryData,
    isLoading: loadingArtists,
    error: artistsQueryError,
    refetch: refetchArtists,
  } = useArtists();

  // 무한 스크롤 데이터를 평탄화 (첫 페이지만 사용)
  const artistsData = React.useMemo(() => {
    return artistsQueryData?.pages?.[0] || [];
  }, [artistsQueryData]);

  const {
    data: concertsQueryData,
    isLoading: loadingConcerts,
    error: concertsQueryError,
    refetch: refetchConcerts,
  } = useConcerts();

  // 무한 스크롤 데이터를 평탄화 (첫 페이지만 사용)
  const concertsData = React.useMemo(() => {
    return concertsQueryData?.pages?.[0] || [];
  }, [concertsQueryData]);

  const {
    data: composersQueryData,
    isLoading: loadingComposers,
    error: composersQueryError,
    refetch: refetchComposers,
  } = useComposers();

  // 무한 스크롤 데이터를 평탄화 (첫 페이지만 사용)
  const composersData = React.useMemo(() => {
    return composersQueryData?.pages?.[0] || [];
  }, [composersQueryData]);

  const errorArtists = artistsQueryError ? '아티스트 정보를 불러오는데 실패했습니다.' : null;
  const errorConcerts = concertsQueryError ? '공연 정보를 불러오는데 실패했습니다.' : null;
  const errorComposers = composersQueryError ? '작곡가 정보를 불러오는데 실패했습니다.' : null;

  // 레거시 형식으로 변환
  const [artists, setArtists] = React.useState<LegacyArtist[]>([]);
  const [concerts, setConcerts] = React.useState<LegacyConcert[]>([]);
  const [composers, setComposers] = React.useState<any[]>([]);
  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // 데이터를 레거시 형식으로 변환 및 이미지 프리페치
  React.useEffect(() => {
    const convertAndPrefetch = async () => {
      // 로딩 중이거나 데이터가 없으면 실행하지 않음
      if (loadingArtists || loadingConcerts || loadingComposers) {
        return;
      }

      if (artistsData.length === 0 && concertsData.length === 0 && composersData.length === 0) {
        return;
      }

      // 레거시 형식으로 변환
      const legacyArtists = artistsData.slice(0, 5).map(artist => ({
        id: String(artist.id),
        name: artist.name,
        category: artist.category,
        tier: artist.tier as 'S' | 'Rising',
        image: artist.imageUrl || '',
      }));
      setArtists(legacyArtists);

      const legacyConcerts = concertsData.slice(0, 5).map(concert => ({
        id: String(concert.id),
        title: concert.title,
        date: concert.startDate,
        venue: '공연장',
        poster: concert.posterUrl || '',
      }));
      setConcerts(legacyConcerts);

      setComposers(composersData);

      // 이미지 프리페치 (타임아웃 추가)
      const timeout = setTimeout(() => {
        setImagesLoaded(true);
      }, 1000);

      try {
        await prefetchImages([
          ...artistsData.slice(0, 5).map(a => a.imageUrl),
          ...concertsData.slice(0, 5).map(c => c.posterUrl)
        ]);
        setImagesLoaded(true);
      } catch (error) {
        setImagesLoaded(true);
      } finally {
        clearTimeout(timeout);
      }
    };

    convertAndPrefetch();
  }, [artistsData, concertsData, composersData, loadingArtists, loadingConcerts, loadingComposers]);

  // 새로고침 핸들러
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchArtists(),
      refetchConcerts(),
      refetchComposers(),
    ]);
    setRefreshing(false);
  }, [refetchArtists, refetchConcerts, refetchComposers]);

  React.useEffect(() => {
    // 페이드 인
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // 손 흔드는 애니메이션 (반복)
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    ).start();

    // 3초 후 페이드 아웃
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setShowGreeting(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getFullName = () => {
    if (!user) return '';
    const lastName = user.lastName || '';
    const firstName = user.firstName || '';
    return lastName || firstName ? ` ${firstName}${lastName}님` : '';
  };

  const waveRotation = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '20deg'],
  });

  return (
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="gap-6 p-4 pb-20">
        {/* Header */}
        {showGreeting && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="h1" className="text-3xl font-bold" style={{ display: 'flex' }}>
                안녕하세요{getFullName()}!
              </Text>
              <Animated.Text
                style={{
                  fontSize: 30,
                  marginLeft: 8,
                  display: 'flex',
                  transform: [{ rotate: waveRotation }],
                }}
              >
                👋
              </Animated.Text>
            </View>
          </Animated.View>
        )}

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
          {loadingArtists ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
            </View>
          ) : errorArtists ? (
            <View className="py-8">
              <Text className="text-center text-destructive">{errorArtists}</Text>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 mx-auto"
                onPress={() => refetchArtists()}
              >
                <Text>다시 시도</Text>
              </Button>
            </View>
          ) : !imagesLoaded ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
              <Text className="text-center text-muted-foreground mt-4">이미지를 불러오는 중...</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={artists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ArtistCard artist={item} />}
              ItemSeparatorComponent={() => <View className="w-3" />}
              contentContainerClassName="pr-4"
            />
          )}
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
          {loadingConcerts ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
            </View>
          ) : errorConcerts ? (
            <View className="py-8">
              <Text className="text-center text-destructive">{errorConcerts}</Text>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 mx-auto"
                onPress={() => refetchConcerts()}
              >
                <Text>다시 시도</Text>
              </Button>
            </View>
          ) : !imagesLoaded ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
              <Text className="text-center text-muted-foreground mt-4">이미지를 불러오는 중...</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={concerts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ConcertCard concert={item} />}
              ItemSeparatorComponent={() => <View className="w-3" />}
              contentContainerClassName="pr-4"
            />
          )}
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
          {loadingComposers ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
            </View>
          ) : errorComposers ? (
            <View className="py-8">
              <Text className="text-center text-destructive">{errorComposers}</Text>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 mx-auto"
                onPress={() => refetchComposers()}
              >
                <Text>다시 시도</Text>
              </Button>
            </View>
          ) : !imagesLoaded ? (
            <View className="py-8">
              <ActivityIndicator size="large" />
              <Text className="text-center text-muted-foreground mt-4">이미지를 불러오는 중...</Text>
            </View>
          ) : composers.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={composers.slice(0, 5).map((composer, idx) => ({
                id: String(idx),
                piece: `${composer.name} 대표곡`,
                artists: '다양한 연주자',
                composerId: composer.id,
                pieceId: 1,
              }))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ComparisonCard comparison={item} />}
              ItemSeparatorComponent={() => <View className="w-3" />}
              contentContainerClassName="pr-4"
            />
          ) : (
            <View className="py-8">
              <Text className="text-center text-muted-foreground">비교 데이터가 없습니다.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// 아티스트 카드
const ArtistCard = React.memo(({ artist }: { artist: LegacyArtist }) => {
  const router = useRouter();

  const handlePress = React.useCallback(() => {
    router.push(`/artist/${artist.id}`);
  }, [router, artist.id]);

  return (
    <Pressable onPress={handlePress}>
      <Card className="w-[160px] p-3">
        <View className="gap-2">
          <Avatar alt={artist.name} className="size-16 self-center">
            <AvatarImage source={{ uri: getImageUrl(artist.image) }} />
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
              ) : artist.tier === 'Rising' ? (
                <Icon as={TrendingUpIcon} size={12} className="text-blue-500" />
              ) : artist.tier === 'A' ? (
                <View className="rounded bg-green-600 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">A</Text>
                </View>
              ) : artist.tier === 'B' ? (
                <View className="rounded bg-gray-500 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">B</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {artist.category}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

// 공연 카드
const ConcertCard = React.memo(({ concert }: { concert: LegacyConcert }) => {
  const router = useRouter();
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(false);
  const [showVendorsModal, setShowVendorsModal] = React.useState(false);
  const [vendors, setVendors] = React.useState<any[]>([]);

  const handlePress = React.useCallback(() => {
    router.push(`/concert/${concert.id}`);
  }, [router, concert.id]);

  const handleBookTicket = React.useCallback(async (e: any) => {
    e.stopPropagation();
    setIsLoadingVendors(true);
    try {
      const concertId = parseInt(concert.id);
      const fetchedVendors = await ConcertAPI.getTicketVendors(concertId);
      setVendors(fetchedVendors);
      setIsLoadingVendors(false);
      setShowVendorsModal(true);
    } catch (error) {
      setIsLoadingVendors(false);
      console.error('Failed to fetch ticket vendors:', error);
      Alert.alert('오류', '예매 정보를 불러오는데 실패했습니다.');
    }
  }, [concert.id]);

  return (
    <>
      <Pressable onPress={handlePress}>
        <Card className="w-[200px] overflow-hidden p-0">
          <View className="aspect-[3/4] bg-muted">
            {concert.poster ? (
              <OptimizedImage
                uri={concert.poster}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Icon as={CalendarIcon} size={32} className="text-muted-foreground" />
              </View>
            )}
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
            <Button size="sm" onPress={handleBookTicket} disabled={isLoadingVendors}>
              <Text className="text-xs">{isLoadingVendors ? '로딩...' : '예매'}</Text>
            </Button>
          </View>
        </Card>
      </Pressable>

      <TicketVendorsModal
        visible={showVendorsModal}
        vendors={vendors}
        onClose={() => setShowVendorsModal(false)}
      />
    </>
  );
});

// 비교 카드
const ComparisonCard = React.memo(({ comparison }: { comparison: LegacyComparison }) => {
  const router = useRouter();

  const handlePress = React.useCallback(() => {
    router.push({
      pathname: '/(tabs)/compare',
      params: {
        composerId: String(comparison.composerId),
        pieceId: String(comparison.pieceId)
      }
    });
  }, [router, comparison.composerId, comparison.pieceId]);

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
});


