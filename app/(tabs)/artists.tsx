import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { StarIcon, TrendingUpIcon, SearchIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ARTISTS } from '@/lib/mockData';

export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'S' | 'Rising'>('all');

  const filteredArtists = React.useMemo(() => {
    return ARTISTS.filter((artist) => {
      const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           artist.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || 
                           (selectedFilter === 'S' && artist.tier === 'S') ||
                           (selectedFilter === 'Rising' && artist.tier === 'Rising');
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedFilter]);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-4">
        <View className="gap-2">
          <Text variant="h1" className="text-3xl font-bold">
            아티스트 DB
          </Text>
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
              <ArtistCard key={artist.id} artist={artist} />
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
    </ScrollView>
  );
}

function ArtistCard({ artist }: { artist: typeof ARTISTS[0] }) {
  const router = useRouter();
  
  return (
    <TouchableOpacity
      onPress={() => router.push(`/artist/${artist.id}` as any)}
      activeOpacity={0.7}
    >
      <Card className="p-4">
        <View className="flex-row gap-4">
          <Avatar alt={artist.name} className="size-16">
            <AvatarImage source={{ uri: artist.image }} />
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
              ) : (
                <View className="rounded bg-blue-500 px-2 py-0.5">
                  <Icon as={TrendingUpIcon} size={12} color="white" />
                </View>
              )}
            </View>
            <Text className="text-sm text-muted-foreground">{artist.category}</Text>
            <View className="flex-row items-center gap-1">
              <Icon as={StarIcon} size={14} className="text-amber-500" />
              <Text className="text-sm font-medium">{artist.rating}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
