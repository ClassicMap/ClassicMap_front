import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { StarIcon, TrendingUpIcon, SearchIcon, PlusIcon, TrashIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ArtistAPI } from '@/lib/api/client';
import { AdminArtistAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import type { Artist } from '@/lib/types/models';
import { prefetchImages } from '@/components/optimized-image';
import { getImageUrl } from '@/lib/utils/image';

export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'S' | 'Rising'>('all');
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showFormModal, setShowFormModal] = React.useState(false);
  const { canEdit } = useAuth();

  React.useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = () => {
    setLoading(true);
    setError(null);
    ArtistAPI.getAll()
      .then((data) => {
        setArtists(data);
        prefetchImages(data.map(a => a.imageUrl));
        setLoading(false);
      })
      .catch((err) => {
        setError('아티스트 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    ArtistAPI.getAll()
      .then((data) => {
        setArtists(data);
        prefetchImages(data.map(a => a.imageUrl));
        setError(null);
        setRefreshing(false);
      })
      .catch((err) => {
        setError('아티스트 정보를 불러오는데 실패했습니다.');
        setRefreshing(false);
      });
  }, []);

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
              loadArtists();
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
                           artist.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || 
                           (selectedFilter === 'S' && artist.tier === 'S') ||
                           (selectedFilter === 'Rising' && artist.tier === 'Rising');
      return matchesSearch && matchesFilter;
    });
  }, [artists, searchQuery, selectedFilter]);

  return (
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          {loading ? (
            <View className="py-12">
              <ActivityIndicator size="large" />
            </View>
          ) : error ? (
            <Card className="p-8">
              <Text className="text-center text-destructive mb-4">{error}</Text>
              <Button 
                variant="outline" 
                size="sm" 
                className="mx-auto"
                onPress={loadArtists}
              >
                <Text>다시 시도</Text>
              </Button>
            </Card>
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
                검색 결과가 없습니다
              </Text>
            </Card>
          )}
        </View>
      </View>

      <ArtistFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={loadArtists}
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
              ) : null}
            </View>
            <Text className="text-sm text-muted-foreground">{artist.category}</Text>
            <View className="flex-row items-center gap-1">
              <Icon as={StarIcon} size={14} className="text-amber-500" />
              <Text className="text-sm font-medium">{artist.rating}</Text>
            </View>
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
