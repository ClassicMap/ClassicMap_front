import {
  ChoiceField,
  FormRow,
  FormSection,
  TextAreaField,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type ChoiceOption,
  type FieldErrors,
} from '@/components/admin/form-field';
import { FORM_INVALID_MESSAGE, FormModal } from '@/components/admin/form-modal';
import { AdminPieceAPI } from '@/lib/api/admin';
import type { Piece } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import * as React from 'react';

interface PieceFormModalProps {
  visible: boolean;
  composerId: number;
  piece?: Piece;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS: ReadonlyArray<ChoiceOption<Piece['type']>> = [
  { value: 'song', label: '단일곡' },
  { value: 'album', label: '앨범·모음집' },
];

export function PieceFormModal({ visible, composerId, piece, onClose, onSuccess }: PieceFormModalProps) {
  const [title, setTitle] = React.useState('');
  const [titleEn, setTitleEn] = React.useState('');
  const [type, setType] = React.useState<'album' | 'song'>('song');
  const [description, setDescription] = React.useState('');
  const [opusNumber, setOpusNumber] = React.useState('');
  const [compositionYear, setCompositionYear] = React.useState('');
  const [difficultyLevel, setDifficultyLevel] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState('');
  const [spotifyUrl, setSpotifyUrl] = React.useState('');
  const [appleMusicUrl, setAppleMusicUrl] = React.useState('');
  const [youtubeMusicUrl, setYoutubeMusicUrl] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const { attempted, setAttempted } = useSubmitAttempt(visible);

  React.useEffect(() => {
    if (visible && piece) {
      // 수정 모드: 기존 데이터 로드
      setTitle(piece.title);
      setTitleEn(piece.titleEn || '');
      setType(piece.type);
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
      setTitleEn('');
      setType('song');
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

  const errors: FieldErrors<'title'> = {
    title: title ? undefined : '제목을 입력해 주세요.',
  };
  const shown: FieldErrors<'title'> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (hasErrors(errors)) {
      setAttempted(true);
      return;
    }

    setSubmitting(true);
    try {
      if (piece) {
        // 수정 모드
        await AdminPieceAPI.update(piece.id, {
          title,
          titleEn: titleEn || undefined,
          type,
          description: description || undefined,
          opusNumber: opusNumber || undefined,
          compositionYear: compositionYear ? parseInt(compositionYear) : undefined,
          difficultyLevel: difficultyLevel ? parseInt(difficultyLevel) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          spotifyUrl: spotifyUrl || undefined,
          appleMusicUrl: appleMusicUrl || undefined,
          youtubeMusicUrl: youtubeMusicUrl || undefined,
        });
        Alert.alert('작품을 수정했어요');
      } else {
        // 생성 모드
        await AdminPieceAPI.create({
          composerId: composerId,
          title,
          titleEn: titleEn || undefined,
          type,
          description: description || undefined,
          opusNumber: opusNumber || undefined,
          compositionYear: compositionYear ? parseInt(compositionYear) : undefined,
          difficultyLevel: difficultyLevel ? parseInt(difficultyLevel) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          spotifyUrl: spotifyUrl || undefined,
          appleMusicUrl: appleMusicUrl || undefined,
          youtubeMusicUrl: youtubeMusicUrl || undefined,
        });
        Alert.alert('작품을 추가했어요');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save piece:', error);
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title={piece ? '작품 수정' : '작품 추가'}
      subtitle={piece?.title}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title="기본 정보">
        <TextField
          label="제목"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="피아노 소나타 14번"
          error={shown.title}
        />
        <TextField
          label="영문 제목"
          value={titleEn}
          onChangeText={setTitleEn}
          placeholder="Piano Sonata No. 14"
        />
        <ChoiceField label="작품 유형" required options={TYPE_OPTIONS} value={type} onChange={setType} />
        <TextAreaField
          label="설명"
          value={description}
          onChangeText={setDescription}
          placeholder="어떤 작품인지 적어 주세요"
          numberOfLines={3}
        />
      </FormSection>

      <FormSection title="세부 정보">
        <FormRow>
          <TextField
            label="작품 번호"
            value={opusNumber}
            onChangeText={setOpusNumber}
            placeholder="Op. 27 No. 2"
          />
          <TextField
            label="작곡 연도"
            value={compositionYear}
            onChangeText={setCompositionYear}
            placeholder="1801"
            keyboardType="numeric"
          />
        </FormRow>
        <FormRow>
          <TextField
            label="난이도 (1–10)"
            value={difficultyLevel}
            onChangeText={setDifficultyLevel}
            placeholder="8"
            keyboardType="numeric"
          />
          <TextField
            label="연주 시간 (분)"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="15"
            keyboardType="numeric"
          />
        </FormRow>
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
          label="Apple Music Classical URL"
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
      </FormSection>
    </FormModal>
  );
}
