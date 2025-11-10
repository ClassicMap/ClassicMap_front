// components/admin/ComposerFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon, ImageIcon, UploadIcon } from 'lucide-react-native';
import { AdminComposerAPI } from '@/lib/api/admin';
import type { Composer } from '@/lib/types/models';
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from '@/lib/utils/image';

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
  const [imageUrl, setImageUrl] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [style, setStyle] = React.useState('');
  const [influence, setInfluence] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | null>(null);
  const [selectedCover, setSelectedCover] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (composer) {
      setName(composer.name);
      setFullName(composer.fullName);
      setEnglishName(composer.englishName);
      setPeriod(composer.period);
      setBirthYear(String(composer.birthYear));
      setDeathYear(String(composer.deathYear));
      setNationality(composer.nationality);
      setImageUrl(composer.imageUrl || '');
      setAvatarUrl(composer.avatarUrl || '');
      setCoverImageUrl(composer.coverImageUrl || '');
      setBio(composer.bio || '');
      setStyle(composer.style || '');
      setInfluence(composer.influence || '');
      setSelectedAvatar(composer.avatarUrl || null);
      setSelectedCover(composer.coverImageUrl || null);
    } else {
      setName('');
      setFullName('');
      setEnglishName('');
      setPeriod('바로크');
      setBirthYear('');
      setDeathYear('');
      setNationality('');
      setImageUrl('');
      setAvatarUrl('');
      setCoverImageUrl('');
      setBio('');
      setStyle('');
      setInfluence('');
      setSelectedAvatar(null);
      setSelectedCover(null);
    }
  }, [composer, visible]);

  const pickImage = async (type: 'avatar' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'avatar') {
        setSelectedAvatar(uri);
      } else {
        setSelectedCover(uri);
      }
      
      // 서버에 업로드
      await uploadImageToServer(uri, type);
    }
  };

  const uploadImageToServer = async (uri: string, type: 'avatar' | 'cover') => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';
      const endpoint = type === 'avatar' 
        ? '/upload/composer/avatar'
        : '/upload/composer/cover';

      const formData = new FormData();

      // Web과 Native 플랫폼 구분
      if (Platform.OS === 'web') {
        // Web: blob URL을 File 객체로 변환
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `image_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append('file', file);
      } else {
        // Native: 기존 방식
        let filename = uri.split('/').pop() || 'image.jpg';
        
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

      const uploadResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        const serverUrl = data.url; // 서버에서 받은 상대 경로: /uploads/...
        if (type === 'avatar') {
          setAvatarUrl(serverUrl);
          setSelectedAvatar(serverUrl); // 미리보기도 서버 경로로 업데이트
        } else {
          setCoverImageUrl(serverUrl);
          setSelectedCover(serverUrl); // 미리보기도 서버 경로로 업데이트
        }
        Alert.alert('성공', '이미지가 업로드되었습니다.');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    }
  };

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
          imageUrl: imageUrl || undefined,
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
          imageUrl: imageUrl || undefined,
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
          {/* Avatar Image */}
          <Card className="overflow-hidden p-0 mb-6 mx-auto" style={{ width: '60%', maxWidth: 240 }}>
            {selectedAvatar ? (
              <Image 
                source={{ uri: getImageUrl(selectedAvatar) }} 
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
              onPress={() => pickImage('avatar')}
              className="absolute bottom-2 right-2 bg-primary rounded-full p-2"
            >
              <Icon as={UploadIcon} size={20} color="white" />
            </TouchableOpacity>
          </Card>

          {/* Cover Image */}
          <Card className="overflow-hidden p-0 mb-6">
            {selectedCover ? (
              <Image 
                source={{ uri: getImageUrl(selectedCover) }} 
                className="w-full h-32"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-32 bg-muted items-center justify-center">
                <Icon as={ImageIcon} size={32} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground mt-2">커버 이미지</Text>
              </View>
            )}
            <TouchableOpacity 
              onPress={() => pickImage('cover')}
              className="absolute bottom-2 right-2 bg-primary rounded-full p-2"
            >
              <Icon as={UploadIcon} size={18} color="white" />
            </TouchableOpacity>
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
                <Label>소개</Label>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="작곡가 소개..."
                  multiline
                  numberOfLines={4}
                  className="border border-input rounded-md p-3 text-base"
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
