import { Text } from '@/components/ui/text';
import { comparePlayer, type SwitchMode, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 세그먼트에서 고른 칸의 그림자. className으로 켜고 끄지 않는다 (아래 주석) */
export const SELECTED_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.1,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

/** 연주자를 바꿀 때 어디서 이어 들을지 */
export function SwitchModeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useComparePlayer((state) => state.switchMode);
  const options: { value: SwitchMode; label: string; hint: string }[] = [
    { value: 'resume', label: '이어서', hint: '연주자마다 듣던 곳에서 이어요' },
    { value: 'align', label: '같은 지점', hint: '지금 듣던 대목에서 바로 넘어가요' },
  ];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="연주자 전환 방식" className="flex-row items-center gap-2">
      {!compact ? (
        <Text variant="caption" className="text-foreground-subtle">
          전환
        </Text>
      ) : null}
      <View className="h-8 flex-row rounded-full bg-surface-2 p-0.5">
        {options.map((option) => {
          const selected = option.value === mode;
          return (
            <Pressable
              key={option.value}
              onPress={() => comparePlayer.setSwitchMode(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityHint={option.hint}
              // 그림자를 className으로 켜고 끄면 NativeWind가 개발 모드에서 컴포넌트를 바꿔 끼우며 오류를 낸다.
              // 그림자는 style로 준다
              style={selected ? SELECTED_SHADOW : undefined}
              className={cn('h-7 justify-center rounded-full px-3', selected && 'bg-surface-1')}>
              <Text className={cn('text-label', selected ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
