import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { CalendarIcon, MapPinIcon, TicketIcon, TrashIcon, PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { useRouter } from 'expo-router';
import { ConcertAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';
import { OptimizedImage, prefetchImages } from '@/components/optimized-image';

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
}

export default function ConcertsScreen() {
  const [concerts, setConcerts] = React.useState<Concert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'month' | 'recommended'>('all');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const { canEdit } = useAuth();

  React.useEffect(() => {
    loadConcerts();
  }, []);

  const loadConcerts = () => {
    setLoading(true);
    setError(null);
    ConcertAPI.getAll()
      .then((data) => {
        setConcerts(data as any);
        prefetchImages(data.map(c => c.posterUrl));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load concerts:', err);
        setError('공연 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    ConcertAPI.getAll()
      .then((data) => {
        setConcerts(data as any);
        prefetchImages(data.map(c => c.posterUrl));
        setError(null);
        setRefreshing(false);
      })
      .catch((err) => {
        console.error('Failed to refresh concerts:', err);
        setError('공연 정보를 불러오는데 실패했습니다.');
        setRefreshing(false);
      });
  }, []);

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      '공연 삭제',
      `${title}을(를) 삭제하시겠습니까?`,
      [
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
      ]
    );
  };

  const filteredConcerts = React.useMemo(() => {
    if (filter === 'all') return concerts;
    if (filter === 'recommended') return concerts.filter(c => c.isRecommended);
    if (filter === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      return concerts.filter(c => {
        const concertDate = new Date(c.concertDate);
        return concertDate.getMonth() === currentMonth;
      });
    }
    return concerts;
  }, [concerts, filter]);
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
              공연 일정
            </Text>
            {canEdit && (
              <Button onPress={() => setShowFormModal(true)} size="sm">
                <Icon as={PlusIcon} size={16} className="text-primary-foreground mr-1" />
                <Text>추가</Text>
              </Button>
            )}
          </View>
          <Text className="text-muted-foreground">
            통합된 클래식 공연 정보와 예매
          </Text>
        </View>

        {/* Filter */}
        <View className="flex-row gap-2">
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('all')}
          >
            <Text className="text-sm">전체</Text>
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'month' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('month')}
          >
            <Text className="text-sm">이번 달</Text>
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'recommended' ? 'default' : 'outline'}
            className="rounded-full"
            onPress={() => setFilter('recommended')}
          >
            <Text className="text-sm">추천</Text>
          </Button>
        </View>

        {/* Concert List */}
        <View className="gap-4">
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
                onPress={loadConcerts}
              >
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
                공연 정보가 없습니다
              </Text>
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
  onDelete 
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

  return (
    <TouchableOpacity
      onPress={() => router.push(`/concert/${concert.id}` as any)}
      activeOpacity={0.7}
    >
      <Card className="overflow-hidden p-0">
      <View className="flex-row" style={{ height: 220 }}>
        <View className="w-32 bg-muted">
          <OptimizedImage 
            uri={concert.posterUrl}
            fallbackUri="https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&h=1200&fit=crop"
            style={{ width: '100%', height: 220 }}
            resizeMode="cover"
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
                  onPress={() => onDelete(concert.id, concert.title)}
                >
                  <Icon as={TrashIcon} size={18} className="text-destructive" />
                </Button>
              )}
            </View>
            {concert.composerInfo && (
              <Text className="text-muted-foreground">{concert.composerInfo}</Text>
            )}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
              <Text className="text-sm">
                {formatDate(concert.concertDate)} {concert.concertTime || ''}
              </Text>
            </View>
            {concert.priceInfo && (
              <View className="flex-row items-center gap-2">
                <Icon as={TicketIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">{concert.priceInfo}</Text>
              </View>
            )}
          </View>

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
