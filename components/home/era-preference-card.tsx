import { Button } from '@/components/ui/button';
import { Chip, ChipDot } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { getEraForeground } from '@/lib/design/era-palette';
import type { ColorScheme } from '@/lib/design/tokens';
import * as React from 'react';
import { View } from 'react-native';

/** 실제 작곡가 데이터가 있는 시대만 고르게 한다. 고를 수 있는데 비어 있으면 헛걸음이다 */
export const PREFERENCE_ERAS = ['바로크', '고전주의', '낭만주의', '근현대'] as const;

interface EraPreferenceCardProps {
  scheme: ColorScheme;
  onSave: (periods: string[]) => Promise<void>;
  onSkip: () => Promise<void>;
}

/**
 * 첫 방문 온보딩을 모달 캐러셀 대신 홈 위 카드 한 장으로 줄였다 (설계 문서 7.11).
 * 고르면 카드가 사라지고 작곡가 셸프와 오늘의 비교가 그 시대 쪽으로 기운다.
 */
export function EraPreferenceCard({ scheme, onSave, onSkip }: EraPreferenceCardProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const toggle = (era: string) =>
    setSelected((current) => (current.includes(era) ? current.filter((item) => item !== era) : [...current, era]));

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    try {
      await action();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="rounded-xl border border-border bg-surface-2 p-4 web:p-5">
      <Text variant="headline">좋아하는 시대를 고르면 추천이 달라져요</Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        여러 개 골라도 돼요. 나중에 설정에서 바꿀 수 있어요.
      </Text>
      <View className="mt-3.5 flex-row flex-wrap gap-2">
        {PREFERENCE_ERAS.map((era) => {
          const color = getEraForeground(era, scheme);
          return (
            <Chip
              key={era}
              label={era}
              selected={selected.includes(era)}
              onPress={() => toggle(era)}
              leading={color ? <ChipDot color={color} /> : undefined}
            />
          );
        })}
      </View>
      <View className="mt-4 flex-row items-center gap-2">
        <Button size="sm" disabled={saving || selected.length === 0} onPress={() => run(() => onSave(selected))}>
          <Text>{saving ? '저장 중…' : '이 시대로 추천받기'}</Text>
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onPress={() => run(onSkip)}>
          <Text className="text-foreground-muted">건너뛰기</Text>
        </Button>
      </View>
    </View>
  );
}
