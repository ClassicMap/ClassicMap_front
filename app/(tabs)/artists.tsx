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
import { useArtists } from '@/lib/query/hooks/useArtists';

export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'S' | 'Rising'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const { canEdit } = useAuth();

  // React Query로 아티스트 데이터 로드 (자동 캐싱)
  const {
    data: artists = [],
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching: refreshing,
  } = useArtists();

  // 에러 처리
  const error = queryError ? '아티스트 정보를 불러오는데 실패했습니다.' : null;

  // 이미지 프리페치
  React.useEffect(() => {
    if (artists.length > 0) {
      prefetchImages(artists.map((a) => a.imageUrl));
    }
  }, [artists]);

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

  const filteredArtists = React.useMemo(() => {
    return artists.filter((artist) => {
      const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           artist.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           artist.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           artist.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (artist.style && artist.style.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = selectedFilter === 'all' ||
                           (selectedFilter === 'S' && artist.tier === 'S') ||
                           (selectedFilter === 'Rising' && artist.tier === 'Rising');
      return matchesSearch && matchesFilter;
    });
  }, [artists, searchQuery, selectedFilter]);

  if (loading) {
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => refetch()} />
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
          {filteredArtists.length > 0 ? (
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
                검색 결과가 없습니다
              </Text>
            </Card>
          )}
        </View>
      </View>

      <ArtistFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={() => refetch()}
      />
    </ScrollView>
  );
}

function ArtistCard({ 
  artist, 
  canEdit, 
  onDelete 
}: { 
  artist: Artist; 
  canEdit: boolean;
  onDelete: (id: number, name: string) => void;
}) {
  const router = useRouter();
  
  return (
    <TouchableOpacity
      onPress={() => router.push(`/artist/${artist.id}` as any)}
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
              onPress={(e) => {
                e.stopPropagation();
                onDelete(artist.id, artist.name);
              }}
            >
              <Icon as={TrashIcon} size={18} className="text-destructive" />
            </Button>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
