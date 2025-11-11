import * as React from 'react';
import { View, Modal, ScrollView, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon, ImageIcon, UploadIcon, CalendarIcon } from 'lucide-react-native';
import { AdminConcertAPI } from '@/lib/api/admin';
import { VenueAPI } from '@/lib/api/client';
import * as ImagePicker from 'expo-image-picker';
import type { Concert, Venue } from '@/lib/types/models';
import { getImageUrl } from '@/lib/utils/image';

interface ConcertFormModalProps {
  visible: boolean;
  concert?: Concert;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConcertFormModal({ visible, concert, onClose, onSuccess }: ConcertFormModalProps) {
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [title, setTitle] = React.useState('');
  const [composerInfo, setComposerInfo] = React.useState('');
  const [venueId, setVenueId] = React.useState<number | null>(null);
  const [concertDate, setConcertDate] = React.useState('');
  const [concertTime, setConcertTime] = React.useState('');
  const [priceInfo, setPriceInfo] = React.useState('');
  const [isRecommended, setIsRecommended] = React.useState(false);
  const [status, setStatus] = React.useState('upcoming');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedPoster, setSelectedPoster] = React.useState<string | null>(null);
  const [posterUrl, setPosterUrl] = React.useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = React.useState('');
  const [showVenuePicker, setShowVenuePicker] = React.useState(false);
  const [venueSearch, setVenueSearch] = React.useState('');

  // 초기 데이터 로드
  React.useEffect(() => {
    if (visible) {
      loadVenues();
      setShowVenuePicker(false);
      setVenueSearch('');

      if (concert) {
        setTitle(concert.title);
        setComposerInfo(concert.composerInfo || '');
        setVenueId(concert.venueId);
        setConcertDate(concert.concertDate);
        setConcertTime(concert.concertTime || '');
        setPriceInfo(concert.priceInfo || '');
        setIsRecommended(concert.isRecommended);
        setStatus(concert.status);
        setPosterUrl(concert.posterUrl || null);
        setTicketUrl(concert.ticketUrl || '');
      } else {
        setTitle('');
        setComposerInfo('');
        setVenueId(null);
        setConcertDate('');
        setConcertTime('');
        setPriceInfo('');
        setIsRecommended(false);
        setStatus('upcoming');
        setSelectedPoster(null);
        setPosterUrl(null);
        setTicketUrl('');
      }
    }
  }, [visible, concert]);

  const loadVenues = async () => {
    try {
      const data = await VenueAPI.getAll();
      setVenues(data);
    } catch (error) {
      console.error('Failed to load venues:', error);
    }
  };

  // 공연장 필터링
  const filteredVenues = React.useMemo(() => {
    if (!venueSearch.trim()) {
      return venues;
    }
    const searchLower = venueSearch.toLowerCase();
    return venues.filter(venue =>
      venue.name.toLowerCase().includes(searchLower) ||
      venue.city?.toLowerCase().includes(searchLower) ||
      venue.country?.toLowerCase().includes(searchLower)
    );
  }, [venues, venueSearch]);

  const pickPoster = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedPoster(uri);
      
      // 서버에 업로드
      await uploadPosterToServer(uri);
    }
  };

  const uploadPosterToServer = async (uri: string) => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';
      const formData = new FormData();

      // Web과 Native 플랫폼 구분
      if (Platform.OS === 'web') {
        // Web: blob URL을 File 객체로 변환
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `poster_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append('file', file);
      } else {
        // Native: 기존 방식
        let filename = uri.split('/').pop() || 'poster.jpg';
        
        if (!filename.includes('.')) {
          filename = `${filename}.jpg`;
        }
        
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri,
          name: filename,
          type: fileType,
        } as any);
      }

      const uploadResponse = await fetch(`${API_BASE_URL}/upload/concert/poster`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        const serverUrl = data.url; // 서버에서 받은 상대 경로: /uploads/...
        setPosterUrl(serverUrl);
        setSelectedPoster(serverUrl); // 미리보기도 서버 경로로 업데이트
        Alert.alert('성공', '포스터가 업로드되었습니다.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('오류', '포스터 업로드에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!title || !concertDate) {
      Alert.alert('오류', '제목과 공연일을 입력해주세요.');
      return;
    }

    if (!venueId) {
      Alert.alert('오류', '공연장을 선택해주세요.');
      return;
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(concertDate)) {
      Alert.alert('오류', '날짜는 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        title,
        composerInfo: composerInfo || undefined,
        venueId: venueId,
        concertDate: concertDate,
        concertTime: concertTime || undefined,
        priceInfo: priceInfo || undefined,
        posterUrl: posterUrl || undefined,
        ticketUrl: ticketUrl || undefined,
        isRecommended: isRecommended,
        status,
      };
      
      if (concert) {
        // Update existing concert
        await AdminConcertAPI.update(concert.id, data);
        Alert.alert('성공', '공연이 수정되었습니다.');
      } else {
        // Create new concert
        await AdminConcertAPI.create(data);
        Alert.alert('성공', '공연이 추가되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('오류', concert ? '공연 수정에 실패했습니다.' : '공연 추가에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="bg-background border-b border-border">
          <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
            <Text className="text-2xl font-bold">{concert ? '공연 수정' : '공연 추가'}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Icon as={XIcon} size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Poster Image */}
          <Card className="overflow-hidden p-0 mb-6 mx-auto" style={{ width: '80%', maxWidth: 320 }}>
            {selectedPoster ? (
              <Image 
                source={{ uri: getImageUrl(selectedPoster) }} 
                className="w-full"
                style={{ aspectRatio: 2/3 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full bg-muted items-center justify-center" style={{ aspectRatio: 2/3 }}>
                <Icon as={ImageIcon} size={64} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground mt-2">공연 포스터</Text>
              </View>
            )}
            <TouchableOpacity 
              onPress={pickPoster}
              className="absolute bottom-3 right-3 bg-primary rounded-full p-3"
            >
              <Icon as={UploadIcon} size={24} color="white" />
            </TouchableOpacity>
          </Card>

          {/* Form Fields */}
          <Card className="p-4 mb-6">
            <View className="gap-4">
              <View>
                <Label>제목 *</Label>
                <Input value={title} onChangeText={setTitle} placeholder="베토벤 교향곡 전곡 연주회" />
              </View>

              <View>
                <Label>작곡가/프로그램 정보</Label>
                <Input value={composerInfo} onChangeText={setComposerInfo} placeholder="베토벤, 모차르트" />
              </View>

              <View>
                <Label>공연일 * (YYYY-MM-DD)</Label>
                <Input 
                  value={concertDate} 
                  onChangeText={setConcertDate} 
                  placeholder="2025-12-25"
                />
                <Text className="text-xs text-muted-foreground mt-1">
                  예: 2025-12-25
                </Text>
              </View>

              <View>
                <Label>공연 시간 (HH:MM)</Label>
                <Input 
                  value={concertTime} 
                  onChangeText={setConcertTime} 
                  placeholder="19:30"
                />
                <Text className="text-xs text-muted-foreground mt-1">
                  예: 19:30
                </Text>
              </View>

              {/* 공연장 선택 */}
              <View>
                <Label>공연장 선택 *</Label>
                <TouchableOpacity
                  onPress={() => setShowVenuePicker(!showVenuePicker)}
                  className="flex-row items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <Text className={venueId ? "text-base" : "text-base text-muted-foreground"}>
                    {venueId ? venues.find(v => v.id === venueId)?.name : '공연장을 선택하세요'}
                  </Text>
                  <Text className="text-muted-foreground">▼</Text>
                </TouchableOpacity>

                {showVenuePicker && (
                  <View className="border border-border rounded-md mt-1 bg-background">
                    {/* 검색 필드 */}
                    <View className="p-2 border-b border-border">
                      <Input
                        placeholder="공연장 검색..."
                        value={venueSearch}
                        onChangeText={setVenueSearch}
                        className="h-9"
                      />
                    </View>

                    {/* 공연장 목록 */}
                    <ScrollView className="max-h-48">
                      {filteredVenues.length === 0 ? (
                        <View className="p-4 items-center">
                          <Text className="text-sm text-muted-foreground">검색 결과가 없습니다</Text>
                        </View>
                      ) : (
                        filteredVenues.map((venue) => (
                          <TouchableOpacity
                            key={venue.id}
                            onPress={() => {
                              setVenueId(venue.id);
                              setShowVenuePicker(false);
                              setVenueSearch('');
                            }}
                            className={`p-3 border-b border-border ${venueId === venue.id ? 'bg-primary/10' : ''}`}
                          >
                            <Text className="text-base font-medium">{venue.name}</Text>
                            {venue.city && venue.country && (
                              <Text className="text-sm text-muted-foreground">{venue.city}, {venue.country}</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View>
                <Label>가격 정보</Label>
                <Input value={priceInfo} onChangeText={setPriceInfo} placeholder="R석 100,000원" />
              </View>

              <View>
                <Label>예매 링크</Label>
                <Input 
                  value={ticketUrl} 
                  onChangeText={setTicketUrl} 
                  placeholder="https://ticket.interpark.com/..."
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Label>상태</Label>
                <View className="flex-row gap-2 flex-wrap">
                  {[
                    { value: 'upcoming', label: '예정' },
                    { value: 'ongoing', label: '진행중' },
                    { value: 'completed', label: '완료' },
                    { value: 'cancelled', label: '취소' }
                  ].map((s) => (
                    <Button
                      key={s.value}
                      variant={status === s.value ? 'default' : 'outline'}
                      onPress={() => setStatus(s.value)}
                      className="flex-1"
                      size="sm"
                    >
                      <Text className="text-xs">{s.label}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Label>추천 공연</Label>
                <Button
                  variant={isRecommended ? 'default' : 'outline'}
                  onPress={() => setIsRecommended(!isRecommended)}
                  size="sm"
                >
                  <Text>{isRecommended ? '✓ 추천' : '추천'}</Text>
                </Button>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pb-6">
            <Button variant="outline" onPress={onClose} className="flex-1" disabled={submitting}>
              <Text>취소</Text>
            </Button>
            <Button onPress={handleSubmit} className="flex-1" disabled={submitting}>
              <Text>{submitting ? '저장 중...' : '저장'}</Text>
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
