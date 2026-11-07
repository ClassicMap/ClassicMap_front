import { Text } from '@/components/ui/text';
import { genreStyle } from '@/lib/design/genre-palette';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable } from 'react-native';

/** 장르 이름. 누르면 그 장르 작품 모아 보기로 간다. 장르를 모르면 아무것도 그리지 않는다 */
export function GenreLink({ genre, className }: { genre?: string | null; className?: string }) {
  const router = useRouter();
  const style = genreStyle(genre);
  if (!style) return null;
  return (
    <Pressable
      onPress={() => router.push(`/compare?genre=${style.key}` as Href)}
      accessibilityRole="link"
      accessibilityLabel={`${style.label} 작품 모아 보기`}
      hitSlop={6}
      className={cn('group self-start', className)}>
      <Text className="text-label font-semibold text-foreground-muted web:underline-offset-4 web:group-hover:text-foreground web:group-hover:underline">
        {style.label}
      </Text>
    </Pressable>
  );
}
