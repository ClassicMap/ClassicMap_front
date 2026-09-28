import {
  FormRow,
  FormSection,
  TextAreaField,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type FieldErrors,
} from '@/components/admin/form-field';
import { ImageUrlField } from '@/components/admin/form-image';
import { FORM_INVALID_MESSAGE, FormModal } from '@/components/admin/form-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AdminArtistAPI } from '@/lib/api/admin';
import type { Artist } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { PlusIcon, TrashIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

interface ArtistFormModalProps {
  visible: boolean;
  artist?: Artist;
  onClose: () => void;
  onSuccess: () => void;
}

// 수상 경력 관리
interface AwardInput {
  id?: number; // 기존 award의 경우 id 존재
  year: string;
  awardName: string;
  displayOrder: number;
  isNew?: boolean; // 새로 추가된 award인지 여부
  isDeleted?: boolean; // 삭제될 award인지 여부
}

type ArtistField = 'name' | 'englishName' | 'category' | 'nationality';

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
  const { attempted, setAttempted } = useSubmitAttempt(visible);

  // 카운트 입력
  const [concertCount, setConcertCount] = React.useState('0');
  const [albumCount, setAlbumCount] = React.useState('0');

  const [awards, setAwards] = React.useState<AwardInput[]>([]);
  const [newAwardYear, setNewAwardYear] = React.useState('');
  const [newAwardName, setNewAwardName] = React.useState('');
  const [awardAttempted, setAwardAttempted] = React.useState(false);

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
      setConcertCount(String(artist.concertCount || 0));
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
      setConcertCount('0');
      setAlbumCount('0');
      setAwards([]);
    }
    setNewAwardYear('');
    setNewAwardName('');
    setAwardAttempted(false);
  }, [artist, visible]);

  const errors: FieldErrors<ArtistField> = {
    name: name ? undefined : '이름을 입력해 주세요.',
    englishName: englishName ? undefined : '영문 이름을 입력해 주세요.',
    category: category ? undefined : '카테고리를 입력해 주세요.',
    nationality: nationality ? undefined : '국적을 입력해 주세요.',
  };
  const shown: FieldErrors<ArtistField> = attempted ? errors : {};

  const awardErrors: FieldErrors<'year' | 'awardName'> = awardAttempted
    ? {
        year: newAwardYear ? undefined : '수상 연도를 입력해 주세요.',
        awardName: newAwardName ? undefined : '수상 내역을 입력해 주세요.',
      }
    : {};

  const handleAddAward = () => {
    if (!newAwardYear || !newAwardName) {
      setAwardAttempted(true);
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
    setAwardAttempted(false);
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

  const handleSubmit = async () => {
    if (hasErrors(errors)) {
      setAttempted(true);
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

      Alert.alert(artist ? '아티스트를 수정했어요' : '아티스트를 추가했어요');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save artist:', error);
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAwards = awards
    .map((award, index) => ({ award, index }))
    .filter(({ award }) => !award.isDeleted);

  return (
    <FormModal
      visible={visible}
      title={artist ? '아티스트 수정' : '아티스트 추가'}
      subtitle={artist?.name}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title="기본 정보">
        <TextField
          label="이름"
          required
          value={name}
          onChangeText={setName}
          placeholder="조성진"
          error={shown.name}
        />
        <TextField
          label="영문 이름"
          required
          value={englishName}
          onChangeText={setEnglishName}
          placeholder="Seong-Jin Cho"
          error={shown.englishName}
        />
        <TextField
          label="카테고리"
          required
          value={category}
          onChangeText={setCategory}
          placeholder="피아니스트"
          error={shown.category}
        />
        <TextField
          label="국적"
          required
          value={nationality}
          onChangeText={setNationality}
          placeholder="대한민국"
          error={shown.nationality}
        />
        <FormRow>
          <TextField
            label="출생 연도"
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="1994"
            keyboardType="numeric"
          />
          <TextField
            label="평점"
            value={rating}
            onChangeText={setRating}
            placeholder="4.5"
            keyboardType="decimal-pad"
          />
        </FormRow>
      </FormSection>

      <FormSection title="이미지">
        <ImageUrlField
          label="프로필 이미지 URL"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/image.jpg"
          shape="square"
        />
        <ImageUrlField
          label="커버 이미지 URL"
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
          placeholder="https://example.com/cover.jpg"
          shape="banner"
        />
      </FormSection>

      <FormSection title="설명">
        <TextAreaField
          label="소개"
          value={bio}
          onChangeText={setBio}
          placeholder="어떤 아티스트인지 적어 주세요"
        />
        <TextField
          label="스타일"
          value={style}
          onChangeText={setStyle}
          placeholder="섬세하고 시적인 표현…"
        />
      </FormSection>

      <FormSection
        title="수상 경력"
        description="추가하거나 지운 수상 경력은 저장을 눌러야 반영돼요.">
        {visibleAwards.length > 0 ? (
          <View className="overflow-hidden rounded-lg border border-border">
            {visibleAwards.map(({ award, index }, position) => (
              <View
                key={award.id ?? `new-${index}`}
                className={cn(
                  'flex-row items-center gap-3 py-2 pl-3 pr-1.5',
                  position > 0 && 'border-t border-border'
                )}>
                <Text variant="mono" className="w-11 text-foreground-muted">
                  {award.year}
                </Text>
                <Text numberOfLines={2} className="min-w-0 flex-1 text-body-sm text-foreground">
                  {award.awardName}
                </Text>
                {award.isNew ? <Badge tone="accent" label="새로 추가" /> : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => handleDeleteAward(index)}
                  accessibilityLabel={`${award.awardName} 삭제`}>
                  <Icon as={TrashIcon} size={16} className="text-destructive" />
                </Button>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="bodySm" className="text-foreground-muted">
            아직 등록한 수상 경력이 없어요.
          </Text>
        )}

        <View className="gap-3 rounded-lg border border-dashed border-border-strong p-3">
          <Text variant="label" className="text-foreground">
            새 수상 경력
          </Text>
          <View className="flex-row gap-3">
            <TextField
              label="수상 연도"
              value={newAwardYear}
              onChangeText={setNewAwardYear}
              placeholder="2015"
              keyboardType="numeric"
              error={awardErrors.year}
              className="w-24"
            />
            <TextField
              label="수상 내역"
              value={newAwardName}
              onChangeText={setNewAwardName}
              placeholder="쇼팽 국제 피아노 콩쿠르 1위"
              error={awardErrors.awardName}
              className="min-w-0 flex-1"
            />
          </View>
          <Button variant="outline" size="sm" onPress={handleAddAward} className="self-start">
            <Icon as={PlusIcon} size={14} className="text-foreground" />
            <Text>목록에 추가</Text>
          </Button>
        </View>
      </FormSection>

      <FormSection title="활동 수치">
        <FormRow>
          <TextField
            label="공연 수"
            value={concertCount}
            onChangeText={setConcertCount}
            placeholder="0"
            keyboardType="numeric"
          />
          <TextField
            label="음반 수"
            value={albumCount}
            onChangeText={setAlbumCount}
            placeholder="0"
            keyboardType="numeric"
          />
        </FormRow>
      </FormSection>
    </FormModal>
  );
}
