import LegacyCompareScreen from '@/components/compare/legacy-compare-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/hooks/useAuth';
import { LockIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

/**
 * 구간·연주 관리 (관리자 전용). 새 비교 화면은 보기 전용이라
 * 구간 추가·연주 등록은 기존 화면에서 계속 한다.
 */
export default function CompareAdminScreen() {
  const { canEdit, loading } = useAuth();
  if (!loading && !canEdit) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState icon={LockIcon} title="관리자만 쓸 수 있는 화면이에요" description="비교 탭에서 같은 작품을 들을 수 있어요." />
      </View>
    );
  }
  return <LegacyCompareScreen />;
}
