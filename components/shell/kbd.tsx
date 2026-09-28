import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** 키캡 표시 (`⌘K`, `↵`). 웹 셸 전용. */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <View
      className={cn(
        'h-5 min-w-5 items-center justify-center rounded-xs border border-border px-1',
        className
      )}>
      <Text className="font-mono text-[11px] leading-none text-foreground-subtle">{children}</Text>
    </View>
  );
}

/** 맥이면 ⌘, 그 외 Ctrl */
export function modKeyLabel(): string {
  if (typeof navigator === 'undefined') return '⌘';
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
}
