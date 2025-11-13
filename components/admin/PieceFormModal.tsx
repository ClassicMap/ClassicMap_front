// components/admin/PieceFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput, Platform, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon } from 'lucide-react-native';
import { AdminPieceAPI } from '@/lib/api/admin';
import type { Piece } from '@/lib/types/models';

interface PieceFormModalProps {
  visible: boolean;
  composerId: number;
  piece?: Piece;
  onClose: () => void;
  onSuccess: () => void;
}

export function PieceFormModal({ visible, composerId, piece, onClose, onSuccess }: PieceFormModalProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [opusNumber, setOpusNumber] = React.useState('');
  const [compositionYear, setCompositionYear] = React.useState('');
  const [difficultyLevel, setDifficultyLevel] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState('');
  const [spotifyUrl, setSpotifyUrl] = React.useState('');
  const [appleMusicUrl, setAppleMusicUrl] = React.useState('');
  const [youtubeMusicUrl, setYoutubeMusicUrl] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (visible && piece) {
      // 수정 모드: 기존 데이터 로드
      setTitle(piece.title);
      setDescription(piece.description || '');
      setOpusNumber(piece.opusNumber || '');
      setCompositionYear(piece.compositionYear ? piece.compositionYear.toString() : '');
      setDifficultyLevel(piece.difficultyLevel ? piece.difficultyLevel.toString() : '');
      setDurationMinutes(piece.durationMinutes ? piece.durationMinutes.toString() : '');
      setSpotifyUrl(piece.spotifyUrl || '');
      setAppleMusicUrl(piece.appleMusicUrl || '');
      setYoutubeMusicUrl(piece.youtubeMusicUrl || '');
    } else if (!visible) {
      // 모달 닫힐 때 초기화
      setTitle('');
      setDescription('');
      setOpusNumber('');
      setCompositionYear('');
      setDifficultyLevel('');
      setDurationMinutes('');
      setSpotifyUrl('');
      setAppleMusicUrl('');
      setYoutubeMusicUrl('');
    }
  }, [visible, piece]);

  const handleSubmit = async () => {
    if (!title) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (piece) {
        // 수정 모드
        await AdminPieceAPI.update(piece.id, {
          title,
          description: description || null,
          opusNumber: opusNumber || null,
          compositionYear: compositionYear ? parseInt(compositionYear) : null,
          difficultyLevel: difficultyLevel ? parseInt(difficultyLevel) : null,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
          spotifyUrl: spotifyUrl || null,
          appleMusicUrl: appleMusicUrl || null,
          youtubeMusicUrl: youtubeMusicUrl || null,
        });
        Alert.alert('성공', '작품이 수정되었습니다.');
      } else {
        // 생성 모드
        await AdminPieceAPI.create({
          composerId: composerId,
          title,
          description: description || undefined,
          opusNumber: opusNumber || undefined,
          compositionYear: compositionYear ? parseInt(compositionYear) : undefined,
          difficultyLevel: difficultyLevel ? parseInt(difficultyLevel) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          spotifyUrl: spotifyUrl || undefined,
          appleMusicUrl: appleMusicUrl || undefined,
          youtubeMusicUrl: youtubeMusicUrl || undefined,
        });
        Alert.alert('성공', '작품이 추가되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save piece:', error);
      Alert.alert('오류', piece ? '작품 수정에 실패했습니다.' : '작품 추가에 실패했습니다.');
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
            <Text className="text-2xl font-bold">{piece ? '작품 수정' : '작품 추가'}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Icon as={XIcon} size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          <Card className="p-4 mb-4">

            <View className="gap-4">
              <View>
                <Label>제목 *</Label>
                <Input value={title} onChangeText={setTitle} placeholder="피아노 소나타 14번" />
              </View>

              <View>
                <Label>설명</Label>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="작품 설명..."
                  multiline
                  numberOfLines={3}
                  className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30"
                  placeholderTextColor={Platform.select({ ios: '#999999', android: '#999999', default: undefined })}
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              <View>
                <Label>작품 번호</Label>
                <Input value={opusNumber} onChangeText={setOpusNumber} placeholder="Op. 27 No. 2" />
              </View>

              <View>
                <Label>작곡 연도</Label>
                <Input value={compositionYear} onChangeText={setCompositionYear} placeholder="1801" keyboardType="numeric" />
              </View>

              <View>
                <Label>난이도 (1-10)</Label>
                <Input value={difficultyLevel} onChangeText={setDifficultyLevel} placeholder="8" keyboardType="numeric" />
              </View>

              <View>
                <Label>연주 시간 (분)</Label>
                <Input value={durationMinutes} onChangeText={setDurationMinutes} placeholder="15" keyboardType="numeric" />
              </View>

              <View className="border-t border-border pt-4 mt-2">
                <Text className="text-sm font-medium mb-3">음악 스트리밍 링크</Text>

                <View>
                  <Label>Spotify URL</Label>
                  <Input
                    value={spotifyUrl}
                    onChangeText={setSpotifyUrl}
                    placeholder="https://open.spotify.com/..."
                    autoCapitalize="none"
                  />
                </View>

                <View className="mt-3">
                  <Label>Apple Music Classical URL</Label>
                  <Input
                    value={appleMusicUrl}
                    onChangeText={setAppleMusicUrl}
                    placeholder="https://music.apple.com/..."
                    autoCapitalize="none"
                  />
                </View>

                <View className="mt-3">
                  <Label>YouTube Music URL</Label>
                  <Input
                    value={youtubeMusicUrl}
                    onChangeText={setYoutubeMusicUrl}
                    placeholder="https://music.youtube.com/..."
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <View className="flex-row gap-2 mt-6">
              <Button variant="outline" onPress={onClose} className="flex-1" disabled={submitting}>
                <Text>취소</Text>
              </Button>
              <Button onPress={handleSubmit} className="flex-1" disabled={submitting}>
                <Text>{submitting ? '저장 중...' : '저장'}</Text>
              </Button>
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
