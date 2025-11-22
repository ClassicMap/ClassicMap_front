// components/admin/RecordingFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon, ImageIcon, UploadIcon } from 'lucide-react-native';
import { AdminRecordingAPI } from '@/lib/api/admin';
import * as ImagePicker from 'expo-image-picker';
import type { Recording } from '@/lib/types/models';
import { getImageUrl } from '@/lib/utils/image';

interface RecordingFormModalProps {
  visible: boolean;
  artistId: number;
  recording?: Recording;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordingFormModal({ visible, artistId, recording, onClose, onSuccess }: RecordingFormModalProps) {
  const [title, setTitle] = React.useState('');
  const [year, setYear] = React.useState('');
  const [releaseDate, setReleaseDate] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [trackCount, setTrackCount] = React.useState('');
  const [isSingle, setIsSingle] = React.useState(false);
  const [spotifyUrl, setSpotifyUrl] = React.useState('');
  const [appleMusicUrl, setAppleMusicUrl] = React.useState('');
  const [youtubeMusicUrl, setYoutubeMusicUrl] = React.useState('');
  const [externalUrl, setExternalUrl] = React.useState('');
  const [selectedCover, setSelectedCover] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      if (recording) {
        setTitle(recording.title);
        setYear(recording.year);
        setReleaseDate(recording.releaseDate || '');
        setLabel(recording.label || '');
        setCoverUrl(recording.coverUrl || '');
        setTrackCount(recording.trackCount ? String(recording.trackCount) : '');
        setIsSingle(recording.isSingle || false);
        setSpotifyUrl(recording.spotifyUrl || '');
        setAppleMusicUrl(recording.appleMusicUrl || '');
        setYoutubeMusicUrl(recording.youtubeMusicUrl || '');
        setExternalUrl(recording.externalUrl || '');
        setSelectedCover(recording.coverUrl || null);
      } else {
        setTitle('');
        setYear('');
        setReleaseDate('');
        setLabel('');
        setCoverUrl('');
        setTrackCount('');
        setIsSingle(false);
        setSpotifyUrl('');
        setAppleMusicUrl('');
        setYoutubeMusicUrl('');
        setExternalUrl('');
        setSelectedCover(null);
      }
    }
  }, [visible, recording]);

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedCover(uri);
      await uploadCoverToServer(uri);
    }
  };

  const uploadCoverToServer = async (uri: string) => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';
      const formData = new FormData();

      // Web과 Native 플랫폼 구분
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `cover_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append('file', file);
      } else {
        let filename = uri.split('/').pop() || 'cover.jpg';
        
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

      const uploadResponse = await fetch(`${API_BASE_URL}/upload/artist/cover`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        const serverUrl = data.url;
        setCoverUrl(serverUrl);
        setSelectedCover(serverUrl);
        Alert.alert('성공', '커버 이미지가 업로드되었습니다.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('오류', '커버 이미지 업로드에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!title || !year) {
      Alert.alert('오류', '제목과 발매 연도를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (recording) {
        await AdminRecordingAPI.update(recording.id, {
          title,
          year,
          releaseDate: releaseDate || undefined,
          label: label || undefined,
          coverUrl: coverUrl || undefined,
          trackCount: trackCount ? parseInt(trackCount) : undefined,
          isSingle: isSingle,
          spotifyUrl: spotifyUrl || undefined,
          appleMusicUrl: appleMusicUrl || undefined,
          youtubeMusicUrl: youtubeMusicUrl || undefined,
          externalUrl: externalUrl || undefined,
        });
        Alert.alert('성공', '앨범이 수정되었습니다.');
      } else {
        await AdminRecordingAPI.create({
          artistId,
          title,
          year,
          releaseDate: releaseDate || undefined,
          label: label || undefined,
          coverUrl: coverUrl || undefined,
          trackCount: trackCount ? parseInt(trackCount) : undefined,
          isSingle: isSingle,
          spotifyUrl: spotifyUrl || undefined,
          appleMusicUrl: appleMusicUrl || undefined,
          youtubeMusicUrl: youtubeMusicUrl || undefined,
          externalUrl: externalUrl || undefined,
        });
        Alert.alert('성공', '앨범이 추가되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('오류', recording ? '앨범 수정에 실패했습니다.' : '앨범 추가에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-border">
          <Text className="text-lg font-bold">
            {recording ? '앨범 수정' : '앨범 추가'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon as={XIcon} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Cover Image */}
          <Card className="overflow-hidden p-0 mb-6 mx-auto" style={{ width: '60%', maxWidth: 240 }}>
            {selectedCover ? (
              <Image 
                source={{ uri: getImageUrl(selectedCover) }} 
                className="w-full"
                style={{ aspectRatio: 1 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full bg-muted items-center justify-center" style={{ aspectRatio: 1 }}>
                <Icon as={ImageIcon} size={48} className="text-muted-foreground" />
              </View>
            )}
            <TouchableOpacity 
              onPress={pickCover}
              className="absolute bottom-2 right-2 bg-primary rounded-full p-2"
            >
              <Icon as={UploadIcon} size={20} color="white" />
            </TouchableOpacity>
          </Card>

          {/* Title */}
          <View className="gap-2 mb-4">
            <Label nativeID="title">앨범 제목 *</Label>
            <Input 
              placeholder="앨범 제목 입력" 
              value={title}
              onChangeText={setTitle}
              aria-labelledby="title"
            />
          </View>

          {/* Year */}
          <View className="gap-2 mb-4">
            <Label nativeID="year">발매 연도 *</Label>
            <Input
              placeholder="2024"
              value={year}
              onChangeText={setYear}
              aria-labelledby="year"
              keyboardType="numeric"
            />
          </View>

          {/* Release Date */}
          <View className="gap-2 mb-4">
            <Label nativeID="releaseDate">정확한 발매일</Label>
            <Input
              placeholder="2024-01-15"
              value={releaseDate}
              onChangeText={setReleaseDate}
              aria-labelledby="releaseDate"
            />
          </View>

          {/* Label */}
          <View className="gap-2 mb-4">
            <Label nativeID="label">레이블</Label>
            <Input
              placeholder="레이블 입력"
              value={label}
              onChangeText={setLabel}
              aria-labelledby="label"
            />
          </View>

          {/* Track Count */}
          <View className="gap-2 mb-4">
            <Label nativeID="trackCount">트랙 수</Label>
            <Input
              placeholder="10"
              value={trackCount}
              onChangeText={setTrackCount}
              aria-labelledby="trackCount"
              keyboardType="numeric"
            />
          </View>

          {/* Is Single */}
          <View className="flex-row items-center gap-2 mb-4">
            <Label nativeID="isSingle">싱글 앨범</Label>
            <Button
              size="sm"
              variant={isSingle ? "default" : "outline"}
              onPress={() => setIsSingle(!isSingle)}
            >
              <Text>{isSingle ? '예' : '아니오'}</Text>
            </Button>
          </View>

          {/* Streaming Links Section */}
          <Text className="text-lg font-bold mb-3">스트리밍 링크</Text>

          {/* Spotify URL */}
          <View className="gap-2 mb-4">
            <Label nativeID="spotifyUrl">Spotify URL</Label>
            <Input
              placeholder="https://open.spotify.com/..."
              value={spotifyUrl}
              onChangeText={setSpotifyUrl}
              aria-labelledby="spotifyUrl"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Apple Music URL */}
          <View className="gap-2 mb-4">
            <Label nativeID="appleMusicUrl">Apple Music URL</Label>
            <Input
              placeholder="https://music.apple.com/..."
              value={appleMusicUrl}
              onChangeText={setAppleMusicUrl}
              aria-labelledby="appleMusicUrl"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* YouTube Music URL */}
          <View className="gap-2 mb-4">
            <Label nativeID="youtubeMusicUrl">YouTube Music URL</Label>
            <Input
              placeholder="https://music.youtube.com/..."
              value={youtubeMusicUrl}
              onChangeText={setYoutubeMusicUrl}
              aria-labelledby="youtubeMusicUrl"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* External URL */}
          <View className="gap-2 mb-4">
            <Label nativeID="externalUrl">기타 링크</Label>
            <Input
              placeholder="https://..."
              value={externalUrl}
              onChangeText={setExternalUrl}
              aria-labelledby="externalUrl"
              autoCapitalize="none"
              keyboardType="url"
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
              <Text>{submitting ? '저장 중...' : recording ? '수정' : '추가'}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
