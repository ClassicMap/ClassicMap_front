// app/concert/[id].tsx
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Animated, Platform } from 'react-native';
import { Alert } from '@/lib/utils/alert';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  MusicIcon,
  ClockIcon,
  MoonStarIcon,
  SunIcon,
  TrashIcon,
  StarIcon,
  EditIcon,
  UserIcon
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ConcertAPI, VenueAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { getImageUrl } from '@/lib/utils/image';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { TicketVendorsModal } from '@/components/ticket-vendors-modal';
import { prefetchImages } from '@/components/optimized-image';
import { StarRating } from '@/components/StarRating';
import { useConcert } from '@/lib/query/hooks/useConcerts';

interface ConcertArtist {
  id: number;
  concertId: number;
  artistId: number;
  artistName: string;
  role?: string;
}

interface BoxofficeRanking {
  id: number;
  ranking: number;
  genreName?: string;
  areaName?: string;
  seatScale?: string;
  performanceCount?: number;
}

interface TicketVendor {
  id: number;
  concertId: number;
  vendorName?: string;
  vendorUrl: string;
  displayOrder: number;
}

interface Concert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  startDate: string;
  endDate?: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
  artists?: ConcertArtist[];
  facilityName?: string;
  boxofficeRanking?: BoxofficeRanking;
  ticketVendors?: TicketVendor[];
}

const getStatusInfo = (concert: Concert) => {
  const concertStartDate = new Date(concert.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  concertStartDate.setHours(0, 0, 0, 0);

  if (concert.status === 'cancelled') {
    return { label: '취소', color: '#ef4444' };
  } else if (concertStartDate < today) {
    return { label: '종료', color: '#9ca3af' };
  } else if (concertStartDate.getTime() === today.getTime()) {
    return { label: '오늘', color: '#22c55e' };
  } else {
    return { label: '예정', color: '#3b82f6' };
  }
};

export default function ConcertDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  // React Query로 공연 데이터 로드 (자동 캐싱)
  const {
    data: concert,
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching: refreshing,
  } = useConcert(id ? Number(id) : undefined);

  const error = queryError ? '공연 정보를 불러오는데 실패했습니다.' : null;

  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imageOpacity = React.useRef(new Animated.Value(0)).current;
  const { canEdit, isSignedIn } = useAuth();
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [userRating, setUserRating] = React.useState<number>(0);
  const [hasWatched, setHasWatched] = React.useState(false);
  const [venueName, setVenueName] = React.useState<string>('');
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(false);
  const [showVendorsModal, setShowVendorsModal] = React.useState(false);
  const [vendors, setVendors] = React.useState<TicketVendor[]>([]);

  // 사용자 평점 로드
  React.useEffect(() => {
    if (id && isSignedIn) {
      loadUserRating();
    }
  }, [id, isSignedIn]);

  const loadUserRating = async () => {
    try {
      const rating = await ConcertAPI.getUserRating(Number(id));
      if (rating != null) {
        setUserRating(Number(rating));
        setHasWatched(true);
      }
    } catch (error) {
      console.error('Failed to load user rating:', error);
    }
  };

  const handleRatingPress = () => {
    if (!isSignedIn) {
      Alert.alert('로그인 필요', '평점을 입력하려면 로그인이 필요합니다.');
      return;
    }

    if (!hasWatched) {
      Alert.alert(
        '공연 관람 확인',
        '이 평점은 공연을 관람한 후에 매기는 평점입니다. 공연을 보셨나요?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '네, 봤습니다',
            onPress: () => setHasWatched(true),
          },
        ]
      );
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!hasWatched) {
      handleRatingPress();
      return;
    }

    setUserRating(rating);
    try {
      await ConcertAPI.submitRating(Number(id), rating);
      Alert.alert('성공', '평점이 등록되었습니다.');
      // 캐시 업데이트
      refetch();
    } catch (error) {
      Alert.alert('오류', '평점 등록에 실패했습니다.');
      console.error('Failed to submit rating:', error);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleImageError = () => {
    setImageLoaded(true);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // 이미지 로드
  React.useEffect(() => {
    const loadImages = async () => {
      if (!concert) return;

      setImagesLoaded(false);

      // facilityName 직접 사용 (API 호출 없음)
      if (concert.facilityName) {
        setVenueName(concert.facilityName);
      }

      // 이미지 프리페치 (타임아웃 추가)
      const timeout = setTimeout(() => {
        setImagesLoaded(true);
      }, 1000);

      try {
        if (concert.posterUrl) {
          await prefetchImages([concert.posterUrl]);
        }
        setImagesLoaded(true);
      } catch (error) {
        setImagesLoaded(true);
      } finally {
        clearTimeout(timeout);
      }
    };

    loadImages();
  }, [concert]);

  const onRefresh = () => {
    refetch();
  };

  const handleDeleteConcert = () => {
    if (!concert) return;
    Alert.alert(
      '공연 삭제',
      `${concert.title}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminConcertAPI.delete(concert.id);
              Alert.alert('성공', '공연이 삭제되었습니다.');
              router.back();
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleBookTicket = async () => {
    if (!concert) return;

    setIsLoadingVendors(true);
    try {
      const fetchedVendors = await ConcertAPI.getTicketVendors(concert.id);
      setVendors(fetchedVendors);
      setIsLoadingVendors(false);
      setShowVendorsModal(true);
    } catch (error) {
      setIsLoadingVendors(false);
      console.error('Failed to fetch ticket vendors:', error);
      Alert.alert('오류', '예매 정보를 불러오는데 실패했습니다.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'undefined년 undefined월 undefined일';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
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
        <Text className="text-center text-muted-foreground mt-4">
          {loading ? '공연 정보를 불러오는 중...' : '이미지를 불러오는 중...'}
        </Text>
      </View>
    );
  }

  if (error || !concert) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Card className="p-8 w-full max-w-md">
          <Text className="text-center text-destructive mb-4">
            {error || '공연을 찾을 수 없습니다'}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            <Text>뒤로 가기</Text>
          </Button>
        </Card>
      </View>
    );
  }

  const statusInfo = getStatusInfo(concert);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-background">
          {/* Top Controls */}
          <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="size-10 items-center justify-center"
            >
              <Icon as={ArrowLeftIcon} size={24} className="text-foreground" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={toggleColorScheme}
                className="size-10 items-center justify-center"
              >
                <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={24} className="text-foreground" />
              </TouchableOpacity>
              <UserMenu />
            </View>
          </View>

          {/* Title Section */}
          <View className="px-4 pb-4 items-center">
            <Text className="text-3xl font-bold mb-2 text-center">{concert.title}</Text>

            {concert.composerInfo && (
              <Text className="text-base text-muted-foreground text-center mb-3">{concert.composerInfo}</Text>
            )}

            {/* Status Badge */}
            <View className="flex-row items-center gap-2 flex-wrap justify-center">
              <View
                className="rounded px-2.5 py-1"
                style={{ backgroundColor: statusInfo.color }}
              >
                <Text className="text-xs font-medium text-white">
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="gap-6 p-4 pb-20">
          {/* Poster Image */}
          <Card className="overflow-hidden p-0 mx-auto" style={{ width: '80%', maxWidth: 320 }}>
            {!imageLoaded && (
              <View className="w-full bg-muted items-center justify-center" style={{ aspectRatio: 2/3 }}>
                <ActivityIndicator size="large" />
              </View>
            )}
            {concert.posterUrl ? (
              Platform.OS === 'web' ? (
                <Image
                  source={{ uri: getImageUrl(concert.posterUrl) }}
                  className="w-full"
                  style={{ aspectRatio: 2/3, opacity: imageLoaded ? 1 : 0 }}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <Animated.Image
                  source={{ uri: getImageUrl(concert.posterUrl) }}
                  className="w-full"
                  style={{ aspectRatio: 2/3, opacity: imageOpacity }}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )
            ) : (
              <View
                className="w-full bg-muted items-center justify-center"
                style={{ aspectRatio: 2/3 }}
                onLayout={handleImageLoad}
              >
                <Icon as={CalendarIcon} size={64} className="text-muted-foreground" />
              </View>
            )}
          </Card>

          {/* Concert Info */}
          <Card className="p-4">
            <View className="gap-3">
              {concert.artists && concert.artists.length > 0 && (
                <View className="flex-row items-start gap-3">
                  <Icon as={UserIcon} size={20} className="text-primary mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">연주자</Text>
                    <Text className="text-base font-medium">
                      {concert.artists.map(a => a.artistName).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-start gap-3">
                <Icon as={CalendarIcon} size={20} className="text-primary mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">날짜</Text>
                  <Text className="text-base font-medium">
                    {formatDate(concert.startDate)}
                    {concert.endDate && concert.endDate !== concert.startDate && ` ~ ${formatDate(concert.endDate)}`}
                  </Text>
                </View>
              </View>

              {concert.concertTime && (
                <View className="flex-row items-start gap-3">
                  <Icon as={ClockIcon} size={20} className="text-primary mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">시간</Text>
                    <Text className="text-base font-medium">{concert.concertTime}</Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-start gap-3">
                <Icon as={MapPinIcon} size={20} className="text-primary mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">장소</Text>
                  <Text className="text-base font-medium">
                    {venueName || '공연장 정보 없음'}
                  </Text>
                </View>
              </View>

              {concert.priceInfo && (
                <View className="flex-row items-start gap-3">
                  <Icon as={TicketIcon} size={20} className="text-primary mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">가격</Text>
                    <Text className="text-base font-medium">{concert.priceInfo}</Text>
                  </View>
                </View>
              )}
            </View>
          </Card>

          {/* Boxoffice Ranking Section */}
          {concert.boxofficeRanking && concert.boxofficeRanking.ranking <= 3 && (
            <Card className="p-4">
              <View className="flex-row items-center gap-3">
                <View
                  className="size-12 rounded-full items-center justify-center"
                  style={{
                    backgroundColor:
                      concert.boxofficeRanking.ranking === 1 ? '#FFD700' :
                      concert.boxofficeRanking.ranking === 2 ? '#C0C0C0' : '#CD7F32'
                  }}
                >
                  <Text className="text-2xl font-bold text-white">
                    {concert.boxofficeRanking.ranking}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold">박스오피스 순위</Text>
                  <Text className="text-sm text-muted-foreground">
                    {concert.boxofficeRanking.genreName} · {concert.boxofficeRanking.areaName}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Rating Section */}
          <Card className="p-4">
            <View className="gap-4">
              <Text className="text-lg font-bold">공연 평점</Text>

              {/* Average Rating */}
              {concert.rating != null && Number(concert.rating) > 0 ? (
                <View className="items-center gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={StarIcon} size={32} className="text-amber-500" />
                    <Text className="text-4xl font-bold">{Number(concert.rating).toFixed(1)}</Text>
                  </View>
                  {concert.ratingCount && concert.ratingCount > 0 && (
                    <Text className="text-sm text-muted-foreground">
                      {concert.ratingCount}명이 평가했습니다
                    </Text>
                  )}
                </View>
              ) : (
                <Text className="text-center text-muted-foreground py-2">
                  아직 평가가 없습니다
                </Text>
              )}

              {/* User Rating Input */}
              <View className="border-t border-border pt-4">
                <TouchableOpacity onPress={handleRatingPress} activeOpacity={hasWatched ? 1 : 0.7}>
                  <View className="gap-2">
                    <Text className="text-sm font-medium">내 평점</Text>
                    <View className="items-center">
                      <StarRating
                        rating={userRating}
                        onRatingChange={hasWatched ? handleRatingChange : undefined}
                        size={32}
                      />
                    </View>
                    {!hasWatched && isSignedIn && (
                      <Text className="text-xs text-muted-foreground text-center">
                        평점을 입력하려면 탭하세요
                      </Text>
                    )}
                    {!isSignedIn && (
                      <Text className="text-xs text-muted-foreground text-center">
                        로그인 후 평점을 입력할 수 있습니다
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Program Info */}
          {concert.composerInfo && (
            <Card className="p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Icon as={MusicIcon} size={20} className="text-primary" />
                <Text className="text-lg font-bold">프로그램</Text>
              </View>
              <Text className="text-muted-foreground leading-6">{concert.composerInfo}</Text>
            </Card>
          )}

          {/* Booking Buttons */}
          {concert.status === 'upcoming' && (
            <Button
              size="lg"
              className="items-center justify-center"
              onPress={handleBookTicket}
              disabled={isLoadingVendors}
            >
              <View className="flex-row items-center justify-center">
                {!isLoadingVendors && (
                  <Icon as={TicketIcon} size={20} className="text-primary-foreground mr-2" />
                )}
                <Text className="text-lg">{isLoadingVendors ? '로딩 중...' : '예매하기'}</Text>
              </View>
            </Button>
          )}

          {concert.status === 'ongoing' && (
            <Button size="lg" variant="secondary" className="items-center justify-center">
              <Text className="text-lg">공연 진행중</Text>
            </Button>
          )}

          {concert.status === 'completed' && (
            <Button size="lg" variant="outline" disabled className="items-center justify-center">
              <Text className="text-lg">공연 종료</Text>
            </Button>
          )}

          {concert.status === 'cancelled' && (
            <Button size="lg" variant="destructive" disabled className="items-center justify-center">
              <Text className="text-lg">공연 취소</Text>
            </Button>
          )}

          {/* Admin Buttons */}
          {canEdit && (
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onPress={() => setEditModalVisible(true)}
              >
                <Icon as={EditIcon} size={16} className="mr-2" />
                <Text>공연 수정</Text>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onPress={handleDeleteConcert}
              >
                <Icon as={TrashIcon} size={16} className="mr-2" />
                <Text>공연 삭제</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {concert && (
        <ConcertFormModal
          visible={editModalVisible}
          concert={concert}
          onClose={() => setEditModalVisible(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Ticket Vendors Modal */}
      <TicketVendorsModal
        visible={showVendorsModal}
        vendors={vendors}
        onClose={() => setShowVendorsModal(false)}
      />
    </View>
  );
}
