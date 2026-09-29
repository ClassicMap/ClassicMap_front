import { comparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from 'react-native-youtube-iframe';

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
/** 네이티브 YouTube는 위치 이벤트가 없어 이 간격으로 묻는다 */
const NATIVE_POLL_MS = 1000;

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
 * 위치를 초마다 물어 적어 둔다.
 */
function NativeYoutubeClip({
  videoId,
  startTime,
  endTime,
  performanceId,
}: {
  videoId: string;
  startTime: number;
  endTime: number;
  performanceId?: number;
}) {
  const ref = React.useRef<YoutubeIframeRef | null>(null);
  const [play, setPlay] = React.useState(false);
  const [sound, setSound] = React.useState(() => {
    const { volume, muted } = comparePlayer.getState();
    return { volume, muted };
  });
  const linked = performanceId !== undefined;
  // 처음 붙을 때만 정한다. 바꾸면 플레이어가 다시 만들어진다
  const [initialStart] = React.useState(() =>
    linked ? startTime + Math.floor(comparePlayer.positionFor(performanceId)) : startTime
  );
  const duration = Math.max(0, endTime - startTime);

  React.useEffect(() => {
    if (performanceId === undefined) return;
    return comparePlayer.registerMedia({
      performanceId,
      play: () => setPlay(true),
      pause: () => setPlay(false),
      seek: (seconds) => ref.current?.seekTo(startTime + seconds, true),
      applyVolume: (volume, muted) => setSound({ volume, muted }),
    });
  }, [performanceId, startTime]);

  React.useEffect(() => {
    if (performanceId === undefined || !play) return;
    const timer = setInterval(() => {
      void ref.current
        ?.getCurrentTime()
        .then((time) => comparePlayer.reportProgress(performanceId, Math.max(0, time - startTime), duration))
        .catch(() => undefined);
    }, NATIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [performanceId, play, startTime, duration]);

  return (
    <YoutubePlayer
      ref={ref}
      videoId={videoId}
      height={196}
      play={play}
      volume={linked ? Math.round(sound.volume * 100) : undefined}
      mute={linked ? sound.muted : undefined}
      initialPlayerParams={{
        start: initialStart,
        end: endTime,
        controls: true,
        modestbranding: true,
        rel: false,
      }}
      onReady={() => {
        if (performanceId !== undefined && comparePlayer.consumePlayIntent(performanceId)) setPlay(true);
      }}
      onChangeState={(event: PLAYER_STATES) => {
        if (event === PLAYER_STATES.PLAYING) setPlay(true);
        else if (event === PLAYER_STATES.PAUSED) setPlay(false);
        if (performanceId === undefined) return;
        if (event === PLAYER_STATES.PLAYING) comparePlayer.reportPlaying(performanceId, true);
        else if (event === PLAYER_STATES.PAUSED) comparePlayer.reportPlaying(performanceId, false);
        else if (event === PLAYER_STATES.ENDED) {
          setPlay(false);
          comparePlayer.reportEnded(performanceId);
        }
      }}
      webViewProps={{
        androidLayerType: 'hardware',
        allowsInlineMediaPlayback: true,
      }}
    />
  );
}
