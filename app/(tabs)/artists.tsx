import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Alert } from '@/lib/utils/alert';
import { StarIcon, TrendingUpIcon, SearchIcon, PlusIcon, TrashIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { AdminArtistAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import type { Artist } from '@/lib/types/models';
import { prefetchImages } from '@/components/optimized-image';
import { getImageUrl } from '@/lib/utils/image';
import { useArtists, ARTIST_QUERY_KEYS } from '@/lib/query/hooks/useArtists';
import { useQueryClient } from '@tanstack/react-query';
import { ArtistAPI } from '@/lib/api/client';

export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'S' | 'Rising'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Artist[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchOffset, setSearchOffset] = React.useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = React.useState(true);
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();

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

  // React Query 무한 스크롤로 아티스트 데이터 로드
  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching: refreshing,
  } = useArtists();

  // 페이지 데이터를 평탄화 및 중복 제거
  const artists = React.useMemo(() => {
    if (!data?.pages) return [];

    const allArtists = data.pages.flat();

    // ID 기준으로 중복 제거
    const uniqueArtists = Array.from(
      new Map(allArtists.map(artist => [artist.id, artist])).values()
    );

    return uniqueArtists;
  }, [data]);

  // 에러 처리
  const error = queryError ? '아티스트 정보를 불러오는데 실패했습니다.' : null;

  // Backend search effect - initial search
  React.useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      setIsSearching(true);
      // Apply tier filter if selected
      const tier = selectedFilter !== 'all' ? selectedFilter : undefined;
      ArtistAPI.search({
        q: debouncedSearchQuery,
        tier,
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
  }, [debouncedSearchQuery, selectedFilter]);

  // Load more search results
  const loadMoreSearchResults = React.useCallback(() => {
    if (!debouncedSearchQuery.trim() || !hasMoreSearchResults || isSearching) {
      return;
    }

    setIsSearching(true);
    const tier = selectedFilter !== 'all' ? selectedFilter : undefined;
    ArtistAPI.search({
      q: debouncedSearchQuery,
      tier,
      offset: searchOffset,
      limit: 20,
    })
      .then((results) => {
        if (results.length > 0) {
          // Deduplicate by ID
          const existingIds = new Set(searchResults.map(a => a.id));
          const newResults = results.filter(a => !existingIds.has(a.id));
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
  }, [debouncedSearchQuery, selectedFilter, searchOffset, hasMoreSearchResults, isSearching, searchResults]);

  // 새로고침 핸들러 (첫 페이지만 다시 로드) - early return 전에 정의
  const handleRefresh = React.useCallback(() => {
    // Clear search state
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchResults([]);
    setSearchOffset(0);
    setHasMoreSearchResults(true);

    // resetQueries를 사용하여 무한 스크롤 상태를 초기화
    // 이렇게 하면 첫 페이지만 로드됨
    queryClient.resetQueries({ queryKey: ARTIST_QUERY_KEYS.all });
  }, [queryClient]);

  // 무한 스크롤 처리 - 마지막 요청 추적 - early return 전에 정의
  const lastFetchRef = React.useRef<number>(0);

  const handleScroll = React.useCallback(
    (event: any) => {
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
    },
    [
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
      debouncedSearchQuery,
      hasMoreSearchResults,
      isSearching,
      loadMoreSearchResults,
    ]
  );

  const filteredArtists = React.useMemo(() => {
    // Use search results if searching, otherwise use paginated artists
    let filtered = debouncedSearchQuery.trim().length > 0 ? searchResults : artists;

    // Deduplicate by ID to prevent duplicate key errors
    filtered = Array.from(
      new Map(filtered.map(artist => [artist.id, artist])).values()
    );

    // Apply tier filter only when NOT searching (search already filters on backend)
    if (debouncedSearchQuery.trim().length === 0 && selectedFilter !== 'all') {
      filtered = filtered.filter((artist) =>
        (selectedFilter === 'S' && artist.tier === 'S') ||
        (selectedFilter === 'Rising' && artist.tier === 'Rising')
      );
    }

    return filtered;
  }, [artists, searchResults, debouncedSearchQuery, selectedFilter]);

  // 이미지 프리페치 (첫 10개만 - 성능 최적화)
  React.useEffect(() => {
    if (artists.length > 0) {
      const firstBatch = artists.slice(0, 10).map((a) => a.imageUrl).filter(Boolean);
      if (firstBatch.length > 0) {
        prefetchImages(firstBatch);
      }
    }
  }, [artists.length]);

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      '아티스트 삭제',
      `${name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminArtistAPI.delete(id);
              Alert.alert('성공', '아티스트가 삭제되었습니다.');
              refetch();
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading && !isSearching) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-muted-foreground">로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <Text className="mb-4 text-center text-destructive">{error}</Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Text>다시 시도</Text>
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      onScroll={handleScroll}
      scrollEventThrottle={400}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="gap-6 p-4">
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="h1" className="text-3xl font-bold">
              아티스트 DB
            </Text>
            {canEdit && (
              <Button onPress={() => setShowFormModal(true)} size="sm">
                <Icon as={PlusIcon} size={16} className="text-primary-foreground mr-1" />
                <Text>추가</Text>
              </Button>
            )}
          </View>
          <Text className="text-muted-foreground">
            세계적인 클래식 연주자들을 만나보세요
          </Text>
        </View>

        {/* Search */}
        <View className="relative">
          <Input
            placeholder="아티스트 검색..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10"
          />
          <View className="absolute left-3 top-3.5">
            <Icon as={SearchIcon} size={18} className="text-muted-foreground" />
          </View>
        </View>

        {/* Tier Filter */}
        <View className="flex-row gap-2">
          <Button 
            size="sm" 
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setSelectedFilter('all')}
          >
            <Text className="text-sm">전체</Text>
          </Button>
          <Button 
            size="sm" 
            variant={selectedFilter === 'S' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setSelectedFilter('S')}
          >
            <Text className="text-sm">S급</Text>
          </Button>
          <Button 
            size="sm" 
            variant={selectedFilter === 'Rising' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setSelectedFilter('Rising')}
          >
            <Text className="text-sm">라이징 스타</Text>
          </Button>
        </View>

        {/* Artists List */}
        <View className="gap-3">
          {(isSearching && filteredArtists.length === 0) ? (
            <View className="py-12">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-center text-muted-foreground">검색 중...</Text>
            </View>
          ) : filteredArtists.length > 0 ? (
            filteredArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                canEdit={canEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <Card className="p-8">
              <Text className="text-center text-muted-foreground">
                {debouncedSearchQuery
                  ? `"${debouncedSearchQuery}"에 대한 검색 결과가 없습니다`
                  : '아티스트가 없습니다'}
              </Text>
            </Card>
          )}
        </View>

        {/* 무한 스크롤 로딩 인디케이터 */}
        {debouncedSearchQuery ? (
          // 검색 중일 때
          isSearching && filteredArtists.length > 0 && (
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
                더 많은 아티스트를 불러오는 중...
              </Text>
            </View>
          )
        )}

        {/* 더 이상 데이터가 없을 때 */}
        {debouncedSearchQuery ? (
          // 검색 모드
          !hasMoreSearchResults && filteredArtists.length > 0 && (
            <View className="py-4">
              <Text className="text-center text-sm text-muted-foreground">
                "{debouncedSearchQuery}" 검색 결과: 총 {filteredArtists.length}개
              </Text>
            </View>
          )
        ) : (
          // 일반 모드
          !hasNextPage && artists.length > 0 && (
            <View className="py-4">
              <Text className="text-center text-muted-foreground text-sm">
                모든 아티스트를 불러왔습니다
              </Text>
            </View>
          )
        )}
      </View>

      <ArtistFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={() => refetch()}
      />
    </ScrollView>
  );
}

const ArtistCard = React.memo(({
  artist,
  canEdit,
  onDelete
}: {
  artist: Artist;
  canEdit: boolean;
  onDelete: (id: number, name: string) => void;
}) => {
  const router = useRouter();

  const handlePress = React.useCallback(() => {
    router.push(`/artist/${artist.id}` as any);
  }, [router, artist.id]);

  const handleDeletePress = React.useCallback((e: any) => {
    e.stopPropagation();
    onDelete(artist.id, artist.name);
  }, [onDelete, artist.id, artist.name]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Card className="p-4">
        <View className="flex-row gap-4">
          <Avatar alt={artist.name} className="size-16">
            <AvatarImage source={{ uri: getImageUrl(artist.imageUrl) }} />
            <AvatarFallback>
              <Text>{artist.name[0]}</Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1 gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold">{artist.name}</Text>
              {artist.tier === 'S' ? (
                <View className="rounded bg-amber-500 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">S</Text>
                </View>
              ) : artist.tier === 'Rising' ? (
                <View className="rounded bg-blue-500 px-2 py-0.5">
                  <Icon as={TrendingUpIcon} size={12} color="white" />
                </View>
              ) : artist.tier === 'A' ? (
                <View className="rounded bg-green-600 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">A</Text>
                </View>
              ) : artist.tier === 'B' ? (
                <View className="rounded bg-gray-500 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">B</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-sm text-muted-foreground">{artist.category}</Text>
            <Text className="text-sm text-muted-foreground">{artist.nationality}</Text>
          </View>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleDeletePress}
            >
              <Icon as={TrashIcon} size={18} className="text-destructive" />
            </Button>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
});
