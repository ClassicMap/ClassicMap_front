import { OptimizedImage } from '@/components/optimized-image';
import * as React from 'react';
import { View } from 'react-native';

export interface CoverPortraitProps {
  uri: string;
  /** 커버 한 변 */
  size: number;
}

/**
 * 커버 오른쪽에 까는 작곡가 초상 (네이티브). 원래 색 그대로 두고, 왼쪽 장르 색은 커버가 덮는다.
 * 웹 구현은 cover-portrait.web.tsx
 */
export function CoverPortrait({ uri, size }: CoverPortraitProps) {
  const width = Math.round(size * 0.74);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: 0, top: 0, width, height: size }}>
      <OptimizedImage uri={uri} resizeMode="cover" style={{ width, height: size }} />
    </View>
  );
}
