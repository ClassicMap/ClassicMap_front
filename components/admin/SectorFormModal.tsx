import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { X as XIcon, Trash2 as TrashIcon } from 'lucide-react-native';
import { Alert } from '@/lib/utils/alert';
import { AdminPerformanceSectorAPI } from '@/lib/api/admin';
import type { PerformanceSectorWithCount } from '@/lib/types/models';

interface SectorFormModalProps {
  visible: boolean;
  sector?: PerformanceSectorWithCount | null;
  pieceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SectorFormModal({
  visible,
  sector,
  pieceId,
  onClose,
  onSuccess,
}: SectorFormModalProps) {
  const [sectorName, setSectorName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditMode = !!sector;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  // 슬라이드 애니메이션
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
    }
  }, [visible]);

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
      setErrors({});
    }
  }, [visible, sector]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!sectorName.trim()) {
      newErrors.sectorName = '섹터명을 입력해주세요.';
    } else if (sectorName.length > 200) {
      newErrors.sectorName = '섹터명은 200자 이내로 입력해주세요.';
    }

    const orderNum = parseInt(displayOrder);
    if (isNaN(orderNum) || orderNum < 0) {
      newErrors.displayOrder = '표시 순서는 0 이상의 숫자여야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isEditMode && !pieceId) {
      Alert.alert('오류', '곡 정보가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && sector) {
        // 수정
        await AdminPerformanceSectorAPI.update(sector.id, {
          sectorName: sectorName.trim(),
          description: description.trim() || undefined,
          displayOrder: parseInt(displayOrder),
        });
        Alert.alert('성공', '섹터가 수정되었습니다.');
      } else if (pieceId) {
        // 생성
        await AdminPerformanceSectorAPI.create({
          pieceId,
          sectorName: sectorName.trim(),
          description: description.trim() || undefined,
          displayOrder: parseInt(displayOrder),
        });
        Alert.alert('성공', '섹터가 생성되었습니다.');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save sector:', error);
      Alert.alert('오류', `섹터 저장에 실패했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sector) return;

    Alert.alert(
      '섹터 삭제',
      `"${sector.sectorName}" 섹터를 삭제하시겠습니까?\n\n⚠️ 이 섹터에 연결된 ${sector.performanceCount}개의 연주가 함께 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await AdminPerformanceSectorAPI.delete(sector.id);
              Alert.alert('성공', '섹터가 삭제되었습니다.');
              onSuccess();
            } catch (error) {
              console.error('Failed to delete sector:', error);
              Alert.alert('오류', '섹터 삭제에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const maxHeight = Dimensions.get('window').height * 0.9;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            height: maxHeight,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="rounded-t-3xl bg-background">
          {/* 헤더 */}
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Text className="text-xl font-bold">
              {isEditMode ? '섹터 수정' : '섹터 추가'}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Icon as={XIcon} size={24} />
            </TouchableOpacity>
          </View>

          {/* 폼 */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, flexGrow: 1 }}>
            <View className="gap-6">
              {/* 섹터명 */}
              <View className="gap-2">
                <Text className="text-sm font-medium">
                  섹터명 <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  value={sectorName}
                  onChangeText={setSectorName}
                  placeholder="예: 1악장, 빠른 템포, 라이브 버전"
                  maxLength={200}
                />
                {errors.sectorName && (
                  <Text className="text-sm text-destructive">{errors.sectorName}</Text>
                )}
              </View>

              {/* 설명 */}
              <View className="gap-2">
                <Text className="text-sm font-medium">설명</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="섹터에 대한 추가 설명 (선택사항)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-[100px] rounded-lg border border-border bg-background p-3 text-foreground"
                />
              </View>

              {/* 표시 순서 */}
              <View className="gap-2">
                <Text className="text-sm font-medium">표시 순서</Text>
                <Input
                  value={displayOrder}
                  onChangeText={setDisplayOrder}
                  placeholder="0"
                  keyboardType="numeric"
                />
                {errors.displayOrder && (
                  <Text className="text-sm text-destructive">{errors.displayOrder}</Text>
                )}
                <Text className="text-xs text-muted-foreground">
                  낮은 숫자가 먼저 표시됩니다 (기본값: 0)
                </Text>
              </View>

              {/* 연주 개수 정보 (수정 모드일 때만) */}
              {isEditMode && sector && (
                <View className="rounded-lg bg-muted/50 p-4">
                  <Text className="text-sm text-muted-foreground">
                    이 섹터에는 현재 {sector.performanceCount}개의 연주가 있습니다.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* 하단 버튼 */}
          <View className="gap-3 border-t border-border p-4">
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={onClose}
                disabled={loading}
                className="flex-1">
                <Text>취소</Text>
              </Button>
              <Button onPress={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text>{isEditMode ? '수정' : '생성'}</Text>
                )}
              </Button>
            </View>

            {/* 삭제 버튼 (수정 모드일 때만) */}
            {isEditMode && sector && (
              <Button
                variant="destructive"
                onPress={handleDelete}
                disabled={loading}
                className="w-full">
                <Icon as={TrashIcon} size={16} className="text-destructive-foreground" />
                <Text className="ml-2">섹터 삭제</Text>
              </Button>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
