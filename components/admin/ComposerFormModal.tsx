import {
  ChoiceField,
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
import { AdminComposerAPI } from '@/lib/api/admin';
import type { Composer } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import * as React from 'react';

interface ComposerFormModalProps {
  visible: boolean;
  composer?: Composer;
  onClose: () => void;
  onSuccess: () => void;
}

const PERIOD_OPTIONS = ['중세', '르네상스', '바로크', '고전주의', '낭만주의', '근현대'].map((period) => ({
  value: period,
  label: period,
}));

type ComposerField = 'name' | 'fullName' | 'englishName' | 'birthYear' | 'deathYear' | 'nationality';

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
  const { attempted, setAttempted } = useSubmitAttempt(visible);

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

  const errors: FieldErrors<ComposerField> = {
    name: name ? undefined : '이름을 입력해 주세요.',
    fullName: fullName ? undefined : '전체 이름을 입력해 주세요.',
    englishName: englishName ? undefined : '영문 이름을 입력해 주세요.',
    birthYear: birthYear ? undefined : '출생 연도를 입력해 주세요.',
    deathYear: deathYear ? undefined : '사망 연도를 입력해 주세요.',
    nationality: nationality ? undefined : '국적을 입력해 주세요.',
  };
  const shown: FieldErrors<ComposerField> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (hasErrors(errors)) {
      setAttempted(true);
      return;
    }

    setSubmitting(true);
    try {
      if (composer) {
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
        Alert.alert('작곡가를 수정했어요');
      } else {
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
        Alert.alert('작곡가를 추가했어요');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save composer:', error);
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title={composer ? '작곡가 수정' : '작곡가 추가'}
      subtitle={composer?.name}
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
          placeholder="바흐"
          error={shown.name}
        />
        <TextField
          label="전체 이름"
          required
          value={fullName}
          onChangeText={setFullName}
          placeholder="요한 제바스티안 바흐"
          error={shown.fullName}
        />
        <TextField
          label="영문 이름"
          required
          value={englishName}
          onChangeText={setEnglishName}
          placeholder="Johann Sebastian Bach"
          error={shown.englishName}
        />
        <ChoiceField label="시대" required options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <FormRow>
          <TextField
            label="출생 연도"
            required
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="1685"
            keyboardType="numeric"
            error={shown.birthYear}
          />
          <TextField
            label="사망 연도"
            required
            value={deathYear}
            onChangeText={setDeathYear}
            placeholder="1750"
            keyboardType="numeric"
            error={shown.deathYear}
          />
        </FormRow>
        <TextField
          label="국적"
          required
          value={nationality}
          onChangeText={setNationality}
          placeholder="독일"
          error={shown.nationality}
        />
      </FormSection>

      <FormSection title="이미지">
        <ImageUrlField
          label="아바타 이미지 URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          shape="square"
        />
        <ImageUrlField
          label="커버 이미지 URL"
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
          shape="banner"
        />
      </FormSection>

      <FormSection title="설명">
        <TextAreaField
          label="소개"
          value={bio}
          onChangeText={setBio}
          placeholder="어떤 작곡가인지 적어 주세요"
        />
        <TextField label="음악 스타일" value={style} onChangeText={setStyle} placeholder="정교한 대위법…" />
        <TextField
          label="음악사적 영향"
          value={influence}
          onChangeText={setInfluence}
          placeholder="모차르트, 베토벤…"
        />
      </FormSection>
    </FormModal>
  );
}
