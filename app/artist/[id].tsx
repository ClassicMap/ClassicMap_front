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
  TicketIcon,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { RecordingAPI, ConcertAPI } from '@/lib/api/client';
import { AdminArtistAPI, AdminRecordingAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Artist, Recording, Concert, TicketVendor } from '@/lib/types/models';
import { getImageUrl } from '@/lib/utils/image';
import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import { RecordingFormModal } from '@/components/admin/RecordingFormModal';
import { TicketVendorsModal } from '@/components/ticket-vendors-modal';
import { prefetchImages } from '@/components/optimized-image';
import { useArtist } from '@/lib/query/hooks/useArtists';

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

/**
 * 최근 공연 필터링 (과거 30일 ~ 미래 180일)
 * 날짜순 오름차순 정렬
 */
function filterRecentConcerts(concerts: Concert[]): Concert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startRange = new Date(today);
  startRange.setDate(startRange.getDate() - 30);

  const endRange = new Date(today);
  endRange.setDate(endRange.getDate() + 180);

  return concerts
    .filter(concert => {
      try {
        if (!concert.startDate) return false;

        const startDate = new Date(concert.startDate);
        if (isNaN(startDate.getTime())) return false;

        startDate.setHours(0, 0, 0, 0);
        return startDate >= startRange && startDate <= endRange;
      } catch (error) {
        console.warn(`Invalid concert date: ${concert.startDate}`, error);
        return false;
      }
    })
    .sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateA - dateB; // 오름차순
    });
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = React.useState(false);
  const coverImageOpacity = React.useRef(new Animated.Value(0)).current;
  const { canEdit } = useAuth();
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [recordingFormVisible, setRecordingFormVisible] = React.useState(false);
  const [selectedRecording, setSelectedRecording] = React.useState<Recording | undefined>();
  const [concerts, setConcerts] = React.useState<Concert[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = React.useState<number | null>(null);
  const [showVendorsModal, setShowVendorsModal] = React.useState(false);
  const [vendors, setVendors] = React.useState<TicketVendor[]>([]);

  // React Query로 아티스트 데이터 로드 (자동 캐싱)
  const {
    data: artist,
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching: refreshing,
  } = useArtist(id ? Number(id) : undefined);

  // 에러 처리
  const error = queryError ? '아티스트 정보를 불러오는데 실패했습니다.' : null;

  // 아티스트 데이터 로드 시 녹음/공연 목록 로드
  React.useEffect(() => {
    if (artist) {
      loadAdditionalData();
    }
  }, [artist]);

  const loadAdditionalData = async () => {
    if (!id) return;

    // 녹음 목록 로드
    try {
      const recordingData = await RecordingAPI.getByArtist(Number(id));
      setRecordings(recordingData);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    }

    // 공연 목록 로드
    try {
      const concertData = await ConcertAPI.getByArtist(Number(id));
      const filteredConcerts = filterRecentConcerts(concertData);
      setConcerts(filteredConcerts);
    } catch (error) {
      console.error('Failed to fetch concerts:', error);
    }
  };

  // 이미지 프리페치 (타임아웃 추가)
  React.useEffect(() => {
    if (artist && !imagesLoaded) {
      const imagesToLoad = [
        artist.imageUrl,
        artist.coverImageUrl,
        ...recordings.map((r) => r.coverUrl),
        ...concerts.map((c) => c.posterUrl),
      ].filter(Boolean);

      // 이미지 로딩 실패 또는 지연 시 1초 후 자동으로 표시
      const timeout = setTimeout(() => {
        setImagesLoaded(true);
      }, 1000);

      prefetchImages(imagesToLoad)
        .then(() => setImagesLoaded(true))
        .catch(() => setImagesLoaded(true))
        .finally(() => clearTimeout(timeout));

      return () => clearTimeout(timeout);
    }
  }, [artist, recordings, concerts, imagesLoaded]);

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
            refetch();
            loadAdditionalData();
          } catch (error) {
            Alert.alert('오류', '앨범 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleBookTicket = async (concert: Concert) => {
    if (!concert) return;

    setIsLoadingVendors(concert.id);
    try {
      const fetchedVendors = await ConcertAPI.getTicketVendors(concert.id);
      setVendors(fetchedVendors);
      setIsLoadingVendors(null);
      setShowVendorsModal(true);
    } catch (error) {
      setIsLoadingVendors(null);
      console.error('Failed to fetch ticket vendors:', error);
      Alert.alert('오류', '예매 정보를 불러오는데 실패했습니다.');
    }
  };

  const formatConcertDate = (dateStr: string) => {
    if (!dateStr) return '날짜 미정';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '날짜 미정';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { refetch(); loadAdditionalData(); }} />}>
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
                ) : artist.tier === 'A' ? (
                  <View className="rounded bg-green-600 px-2 py-1">
                    <Text className="text-xs font-bold text-white">A</Text>
                  </View>
                ) : artist.tier === 'B' ? (
                  <View className="rounded bg-gray-500 px-2 py-1">
                    <Text className="text-xs font-bold text-white">B</Text>
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

          {/* Top Award - 주요 수상 */}
          {(() => {
            if (!artist.awards || artist.awards.length === 0) return null;
            // displayOrder가 가장 큰 것(가장 높은 점수) 찾기
            const topAward = artist.awards.reduce((prev, current) => {
              const prevOrder = prev.displayOrder ?? 0;
              const currentOrder = current.displayOrder ?? 0;
              return currentOrder > prevOrder ? current : prev;
            });
            if (!topAward) return null;

            return (
              <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                <View className="flex-row items-center gap-2 mb-3">
                  <Icon as={AwardIcon} size={22} className="text-amber-600" />
                  <Text className="text-lg font-bold text-amber-800">주요 수상</Text>
                </View>
                <View className="gap-2">
                  <Text className="text-lg font-semibold text-amber-900">{topAward.awardName}</Text>
                  <Text className="text-base text-amber-700">{topAward.year}</Text>
                  {topAward.category && (
                    <Text className="text-sm text-amber-700">{topAward.category}</Text>
                  )}
                  {topAward.ranking && (
                    <Text className="text-sm text-amber-600">{topAward.ranking}</Text>
                  )}
                  {topAward.organization && (
                    <Text className="text-xs text-amber-600 mt-1">{topAward.organization}</Text>
                  )}
                </View>
              </Card>
            );
          })()}

          {/* Stats */}
          <View className="flex-row gap-3">
            <Card className="flex-1 items-center gap-1 p-4">
              <Text className="text-2xl font-bold">{artist.concertCount}+</Text>
              <Text className="text-xs text-muted-foreground">공연</Text>
            </Card>
            <Card className="flex-1 items-center gap-1 p-4">
              <Text className="text-2xl font-bold">{artist.albumCount}+</Text>
              <Text className="text-xs text-muted-foreground">앨범</Text>
            </Card>
          </View>

          {/* Biography */}
          <Card className="p-4">
            <Text className="mb-2 text-lg font-bold">소개</Text>
            {artist.bio ? (
              <Text className="leading-6 text-muted-foreground">{artist.bio}</Text>
            ) : (
              <Text className="leading-6 text-muted-foreground/50 italic">소개가 아직 등록되지 않았습니다.</Text>
            )}
          </Card>


          {/* Awards History - 수상 경력 */}
          <Card className="p-4">
            <Text className="mb-3 text-lg font-bold">수상 경력</Text>
            {artist.awards && artist.awards.length > 0 ? (
              <View className="gap-3">
                {artist.awards.map((award) => (
                  <View key={award.id} className="flex-row items-start gap-3">
                    <Icon as={AwardIcon} size={18} className="mt-1 text-amber-500" />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-semibold">{award.awardName}</Text>
                        {award.ranking && (
                          <Text className="text-sm font-medium text-amber-600">({award.ranking})</Text>
                        )}
                      </View>
                      <Text className="text-sm text-muted-foreground">{award.year}</Text>
                      {award.category && (
                        <Text className="text-xs text-muted-foreground mt-0.5">{award.category}</Text>
                      )}
                      {award.organization && (
                        <Text className="text-xs text-muted-foreground mt-0.5">{award.organization}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-muted-foreground/50 italic">수상 경력이 아직 등록되지 않았습니다.</Text>
            )}
          </Card>

          {/* Style Description */}
          {artist.style && (
            <Card className="p-5 bg-primary/5 border-primary/10">
              <View className="gap-3">
                <Text className="text-base font-semibold text-primary">연주 스타일</Text>
                <View className="border-l-4 border-primary/30 pl-4">
                  <Text className="text-base leading-7 text-foreground/80 italic">
                    {artist.style}
                  </Text>
                </View>
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
                    <Card className="p-3" style={{ minHeight: canEdit ? 460 : 360 }}>
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
                        <View className="flex-1" />
                        {(recording.spotifyUrl ||
                          recording.appleMusicUrl ||
                          recording.youtubeMusicUrl ||
                          recording.externalUrl) && (
                          <View className="flex-row flex-wrap gap-2">
                            {recording.spotifyUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.spotifyUrl!)}
                                className="h-10 w-10 items-center justify-center rounded-full bg-green-600">
                                <Image
                                  source={require('@/assets/spotify.png')}
                                  className="h-10 w-10"
                                  resizeMode="contain"
                                  defaultSource={require('@/assets/spotify.png')}
                                />
                              </TouchableOpacity>
                            )}
                            {recording.appleMusicUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(recording.appleMusicUrl!)}
                                className="h-10 w-10 items-center justify-center rounded-full bg-pink-600">
                                <Image
                                  source={require('@/assets/apple_music_classical.png')}
                                  className="h-10 w-10"
                                  resizeMode="contain"
                                  defaultSource={require('@/assets/apple_music_classical.png')}
                                />
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
                        {canEdit && (
                          <View className="mt-2 flex-row gap-2 border-t border-border pt-2">
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
                    onPress={() => router.push(`/concert/${concert.id}` as any)}>
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
                                {formatConcertDate(concert.startDate)}
                                {concert.endDate && concert.endDate !== concert.startDate &&
                                  ` ~ ${formatConcertDate(concert.endDate)}`}
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

                          {/* 예매하기 버튼 */}
                          {concert.status === 'upcoming' && (
                            <Button
                              size="sm"
                              className="mt-2 w-full"
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                handleBookTicket(concert);
                              }}
                              disabled={isLoadingVendors === concert.id}>
                              <View className="flex-row items-center justify-center">
                                {isLoadingVendors !== concert.id && (
                                  <Icon as={TicketIcon} size={16} className="mr-2 text-primary-foreground" />
                                )}
                                <Text className="text-sm">
                                  {isLoadingVendors === concert.id ? '로딩 중...' : '예매하기'}
                                </Text>
                              </View>
                            </Button>
                          )}
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
            refetch();
            loadAdditionalData();
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
          refetch();
          loadAdditionalData();
        }}
      />

      {/* Ticket Vendors Modal */}
      <TicketVendorsModal
        visible={showVendorsModal}
        vendors={vendors}
        onClose={() => setShowVendorsModal(false)}
      />
    </View>
  );
}
