import { comparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { type YoutubeClipHandle, YoutubeClipPlayer, YT_STATE } from '@/components/player/youtube-clip-player';

interface PerformanceVideoPlayerProps {
  videoId?: string;
  startTime?: number;
  endTime?: number;
  clipUrl?: string;
  /**
   * 비교 재생 스토어에 붙일 연주. 주면 연주별로 듣던 위치에서 시작하고, 재생 상태·위치·볼륨을
   * 스토어와 주고받는다. 없으면 예전처럼 혼자 도는 플레이어다.
   */
  performanceId?: number;
}

const VIDEO_CLIP_BASE = process.env.EXPO_PUBLIC_VIDEO_CLIP_BASE ?? '/classicmap/clips';

function createClipUrl(videoId: string, startTime: number, endTime: number): string {
  const params = new URLSearchParams({
    end: String(endTime),
    start: String(startTime),
  });

  return `${VIDEO_CLIP_BASE}/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function PerformanceVideoPlayer({
  videoId,
  startTime,
  endTime,
  clipUrl: preparedClipUrl,
  performanceId,
}: PerformanceVideoPlayerProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = React.useState(0);
  const clipUrl = React.useMemo(() => {
    if (preparedClipUrl) {
      return preparedClipUrl;
    }
    if (videoId && startTime !== undefined && endTime !== undefined) {
      return createClipUrl(videoId, startTime, endTime);
    }
    return null;
  }, [endTime, preparedClipUrl, startTime, videoId]);

  React.useEffect(() => {
    setError(null);
    setRetryAttempt(0);
  }, [clipUrl]);

  const retry = React.useCallback(() => {
    setError(null);
    setRetryAttempt((attempt) => attempt + 1);
  }, []);

  if (Platform.OS !== 'web') {
    if (videoId && startTime !== undefined && endTime !== undefined) {
      return (
        <NativeYoutubeClip videoId={videoId} startTime={startTime} endTime={endTime} performanceId={performanceId} />
      );
    }

    return (
      <View className="h-full items-center justify-center bg-black px-4">
        <Text className="text-center text-sm text-white/80">
          이 영상은 현재 웹에서 재생할 수 있어요.
        </Text>
      </View>
    );
  }

  if (!clipUrl) {
    return (
      <View className="h-full items-center justify-center bg-black px-4">
        <Text className="text-center text-sm text-white/80">
          재생할 영상 주소가 없어요.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="h-full items-center justify-center gap-3 bg-black px-4">
        <Text className="text-center text-sm text-white/80">{error}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          className="rounded-full border border-white/40 px-4 py-2"
          onPress={retry}>
          <Text className="text-sm font-semibold text-white">다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebClip
      key={retryAttempt}
      clipUrl={clipUrl}
      performanceId={performanceId}
      onError={() => setError('영상 구간을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.')}
    />
  );
}

/** 웹: 잘라 둔 클립. 기본 컨트롤(전체 화면 포함)을 그대로 쓴다 */
function WebClip({
  clipUrl,
  performanceId,
  onError,
}: {
  clipUrl: string;
  performanceId?: number;
  onError: () => void;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video || performanceId === undefined) return;
    const id = performanceId;
    return comparePlayer.registerMedia({
      performanceId: id,
      play: () => {
        void video.play().catch(() => comparePlayer.reportPlaying(id, false));
      },
      pause: () => video.pause(),
      seek: (seconds) => {
        video.currentTime = seconds;
      },
      applyVolume: (volume, muted) => {
        video.volume = volume;
        video.muted = muted;
      },
    });
  }, [performanceId]);

  const linked = performanceId !== undefined;
  return (
    <video
      ref={ref}
      controls
      playsInline
      preload="metadata"
      src={clipUrl}
      style={{ backgroundColor: '#000000', height: '100%', width: '100%' }}
      onError={onError}
      onLoadedMetadata={
        linked
          ? (event) => {
              const video = event.currentTarget;
              const resume = comparePlayer.positionFor(performanceId);
              if (resume > 0 && resume < video.duration) video.currentTime = resume;
              comparePlayer.reportProgress(performanceId, video.currentTime, video.duration);
              if (comparePlayer.consumePlayIntent(performanceId)) {
                void video.play().catch(() => comparePlayer.reportPlaying(performanceId, false));
              }
            }
          : undefined
      }
      onPlay={linked ? () => comparePlayer.reportPlaying(performanceId, true) : undefined}
      onPause={linked ? () => comparePlayer.reportPlaying(performanceId, false) : undefined}
      onEnded={linked ? () => comparePlayer.reportEnded(performanceId) : undefined}
      onTimeUpdate={
        linked
          ? (event) =>
              comparePlayer.reportProgress(
                performanceId,
                event.currentTarget.currentTime,
                event.currentTarget.duration || 0
              )
          : undefined
      }
      onVolumeChange={
        linked ? (event) => comparePlayer.syncVolume(event.currentTarget.volume, event.currentTarget.muted) : undefined
      }
    />
  );
}

/**
 * 네이티브: YouTube 원본의 그 구간. 스토어에 붙으면 듣던 위치(구간 안 초)에서 시작하고,
 * 재생 상태·위치를 스토어에 알린다. 구간 끝에서 멈춘다.
 */
export function NativeYoutubeClip({
  videoId,
  startTime,
  endTime,
  performanceId,
  height = 196,
}: {
  videoId: string;
  startTime: number;
  endTime: number;
  performanceId?: number;
  /** 플레이어 높이. 루트 호스트는 기준 크기로 그리고 자리에 맞춰 줄여 보인다 */
  height?: number;
}) {
  const player = React.useRef<YoutubeClipHandle>(null);
  const duration = Math.max(0, endTime - startTime);
  // 처음 붙을 때만 정한다. 바꾸면 플레이어가 다시 만들어진다
  const [initialStart] = React.useState(() =>
    performanceId !== undefined ? startTime + comparePlayer.positionFor(performanceId) : startTime
  );

  React.useEffect(() => {
    if (performanceId === undefined) return;
    return comparePlayer.registerMedia({
      performanceId,
      play: () => player.current?.play(),
      pause: () => player.current?.pause(),
      seek: (seconds) => player.current?.seekTo(startTime + seconds),
      applyVolume: (volume, muted) => player.current?.setVolume(volume, muted),
    });
  }, [performanceId, startTime]);

  return (
    <YoutubeClipPlayer
      ref={player}
      videoId={videoId}
      start={initialStart}
      end={endTime}
      height={height}
      onReady={() => {
        if (performanceId === undefined) return;
        const { volume, muted } = comparePlayer.getState();
        player.current?.setVolume(volume, muted);
        // 시작 전 YouTube는 seekTo를 받으면 재생해 버린다. 틀 때만 초 단위 아래까지 맞춘다
        if (comparePlayer.consumePlayIntent(performanceId)) {
          player.current?.seekTo(initialStart);
          player.current?.play();
        }
      }}
      onState={(state) => {
        if (performanceId === undefined) return;
        if (state === YT_STATE.playing) comparePlayer.reportPlaying(performanceId, true);
        else if (state === YT_STATE.paused) comparePlayer.reportPlaying(performanceId, false);
        else if (state === YT_STATE.ended) {
          // 끝나면 구간 처음으로 되돌려 둔다 (다음 재생이 영상 맨 앞에서 시작하지 않게)
          player.current?.seekTo(startTime);
          player.current?.pause();
          comparePlayer.reportEnded(performanceId);
        }
      }}
      onTime={(seconds) => {
        if (performanceId === undefined) return;
        // 구간을 벗어나면 끝난 것으로 본다. YouTube는 end에 닿으면 영상 맨 앞으로 돌아가 이어서 트는 때가 있다
        if (seconds >= endTime - 0.25 || seconds < startTime - 1) {
          // 옮긴 뒤 멈춘다. 재생 중에 옮기면 계속 재생되니 멈춤이 마지막이어야 한다
          player.current?.seekTo(startTime);
          player.current?.pause();
          comparePlayer.reportEnded(performanceId);
          return;
        }
        comparePlayer.reportProgress(performanceId, Math.max(0, seconds - startTime), duration);
      }}
    />
  );
}
