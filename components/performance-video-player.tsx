import * as React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface PerformanceVideoPlayerProps {
  videoId?: string;
  startTime?: number;
  endTime?: number;
  clipUrl?: string;
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
        <YoutubePlayer
          videoId={videoId}
          height={196}
          play={false}
          initialPlayerParams={{
            start: startTime,
            end: endTime,
            controls: true,
            modestbranding: true,
            rel: false,
          }}
          webViewProps={{
            androidLayerType: 'hardware',
            allowsInlineMediaPlayback: true,
          }}
        />
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
    <video
      key={retryAttempt}
      controls
      playsInline
      preload="metadata"
      src={clipUrl}
      style={{ backgroundColor: '#000000', height: '100%', width: '100%' }}
      onError={() => setError('영상 구간을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.')}
    />
  );
}
