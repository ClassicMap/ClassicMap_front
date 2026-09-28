import { OptimizedImage } from '@/components/optimized-image';
import { FallbackArt } from '@/components/ui/fallback-art';
import * as React from 'react';

interface EntityThumbProps {
  name: string;
  image?: string | null;
  /** 사람은 원, 콘텐츠(작품·음반·공연)는 사각 */
  shape: 'circle' | 'square';
  size: number;
  /** 포스터처럼 세로가 긴 사각. 폭 대비 높이 비율 */
  aspect?: number;
}

/** 이미지가 있으면 이미지, 없거나 실패하면 이름 기반 폴백 타일. */
export function EntityThumb({ name, image, shape, size, aspect = 1 }: EntityThumbProps) {
  const height = Math.round(size * aspect);
  const radius = shape === 'circle' ? size / 2 : Math.max(4, Math.round(size * 0.08));
  const fallback = <FallbackArt name={name} shape={shape} size={size} />;
  if (!image) return fallback;
  return (
    <OptimizedImage
      uri={image}
      fallbackComponent={fallback}
      resizeMode="cover"
      style={{ width: size, height, borderRadius: radius, overflow: 'hidden' }}
    />
  );
}
