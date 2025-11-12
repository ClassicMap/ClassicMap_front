import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Alert } from '@/lib/utils/alert';
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  TrashIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { useRouter } from 'expo-router';
import { ConcertAPI, VenueAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { OptimizedImage, prefetchImages } from '@/components/optimized-image';
import { StarRating } from '@/components/StarRating';

interface Concert {
  id: number;
  title: string;
  composerInfo?: string;
  venueId: number;
  concertDate: string;
  concertTime?: string;
  priceInfo?: string;
  posterUrl?: string;
  ticketUrl?: string;
  isRecommended: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
}

export default function ConcertsScreen() {
  const [concerts, setConcerts] = React.useState<Concert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'month' | 'recommended' | 'highRating'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [venueNames, setVenueNames] = React.useState<{ [key: number]: string }>({});
  const { canEdit } = useAuth();

  React.useEffect(() => {
    loadConcerts();
  }, []);

  const loadConcerts = async () => {
    setLoading(true);
    setImagesLoaded(false);
    setError(null);
    try {
      const data = await ConcertAPI.getAll();
      setConcerts(data as any);

      // 공연장 정보 로드
      const venueIds = [...new Set(data.map((c) => c.venueId))];
      const venueData: { [key: number]: string } = {};
      await Promise.all(
        venueIds.map(async (venueId) => {
          try {
            const venue = await VenueAPI.getById(venueId);
            if (venue) {
              venueData[venueId] = venue.name;
            }
          } catch (error) {
            console.error(`Failed to load venue ${venueId}:`, error);
          }
        })
      );
      setVenueNames(venueData);

      // 이미지 로딩 완료 대기
      await prefetchImages(data.map((c) => c.posterUrl));
      setImagesLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load concerts:', err);
      setError('공연 정보를 불러오는데 실패했습니다.');
      setLoading(false);
      setImagesLoaded(true);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await ConcertAPI.getAll();
      setConcerts(data as any);

      // 공연장 정보 로드
      const venueIds = [...new Set(data.map((c) => c.venueId))];
      const venueData: { [key: number]: string } = {};
      await Promise.all(
        venueIds.map(async (venueId) => {
          try {
            const venue = await VenueAPI.getById(venueId);
            if (venue) {
              venueData[venueId] = venue.name;
            }
          } catch (error) {
            console.error(`Failed to load venue ${venueId}:`, error);
          }
        })
      );
      setVenueNames(venueData);

      await prefetchImages(data.map((c) => c.posterUrl));
      setError(null);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to refresh concerts:', err);
      setError('공연 정보를 불러오는데 실패했습니다.');
      setRefreshing(false);
    }
  }, []);

  const handleDelete = (id: number, title: string) => {
    Alert.alert('공연 삭제', `${title}을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminConcertAPI.delete(id);
            Alert.alert('성공', '공연이 삭제되었습니다.');
            loadConcerts();
          } catch (error) {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const filteredConcerts = React.useMemo(() => {
    let filtered = concerts;

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter((concert) => {
        const venueName = venueNames[concert.venueId] || '';
        return (
          concert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (concert.composerInfo &&
            concert.composerInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
          venueName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // 카테고리 필터
    if (filter === 'recommended') {
      filtered = filtered.filter((c) => c.isRecommended);
    } else if (filter === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      filtered = filtered.filter((c) => {
        const concertDate = new Date(c.concertDate);
        return concertDate.getMonth() === currentMonth;
      });
    } else if (filter === 'highRating') {
      filtered = filtered.filter((c) => (c.rating || 0) >= 4.0);
    }

    return filtered;
  }, [concerts, filter, searchQuery, venueNames]);
  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View className="gap-6 p-4">
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="h1" className="text-3xl font-bold">
              공연 일정
            </Text>
            {canEdit && (
              <Button onPress={() => setShowFormModal(true)} size="sm">
                <Icon as={PlusIcon} size={16} className="mr-1 text-primary-foreground" />
                <Text>추가</Text>
              </Button>
            )}
          </View>
          <Text className="text-muted-foreground">통합된 클래식 공연 정보와 예매</Text>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <Input
            placeholder="공연명, 작곡가, 공연장으로 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10"
          />
          <View className="absolute left-3 top-3.5">
            <Icon as={SearchIcon} size={18} className="text-muted-foreground" />
          </View>
        </View>

        {/* Filter */}
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('all')}>
            <Text className="text-sm">전체</Text>
          </Button>
          <Button
            size="sm"
            variant={filter === 'month' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('month')}>
            <Text className="text-sm">이번 달</Text>
          </Button>
          <Button
            size="sm"
            variant={filter === 'recommended' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('recommended')}>
            <Text className="text-sm">추천</Text>
          </Button>
          <Button
            size="sm"
            variant={filter === 'highRating' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('highRating')}>
            <Text className="text-sm">평점 4.0+</Text>
          </Button>
        </View>

        {/* Concert List */}
        <View className="gap-4">
          {loading || !imagesLoaded ? (
            <View className="py-12">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-center text-muted-foreground">
                {loading ? '공연 정보를 불러오는 중...' : '이미지를 불러오는 중...'}
              </Text>
            </View>
          ) : error ? (
            <Card className="p-8">
              <Text className="mb-4 text-center text-destructive">{error}</Text>
              <Button variant="outline" size="sm" className="mx-auto" onPress={loadConcerts}>
                <Text>다시 시도</Text>
              </Button>
            </Card>
          ) : filteredConcerts.length > 0 ? (
            filteredConcerts.map((concert) => (
              <ConcertCard
                key={concert.id}
                concert={concert}
                canEdit={canEdit}
                onDelete={handleDelete}
                onRatingSuccess={loadConcerts}
                venueName={venueNames[concert.venueId]}
              />
            ))
          ) : (
            <Card className="p-8">
              <Text className="text-center text-muted-foreground">공연 정보가 없습니다</Text>
            </Card>
          )}
        </View>
      </View>

      <ConcertFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={loadConcerts}
      />
    </ScrollView>
  );
}

function ConcertCard({
  concert,
  canEdit,
  onDelete,
  onRatingSuccess,
  venueName,
}: {
  concert: Concert;
  canEdit: boolean;
  onDelete: (id: number, title: string) => void;
  onRatingSuccess: () => void;
  venueName?: string;
}) {
  const router = useRouter();
  const [userRating, setUserRating] = React.useState<number>(0);
  const [hasWatched, setHasWatched] = React.useState(false);
  const { isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      loadUserRating();
    }
  }, [concert.id, isSignedIn]);

  const loadUserRating = async () => {
    try {
      const rating = await ConcertAPI.getUserRating(concert.id);
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
      await ConcertAPI.submitRating(concert.id, rating);
      Alert.alert('성공', '평점이 등록되었습니다.');
      // Reload concerts to show updated average rating
      onRatingSuccess();
    } catch (error) {
      Alert.alert('오류', '평점 등록에 실패했습니다.');
      console.error('Failed to submit rating:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '날짜 정보 없음';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '날짜 정보 없음';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/concert/${concert.id}` as any)}
      activeOpacity={0.7}>
      <Card className="overflow-hidden p-0">
        <View className="flex-row" style={{ height: 295 }}>
          <View className="w-32 items-center justify-center bg-muted">
            <OptimizedImage
              uri={concert.posterUrl}
              style={{ width: '100%', height: 295 }}
              resizeMode="cover"
              fallbackComponent={
                <View className="h-full w-full items-center justify-center bg-muted">
                  <Icon as={CalendarIcon} size={48} className="text-muted-foreground" />
                </View>
              }
            />
          </View>
          <View className="flex-1 gap-3 p-4">
            <View className="gap-2">
              <View className="flex-row items-start justify-between">
                <Text className="flex-1 text-xl font-bold">{concert.title}</Text>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => onDelete(concert.id, concert.title)}>
                    <Icon as={TrashIcon} size={18} className="text-destructive" />
                  </Button>
                )}
              </View>
              {concert.composerInfo && (
                <Text className="text-muted-foreground">{concert.composerInfo}</Text>
              )}
              <View className="flex-row items-center gap-1">
                <Icon as={StarIcon} size={14} className="text-amber-500" />
                <Text className="text-sm font-medium">
                  {concert.rating != null && Number(concert.rating) > 0
                    ? Number(concert.rating).toFixed(1)
                    : '0.0'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  ({concert.ratingCount && concert.ratingCount > 0 ? concert.ratingCount : 0})
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">
                  {formatDate(concert.concertDate)} {concert.concertTime || ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Icon as={MapPinIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">{venueName || '공연장 정보 없음'}</Text>
              </View>
              {concert.priceInfo && (
                <View className="flex-row items-center gap-2">
                  <Icon as={TicketIcon} size={16} className="text-muted-foreground" />
                  <Text className="text-sm">{concert.priceInfo}</Text>
                </View>
              )}
            </View>

            {/* Rating Section */}
            <TouchableOpacity onPress={handleRatingPress} activeOpacity={hasWatched ? 1 : 0.7}>
              <View className="gap-1">
                <Text className="text-xs text-muted-foreground">내 평점</Text>
                <StarRating
                  rating={userRating}
                  onRatingChange={hasWatched ? handleRatingChange : undefined}
                  size={20}
                />
              </View>
            </TouchableOpacity>

            {concert.ticketUrl && (
              <Button onPress={() => Linking.openURL(concert.ticketUrl!)}>
                <Text>예매하기</Text>
              </Button>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
