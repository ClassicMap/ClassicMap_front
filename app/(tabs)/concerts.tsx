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
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { OptimizedImage, prefetchImages } from '@/components/optimized-image';
import { useConcerts, CONCERT_QUERY_KEYS } from '@/lib/query/hooks/useConcerts';
import { useQueryClient } from '@tanstack/react-query';
import { ConcertAPI } from '@/lib/api/client';

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
  facilityName?: string; // 백엔드에서 이미 제공
  area?: string;
  boxofficeRanking?: BoxofficeRanking;
  ticketVendors?: TicketVendor[];
}

export default function ConcertsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'upcoming' | 'completed'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [selectedCity, setSelectedCity] = React.useState<string>('all');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [showHighRating, setShowHighRating] = React.useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = React.useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = React.useState(false);
  const [showCityPicker, setShowCityPicker] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Concert[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchOffset, setSearchOffset] = React.useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = React.useState(true);
  const { canEdit } = useAuth();

  // Debounce search query (300ms delay)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset search pagination when query changes
      setSearchOffset(0);
      setSearchResults([]);
      setHasMoreSearchResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // React Query 무한 스크롤로 공연 데이터 로드
  const queryClient = useQueryClient();
  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching: refreshing,
  } = useConcerts();

  // 페이지 데이터를 평탄화 및 중복 제거
  const concerts = React.useMemo(() => {
    if (!data?.pages) return [];

    const allConcerts = data.pages.flat();

    // ID 기준으로 중복 제거
    const uniqueConcerts = Array.from(
      new Map(allConcerts.map(concert => [concert.id, concert])).values()
    );

    return uniqueConcerts;
  }, [data]);

  // Backend search effect - initial search
  React.useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      setIsSearching(true);
      ConcertAPI.search({
        q: debouncedSearchQuery,
        offset: 0,
        limit: 20,
      })
        .then((results) => {
          setSearchResults(results);
          setSearchOffset(20);
          setHasMoreSearchResults(results.length === 20);
          setIsSearching(false);
        })
        .catch((error) => {
          console.error('Search failed:', error);
          setSearchResults([]);
          setIsSearching(false);
        });
    } else {
      setSearchResults([]);
      setSearchOffset(0);
      setHasMoreSearchResults(true);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery]);

  // Load more search results
  const loadMoreSearchResults = React.useCallback(() => {
    if (!debouncedSearchQuery.trim() || !hasMoreSearchResults || isSearching) {
      return;
    }

    setIsSearching(true);
    ConcertAPI.search({
      q: debouncedSearchQuery,
      offset: searchOffset,
      limit: 20,
    })
      .then((results) => {
        if (results.length > 0) {
          // Deduplicate by ID
          const existingIds = new Set(searchResults.map(c => c.id));
          const newResults = results.filter(c => !existingIds.has(c.id));
          setSearchResults(prev => [...prev, ...newResults]);
          setSearchOffset(prev => prev + 20);
          setHasMoreSearchResults(results.length === 20);
        } else {
          setHasMoreSearchResults(false);
        }
        setIsSearching(false);
      })
      .catch((error) => {
        console.error('Failed to load more search results:', error);
        setIsSearching(false);
      });
  }, [debouncedSearchQuery, searchOffset, hasMoreSearchResults, isSearching, searchResults]);

  // 에러 처리
  const error = queryError ? '공연 정보를 불러오는데 실패했습니다.' : null;

  // 이미지 프리페치 (첫 10개만 - 성능 최적화)
  React.useEffect(() => {
    if (concerts.length > 0) {
      const firstBatch = concerts.slice(0, 10).map((c) => c.posterUrl).filter(Boolean);
      if (firstBatch.length > 0) {
        prefetchImages(firstBatch);
      }
    }
  }, [concerts.length]);

  const handleDelete = React.useCallback((id: number, title: string) => {
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
  }, [refetch]);

  const getConcertStatus = React.useCallback((concert: Concert) => {
    if (concert.status === 'cancelled') return 'cancelled';

    const concertStartDate = new Date(concert.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    concertStartDate.setHours(0, 0, 0, 0);

    if (concertStartDate.getTime() === today.getTime()) return 'today';
    if (concertStartDate < today) return 'completed';
    return 'upcoming';
  }, []);

  // 도시 목록 추출 (area 사용)
  const availableCities = React.useMemo(() => {
    const cities = new Set<string>();
    concerts.forEach((concert) => {
      if (concert.area) {
        cities.add(concert.area);
      }
    });
    return Array.from(cities).sort();
  }, [concerts]);

  const filteredConcerts = React.useMemo(() => {
    // Use search results if searching, otherwise use paginated concerts
    let filtered = debouncedSearchQuery.trim().length > 0 ? searchResults : concerts;

    // Deduplicate by ID to prevent duplicate key errors
    filtered = Array.from(
      new Map(filtered.map(concert => [concert.id, concert])).values()
    );

    // 도시 필터
    if (selectedCity !== 'all') {
      filtered = filtered.filter((c) => c.area === selectedCity);
    }

    // 날짜 범위 필터
    if (startDate || endDate) {
      filtered = filtered.filter((c) => {
        const concertStartDate = new Date(c.startDate);
        concertStartDate.setHours(0, 0, 0, 0);

        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return concertStartDate >= start && concertStartDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return concertStartDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return concertStartDate <= end;
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
  }, [concerts, searchResults, debouncedSearchQuery, selectedCity, startDate, endDate, statusFilter, showHighRating, getConcertStatus]);

  // 무한 스크롤 처리 - 마지막 요청 추적
  const lastFetchRef = React.useRef<number>(0);

  const handleScroll = React.useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200; // 하단 200px 전에 로드 시작

    // contentSize가 0이면 아직 렌더링 안 됨 (초기 로드 중)
    if (contentSize.height === 0) {
      return;
    }

    // 음수 스크롤은 무시 (RefreshControl 당기는 동작)
    if (contentOffset.y < 0) {
      return;
    }

    // 실제로 스크롤을 했는지 체크 (최소 200px 이상 스크롤)
    const hasScrolled = contentOffset.y > 200;

    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (!hasScrolled || !isNearBottom) {
      return;
    }

    const now = Date.now();
    // 마지막 요청 후 1초 이내면 무시 (중복 방지)
    if (now - lastFetchRef.current < 1000) {
      return;
    }

    // If searching, load more search results
    if (debouncedSearchQuery.trim().length > 0) {
      if (hasMoreSearchResults && !isSearching) {
        lastFetchRef.current = now;
        loadMoreSearchResults();
      }
    } else {
      // Otherwise, load more paginated results
      if (hasNextPage && !isFetchingNextPage) {
        lastFetchRef.current = now;
        fetchNextPage();
      }
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    debouncedSearchQuery,
    hasMoreSearchResults,
    isSearching,
    loadMoreSearchResults,
  ]);

  // 새로고침 핸들러 (첫 페이지만 다시 로드)
  const handleRefresh = React.useCallback(() => {
    // Clear search state
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchResults([]);
    setSearchOffset(0);
    setHasMoreSearchResults(true);

    // resetQueries를 사용하여 무한 스크롤 상태를 초기화
    // 이렇게 하면 첫 페이지만 로드됨
    queryClient.resetQueries({ queryKey: CONCERT_QUERY_KEYS.all });
  }, [queryClient]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      onScroll={handleScroll}
      scrollEventThrottle={400}>
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
          {(loading || (isSearching && filteredConcerts.length === 0)) ? (
            <View className="py-12">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-center text-muted-foreground">
                {isSearching ? '검색 중...' : '공연 정보를 불러오는 중...'}
              </Text>
            </View>
          ) : error ? (
            <Card className="p-8">
              <Text className="mb-4 text-center text-destructive">{error}</Text>
              <Button variant="outline" size="sm" className="mx-auto" onPress={handleRefresh}>
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
              />
            ))
          ) : (
            <Card className="p-8">
              <Text className="text-center text-muted-foreground">
                {debouncedSearchQuery
                  ? `"${debouncedSearchQuery}"에 대한 검색 결과가 없습니다`
                  : '공연 정보가 없습니다'}
              </Text>
            </Card>
          )}

          {/* 무한 스크롤 로딩 인디케이터 */}
          {debouncedSearchQuery ? (
            // 검색 중일 때
            isSearching && filteredConcerts.length > 0 && (
              <View className="py-4">
                <ActivityIndicator size="small" />
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                  더 많은 검색 결과를 불러오는 중...
                </Text>
              </View>
            )
          ) : (
            // 일반 무한 스크롤
            isFetchingNextPage && (
              <View className="py-4">
                <ActivityIndicator size="small" />
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                  더 많은 공연을 불러오는 중...
                </Text>
              </View>
            )
          )}

          {/* 더 이상 데이터가 없을 때 */}
          {debouncedSearchQuery ? (
            // 검색 모드
            !hasMoreSearchResults && filteredConcerts.length > 0 && (
              <View className="py-4">
                <Text className="text-center text-sm text-muted-foreground">
                  "{debouncedSearchQuery}" 검색 결과: 총 {filteredConcerts.length}개
                </Text>
              </View>
            )
          ) : (
            // 일반 모드
            !hasNextPage && filteredConcerts.length > 0 && (
              <View className="py-4">
                <Text className="text-center text-sm text-muted-foreground">
                  모든 공연을 불러왔습니다
                </Text>
              </View>
            )
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

const ConcertCard = React.memo(function ConcertCard({
  concert,
  canEdit,
  onDelete,
}: {
  concert: Concert;
  canEdit: boolean;
  onDelete: (id: number, title: string) => void;
}) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '날짜 정보 없음';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '날짜 정보 없음';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // 상태 정보 계산
  const getConcertStatusInfo = () => {
    const concertStartDate = new Date(concert.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    concertStartDate.setHours(0, 0, 0, 0);

    if (concert.status === 'cancelled') {
      return {
        text: '취소',
        bgColor: '#ef4444',
      };
    } else if (concertStartDate < today) {
      return {
        text: '종료',
        bgColor: '#9ca3af',
      };
    } else if (concertStartDate.getTime() === today.getTime()) {
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
        <View className="flex-row" style={{ height: 250 }}>
          <View className="w-32 items-center justify-center bg-muted relative">
            <OptimizedImage
              key={`concert-poster-${concert.id}`}
              uri={concert.posterUrl}
              style={{ width: '100%', height: 250 }}
              resizeMode="cover"
              fallbackComponent={
                <View className="h-full w-full items-center justify-center bg-muted">
                  <Icon as={CalendarIcon} size={48} className="text-muted-foreground" />
                </View>
              }
            />
            {/* Ranking Badge for Top 3 */}
            {concert.boxofficeRanking && concert.boxofficeRanking.ranking <= 3 && (
              <View
                className="absolute top-2 left-2"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor:
                    concert.boxofficeRanking.ranking === 1 ? '#FFD700' :
                    concert.boxofficeRanking.ranking === 2 ? '#C0C0C0' : '#CD7F32',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                  elevation: 6,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF' }}>
                  {concert.boxofficeRanking.ranking}
                </Text>
              </View>
            )}
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
                  {formatDate(concert.startDate)} {concert.concertTime || ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Icon as={MapPinIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">{concert.facilityName || '공연장 정보 없음'}</Text>
              </View>
              {concert.priceInfo && (
                <View className="flex-row items-center gap-2">
                  <Icon as={TicketIcon} size={16} className="text-muted-foreground" />
                  <Text className="text-sm">{concert.priceInfo}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});
