import { OptimizedImage } from '@/components/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { YoutubeThumb } from '@/components/screen/youtube-thumb';
import type { ScreenThumbs } from '@/lib/types/models';
import { tmdbImageUrl } from '@/lib/utils/tmdb';
import * as React from 'react';
import { Animated, Platform, View } from 'react-native';

/** 포스터 칸은 A 판형(1:√2). 국내 극장 포스터가 이 비율이라 KMDb 포스터가 거의 그대로 들어간다 */
export const POSTER_ASPECT = Math.SQRT2;

interface ScreenPosterProps {
  title: string;
  posterPath: string | null;
  /** 실제 극장 포스터 주소(KMDb) */
  posterUrl?: string | null;
  /** 포스터가 없을 때 쓸 권리자 공식 클립. 장면 가운데를 잘라 보인다 */
  coverVideoId?: string | null;
  /** 대표 클립의 썸네일 화질(서버가 잰 값) */
  coverThumbs?: ScreenThumbs;
  width: number;
}

/**
 * 포스터 칸. 실제 포스터(TMDB → KMDb)가 먼저, 없으면 공식 클립 장면(가운데를 잘라),
 * 그것도 없으면 제목을 적은 슬레이트 카드로 대신한다
 */
export function ScreenPoster({ title, posterPath, posterUrl, coverVideoId, coverThumbs, width }: ScreenPosterProps) {
  const height = Math.round(width * POSTER_ASPECT);
  const radius = Math.max(4, Math.round(width * 0.06));
  const [posterFailed, setPosterFailed] = React.useState(false);
  const slate = <PosterSlate title={title} width={width} height={height} radius={radius} />;
  const tmdbPoster = tmdbImageUrl(posterPath, width > 160 ? 'w500' : width > 90 ? 'w342' : 'w185');
  if (tmdbPoster) {
    return (
      <OptimizedImage
        uri={tmdbPoster}
        fallbackComponent={slate}
        resizeMode="cover"
        accessibilityLabel={`${title} 포스터`}
        style={{ width, height, borderRadius: radius, overflow: 'hidden' }}
      />
    );
  }
  if (posterUrl && !posterFailed) {
    return (
      <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }} className="bg-surface-3">
        <FadeInPoster uri={posterUrl} title={title} onError={() => setPosterFailed(true)} />
      </View>
    );
  }
  if (!coverVideoId) return slate;
  // 출처는 화면 아래 문구로 적고, 칸마다 배지를 달지 않는다
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }} className="bg-surface-3">
      <YoutubeThumb
        videoId={coverVideoId}
        thumbs={coverThumbs}
        accessibilityLabel={`${title} 공식 클립 장면`}
        fallback={slate}
      />
    </View>
  );
}

/** 한 번 그려진 포스터. 다시 볼 때는 쉬머 없이 바로 보인다 */
const shownPosters = new Set<string>();

/** 받는 동안 쉬머를 깔고, 다 받으면 서서히 드러낸다 */
function FadeInPoster({ uri, title, onError }: { uri: string; title: string; onError: () => void }) {
  const seen = shownPosters.has(uri);
  const [revealed, setRevealed] = React.useState(seen);
  const opacity = React.useRef(new Animated.Value(seen ? 1 : 0)).current;
  const started = React.useRef(seen);
  const onLoad = () => {
    // 웹은 그릴 때마다 onLoad 가 다시 올 수 있어 한 번만 드러낸다
    if (started.current) return;
    started.current = true;
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      shownPosters.add(uri);
      setRevealed(true);
    });
  };
  return (
    <>
      {revealed ? null : <Skeleton className="absolute inset-0 rounded-none bg-surface-3" />}
      <Animated.Image
        source={{ uri }}
        accessibilityLabel={`${title} 포스터`}
        resizeMode="cover"
        onLoad={onLoad}
        onError={onError}
        style={{ width: '100%', height: '100%', opacity }}
      />
    </>
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
