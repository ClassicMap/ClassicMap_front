// components/admin/PieceFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPieceAPI } from '@/lib/api/admin';

interface PieceFormModalProps {
  visible: boolean;
  composerId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PieceFormModal({ visible, composerId, onClose, onSuccess }: PieceFormModalProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [opusNumber, setOpusNumber] = React.useState('');
  const [compositionYear, setCompositionYear] = React.useState('');
  const [difficultyLevel, setDifficultyLevel] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setOpusNumber('');
      setCompositionYear('');
      setDifficultyLevel('');
      setDurationMinutes('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!title) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await AdminPieceAPI.create({
        composer_id: composerId,
        title,
        description: description || undefined,
        opus_number: opusNumber || undefined,
        composition_year: compositionYear ? parseInt(compositionYear) : undefined,
        difficulty_level: difficultyLevel ? parseInt(difficultyLevel) : undefined,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      });
      Alert.alert('성공', '작품이 추가되었습니다.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create piece:', error);
      Alert.alert('오류', '작품 추가에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <ScrollView className="flex-1 p-4">
          <Card className="p-4 mb-4">
            <Text className="text-2xl font-bold mb-4">작품 추가</Text>

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
                  className="border border-input rounded-md p-3 text-base"
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
