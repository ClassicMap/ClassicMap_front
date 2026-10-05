import { OptimizedImage } from '@/components/optimized-image';
import { Text } from '@/components/ui/text';
import { tmdbImageUrl } from '@/lib/utils/tmdb';
import * as React from 'react';
import { View } from 'react-native';

interface ScreenPosterProps {
  title: string;
  posterPath: string | null;
  width: number;
}

/** 포스터는 2:3. 포스터가 없거나 못 불러오면 제목을 적은 슬레이트 카드로 대신한다 */
export function ScreenPoster({ title, posterPath, width }: ScreenPosterProps) {
  const height = Math.round(width * 1.5);
  const radius = Math.max(4, Math.round(width * 0.06));
  const slate = <PosterSlate title={title} width={width} height={height} radius={radius} />;
  const uri = tmdbImageUrl(posterPath, width > 160 ? 'w500' : width > 90 ? 'w342' : 'w185');
  if (!uri) return slate;
  return (
    <OptimizedImage
      uri={uri}
      fallbackComponent={slate}
      resizeMode="cover"
      accessibilityLabel={`${title} 포스터`}
      style={{ width, height, borderRadius: radius, overflow: 'hidden' }}
    />
  );
}

function PosterSlate({ title, width, height, radius }: { title: string; width: number; height: number; radius: number }) {
  const small = width < 70;
  return (
    <View
      accessibilityLabel={title}
      className="justify-end overflow-hidden border border-border bg-foreground dark:bg-surface-3"
      style={{ width, height, borderRadius: radius, padding: small ? 4 : 8 }}>
      <Text
        numberOfLines={small ? 2 : 4}
        className="font-bold text-background dark:text-foreground"
        style={{ fontSize: small ? 9 : Math.min(18, Math.max(11, width / 8)), lineHeight: small ? 11 : undefined }}>
        {title}
      </Text>
    </View>
  );
}
