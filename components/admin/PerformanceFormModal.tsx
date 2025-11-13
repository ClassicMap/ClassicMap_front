// components/admin/PerformanceFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon } from 'lucide-react-native';
import { AdminPerformanceAPI } from '@/lib/api/admin';
import { ArtistAPI } from '@/lib/api/client';
import type { Performance, Artist } from '@/lib/types/models';

interface PerformanceFormModalProps {
  visible: boolean;
  performance?: Performance;
  composerId?: number;
  pieceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PerformanceFormModal({ visible, performance, composerId, pieceId: initialPieceId, onClose, onSuccess }: PerformanceFormModalProps) {
  const [artists, setArtists] = React.useState<Artist[]>([]);

  const [pieceId, setPieceId] = React.useState<number | null>(null);
  const [artistId, setArtistId] = React.useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [characteristic, setCharacteristic] = React.useState('');
  const [recordingDate, setRecordingDate] = React.useState('');
  const [viewCount, setViewCount] = React.useState('');
  const [rating, setRating] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showArtistPicker, setShowArtistPicker] = React.useState(false);
  const [artistSearch, setArtistSearch] = React.useState('');

  // 초기 데이터 로드
  React.useEffect(() => {
    if (visible) {
      loadArtists();
      setShowArtistPicker(false);
      setArtistSearch('');

      if (performance) {
        // 수정 모드
        setPieceId(performance.pieceId);
        setArtistId(performance.artistId);
        setYoutubeUrl(`https://www.youtube.com/watch?v=${performance.videoId}`);
        setStartTime(formatSeconds(performance.startTime));
        setEndTime(formatSeconds(performance.endTime));
        setCharacteristic(performance.characteristic || '');
        setRecordingDate(performance.recordingDate || '');
        setViewCount(performance.viewCount?.toString() || '0');
        setRating(performance.rating?.toString() || '0.0');
      } else {
        // 추가 모드
        setPieceId(initialPieceId ?? null);
        setArtistId(null);
        setYoutubeUrl('');
        setStartTime('');
        setEndTime('');
        setCharacteristic('');
        setRecordingDate('');
        setViewCount('0');
        setRating('0.0');
      }
    }
  }, [visible, performance, initialPieceId]);

  const loadArtists = async () => {
    try {
      const data = await ArtistAPI.getAll();
      setArtists(data);
    } catch (error) {
      console.error('Failed to load artists:', error);
    }
  };

  // 연주자 필터링
  const filteredArtists = React.useMemo(() => {
    if (!artistSearch.trim()) {
      return artists;
    }
    const searchLower = artistSearch.toLowerCase();
    return artists.filter(artist =>
      artist.name.toLowerCase().includes(searchLower) ||
      artist.englishName.toLowerCase().includes(searchLower)
    );
  }, [artists, artistSearch]);

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
    if (!pieceId || !artistId || !youtubeUrl || !startTime || !endTime) {
      Alert.alert('오류', '연주자, URL, 시작/종료 시간은 필수 항목입니다.');
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
      pieceId,
      artistId,
      videoPlatform: 'youtube' as 'youtube',
      videoId,
      startTime: startSeconds,
      endTime: endSeconds,
      characteristic: characteristic || undefined,
      recordingDate: recordingDate || undefined,
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="bg-background border-b border-border">
          <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
            <Text className="text-2xl font-bold">
              {performance ? '연주 수정' : '연주 추가'}
            </Text>
            <Button variant="ghost" size="icon" onPress={onClose}>
              <Icon as={XIcon} size={24} />
            </Button>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* 아티스트 선택 */}
          <View className="gap-2 mb-4">
            <Label nativeID="artist">연주자 선택 *</Label>
            <TouchableOpacity
              onPress={() => setShowArtistPicker(!showArtistPicker)}
              className="flex-row items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <Text className={artistId ? "text-base" : "text-base text-muted-foreground"}>
                {artistId ? artists.find(a => a.id === artistId)?.name : '연주자를 선택하세요'}
              </Text>
              <Text className="text-muted-foreground">▼</Text>
            </TouchableOpacity>

            {showArtistPicker && (
              <View className="border border-border rounded-md mt-1 bg-background">
                {/* 검색 필드 */}
                <View className="p-2 border-b border-border">
                  <Input
                    placeholder="연주자 검색..."
                    value={artistSearch}
                    onChangeText={setArtistSearch}
                    className="h-9"
                  />
                </View>

                {/* 연주자 목록 */}
                <ScrollView className="max-h-48">
                  {filteredArtists.length === 0 ? (
                    <View className="p-4 items-center">
                      <Text className="text-sm text-muted-foreground">검색 결과가 없습니다</Text>
                    </View>
                  ) : (
                    filteredArtists.map((artist) => (
                      <TouchableOpacity
                        key={artist.id}
                        onPress={() => {
                          setArtistId(artist.id);
                          setShowArtistPicker(false);
                          setArtistSearch('');
                        }}
                        className={`p-3 border-b border-border ${artistId === artist.id ? 'bg-primary/10' : ''}`}
                      >
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
          <View className="gap-2 mb-4">
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
          <View className="gap-2 mb-4">
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
          <View className="gap-2 mb-4">
            <Label nativeID="endTime">종료 시간 (분:초) *</Label>
            <Input 
              placeholder="1:30" 
              value={endTime}
              onChangeText={setEndTime}
              aria-labelledby="endTime"
              keyboardType="numeric"
            />
          </View>

          {/* 녹화 날짜 */}
          <View className="gap-2 mb-4">
            <Label nativeID="recordingDate">녹화 날짜 (YYYY-MM-DD)</Label>
            <Input 
              placeholder="2024-01-01" 
              value={recordingDate}
              onChangeText={setRecordingDate}
              aria-labelledby="recordingDate"
            />
          </View>

          {/* 조회수 */}
          <View className="gap-2 mb-4">
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
          <View className="gap-2 mb-4">
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
          <View className="gap-2 mb-4">
            <Label nativeID="characteristic">연주 특징</Label>
            <TextInput
              className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30"
              placeholder="이 연주의 특징을 입력하세요"
              placeholderTextColor={Platform.select({ ios: '#999999', android: '#999999', default: undefined })}
              value={characteristic}
              onChangeText={setCharacteristic}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-border">
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              <Text>취소</Text>
            </Button>
            <Button className="flex-1" onPress={handleSubmit} disabled={submitting}>
              <Text>{submitting ? '저장 중...' : performance ? '수정' : '추가'}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
