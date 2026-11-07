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
  focalPoint = '50% 22%',
}: {
  uri: string;
  width: number;
  height: number;
  layout?: HeroImageLayout;
  /** 웹 object-position 과 같은 'x% y%' */
  focalPoint?: string;
}) {
  const candidates = React.useMemo(() => getHeroImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const [natural, setNatural] = React.useState<{ width: number; height: number } | null>(null);
  React.useEffect(() => setNatural(null), [uri]);
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

  // 웹 object-position 과 같게: 칸을 덮는 크기로 키운 뒤 남는 만큼을 초점 비율로 민다.
  // 그림 크기를 받기 전에는 폭에 맞춘 키 큰 칸에 깔아 둔다
  const [focusX, focusY] = parseFocalPoint(focalPoint);
  const scale = natural ? Math.max(width / natural.width, height / natural.height) : 0;
  const drawn = natural
    ? { width: natural.width * scale, height: natural.height * scale }
    : { width, height: Math.max(height, width * 1.1) };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      <Image
        source={{ uri: src }}
        resizeMode="cover"
        onError={onError}
        onLoad={(event) => {
          const { width: w, height: h } = event.nativeEvent.source;
          if (w > 0 && h > 0) setNatural({ width: w, height: h });
        }}
        style={{
          position: 'absolute',
          left: -Math.round((drawn.width - width) * focusX),
          top: -Math.round((drawn.height - height) * focusY),
          width: drawn.width,
          height: drawn.height,
        }}
      />
    </View>
  );
}

function parseFocalPoint(focalPoint: string): [number, number] {
  const match = /^(\d{1,3})% (\d{1,3})%$/.exec(focalPoint.trim());
  if (!match) return [0.5, 0.22];
  return [Math.min(100, Number(match[1])) / 100, Math.min(100, Number(match[2])) / 100];
}
