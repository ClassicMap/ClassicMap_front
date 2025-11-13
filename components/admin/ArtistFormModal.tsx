// components/admin/ArtistFormModal.tsx
import * as React from 'react';
import { View, Modal, ScrollView, Alert, TextInput, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { XIcon, ImageIcon, UploadIcon, PlusIcon, TrashIcon } from 'lucide-react-native';
import { AdminArtistAPI } from '@/lib/api/admin';
import type { Artist, ArtistAward } from '@/lib/types/models';
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from '@/lib/utils/image';

interface ArtistFormModalProps {
  visible: boolean;
  artist?: Artist;
  onClose: () => void;
  onSuccess: () => void;
}

export function ArtistFormModal({ visible, artist, onClose, onSuccess }: ArtistFormModalProps) {
  const [name, setName] = React.useState('');
  const [englishName, setEnglishName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [tier, setTier] = React.useState('B');
  const [nationality, setNationality] = React.useState('');
  const [birthYear, setBirthYear] = React.useState('');
  const [rating, setRating] = React.useState('4.0');
  const [imageUrl, setImageUrl] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [style, setStyle] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [selectedCoverImage, setSelectedCoverImage] = React.useState<string | null>(null);

  // 카운트 입력
  const [concertCount, setConcertCount] = React.useState('0');
  const [countryCount, setCountryCount] = React.useState('0');
  const [albumCount, setAlbumCount] = React.useState('0');

  // 수상 경력 관리
  interface AwardInput {
    id?: number; // 기존 award의 경우 id 존재
    year: string;
    awardName: string;
    displayOrder: number;
    isNew?: boolean; // 새로 추가된 award인지 여부
    isDeleted?: boolean; // 삭제될 award인지 여부
  }
  const [awards, setAwards] = React.useState<AwardInput[]>([]);
  const [newAwardYear, setNewAwardYear] = React.useState('');
  const [newAwardName, setNewAwardName] = React.useState('');

  React.useEffect(() => {
    if (artist) {
      setName(artist.name);
      setEnglishName(artist.englishName);
      setCategory(artist.category);
      setTier(artist.tier);
      setNationality(artist.nationality);
      setBirthYear(artist.birthYear || '');
      setRating(String(artist.rating));
      setImageUrl(artist.imageUrl || '');
      setCoverImageUrl(artist.coverImageUrl || '');
      setBio(artist.bio || '');
      setStyle(artist.style || '');
      setSelectedImage(artist.imageUrl || null);
      setSelectedCoverImage(artist.coverImageUrl || null);
      setConcertCount(String(artist.concertCount || 0));
      setCountryCount(String(artist.countryCount || 0));
      setAlbumCount(String(artist.albumCount || 0));

      // 기존 awards 로드
      if (artist.awards && artist.awards.length > 0) {
        setAwards(artist.awards.map(award => ({
          id: award.id,
          year: award.year,
          awardName: award.awardName,
          displayOrder: award.displayOrder,
          isNew: false,
          isDeleted: false,
        })));
      } else {
        setAwards([]);
      }
    } else {
      setName('');
      setEnglishName('');
      setCategory('');
      setTier('B');
      setNationality('');
      setBirthYear('');
      setRating('4.0');
      setImageUrl('');
      setCoverImageUrl('');
      setBio('');
      setStyle('');
      setSelectedImage(null);
      setSelectedCoverImage(null);
      setConcertCount('0');
      setCountryCount('0');
      setAlbumCount('0');
      setAwards([]);
    }
    setNewAwardYear('');
    setNewAwardName('');
  }, [artist, visible]);

  const pickImage = async (type: 'profile' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'profile') {
        setSelectedImage(uri);
      } else {
        setSelectedCoverImage(uri);
      }
      
      // 서버에 업로드
      await uploadImageToServer(uri, type);
    }
  };

  const handleAddAward = () => {
    if (!newAwardYear || !newAwardName) {
      Alert.alert('오류', '수상 연도와 이름을 모두 입력해주세요.');
      return;
    }

    const newAward: AwardInput = {
      year: newAwardYear,
      awardName: newAwardName,
      displayOrder: awards.length,
      isNew: true,
    };

    setAwards([...awards, newAward]);
    setNewAwardYear('');
    setNewAwardName('');
  };

  const handleDeleteAward = (index: number) => {
    const award = awards[index];
    if (award.isNew) {
      // 새로 추가된 award는 그냥 제거
      setAwards(awards.filter((_, i) => i !== index));
    } else {
      // 기존 award는 삭제 플래그 설정
      setAwards(awards.map((a, i) => i === index ? { ...a, isDeleted: true } : a));
    }
  };

  const uploadImageToServer = async (uri: string, type: 'profile' | 'cover') => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';
      const endpoint = type === 'profile' 
        ? '/upload/artist/avatar'
        : '/upload/artist/cover';

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
        if (type === 'profile') {
          setImageUrl(serverUrl);
          setSelectedImage(serverUrl); // 미리보기도 서버 경로로 업데이트
        } else {
          setCoverImageUrl(serverUrl);
          setSelectedCoverImage(serverUrl); // 미리보기도 서버 경로로 업데이트
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
    if (!name || !englishName || !category || !nationality) {
      Alert.alert('오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      let artistId: number;

      if (artist) {
        // Update existing artist
        await AdminArtistAPI.update(artist.id, {
          name,
          englishName,
          category,
          tier,
          nationality,
          birthYear: birthYear || undefined,
          rating: parseFloat(rating),
          imageUrl: imageUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          bio: bio || undefined,
          style: style || undefined,
          concertCount: parseInt(concertCount),
          countryCount: parseInt(countryCount),
          albumCount: parseInt(albumCount),
        });
        artistId = artist.id;
      } else {
        // Create new artist
        artistId = await AdminArtistAPI.create({
          name,
          englishName,
          category,
          tier,
          nationality,
          birthYear: birthYear || undefined,
          rating: parseFloat(rating),
          imageUrl: imageUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          bio: bio || undefined,
          style: style || undefined,
          concertCount: parseInt(concertCount),
          countryCount: parseInt(countryCount),
          albumCount: parseInt(albumCount),
        });
      }

      // Awards 처리
      // 1. 삭제할 awards
      const awardsToDelete = awards.filter(a => a.isDeleted && a.id);
      for (const award of awardsToDelete) {
        try {
          await AdminArtistAPI.deleteAward(artistId, award.id!);
        } catch (error) {
          console.error('Failed to delete award:', error);
        }
      }

      // 2. 추가할 awards
      const awardsToAdd = awards.filter(a => a.isNew && !a.isDeleted);
      for (const award of awardsToAdd) {
        try {
          await AdminArtistAPI.createAward(artistId, {
            year: award.year,
            awardName: award.awardName,
            displayOrder: award.displayOrder,
          });
        } catch (error) {
          console.error('Failed to create award:', error);
        }
      }

      Alert.alert('성공', artist ? '아티스트가 수정되었습니다.' : '아티스트가 추가되었습니다.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save artist:', error);
      Alert.alert('오류', artist ? '아티스트 수정에 실패했습니다.' : '아티스트 추가에 실패했습니다.');
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
            <Text className="text-2xl font-bold">{artist ? '아티스트 수정' : '아티스트 추가'}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Icon as={XIcon} size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Profile Image */}
          <Card className="overflow-hidden p-0 mb-6 mx-auto" style={{ width: '60%', maxWidth: 240 }}>
            {selectedImage ? (
              <Image 
                source={{ uri: getImageUrl(selectedImage) }} 
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
              onPress={() => pickImage('profile')}
              className="absolute bottom-2 right-2 bg-primary rounded-full p-2"
            >
              <Icon as={UploadIcon} size={20} color="white" />
            </TouchableOpacity>
          </Card>

          {/* Cover Image */}
          <Card className="overflow-hidden p-0 mb-6">
            {selectedCoverImage ? (
              <Image 
                source={{ uri: getImageUrl(selectedCoverImage) }} 
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

          {/* Basic Info */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-4">기본 정보</Text>
            <View className="gap-4">
              <View>
                <Label>이름 *</Label>
                <Input value={name} onChangeText={setName} placeholder="조성진" />
              </View>

              <View>
                <Label>영문명 *</Label>
                <Input value={englishName} onChangeText={setEnglishName} placeholder="Seong-Jin Cho" />
              </View>

              <View>
                <Label>카테고리 *</Label>
                <Input value={category} onChangeText={setCategory} placeholder="피아니스트" />
              </View>

              <View>
                <Label>등급 *</Label>
                <View className="flex-row gap-2">
                  {['S', 'A', 'B', 'Rising'].map((t) => (
                    <Button
                      key={t}
                      variant={tier === t ? 'default' : 'outline'}
                      onPress={() => setTier(t)}
                      className="flex-1"
                      size="sm"
                    >
                      <Text>{t}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View>
                <Label>국적 *</Label>
                <Input value={nationality} onChangeText={setNationality} placeholder="대한민국" />
              </View>

              <View>
                <Label>출생연도</Label>
                <Input value={birthYear} onChangeText={setBirthYear} placeholder="1994" keyboardType="numeric" />
              </View>

              <View>
                <Label>평점</Label>
                <Input value={rating} onChangeText={setRating} placeholder="4.5" keyboardType="decimal-pad" />
              </View>

              <View>
                <Label>소개</Label>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="아티스트 소개..."
                  multiline
                  numberOfLines={4}
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30"
                  placeholderTextColor={Platform.select({ ios: '#999999', android: '#999999', default: undefined })}
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              <View>
                <Label>스타일</Label>
                <Input value={style} onChangeText={setStyle} placeholder="섬세하고 시적인 표현..." />
              </View>
            </View>
          </Card>

          {/* Awards */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-3">수상 경력</Text>

            {/* 기존 Awards 목록 */}
            {awards.filter(a => !a.isDeleted).length > 0 && (
              <View className="gap-2 mb-4">
                {awards.map((award, index) => {
                  if (award.isDeleted) return null;
                  return (
                    <View key={index} className="flex-row items-center gap-2 p-3 bg-muted rounded-md">
                      <View className="flex-1">
                        <Text className="font-semibold">{award.awardName}</Text>
                        <Text className="text-sm text-muted-foreground">{award.year}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteAward(index)}
                        className="p-2"
                      >
                        <Icon as={TrashIcon} size={18} className="text-destructive" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 새 Award 추가 */}
            <View className="gap-3 p-3 border border-border rounded-md">
              <Text className="font-semibold">새 수상 경력 추가</Text>
              <View>
                <Label>수상 연도</Label>
                <Input
                  value={newAwardYear}
                  onChangeText={setNewAwardYear}
                  placeholder="2015"
                  keyboardType="numeric"
                />
              </View>
              <View>
                <Label>수상 내역</Label>
                <Input
                  value={newAwardName}
                  onChangeText={setNewAwardName}
                  placeholder="쇼팽 국제 피아노 콩쿠르 1위"
                />
              </View>
              <Button
                variant="outline"
                onPress={handleAddAward}
                className="flex-row items-center justify-center gap-2"
              >
                <Icon as={PlusIcon} size={16} />
                <Text>추가</Text>
              </Button>
            </View>
          </Card>

          {/* Concerts */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-3">공연 정보</Text>
            <View>
              <Label>공연 수</Label>
              <Input 
                value={concertCount}
                onChangeText={setConcertCount}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </Card>

          {/* Countries */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-3">활동 국가</Text>
            <View>
              <Label>국가 수</Label>
              <Input 
                value={countryCount}
                onChangeText={setCountryCount}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </Card>

          {/* Albums */}
          <Card className="p-4 mb-6">
            <Text className="text-lg font-bold mb-3">앨범</Text>
            <View>
              <Label>앨범 수</Label>
              <Input 
                value={albumCount}
                onChangeText={setAlbumCount}
                placeholder="0"
                keyboardType="numeric"
              />
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
