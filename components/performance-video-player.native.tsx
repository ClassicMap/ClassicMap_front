import YoutubePlayer from 'react-native-youtube-iframe';

interface PerformanceVideoPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
}

export function PerformanceVideoPlayer({
  videoId,
  startTime,
  endTime,
}: PerformanceVideoPlayerProps) {
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
