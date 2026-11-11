import {
  FormSection,
  TextAreaField,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type FieldErrors,
} from '@/features/admin/components/form-field';
import { FORM_INVALID_MESSAGE, FormModal } from '@/features/admin/components/form-modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AdminPerformanceSectorAPI } from '@/lib/api/admin';
import { t, useLocale } from '@/lib/i18n';
import type { PerformanceSectorWithCount } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import { Trash2 as TrashIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

interface SectorFormModalProps {
  visible: boolean;
  sector?: PerformanceSectorWithCount | null;
  pieceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const SECTOR_NAME_MAX = 200;

type SectorField = 'sectorName' | 'displayOrder';

export function SectorFormModal({
  visible,
  sector,
  pieceId,
  onClose,
  onSuccess,
}: SectorFormModalProps) {
  useLocale();
  const [sectorName, setSectorName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { attempted, setAttempted } = useSubmitAttempt(visible);

  const isEditMode = !!sector;
  const loading = saving || deleting;

  // 모달이 열릴 때 데이터 초기화
  useEffect(() => {
    if (visible) {
      if (sector) {
        // 수정 모드
        setSectorName(sector.sectorName);
        setDescription(sector.description || '');
        setDisplayOrder(sector.displayOrder.toString());
      } else {
        // 새로 만들기 모드
        setSectorName('');
        setDescription('');
        setDisplayOrder('0');
      }
    }
  }, [visible, sector]);

  const orderNum = parseInt(displayOrder);
  const errors: FieldErrors<SectorField> = {
    sectorName: !sectorName.trim()
      ? t('구간 이름을 입력해 주세요.')
      : sectorName.length > SECTOR_NAME_MAX
        ? t('구간 이름은 {max}자 이내로 적어 주세요.', { max: SECTOR_NAME_MAX })
        : undefined,
    displayOrder:
      isNaN(orderNum) || orderNum < 0
        ? t('표시 순서는 0 이상의 숫자로 적어 주세요.')
        : undefined,
  };
  const shown: FieldErrors<SectorField> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (hasErrors(errors)) {
      setAttempted(true);
      return;
    }

    if (!isEditMode && !pieceId) {
      Alert.alert(t('곡 정보가 없어요'), t('곡을 먼저 고른 뒤 다시 시도해 주세요.'));
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && sector) {
        // 수정
        await AdminPerformanceSectorAPI.update(sector.id, {
          sectorName: sectorName.trim(),
          description: description.trim() || undefined,
          displayOrder: parseInt(displayOrder),
        });
        Alert.alert(t('구간을 수정했어요'));
      } else if (pieceId) {
        // 생성
        await AdminPerformanceSectorAPI.create({
          pieceId,
          sectorName: sectorName.trim(),
          description: description.trim() || undefined,
          displayOrder: parseInt(displayOrder),
        });
        Alert.alert(t('구간을 추가했어요'));
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save sector:', error);
      Alert.alert(t('저장하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sector) return;

    Alert.alert(
      t('구간을 삭제할까요?'),
      t('"{name}" 구간과 연결된 연주 {count}개가 함께 삭제돼요. 삭제한 뒤에는 되돌릴 수 없어요.', {
        name: sector.sectorName,
        count: sector.performanceCount,
      }),
      [
        { text: t('취소'), style: 'cancel' },
        {
          text: t('삭제'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await AdminPerformanceSectorAPI.delete(sector.id);
              Alert.alert(t('구간을 삭제했어요'));
              onSuccess();
            } catch (error) {
              console.error('Failed to delete sector:', error);
              Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <FormModal
      visible={visible}
      title={isEditMode ? t('구간 수정') : t('구간 추가')}
      subtitle={sector?.sectorName}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={saving}
      busy={deleting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title={t('구간 정보')}>
        <TextField
          label={t('구간 이름')}
          required
          value={sectorName}
          onChangeText={setSectorName}
          placeholder={t('예: 1악장, 빠른 템포, 라이브 버전')}
          maxLength={SECTOR_NAME_MAX}
          error={shown.sectorName}
          aside={
            <Text variant="mono" className="text-foreground-subtle">
              {`${sectorName.length}/${SECTOR_NAME_MAX}`}
            </Text>
          }
        />
        <TextAreaField
          label={t('설명')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('구간을 설명해 주세요 (선택)')}
        />
        <TextField
          label={t('표시 순서')}
          value={displayOrder}
          onChangeText={setDisplayOrder}
          placeholder="0"
          keyboardType="numeric"
          error={shown.displayOrder}
          help={t('숫자가 작을수록 앞에 보여요. 기본값은 0이에요.')}
        />
      </FormSection>

      {isEditMode && sector ? (
        <FormSection title={t('삭제')}>
          <View className="gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <View className="gap-1">
              <Text variant="bodySm" className="text-foreground">
                {t('이 구간에는 연주가 {count}개 있어요.', { count: sector.performanceCount })}
              </Text>
              <Text variant="caption">
                {t('구간을 삭제하면 연결된 연주도 함께 삭제되고, 되돌릴 수 없어요.')}
              </Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={handleDelete}
              disabled={loading}
              className="self-start">
              <Icon as={TrashIcon} size={14} className="text-destructive" />
              <Text className="text-destructive">{deleting ? t('삭제 중…') : t('구간 삭제')}</Text>
            </Button>
          </View>
        </FormSection>
      ) : null}
    </FormModal>
  );
}
