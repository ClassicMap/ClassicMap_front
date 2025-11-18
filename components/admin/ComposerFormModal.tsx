// components/admin/ComposerFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon, ImageIcon } from 'lucide-react-native';
import { AdminComposerAPI } from '@/lib/api/admin';
import type { Composer } from '@/lib/types/models';

interface ComposerFormModalProps {
  visible: boolean;
  composer?: Composer;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposerFormModal({ visible, composer, onClose, onSuccess }: ComposerFormModalProps) {
  const [name, setName] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [englishName, setEnglishName] = React.useState('');
  const [period, setPeriod] = React.useState('바로크');
  const [birthYear, setBirthYear] = React.useState('');
  const [deathYear, setDeathYear] = React.useState('');
  const [nationality, setNationality] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [style, setStyle] = React.useState('');
  const [influence, setInfluence] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (composer) {
      setName(composer.name);
      setFullName(composer.fullName);
      setEnglishName(composer.englishName);
      setPeriod(composer.period);
      setBirthYear(String(composer.birthYear));
      setDeathYear(String(composer.deathYear));
      setNationality(composer.nationality);
      setAvatarUrl(composer.avatarUrl || '');
      setCoverImageUrl(composer.coverImageUrl || '');
      setBio(composer.bio || '');
      setStyle(composer.style || '');
      setInfluence(composer.influence || '');
    } else {
      setName('');
      setFullName('');
      setEnglishName('');
      setPeriod('바로크');
      setBirthYear('');
      setDeathYear('');
      setNationality('');
      setAvatarUrl('');
      setCoverImageUrl('');
      setBio('');
      setStyle('');
      setInfluence('');
    }
  }, [composer, visible]);

  const handleSubmit = async () => {
    if (!name || !fullName || !englishName || !birthYear || !deathYear || !nationality) {
      Alert.alert('오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (composer) {
        // Update existing composer
        await AdminComposerAPI.update(composer.id, {
          name,
          fullName: fullName,
          englishName: englishName,
          period,
          birthYear: parseInt(birthYear),
          deathYear: parseInt(deathYear),
          nationality,
          avatarUrl: avatarUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          bio: bio || undefined,
          style: style || undefined,
          influence: influence || undefined,
        });
        Alert.alert('성공', '작곡가가 수정되었습니다.');
      } else {
        // Create new composer
        await AdminComposerAPI.create({
          name,
          fullName: fullName,
          englishName: englishName,
          period,
          birthYear: parseInt(birthYear),
          deathYear: parseInt(deathYear),
          nationality,
          avatarUrl: avatarUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          bio: bio || undefined,
          style: style || undefined,
          influence: influence || undefined,
        });
        Alert.alert('성공', '작곡가가 추가되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save composer:', error);
      Alert.alert('오류', composer ? '작곡가 수정에 실패했습니다.' : '작곡가 추가에 실패했습니다.');
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
            <Text className="text-2xl font-bold">{composer ? '작곡가 수정' : '작곡가 추가'}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Icon as={XIcon} size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Avatar Image Preview */}
          <Card className="overflow-hidden p-0 mb-6 mx-auto" style={{ width: '60%', maxWidth: 240 }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full"
                style={{ aspectRatio: 1 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full bg-muted items-center justify-center" style={{ aspectRatio: 1 }}>
                <Icon as={ImageIcon} size={48} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground mt-2">아바타 이미지</Text>
              </View>
            )}
          </Card>

          {/* Cover Image Preview */}
          <Card className="overflow-hidden p-0 mb-6">
            {coverImageUrl ? (
              <Image
                source={{ uri: coverImageUrl }}
                className="w-full h-32"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-32 bg-muted items-center justify-center">
                <Icon as={ImageIcon} size={32} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground mt-2">커버 이미지</Text>
              </View>
            )}
          </Card>

          {/* Form Fields */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-4">기본 정보</Text>
            <View className="gap-4">
              <View>
                <Label>이름 *</Label>
                <Input value={name} onChangeText={setName} placeholder="바흐" />
              </View>

              <View>
                <Label>전체 이름 *</Label>
                <Input value={fullName} onChangeText={setFullName} placeholder="요한 제바스티안 바흐" />
              </View>

              <View>
                <Label>영문명 *</Label>
                <Input value={englishName} onChangeText={setEnglishName} placeholder="Johann Sebastian Bach" />
              </View>

              <View>
                <Label>시대 *</Label>
                <View className="flex-row gap-2">
                  {['바로크', '고전주의', '낭만주의', '근현대'].map((p) => (
                    <Button
                      key={p}
                      variant={period === p ? 'default' : 'outline'}
                      onPress={() => setPeriod(p)}
                      className="flex-1"
                      size="sm"
                    >
                      <Text className="text-xs">{p}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View>
                <Label>출생년도 *</Label>
                <Input value={birthYear} onChangeText={setBirthYear} placeholder="1685" keyboardType="numeric" />
              </View>

              <View>
                <Label>사망년도 *</Label>
                <Input value={deathYear} onChangeText={setDeathYear} placeholder="1750" keyboardType="numeric" />
              </View>

              <View>
                <Label>국적 *</Label>
                <Input value={nationality} onChangeText={setNationality} placeholder="독일" />
              </View>

              <View>
                <Label>아바타 이미지 URL</Label>
                <Input value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://..." />
              </View>

              <View>
                <Label>커버 이미지 URL</Label>
                <Input value={coverImageUrl} onChangeText={setCoverImageUrl} placeholder="https://..." />
              </View>

              <View>
                <Label>소개</Label>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="작곡가 소개..."
                  multiline
                  numberOfLines={4}
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30"
                  placeholderTextColor={Platform.select({ ios: '#999999', android: '#999999', default: undefined })}
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              <View>
                <Label>음악 스타일</Label>
                <Input value={style} onChangeText={setStyle} placeholder="정교한 대위법..." />
              </View>

              <View>
                <Label>음악사적 영향</Label>
                <Input value={influence} onChangeText={setInfluence} placeholder="모차르트, 베토벤..." />
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
