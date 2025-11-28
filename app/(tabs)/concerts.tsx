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
import { useConcerts, useAreas, CONCERT_QUERY_KEYS } from '@/lib/query/hooks/useConcerts';
import { useQueryClient } from '@tanstack/react-query';
import { ConcertAPI, BoxofficeAPI, BoxofficeConcert } from '@/lib/api/client';

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
  const [selectedAreaCode, setSelectedAreaCode] = React.useState<string | undefined>(undefined); // KOPIS area code
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
  const [top3Concerts, setTop3Concerts] = React.useState<BoxofficeConcert[]>([]);
  const [loadingTop3, setLoadingTop3] = React.useState(false);
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
  } = useConcerts(selectedCity !== 'all' ? selectedCity : undefined);

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
        area: selectedCity !== 'all' ? selectedCity : undefined,
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
  }, [debouncedSearchQuery, selectedCity]);

  // Load more search results
  const loadMoreSearchResults = React.useCallback(() => {
    if (!debouncedSearchQuery.trim() || !hasMoreSearchResults || isSearching) {
      return;
    }

    setIsSearching(true);
    ConcertAPI.search({
      q: debouncedSearchQuery,
      area: selectedCity !== 'all' ? selectedCity : undefined,
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
  }, [debouncedSearchQuery, selectedCity, searchOffset, hasMoreSearchResults, isSearching, searchResults]);

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

  // 지역명 -> KOPIS 코드 매핑
  const AREA_CODE_MAP: Record<string, string> = {
    '서울': '11',
    '부산': '26',
    '대구': '27',
    '인천': '28',
    '광주': '29',
    '대전': '30',
    '울산': '31',
    '세종': '36',
    '경기': '41',
    '강원': '42',
    '충북': '43',
    '충남': '44',
    '전북': '45',
    '전남': '46',
    '경북': '47',
    '경남': '48',
    '제주': '50',
  };

  // 도시 목록 조회 (API에서 가져오기)
  const { data: availableCities = [] } = useAreas();

  // Load TOP3 boxoffice concerts
  React.useEffect(() => {
    const loadTop3 = async () => {
      setLoadingTop3(true);
      try {
        const data = await BoxofficeAPI.getTop3(selectedAreaCode);
        console.log('Boxoffice TOP3 data:', data.map(c => ({ id: c.id, ranking: c.ranking, title: c.title })));
        setTop3Concerts(data);
      } catch (error) {
        console.error('Failed to load TOP3 boxoffice:', error);
        setTop3Concerts([]);
      } finally {
        setLoadingTop3(false);
      }
    };
    loadTop3();
  }, [selectedAreaCode]);

  const filteredConcerts = React.useMemo(() => {
    // Use search results if searching, otherwise use paginated concerts
    let filtered = debouncedSearchQuery.trim().length > 0 ? searchResults : concerts;

    // Deduplicate by ID to prevent duplicate key errors
    filtered = Array.from(
      new Map(filtered.map(concert => [concert.id, concert])).values()
    );

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
  }, [concerts, searchResults, debouncedSearchQuery, startDate, endDate, statusFilter, showHighRating, getConcertStatus]);

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
    // 모든 공연 쿼리 (전체 및 지역별 필터링 포함)를 리셋
    queryClient.resetQueries({ queryKey: ['concerts'] });
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
                          setSelectedAreaCode(undefined);
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
                            setSelectedAreaCode(AREA_CODE_MAP[city]);
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

        {/* TOP 3 Boxoffice Section */}
        {!debouncedSearchQuery && top3Concerts.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2 px-1">
              <Icon as={StarIcon} size={20} className="text-amber-500" />
              <Text className="text-xl font-bold">
                {selectedAreaCode ? `${selectedCity} 박스오피스 TOP 3` : '전국 박스오피스 TOP 3'}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 2 }}
              className="gap-3"
            >
              {top3Concerts.map((concert, index) => (
                <View key={concert.id} style={{ marginRight: index < top3Concerts.length - 1 ? 16 : 0 }}>
                  <BoxofficeTop3Card concert={concert} canEdit={canEdit} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading TOP3 */}
        {!debouncedSearchQuery && loadingTop3 && (
          <View className="py-4">
            <ActivityIndicator size="small" />
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              박스오피스 순위를 불러오는 중...
            </Text>
          </View>
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
            <>
              {!debouncedSearchQuery && filteredConcerts.length > 0 && (
                <View className="flex-row items-center gap-2 mt-2">
                  <Text className="text-lg font-semibold">전체 공연</Text>
                  <Text className="text-sm text-muted-foreground">({filteredConcerts.length})</Text>
                </View>
              )}
              {filteredConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  canEdit={canEdit}
                  onDelete={handleDelete}
                />
              ))}
            </>
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

// BoxofficeTop3Card component
const BoxofficeTop3Card = React.memo(function BoxofficeTop3Card({
  concert,
  canEdit,
}: {
  concert: BoxofficeConcert;
  canEdit: boolean;
}) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '날짜 정보 없음';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '날짜 정보 없음';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getRankingColor = () => {
    switch(concert.ranking) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#9CA3AF';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/concert/${concert.concertId}` as any)}
      activeOpacity={0.7}>
      <Card className="overflow-hidden p-0" style={{
        borderWidth: 2.5,
        borderColor: getRankingColor(),
        shadowColor: getRankingColor(),
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
      }}>
        <View style={{ width: 220 }}>
          {/* Poster Image with Ranking Badge */}
          <View className="items-center justify-center bg-muted relative" style={{ aspectRatio: 3/4 }}>
            <OptimizedImage
              key={`boxoffice-poster-${concert.id}`}
              uri={concert.posterUrl}
              style={{ width: '100%', aspectRatio: 3/4 }}
              resizeMode="cover"
              fallbackComponent={
                <View className="h-full w-full items-center justify-center bg-muted">
                  <Icon as={CalendarIcon} size={48} className="text-muted-foreground" />
                </View>
              }
            />
            {/* Dark Gradient Overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            />
            {/* Ranking Badge */}
            <View
              className="absolute top-2.5 left-2.5"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: getRankingColor(),
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.7,
                shadowRadius: 6,
                elevation: 10,
                borderWidth: 2.5,
                borderColor: '#FFF',
              }}
            >
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#FFF',
                textShadowColor: 'rgba(0,0,0,0.4)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3
              }}>
                {concert.ranking}
              </Text>
            </View>
          </View>

          {/* Concert Info */}
          <View className="gap-2 p-3 bg-card">
            <View className="gap-1.5">
              <Text className="text-sm font-bold leading-4" numberOfLines={2}>{concert.title}</Text>
              <View className="flex-row items-center gap-1">
                <Icon as={StarIcon} size={13} className="text-amber-500" />
                <Text className="text-xs font-semibold">
                  {concert.rating != null && Number(concert.rating) > 0
                    ? Number(concert.rating).toFixed(1)
                    : '0.0'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  ({concert.ratingCount && concert.ratingCount > 0 ? concert.ratingCount : 0})
                </Text>
              </View>
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center gap-1.5">
                <Icon as={CalendarIcon} size={12} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                  {formatDate(concert.startDate)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon as={MapPinIcon} size={12} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                  {concert.facilityName || '공연장 정보 없음'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

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
