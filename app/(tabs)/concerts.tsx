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
  Platform,
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
  XIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as React from 'react';
import { useRouter } from 'expo-router';
import { VenueAPI, ConcertAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { OptimizedImage, prefetchImages } from '@/components/optimized-image';
import { StarRating } from '@/components/StarRating';
import { useConcerts } from '@/lib/query/hooks/useConcerts';

interface ConcertArtist {
  id: number;
  concertId: number;
  artistId: number;
  artistName: string;
  role?: string;
}

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
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  ratingCount?: number;
  artists?: ConcertArtist[];
}

interface Venue {
  id: number;
  name: string;
  city?: string;
  country?: string;
}

export default function ConcertsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'upcoming' | 'completed'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [venues, setVenues] = React.useState<{ [key: number]: Venue }>({});
  const [selectedCity, setSelectedCity] = React.useState<string>('all');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [showHighRating, setShowHighRating] = React.useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = React.useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = React.useState(false);
  const [showCityPicker, setShowCityPicker] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const { canEdit } = useAuth();

  // React Query로 공연 데이터 로드 (자동 캐싱)
  const {
    data: concerts = [],
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching: refreshing,
  } = useConcerts();

  // 에러 처리
  const error = queryError ? '공연 정보를 불러오는데 실패했습니다.' : null;

  // 공연장 정보 로드
  React.useEffect(() => {
    if (concerts.length > 0) {
      loadVenues();
    }
  }, [concerts]);

  const loadVenues = async () => {
    const venueIds = [...new Set(concerts.map((c) => c.venueId))];
    const venueData: { [key: number]: Venue } = {};
    await Promise.all(
      venueIds.map(async (venueId) => {
        try {
          const venue = await VenueAPI.getById(venueId);
          if (venue) {
            venueData[venueId] = venue;
          }
        } catch (error) {
          console.error(`Failed to load venue ${venueId}:`, error);
        }
      })
    );
    setVenues(venueData);
  };

  // 이미지 프리페치
  React.useEffect(() => {
    if (concerts.length > 0) {
      prefetchImages(concerts.map((c) => c.posterUrl));
    }
  }, [concerts]);

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
            refetch();
          } catch (error) {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const getConcertStatus = (concert: Concert) => {
    if (concert.status === 'cancelled') return 'cancelled';

    const concertDate = new Date(concert.concertDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    concertDate.setHours(0, 0, 0, 0);

    if (concertDate.getTime() === today.getTime()) return 'today';
    if (concertDate < today) return 'completed';
    return 'upcoming';
  };

  // 도시 목록 추출
  const availableCities = React.useMemo(() => {
    const cities = new Set<string>();
    Object.values(venues).forEach((venue) => {
      if (venue.city) {
        cities.add(venue.city);
      }
    });
    return Array.from(cities).sort();
  }, [venues]);

  const filteredConcerts = React.useMemo(() => {
    let filtered = concerts;

    // 검색 필터 (공연명, 작곡가, 연주자, 공연장명, 도시)
    if (searchQuery) {
      filtered = filtered.filter((concert) => {
        const venue = venues[concert.venueId];
        const venueName = venue?.name || '';
        const venueCity = venue?.city || '';
        const artistNames = concert.artists?.map(a => a.artistName).join(' ') || '';
        const query = searchQuery.toLowerCase();
        return (
          concert.title.toLowerCase().includes(query) ||
          (concert.composerInfo && concert.composerInfo.toLowerCase().includes(query)) ||
          venueName.toLowerCase().includes(query) ||
          venueCity.toLowerCase().includes(query) ||
          artistNames.toLowerCase().includes(query)
        );
      });
    }

    // 도시 필터
    if (selectedCity !== 'all') {
      filtered = filtered.filter((c) => {
        const venue = venues[c.venueId];
        return venue?.city === selectedCity;
      });
    }

    // 날짜 범위 필터
    if (startDate || endDate) {
      filtered = filtered.filter((c) => {
        const concertDate = new Date(c.concertDate);
        concertDate.setHours(0, 0, 0, 0);

        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return concertDate >= start && concertDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return concertDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return concertDate <= end;
        }
        return true;
      });
    }

    // 상태 필터
    if (statusFilter === 'upcoming') {
      filtered = filtered.filter((c) => {
        const status = getConcertStatus(c);
        return status === 'upcoming' || status === 'today';
      });
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((c) => getConcertStatus(c) === 'completed');
    }

    // 평점 필터
    if (showHighRating) {
      filtered = filtered.filter((c) => (c.rating || 0) >= 4.0);
    }

    return filtered;
  }, [concerts, searchQuery, selectedCity, startDate, endDate, statusFilter, showHighRating, venues]);
  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetch()} />}>
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
            placeholder="공연명, 작곡가, 연주자, 공연장, 지역으로 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10"
          />
          <View className="absolute left-3 top-3.5">
            <Icon as={SearchIcon} size={18} className="text-muted-foreground" />
          </View>
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Card className="p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon as={FilterIcon} size={18} className="text-foreground" />
                <Text className="font-medium">필터 검색</Text>
              </View>
              <Icon
                as={showFilters ? ChevronUpIcon : ChevronDownIcon}
                size={20}
                className="text-muted-foreground"
              />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4">
          <View className="gap-4">
            {/* 날짜 범위 필터 */}
            <View className="gap-2">
              <Text className="text-sm font-medium">날짜 범위</Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(true)}
                    className="flex-row items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <Text className={startDate ? "text-sm" : "text-sm text-muted-foreground"}>
                      {startDate ? startDate.toLocaleDateString('ko-KR') : '시작일'}
                    </Text>
                    <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                  </TouchableOpacity>
                  {startDate && (
                    <TouchableOpacity
                      onPress={() => setStartDate(null)}
                      className="absolute right-8 top-2.5"
                    >
                      <Icon as={XIcon} size={16} className="text-muted-foreground" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text className="text-muted-foreground self-center">~</Text>
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(true)}
                    className="flex-row items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <Text className={endDate ? "text-sm" : "text-sm text-muted-foreground"}>
                      {endDate ? endDate.toLocaleDateString('ko-KR') : '종료일'}
                    </Text>
                    <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                  </TouchableOpacity>
                  {endDate && (
                    <TouchableOpacity
                      onPress={() => setEndDate(null)}
                      className="absolute right-8 top-2.5"
                    >
                      <Icon as={XIcon} size={16} className="text-muted-foreground" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowStartDatePicker(Platform.OS === 'ios');
                    if (date) setStartDate(date);
                  }}
                />
              )}
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            {/* 지역 필터 */}
            {availableCities.length > 0 && (
              <View className="gap-2">
                <Text className="text-sm font-medium">지역</Text>
                <TouchableOpacity
                  onPress={() => setShowCityPicker(!showCityPicker)}
                  className="flex-row items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <Text className={selectedCity !== 'all' ? "text-sm" : "text-sm text-muted-foreground"}>
                    {selectedCity !== 'all' ? selectedCity : '전체 지역'}
                  </Text>
                  <Text className="text-muted-foreground">▼</Text>
                </TouchableOpacity>
                {showCityPicker && (
                  <View className="border border-border rounded-md bg-background">
                    <ScrollView className="max-h-48">
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCity('all');
                          setShowCityPicker(false);
                        }}
                        className={`p-3 border-b border-border ${selectedCity === 'all' ? 'bg-primary/10' : ''}`}
                      >
                        <Text className="text-sm">전체 지역</Text>
                      </TouchableOpacity>
                      {availableCities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => {
                            setSelectedCity(city);
                            setShowCityPicker(false);
                          }}
                          className={`p-3 border-b border-border ${selectedCity === city ? 'bg-primary/10' : ''}`}
                        >
                          <Text className="text-sm">{city}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* 상태 및 평점 필터 */}
            <View className="gap-2">
              <Text className="text-sm font-medium">기타 필터</Text>
              <View className="flex-row gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text className="text-xs">전체</Text>
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
                  onPress={() => setStatusFilter('upcoming')}
                >
                  <Text className="text-xs">예정</Text>
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'completed' ? 'default' : 'outline'}
                  onPress={() => setStatusFilter('completed')}
                >
                  <Text className="text-xs">종료</Text>
                </Button>
                <Button
                  size="sm"
                  variant={showHighRating ? 'default' : 'outline'}
                  onPress={() => setShowHighRating(!showHighRating)}
                >
                  <Icon as={StarIcon} size={12} className={showHighRating ? "text-primary-foreground mr-1" : "text-foreground mr-1"} />
                  <Text className="text-xs">평점 4.0+</Text>
                </Button>
              </View>
            </View>
          </View>
        </Card>
        )}

        {/* Concert List */}
        <View className="gap-4">
          {loading ? (
            <View className="py-12">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-center text-muted-foreground">
                공연 정보를 불러오는 중...
              </Text>
            </View>
          ) : error ? (
            <Card className="p-8">
              <Text className="mb-4 text-center text-destructive">{error}</Text>
              <Button variant="outline" size="sm" className="mx-auto" onPress={() => refetch()}>
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
                onRatingSuccess={() => refetch()}
                venueName={venues[concert.venueId]?.name}
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
        onSuccess={() => refetch()}
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
    // 로그인하지 않았으면 요청하지 않음
    if (!isSignedIn) return;

    try {
      const rating = await ConcertAPI.getUserRating(concert.id);
      if (rating != null) {
        setUserRating(Number(rating));
        setHasWatched(true);
      }
    } catch (error) {
      // 401 에러는 정상 (로그인 필요)
      if (error instanceof Error && !error.message.includes('401')) {
        console.error('Failed to load user rating:', error);
      }
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

  // 상태 정보 계산
  const getConcertStatusInfo = () => {
    const concertDate = new Date(concert.concertDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    concertDate.setHours(0, 0, 0, 0);

    if (concert.status === 'cancelled') {
      return {
        text: '취소',
        bgColor: '#ef4444',
      };
    } else if (concertDate < today) {
      return {
        text: '종료',
        bgColor: '#9ca3af',
      };
    } else if (concertDate.getTime() === today.getTime()) {
      return {
        text: '오늘',
        bgColor: '#22c55e',
      };
    } else {
      return {
        text: '예정',
        bgColor: '#3b82f6',
      };
    }
  };

  const statusInfo = getConcertStatusInfo();

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
                <View className="flex-1">
                  <Text className="text-xl font-bold">{concert.title}</Text>
                  {/* Status Badge */}
                  <View
                    className="mt-1 self-start rounded px-2 py-0.5"
                    style={{ backgroundColor: statusInfo.bgColor }}
                  >
                    <Text className="text-xs font-medium text-white">
                      {statusInfo.text}
                    </Text>
                  </View>
                </View>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => onDelete(concert.id, concert.title)}>
                    <Icon as={TrashIcon} size={18} className="text-destructive" />
                  </Button>
                )}
              </View>
              {(concert.artists && concert.artists.length > 0) || concert.composerInfo ? (
                <Text className="text-muted-foreground">
                  {concert.artists && concert.artists.length > 0
                    ? `${concert.artists.map(a => a.artistName).join(', ')}${concert.composerInfo ? ' | ' + concert.composerInfo : ''}`
                    : concert.composerInfo}
                </Text>
              ) : null}
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
