import { Skeleton } from '@/components/ui/skeleton';
import * as React from 'react';
import { Animated, Image, type LayoutChangeEvent, PixelRatio, Platform, View } from 'react-native';

/**
 * YouTube 썸네일 화질. 값은 그림 안 16:9 장면의 높이(px)다.
 * sd·hq 는 4:3 그림 위아래에 검은 띠가 있고, mq·maxres 는 16:9 그대로다.
 */
const SCENE_HEIGHT = {
  mqdefault: 180,
  hqdefault: 270,
  sddefault: 360,
  maxresdefault: 720,
} as const;
type Quality = keyof typeof SCENE_HEIGHT;
const LADDER: readonly Quality[] = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];
/** 화면 밀도가 높아도 1.5배까지만 맞춘다. 2배로 맞추면 포스터 자리마다 maxres(최대 190KB)를 받는다 */
const MAX_DENSITY = 1.5;
/** YouTube 대체 그림(120×90)보다 크면 진짜 썸네일로 본다 */
const PLACEHOLDER_MAX_WIDTH = 160;
/** 한꺼번에 재는 영상 수. 목록 위쪽(먼저 그려진 칸)이 먼저 뜬다 */
const MAX_PROBES = 6;

interface Pick {
  uri: string;
  quality: Quality;
}

const webpUrl = (videoId: string, quality: Quality) => `https://i.ytimg.com/vi_webp/${videoId}/${quality}.webp`;
const jpgUrl = (videoId: string, quality: Quality) => `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;

/** 상자를 덮는 데 필요한 가장 낮은 화질 */
function targetQuality(width: number, height: number): Quality {
  const need = Math.max(height, (width * 9) / 16) * Math.min(PixelRatio.get(), MAX_DENSITY);
  return [...LADDER].reverse().find((quality) => SCENE_HEIGHT[quality] >= need) ?? 'maxresdefault';
}

function measure(uri: string): Promise<number> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width) => resolve(width),
      () => resolve(0)
    );
  });
}

let activeProbes = 0;
const waitingProbes: (() => void)[] = [];

async function withProbeSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeProbes < MAX_PROBES) activeProbes += 1;
  else await new Promise<void>((resolve) => waitingProbes.push(resolve));
  try {
    return await task();
  } finally {
    // 기다리는 칸에 자리를 그대로 넘긴다
    const next = waitingProbes.shift();
    if (next) next();
    else activeProbes -= 1;
  }
}

/** 영상·화질마다 고른 그림. 목록을 오가도 다시 재지 않는다 */
const pending = new Map<string, Promise<Pick | null>>();
const settled = new Map<string, Pick | null>();
/** 한 번 그려진 주소. 다시 볼 때는 쉬머 없이 바로 보인다 */
const shown = new Set<string>();

/**
 * 목표 화질부터 낮은 쪽으로, 화질마다 webp → jpg 순으로 잰다.
 * webp 가 없는 영상이 있고(10편 중 2편꼴), maxres·sd 가 없는 영상도 있다.
 * 없는 화질은 YouTube 가 404 와 함께 120×90 회색 그림을 주는데 브라우저는 그걸 정상으로 그려서, 크기로 가린다.
 */
function pickThumb(videoId: string, target: Quality): Promise<Pick | null> {
  const key = `${videoId}:${target}`;
  const known = pending.get(key);
  if (known) return known;
  const task = withProbeSlot(async () => {
    for (const quality of LADDER.slice(LADDER.indexOf(target))) {
      for (const uri of [webpUrl(videoId, quality), jpgUrl(videoId, quality)]) {
        if ((await measure(uri)) > PLACEHOLDER_MAX_WIDTH) return { uri, quality };
      }
    }
    return null;
  }).then((pick) => {
    settled.set(key, pick);
    return pick;
  });
  pending.set(key, task);
  return task;
}

/** 이미 받아 둔 다른 화질. 큰 그림을 받는 동안 흐린 미리보기로 깐다 */
function settledPreview(videoId: string, except: Quality): Pick | null {
  for (const quality of LADDER) {
    if (quality === except) continue;
    const pick = settled.get(`${videoId}:${quality}`);
    if (pick && shown.has(pick.uri)) return pick;
  }
  return null;
}

/** maxres·mq 는 16:9 그대로 덮고, sd·hq 는 4:3 안 위아래 검은 띠(각 12.5%)가 밖으로 나가게 키워 가운데에 둔다 */
function coverStyle(box: { width: number; height: number }, quality: Quality) {
  const letterboxed = quality === 'sddefault' || quality === 'hqdefault';
  const contentRatio = letterboxed ? 0.75 : 1;
  const imageAspect = letterboxed ? 4 / 3 : 16 / 9;
  const height = Math.max(box.height / contentRatio, box.width / imageAspect);
  const width = height * imageAspect;
  return {
    position: 'absolute' as const,
    width,
    height,
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
  };
}

interface YoutubeThumbProps {
  videoId: string;
  accessibilityLabel?: string;
  /** 쓸 만한 썸네일이 없을 때 대신 그릴 것 */
  fallback?: React.ReactNode;
}

/**
 * 권리자 공식 클립의 썸네일로 부모 상자를 채운다(부모가 크기를 정한다).
 * 상자 크기에 맞는 화질만 받고, 받는 동안 쉬머를 보이다가 그림이 오면 서서히 드러낸다.
 */
export function YoutubeThumb({ videoId, accessibilityLabel, fallback }: YoutubeThumbProps) {
  const [box, setBox] = React.useState<{ width: number; height: number } | null>(null);
  const target = box ? targetQuality(box.width, box.height) : null;
  const key = target ? `${videoId}:${target}` : null;
  // 고른 그림을 어느 영상·화질 것인지와 같이 둔다. 영상이 바뀐 첫 그림에 앞 영상 그림이 남지 않게
  const [picked, setPicked] = React.useState<{ key: string; pick: Pick | null } | null>(null);

  React.useEffect(() => {
    if (!target || !key || settled.has(key)) return;
    let alive = true;
    void pickThumb(videoId, target).then((pick) => {
      if (alive) setPicked({ key, pick });
    });
    return () => {
      alive = false;
    };
  }, [videoId, target, key]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== box?.width || height !== box?.height)) setBox({ width, height });
  };

  const [revealed, setRevealed] = React.useState<string | null>(null);
  const current = !key ? undefined : picked?.key === key ? picked.pick : settled.get(key);
  if (current === null) return <View className="flex-1">{fallback ?? null}</View>;
  // 그림이 다 드러나기 전까지 아래에 쉬머(이미 받아 둔 낮은 화질이 있으면 그 그림)를 깐다
  const covered = Boolean(current && (revealed === current.uri || shown.has(current.uri)));
  const preview = target && !covered ? settledPreview(videoId, target) : null;

  return (
    <View className="flex-1 overflow-hidden" onLayout={onLayout}>
      {covered ? null : box && preview ? (
        <Image source={{ uri: preview.uri }} resizeMode="stretch" style={coverStyle(box, preview.quality)} />
      ) : (
        <Skeleton className="absolute inset-0 rounded-none bg-surface-3" />
      )}
      {box && current ? (
        <FadeInImage
          key={current.uri}
          pick={current}
          box={box}
          accessibilityLabel={accessibilityLabel}
          onRevealed={() => setRevealed(current.uri)}
        />
      ) : null}
    </View>
  );
}

function FadeInImage({
  pick,
  box,
  accessibilityLabel,
  onRevealed,
}: {
  pick: Pick;
  box: { width: number; height: number };
  accessibilityLabel?: string;
  onRevealed: () => void;
}) {
  const opacity = React.useRef(new Animated.Value(shown.has(pick.uri) ? 1 : 0)).current;
  const started = React.useRef(shown.has(pick.uri));
  const onLoad = () => {
    // 웹은 그릴 때마다 onLoad 가 다시 올 수 있어 한 번만 드러낸다
    if (started.current) return;
    started.current = true;
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      shown.add(pick.uri);
      onRevealed();
    });
  };
  return (
    <Animated.Image
      source={{ uri: pick.uri }}
      accessibilityLabel={accessibilityLabel}
      resizeMode="stretch"
      onLoad={onLoad}
      style={[coverStyle(box, pick.quality), { opacity }]}
    />
  );
}
