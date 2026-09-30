import {
  ChoiceField,
  FormRow,
  FormSection,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type ChoiceOption,
  type FieldErrors,
} from '@/components/admin/form-field';
import { ImageUploadField } from '@/components/admin/form-image';
import { FORM_INVALID_MESSAGE, FormModal } from '@/components/admin/form-modal';
import { AdminRecordingAPI } from '@/lib/api/admin';
import type { Recording } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Platform } from 'react-native';

interface RecordingFormModalProps {
  visible: boolean;
  artistId: number;
  recording?: Recording;
  onClose: () => void;
  onSuccess: () => void;
}

type ReleaseKind = 'album' | 'single';

const RELEASE_KIND_OPTIONS: ReadonlyArray<ChoiceOption<ReleaseKind>> = [
  { value: 'album', label: '앨범' },
  { value: 'single', label: '싱글' },
];

type RecordingField = 'title' | 'year';

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
  const { attempted, setAttempted } = useSubmitAttempt(visible);

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
      Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 접근을 허용한 뒤 다시 시도해 주세요.');
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

        // React Native의 FormData는 파일을 { uri, name, type } 객체로 받는다. DOM 타입에는 없는 모양이다.
        formData.append('file', {
          uri,
          name: filename,
          type: fileType,
        } as unknown as Blob);
      }

      const uploadResponse = await fetch(`${API_BASE_URL}/upload/artist/cover`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data: { url: string } = await uploadResponse.json();
        const serverUrl = data.url;
        setCoverUrl(serverUrl);
        setSelectedCover(serverUrl);
        Alert.alert('커버 이미지를 올렸어요');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('커버 이미지를 올리지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    }
  };

  const errors: FieldErrors<RecordingField> = {
    title: title ? undefined : '제목을 입력해 주세요.',
    year: year ? undefined : '발매 연도를 입력해 주세요.',
  };
  const shown: FieldErrors<RecordingField> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (hasErrors(errors)) {
      setAttempted(true);
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
        Alert.alert('음반을 수정했어요');
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
        Alert.alert('음반을 추가했어요');
      }
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title={recording ? '음반 수정' : '음반 추가'}
      subtitle={recording?.title}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title="이미지">
        <ImageUploadField
          label="커버 이미지"
          uri={selectedCover}
          heightRatio={1}
          onPick={pickCover}
          help="고르면 바로 올라가요. 저장을 눌러야 음반에 반영돼요."
        />
      </FormSection>

      <FormSection title="기본 정보">
        <TextField
          label="제목"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="음반 제목"
          error={shown.title}
        />
        <FormRow>
          <TextField
            label="발매 연도"
            required
            value={year}
            onChangeText={setYear}
            placeholder="2024"
            keyboardType="numeric"
            error={shown.year}
          />
          <TextField
            label="정확한 발매일"
            value={releaseDate}
            onChangeText={setReleaseDate}
            placeholder="2024-01-15"
          />
        </FormRow>
        <FormRow>
          <TextField label="레이블" value={label} onChangeText={setLabel} placeholder="레이블 이름" />
          <TextField
            label="트랙 수"
            value={trackCount}
            onChangeText={setTrackCount}
            placeholder="10"
            keyboardType="numeric"
          />
        </FormRow>
        <ChoiceField
          label="구분"
          options={RELEASE_KIND_OPTIONS}
          value={isSingle ? 'single' : 'album'}
          onChange={(kind) => setIsSingle(kind === 'single')}
        />
      </FormSection>

      <FormSection title="스트리밍 링크">
        <TextField
          label="Spotify URL"
          value={spotifyUrl}
          onChangeText={setSpotifyUrl}
          placeholder="https://open.spotify.com/…"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextField
          label="Apple Music URL"
          value={appleMusicUrl}
          onChangeText={setAppleMusicUrl}
          placeholder="https://music.apple.com/…"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextField
          label="YouTube Music URL"
          value={youtubeMusicUrl}
          onChangeText={setYoutubeMusicUrl}
          placeholder="https://music.youtube.com/…"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextField
          label="기타 링크"
          value={externalUrl}
          onChangeText={setExternalUrl}
          placeholder="https://…"
          autoCapitalize="none"
          keyboardType="url"
        />
      </FormSection>
    </FormModal>
  );
}
