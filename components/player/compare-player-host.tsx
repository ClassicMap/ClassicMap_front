import { NativeYoutubeClip } from '@/components/performance-video-player';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { surfaceRects, useNativeSurface } from '@/lib/player/native-surface';
import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

/** 영상이 받을 자리가 이만큼 계속 없으면 멈춘다 (화면 전환 중 한두 프레임은 기다린다) */
const HIDDEN_PAUSE_MS = 800;
const SIDE_GUTTER = 32;

/**
 * 네이티브 비교 영상. 앱 전체에 YouTube 플레이어 하나를 루트에 두고, 비교 화면 자리나 미니 플레이어 자리
 * 좌표로 옮겨 보인다. 같은 WebView를 옮기기만 해서 화면을 오가도 재생이 끊기지 않는다.
 * 플레이어는 기준 크기(화면 폭 - 여백)로 그리고 자리 폭에 맞춰 줄인다.
 * 보일 자리가 없으면 멈춘다 (영상을 숨긴 채 소리만 내지 않는다).
 * 웹 구현은 compare-player-host.web.tsx
 */
export function ComparePlayerHost() {
  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const surface = useNativeSurface();
  const { width: windowWidth } = useWindowDimensions();
  const baseWidth = Math.max(160, windowWidth - SIDE_GUTTER);
  const baseHeight = Math.round((baseWidth * 9) / 16);

  const kind = surface?.kind ?? 'none';
  React.useEffect(() => comparePlayer.reportSurface(kind), [kind]);

  React.useEffect(() => {
    if (kind !== 'none' || !playing) return;
    const timer = setTimeout(() => comparePlayer.pause(), HIDDEN_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [kind, playing]);

  const bandStyle = useAnimatedStyle(() => ({
    top: surfaceRects.bandTop.value,
    height: Math.max(0, surfaceRects.bandBottom.value - surfaceRects.bandTop.value),
  }));

  const playerStyle = useAnimatedStyle(() => {
    const which = surfaceRects.kind.value;
    const rect = which === 1 ? surfaceRects.slot.value : which === 2 ? surfaceRects.mini.value : null;
    if (!rect || rect.width <= 0) {
      return { opacity: 0, transform: [{ translateX: -10000 }, { translateY: 0 }, { scale: 1 }] };
    }
    return {
      opacity: 1,
      transform: [
        { translateX: rect.x },
        { translateY: rect.y - surfaceRects.bandTop.value },
        { scale: rect.width / baseWidth },
      ],
    };
  });

  if (!current?.videoId) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, right: 0, overflow: 'hidden', zIndex: 40 }, bandStyle]}>
      <Animated.View
        // 미니 자리에서는 누르면 미니 플레이어가 받게 한다
        pointerEvents={kind === 'slot' ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: baseWidth,
            height: baseHeight,
            transformOrigin: 'top left',
            overflow: 'hidden',
            borderRadius: (surface?.radius ?? 0) * (baseWidth / Math.max(1, windowWidth - SIDE_GUTTER)),
            backgroundColor: '#000000',
          },
          playerStyle,
        ]}>
        <NativeYoutubeClip
          key={current.performanceId}
          videoId={current.videoId}
          startTime={Math.floor(current.startMs / 1000)}
          endTime={Math.ceil(current.endMs / 1000)}
          performanceId={current.performanceId}
          height={baseHeight}
        />
      </Animated.View>
    </Animated.View>
  );
}
