import * as React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface PerformanceVideoPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
}

interface InvidiousFormatStream {
  type: string;
  url: string;
  qualityLabel?: string;
  quality?: string;
}

interface InvidiousVideoResponse {
  formatStreams?: InvidiousFormatStream[];
}

const INVIDIOUS_API_BASE = process.env.EXPO_PUBLIC_INVIDIOUS_API_BASE ?? '/classicmap/invidious';

function qualityRank(stream: InvidiousFormatStream): number {
  const quality = stream.qualityLabel ?? stream.quality ?? '';
  const match = quality.match(/(\d{3,4})p/i);

  return match ? Number.parseInt(match[1], 10) : 0;
}

function selectStream(video: InvidiousVideoResponse): InvidiousFormatStream | null {
  const candidates = (video.formatStreams ?? []).filter(
    (stream) => stream.url.length > 0 && stream.type.startsWith('video/')
  );

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => qualityRank(right) - qualityRank(left))[0];
}

function toPlayableStreamUrl(streamUrl: string): string {
  if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
    return streamUrl;
  }

  return `${INVIDIOUS_API_BASE}${streamUrl}`;
}

export function PerformanceVideoPlayer({
  videoId,
  startTime,
  endTime,
}: PerformanceVideoPlayerProps) {
  const [streamUrl, setStreamUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const controller = new AbortController();

    async function loadStream() {
      setStreamUrl(null);
      setError(null);

      try {
        const response = await fetch(
          `${INVIDIOUS_API_BASE}/api/v1/videos/${encodeURIComponent(videoId)}?local=true`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`영상 정보를 불러오지 못했어. (${response.status})`);
        }

        const video = (await response.json()) as InvidiousVideoResponse;
        const stream = selectStream(video);

        if (!stream) {
          throw new Error('재생 가능한 영상 스트림이 없어.');
        }

        setStreamUrl(toPlayableStreamUrl(stream.url));
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : '영상 재생을 준비하지 못했어.');
      }
    }

    void loadStream();

    return () => controller.abort();
  }, [videoId]);

  const seekToStart = React.useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = startTime;
  }, [startTime]);

  const stopAtEnd = React.useCallback(() => {
    const video = videoRef.current;

    if (!video || endTime <= startTime || video.currentTime < endTime) {
      return;
    }

    video.pause();
    video.currentTime = startTime;
  }, [endTime, startTime]);

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

  if (!streamUrl) {
    return (
      <View className="h-full items-center justify-center bg-black">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      src={streamUrl}
      style={{ backgroundColor: '#000000', height: '100%', width: '100%' }}
      onLoadedMetadata={seekToStart}
      onTimeUpdate={stopAtEnd}
    />
  );
}
