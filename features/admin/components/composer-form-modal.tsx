import {
  ChoiceField,
  FormRow,
  FormSection,
  TextAreaField,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type FieldErrors,
} from '@/features/admin/components/form-field';
import { ImageUrlField } from '@/features/admin/components/form-image';
import { FORM_INVALID_MESSAGE, FormModal } from '@/features/admin/components/form-modal';
import { AdminComposerAPI } from '@/lib/api/admin';
import { msg, t, useLocale } from '@/lib/i18n';
import type { Composer } from '@/types/models';
import { Alert } from '@/lib/utils/alert';
import * as React from 'react';

interface ComposerFormModalProps {
  visible: boolean;
  composer?: Composer;
  onClose: () => void;
  onSuccess: () => void;
}

const PERIOD_OPTIONS = [
  msg('중세'),
  msg('르네상스'),
  msg('바로크'),
  msg('고전주의'),
  msg('낭만주의'),
  msg('근현대'),
].map((period) => ({
  value: period,
  label: period,
}));

type ComposerField =
  | 'name'
  | 'fullName'
  | 'englishName'
  | 'birthYear'
  | 'deathYear'
  | 'nationality';

export function ComposerFormModal({
  visible,
  composer,
  onClose,
  onSuccess,
}: ComposerFormModalProps) {
  useLocale();
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
    name: name ? undefined : t('form::이름을 입력해 주세요.'),
    fullName: fullName ? undefined : t('전체 이름을 입력해 주세요.'),
    englishName: englishName ? undefined : t('영문 이름을 입력해 주세요.'),
    birthYear: birthYear ? undefined : t('출생 연도를 입력해 주세요.'),
    deathYear: deathYear ? undefined : t('사망 연도를 입력해 주세요.'),
    nationality: nationality ? undefined : t('국적을 입력해 주세요.'),
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
        Alert.alert(t('작곡가를 수정했어요'));
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
        Alert.alert(t('작곡가를 추가했어요'));
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save composer:', error);
      Alert.alert(t('저장하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title={composer ? t('작곡가 수정') : t('작곡가 추가')}
      subtitle={composer?.name}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title={t('기본 정보')}>
        <TextField
          label={t('form::이름')}
          required
          value={name}
          onChangeText={setName}
          placeholder={t('바흐')}
          error={shown.name}
        />
        <TextField
          label={t('전체 이름')}
          required
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('요한 제바스티안 바흐')}
          error={shown.fullName}
        />
        <TextField
          label={t('영문 이름')}
          required
          value={englishName}
          onChangeText={setEnglishName}
          placeholder="Johann Sebastian Bach"
          error={shown.englishName}
        />
        <ChoiceField
          label={t('시대')}
          required
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
        <FormRow>
          <TextField
            label={t('출생 연도')}
            required
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="1685"
            keyboardType="numeric"
            error={shown.birthYear}
          />
          <TextField
            label={t('사망 연도')}
            required
            value={deathYear}
            onChangeText={setDeathYear}
            placeholder="1750"
            keyboardType="numeric"
            error={shown.deathYear}
          />
        </FormRow>
        <TextField
          label={t('국적')}
          required
          value={nationality}
          onChangeText={setNationality}
          placeholder={t('독일')}
          error={shown.nationality}
        />
      </FormSection>

      <FormSection title={t('form::이미지')}>
        <ImageUrlField
          label={t('아바타 이미지 URL')}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          shape="square"
        />
        <ImageUrlField
          label={t('커버 이미지 URL')}
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
          shape="banner"
        />
      </FormSection>

      <FormSection title={t('설명')}>
        <TextAreaField
          label={t('소개')}
          value={bio}
          onChangeText={setBio}
          placeholder={t('어떤 작곡가인지 적어 주세요')}
        />
        <TextField
          label={t('음악 스타일')}
          value={style}
          onChangeText={setStyle}
          placeholder={t('정교한 대위법…')}
        />
        <TextField
          label={t('음악사적 영향')}
          value={influence}
          onChangeText={setInfluence}
          placeholder={t('모차르트, 베토벤…')}
        />
      </FormSection>
    </FormModal>
  );
}
