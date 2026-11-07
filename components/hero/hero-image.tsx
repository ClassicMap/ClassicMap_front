import { getHeroImageCandidates } from '@/lib/utils/image';
import * as React from 'react';
import { Image, View } from 'react-native';

/**
 * 배너 그림 (네이티브). 초상은 세로가 길어 가운데로 자르면 얼굴이 잘리므로,
 * 폭에 맞춘 키 큰 그림을 위쪽(얼굴)이 보이게 깐다. 웹 구현은 hero-image.web.tsx
 */
export function HeroImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const candidates = React.useMemo(() => getHeroImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const src = candidates[attempt];
  if (!src || width <= 0) return null;
  const tall = Math.max(height, width * 1.1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      <Image
        source={{ uri: src }}
        resizeMode="cover"
        onError={() => setAttempt((current) => current + 1)}
        style={{ position: 'absolute', left: 0, top: -Math.round((tall - height) * 0.22), width, height: tall }}
      />
    </View>
  );
}
