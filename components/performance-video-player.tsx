import * as React from 'react';
import { Platform, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface PerformanceVideoPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
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
}: PerformanceVideoPlayerProps) {
  const [error, setError] = React.useState<string | null>(null);
  const clipUrl = React.useMemo(
    () => createClipUrl(videoId, startTime, endTime),
    [endTime, startTime, videoId]
  );

  if (Platform.OS !== 'web') {
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

  if (error) {
    return (
      <View className="h-full items-center justify-center bg-black px-4">
        <Text className="text-center text-sm text-white/80">{error}</Text>
      </View>
    );
  }

  return (
    <video
      controls
      playsInline
      preload="metadata"
      src={clipUrl}
      style={{ backgroundColor: '#000000', height: '100%', width: '100%' }}
      onError={() => setError('영상 구간을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.')}
    />
  );
}
