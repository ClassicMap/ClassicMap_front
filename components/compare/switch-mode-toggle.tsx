import { Text } from '@/components/ui/text';
import { comparePlayer, type SwitchMode, useComparePlayer } from '@/lib/player/compare-player-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 연주자를 바꿀 때 어디서 이어 들을지 */
export function SwitchModeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useComparePlayer((state) => state.switchMode);
  const options: { value: SwitchMode; label: string; hint: string }[] = [
    { value: 'resume', label: '듣던 곳부터', hint: '연주자마다 듣던 자리에서 이어 들어요' },
    { value: 'align', label: '같은 지점', hint: '방금 듣던 대목과 같은 지점으로 맞춰 들어요' },
  ];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="연주자를 바꿀 때" className="flex-row items-center gap-2">
      {!compact ? (
        <Text variant="caption" className="text-foreground-subtle">
          바꿀 때
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
              className={cn('h-7 justify-center rounded-full px-3', selected && 'bg-surface-1 shadow-sm shadow-black/10')}>
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
