import { OptimizedImage } from '@/components/optimized-image';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { tmdbImageUrl, youtubeClipThumbnail } from '@/lib/utils/tmdb';
import { PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

interface ScreenPosterProps {
  title: string;
  posterPath: string | null;
  /** 포스터가 없을 때 쓸 권리자 공식 클립. 장면 가운데를 2:3 으로 잘라 보인다 */
  coverVideoId?: string | null;
  width: number;
}

/** 포스터는 2:3. 포스터가 없으면 공식 클립 장면, 그것도 없으면 제목을 적은 슬레이트 카드로 대신한다 */
export function ScreenPoster({ title, posterPath, coverVideoId, width }: ScreenPosterProps) {
  const height = Math.round(width * 1.5);
  const radius = Math.max(4, Math.round(width * 0.06));
  const slate = <PosterSlate title={title} width={width} height={height} radius={radius} />;
  const poster = tmdbImageUrl(posterPath, width > 160 ? 'w500' : width > 90 ? 'w342' : 'w185');
  if (poster) {
    return (
      <OptimizedImage
        uri={poster}
        fallbackComponent={slate}
        resizeMode="cover"
        accessibilityLabel={`${title} 포스터`}
        style={{ width, height, borderRadius: radius, overflow: 'hidden' }}
      />
    );
  }
  const scene = youtubeClipThumbnail(coverVideoId);
  if (!scene) return slate;
  const small = width < 70;
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }} className="bg-surface-3">
      <OptimizedImage
        uri={width > 120 ? scene.uri : scene.fallback}
        fallbackUri={scene.fallback}
        fallbackComponent={slate}
        resizeMode="cover"
        accessibilityLabel={`${title} 공식 클립 장면`}
        style={{ width, height }}
      />
      <View
        className="absolute flex-row items-center gap-1 rounded-full bg-black/60"
        style={{ left: small ? 3 : 6, top: small ? 3 : 6, paddingHorizontal: small ? 3 : 6, paddingVertical: small ? 2 : 3 }}>
        <Icon as={PlayIcon} size={small ? 8 : 10} className="fill-white text-white" />
        {small ? null : <Text className="text-[10px] font-semibold text-white">공식 클립</Text>}
      </View>
    </View>
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
