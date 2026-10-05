import * as React from 'react';
import { Image, type LayoutChangeEvent, View } from 'react-native';

/**
 * 고화질부터 시도한다. maxresdefault 가 없는 영상은 YouTube 가 404 와 함께 120×90 회색 그림을 주는데,
 * 브라우저는 그 그림을 정상으로 그린다. 그래서 그리기 전에 크기를 재 보고 다음 단계로 내려간다.
 */
const QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;
type Quality = (typeof QUALITIES)[number];
/** YouTube 대체 그림(120×90)보다 크면 진짜 썸네일로 본다 */
const PLACEHOLDER_MAX_WIDTH = 160;

const thumbUrl = (videoId: string, quality: Quality) => `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;

function measure(uri: string): Promise<number> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width) => resolve(width),
      () => resolve(0)
    );
  });
}

/** 영상마다 고른 화질. 목록을 오가도 다시 재지 않는다 */
const chosen = new Map<string, Promise<Quality | null>>();

function pickQuality(videoId: string): Promise<Quality | null> {
  const known = chosen.get(videoId);
  if (known) return known;
  const pending = (async () => {
    for (const quality of QUALITIES) {
      if ((await measure(thumbUrl(videoId, quality))) > PLACEHOLDER_MAX_WIDTH) return quality;
    }
    return null;
  })();
  chosen.set(videoId, pending);
  return pending;
}

interface YoutubeThumbProps {
  videoId: string;
  accessibilityLabel?: string;
  /** 쓸 만한 썸네일이 없을 때 대신 그릴 것 */
  fallback?: React.ReactNode;
}

/**
 * 권리자 공식 클립의 썸네일로 부모 상자를 채운다(부모가 크기를 정한다).
 * maxresdefault 는 16:9 그대로 덮고, sd·hq 는 4:3 안 위아래 검은 띠(각 12.5%)가 밖으로 나가게 키워 가운데에 둔다.
 */
export function YoutubeThumb({ videoId, accessibilityLabel, fallback }: YoutubeThumbProps) {
  const [quality, setQuality] = React.useState<Quality | null | undefined>(undefined);
  const [box, setBox] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    setQuality(undefined);
    void pickQuality(videoId).then((picked) => {
      if (alive) setQuality(picked);
    });
    return () => {
      alive = false;
    };
  }, [videoId]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== box?.width || height !== box?.height)) setBox({ width, height });
  };

  if (quality === null) return <View className="flex-1">{fallback ?? null}</View>;

  let imageStyle: { position: 'absolute'; width: number; height: number; left: number; top: number } | null = null;
  if (box && quality) {
    // maxres 는 16:9 그대로, sd·hq 는 4:3 의 가운데 16:9 부분(높이 75%)이 상자를 덮게 키운다
    const contentRatio = quality === 'maxresdefault' ? 1 : 0.75;
    const imageAspect = quality === 'maxresdefault' ? 16 / 9 : 4 / 3;
    const height = Math.max(box.height / contentRatio, box.width / imageAspect);
    const width = height * imageAspect;
    imageStyle = { position: 'absolute', width, height, left: (box.width - width) / 2, top: (box.height - height) / 2 };
  }

  return (
    <View className="flex-1 overflow-hidden" onLayout={onLayout}>
      {imageStyle && quality ? (
        <Image
          source={{ uri: thumbUrl(videoId, quality) }}
          accessibilityLabel={accessibilityLabel}
          resizeMode="stretch"
          style={imageStyle}
        />
      ) : null}
    </View>
  );
}
