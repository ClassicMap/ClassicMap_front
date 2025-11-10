// app/concert/[id].tsx
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Linking, Animated } from 'react-native';
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
  EditIcon
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ConcertAPI } from '@/lib/api/client';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { getImageUrl } from '@/lib/utils/image';
import { ConcertFormModal } from '@/components/admin/ConcertFormModal';

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

const STATUS_INFO = {
  upcoming: { label: '예정', color: '#3b82f6', emoji: '📅' },
  ongoing: { label: '진행중', color: '#22c55e', emoji: '🎵' },
  completed: { label: '완료', color: '#6b7280', emoji: '✅' },
  cancelled: { label: '취소', color: '#ef4444', emoji: '❌' },
};

export default function ConcertDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [concert, setConcert] = React.useState<Concert | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imageOpacity = React.useRef(new Animated.Value(0)).current;
  const { canEdit } = useAuth();
  const [editModalVisible, setEditModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (id) {
      loadConcert();
    }
  }, [id]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const loadConcert = () => {
    setLoading(true);
    setError(null);
    ConcertAPI.getById(Number(id))
      .then((data) => {
        setConcert(data as Concert);
        setLoading(false);
      })
      .catch((err) => {
        setError('공연 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    ConcertAPI.getById(Number(id))
      .then((data) => {
        setConcert(data as Concert);
        setError(null);
        setRefreshing(false);
      })
      .catch((err) => {
        setError('공연 정보를 불러오는데 실패했습니다.');
        setRefreshing(false);
      });
  }, [id]);

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

  const handleBookTicket = () => {
    if (concert?.ticketUrl) {
      Linking.openURL(concert.ticketUrl).catch(() => {
        Alert.alert('오류', '예매 페이지를 열 수 없습니다.');
      });
    } else {
      Alert.alert('안내', '예매 링크가 없습니다.');
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
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

  const statusInfo = STATUS_INFO[concert.status];

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
            <View className="flex-row items-center gap-2 mb-3 flex-wrap justify-center">
              <View 
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: statusInfo.color }}
              >
                <Text className="text-xs font-bold text-white">
                  {statusInfo.emoji} {statusInfo.label}
                </Text>
              </View>
              {concert.isRecommended && (
                <View 
                  className="rounded-full px-3 py-1.5 flex-row items-center gap-1 bg-amber-500"
                >
                  <Icon as={StarIcon} size={12} color="white" />
                  <Text className="text-xs font-bold text-white">추천</Text>
                </View>
              )}
            </View>
            <Text className="text-3xl font-bold mb-2 text-center">{concert.title}</Text>
            {concert.composerInfo && (
              <Text className="text-base text-muted-foreground text-center">{concert.composerInfo}</Text>
            )}
          </View>
        </View>

        {/* Content */}
        <View className="gap-6 p-4 pb-20">
          {/* Poster Image */}
          <Card className="overflow-hidden p-0 mx-auto" style={{ width: '80%', maxWidth: 320 }}>
            {!imageLoaded && (
              <View className="w-full bg-muted" style={{ aspectRatio: 2/3 }}>
                <ActivityIndicator size="large" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 }} />
              </View>
            )}
            <Animated.Image 
              source={{ uri: getImageUrl(concert.posterUrl) || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=900&fit=crop' }} 
              className="w-full"
              style={{ aspectRatio: 2/3, opacity: imageOpacity }}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
          </Card>

          {/* Concert Info */}
          <Card className="p-4">
            <View className="gap-3">
              <View className="flex-row items-start gap-3">
                <Icon as={CalendarIcon} size={20} className="text-primary mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">날짜</Text>
                  <Text className="text-base font-medium">{formatDate(concert.concertDate)}</Text>
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
                  <Text className="text-base font-medium">공연장 ID: {concert.venueId || 'N/A'}</Text>
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
            <Button size="lg" className="items-center justify-center" onPress={handleBookTicket}>
              <View className="flex-row items-center justify-center">
                <Icon as={TicketIcon} size={20} className="text-primary-foreground mr-2" />
                <Text className="text-lg">예매하기</Text>
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
          onSuccess={() => {
            loadConcert();
          }}
        />
      )}
    </View>
  );
}
