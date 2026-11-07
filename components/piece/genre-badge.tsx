import { Text } from '@/components/ui/text';
import { genreForeground, genreStyle } from '@/lib/design/genre-palette';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

/** 장르 점 + 이름. 장르를 모르면 아무것도 그리지 않는다 */
export function GenreBadge({ genre, className }: { genre?: string | null; className?: string }) {
  const { colorScheme } = useColorScheme();
  const style = genreStyle(genre);
  const color = genreForeground(genre, colorScheme === 'dark' ? 'dark' : 'light');
  if (!style || !color) return null;
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <View className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-caption font-semibold" style={{ color }}>
        {style.label}
      </Text>
    </View>
  );
}
