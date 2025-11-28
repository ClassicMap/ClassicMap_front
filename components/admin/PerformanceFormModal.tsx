// components/admin/PerformanceFormModal.tsx
import * as React from 'react';
import {
  View,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon } from 'lucide-react-native';
import { AdminPerformanceAPI } from '@/lib/api/admin';
import { ArtistAPI, PerformanceSectorAPI } from '@/lib/api/client';
import type { Performance, Artist, PerformanceSectorWithCount } from '@/lib/types/models';
import { useArtistSearch } from '@/lib/hooks/useArtistSearch';

interface PerformanceFormModalProps {
  visible: boolean;
  performance?: Performance;
  composerId?: number;
  pieceId?: number;
  sectorId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PerformanceFormModal({
  visible,
  performance,
  composerId,
  pieceId: initialPieceId,
  sectorId: initialSectorId,
  onClose,
  onSuccess,
}: PerformanceFormModalProps) {
  const [pieceId, setPieceId] = React.useState<number | null>(null);
  const [sectorId, setSectorId] = React.useState<number | null>(null);
  const [sectors, setSectors] = React.useState<PerformanceSectorWithCount[]>([]);
  const [loadingSectors, setLoadingSectors] = React.useState(false);
  const [showSectorPicker, setShowSectorPicker] = React.useState(false);
  const [artistId, setArtistId] = React.useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [characteristic, setCharacteristic] = React.useState('');
  const [viewCount, setViewCount] = React.useState('');
  const [rating, setRating] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showArtistPicker, setShowArtistPicker] = React.useState(false);
  const [artistSearch, setArtistSearch] = React.useState('');

  const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const { data: artistSearchResults = [], isLoading } = useArtistSearch(artistSearch, visible);

  // 슬라이드 애니메이션
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
    }
  }, [visible]);

  // 초기 데이터 로드
  React.useEffect(() => {
    if (visible) {
      setShowArtistPicker(false);
      setShowSectorPicker(false);
      setArtistSearch('');

      if (performance) {
        // 수정 모드
        setPieceId(performance.pieceId);
        setSectorId(performance.sectorId);
        setArtistId(performance.artistId);
        setYoutubeUrl(`https://www.youtube.com/watch?v=${performance.videoId}`);
        setStartTime(formatSeconds(performance.startTime));
        setEndTime(formatSeconds(performance.endTime));
        setCharacteristic(performance.characteristic || '');
        setViewCount(performance.viewCount?.toString() || '0');
        setRating(performance.rating?.toString() || '0.0');
      } else {
        // 추가 모드
        setPieceId(initialPieceId ?? null);
        setSectorId(initialSectorId ?? null);
        setArtistId(null);
        setYoutubeUrl('');
        setStartTime('');
        setEndTime('');
        setCharacteristic('');
        setViewCount('0');
        setRating('0.0');
      }
    }
  }, [visible, performance, initialPieceId, initialSectorId]);

  // 섹터 로드
  React.useEffect(() => {
    const loadSectors = async () => {
      if (!pieceId) {
        setSectors([]);
        return;
      }

      setLoadingSectors(true);
      try {
        const data = await PerformanceSectorAPI.getByPiece(pieceId);
        setSectors(data);

        // 섹터가 하나만 있으면 자동 선택
        if (data.length === 1 && !sectorId) {
          setSectorId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load sectors:', error);
        Alert.alert('오류', '섹터 목록을 불러오는데 실패했습니다.');
        setSectors([]);
      } finally {
        setLoadingSectors(false);
      }
    };

    if (visible && pieceId) {
      loadSectors();
    }
  }, [visible, pieceId]);

  // 초를 "분:초" 형식으로 변환
  const formatSeconds = (seconds: number): string => {
    if (isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // "분:초" 형식을 초로 변환
  const parseTimeToSeconds = (time: string): number => {
    const parts = time.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    return parseInt(time) || 0;
  };

  // YouTube URL에서 video ID 추출
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!sectorId || !artistId || !youtubeUrl || !startTime || !endTime) {
      Alert.alert('오류', '섹터, 연주자, URL, 시작/종료 시간은 필수 항목입니다.');
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('오류', '올바른 YouTube URL을 입력해주세요.');
      return;
    }

    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = parseTimeToSeconds(endTime);

    if (endSeconds <= startSeconds) {
      Alert.alert('오류', '종료 시간은 시작 시간보다 커야 합니다.');
      return;
    }

    const performanceData = {
      sectorId,
      pieceId: pieceId!, // 하위 호환성
      artistId,
      videoPlatform: 'youtube' as 'youtube',
      videoId,
      startTime: startSeconds,
      endTime: endSeconds,
      characteristic: characteristic || undefined,
      viewCount: parseInt(viewCount) || 0,
      rating: parseFloat(rating) || 0.0,
    };

    setSubmitting(true);
    try {
      if (performance) {
        await AdminPerformanceAPI.update(performance.id, performanceData);
        Alert.alert('성공', '연주가 수정되었습니다.');
      } else {
        await AdminPerformanceAPI.create(performanceData);
        Alert.alert('성공', '연주가 추가되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('오류', performance ? '연주 수정에 실패했습니다.' : '연주 추가에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const maxHeight = Dimensions.get('window').height * 0.9;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            height: maxHeight,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="rounded-t-3xl bg-background">
        {/* Header */}
        <View className="border-b border-border bg-background">
          <View className="flex-row items-center justify-between px-4 pb-4 pt-6">
            <Text className="text-2xl font-bold">{performance ? '연주 수정' : '연주 추가'}</Text>
            <Button variant="ghost" size="icon" onPress={onClose}>
              <Icon as={XIcon} size={24} />
            </Button>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, flexGrow: 1 }}>
          {/* 섹터 선택 */}
          <View className="mb-4 gap-2">
            <Label nativeID="sector">섹터 선택 *</Label>
            <TouchableOpacity
              onPress={() => setShowSectorPicker(!showSectorPicker)}
              className="h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <Text className={sectorId ? 'text-base' : 'text-base text-muted-foreground'}>
                {loadingSectors
                  ? '섹터 로딩 중...'
                  : sectorId
                    ? sectors.find((s) => s.id === sectorId)?.sectorName || `선택됨 (ID: ${sectorId})`
                    : '섹터를 선택하세요'}
              </Text>
              <Text className="text-muted-foreground">▼</Text>
            </TouchableOpacity>

            {showSectorPicker && (
              <View className="mt-1 rounded-md border border-border bg-background">
                <ScrollView className="max-h-48">
                  {sectors.length === 0 ? (
                    <View className="items-center p-4">
                      <Text className="text-sm text-muted-foreground">
                        {loadingSectors ? '섹터 로딩 중...' : '섹터가 없습니다'}
                      </Text>
                    </View>
                  ) : (
                    sectors.map((sector) => (
                      <TouchableOpacity
                        key={sector.id}
                        onPress={() => {
                          setSectorId(sector.id);
                          setShowSectorPicker(false);
                        }}
                        className={`border-b border-border p-3 ${sectorId === sector.id ? 'bg-primary/10' : ''}`}>
                        <Text className="text-base font-medium">{sector.sectorName}</Text>
                        {sector.description && (
                          <Text className="text-sm text-muted-foreground">{sector.description}</Text>
                        )}
                        <Text className="mt-1 text-xs text-muted-foreground">
                          연주 {sector.performanceCount}개
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* 아티스트 선택 */}
          <View className="mb-4 gap-2">
            <Label nativeID="artist">연주자 선택 *</Label>
            <TouchableOpacity
              onPress={() => setShowArtistPicker(!showArtistPicker)}
              className="h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <Text className={artistId ? 'text-base' : 'text-base text-muted-foreground'}>
                {artistId
                  ? artistSearchResults.find((a) => a.id === artistId)?.name ||
                    `선택됨 (ID: ${artistId})`
                  : '연주자를 선택하세요'}
              </Text>
              <Text className="text-muted-foreground">▼</Text>
            </TouchableOpacity>

            {showArtistPicker && (
              <View className="mt-1 rounded-md border border-border bg-background">
                {/* 검색 필드 */}
                <View className="border-b border-border p-2">
                  <Input
                    placeholder="연주자 검색..."
                    value={artistSearch}
                    onChangeText={setArtistSearch}
                    className="h-9"
                  />
                </View>

                {/* 연주자 목록 */}
                <ScrollView className="max-h-48">
                  {artistSearchResults.length === 0 ? (
                    <View className="items-center p-4">
                      <Text className="text-sm text-muted-foreground">
                        {isLoading ? '검색 중...' : '검색 결과가 없습니다'}
                      </Text>
                    </View>
                  ) : (
                    artistSearchResults.map((artist) => (
                      <TouchableOpacity
                        key={artist.id}
                        onPress={() => {
                          setArtistId(artist.id);
                          setShowArtistPicker(false);
                          setArtistSearch('');
                        }}
                        className={`border-b border-border p-3 ${artistId === artist.id ? 'bg-primary/10' : ''}`}>
                        <Text className="text-base font-medium">{artist.name}</Text>
                        <Text className="text-sm text-muted-foreground">{artist.englishName}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* YouTube URL */}
          <View className="mb-4 gap-2">
            <Label nativeID="youtube">YouTube URL *</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              aria-labelledby="youtube"
            />
            <Text className="text-xs text-muted-foreground">
              예시: https://www.youtube.com/watch?v=dQw4w9WgXcQ
            </Text>
          </View>

          {/* 시작 시간 */}
          <View className="mb-4 gap-2">
            <Label nativeID="startTime">시작 시간 (분:초) *</Label>
            <Input
              placeholder="0:30"
              value={startTime}
              onChangeText={setStartTime}
              aria-labelledby="startTime"
              keyboardType="numeric"
            />
            <Text className="text-xs text-muted-foreground">
              예시: 0:30 (30초), 1:15 (1분 15초)
            </Text>
          </View>

          {/* 종료 시간 */}
          <View className="mb-4 gap-2">
            <Label nativeID="endTime">종료 시간 (분:초) *</Label>
            <Input
              placeholder="1:30"
              value={endTime}
              onChangeText={setEndTime}
              aria-labelledby="endTime"
              keyboardType="numeric"
            />
          </View>

          {/* 조회수 */}
          <View className="mb-4 gap-2">
            <Label nativeID="viewCount">조회수</Label>
            <Input
              placeholder="0"
              value={viewCount}
              onChangeText={setViewCount}
              aria-labelledby="viewCount"
              keyboardType="number-pad"
            />
          </View>

          {/* 평점 */}
          <View className="mb-4 gap-2">
            <Label nativeID="rating">평점</Label>
            <Input
              placeholder="0.0"
              value={rating}
              onChangeText={setRating}
              aria-labelledby="rating"
              keyboardType="decimal-pad"
            />
          </View>

          {/* 특징 */}
          <View className="mb-4 gap-2">
            <Label nativeID="characteristic">연주 특징</Label>
            <TextInput
              className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30"
              placeholder="이 연주의 특징을 입력하세요"
              placeholderTextColor={Platform.select({
                ios: '#999999',
                android: '#999999',
                default: undefined,
              })}
              value={characteristic}
              onChangeText={setCharacteristic}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="border-t border-border p-4">
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              <Text>취소</Text>
            </Button>
            <Button className="flex-1" onPress={handleSubmit} disabled={submitting}>
              <Text>{submitting ? '저장 중...' : performance ? '수정' : '추가'}</Text>
            </Button>
          </View>
        </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
