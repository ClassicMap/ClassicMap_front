import { Scrim } from '@/components/ui/scrim';
import { getHeroImageCandidates } from '@/lib/utils/image';
import * as React from 'react';
import { Image, View } from 'react-native';

export type HeroImageLayout = 'cover' | 'side';

/**
 * 배너 그림 (네이티브). cover 는 폭에 맞춘 키 큰 그림을 위쪽(얼굴)이 보이게 깔고,
 * side 는 같은 사진을 흐리게 뒤에 깔고 오른쪽에 정사각으로 세운다. 웹 구현은 hero-image.web.tsx
 */
export function HeroImage({
  uri,
  width,
  height,
  layout = 'cover',
}: {
  uri: string;
  width: number;
  height: number;
  layout?: HeroImageLayout;
}) {
  const candidates = React.useMemo(() => getHeroImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const src = candidates[attempt];
  if (!src || width <= 0) return null;
  const onError = () => setAttempt((current) => current + 1);

  if (layout === 'side') {
    const side = Math.min(height, width);
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
        <Image source={{ uri: src }} blurRadius={40} resizeMode="cover" style={{ position: 'absolute', width, height, opacity: 0.55 }} />
        <View style={{ position: 'absolute', right: 0, top: 0, width: side, height: side }}>
          <Image source={{ uri: src }} resizeMode="cover" onError={onError} style={{ width: side, height: side }} />
          <Scrim from="left" color="#000" opacity={0.85} extent={45} />
        </View>
      </View>
    );
  }

  const tall = Math.max(height, width * 1.1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      <Image
        source={{ uri: src }}
        resizeMode="cover"
        onError={onError}
        style={{ position: 'absolute', left: 0, top: -Math.round((tall - height) * 0.22), width, height: tall }}
      />
    </View>
  );
}
