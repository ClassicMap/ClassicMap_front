import { type YoutubeClipHandle, YoutubeClipPlayer } from '@/components/player/youtube-clip-player';
import * as React from 'react';
import { View } from 'react-native';

export interface ScreenClipPlayerProps {
  videoId: string;
  startSec: number;
  title: string;
  /** 퍼가기가 막혔거나 연령 제한 등으로 앱 안에서 못 틀 때 */
  onError: () => void;
}

/** 공식 클립을 그 자리(16:9)에서 튼다. 앱은 비교 화면과 같은 YouTube 플레이어를 쓴다 */
export function ScreenClipPlayer({ videoId, startSec, onError }: ScreenClipPlayerProps) {
  const [width, setWidth] = React.useState(0);
  const player = React.useRef<YoutubeClipHandle>(null);
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: '100%', aspectRatio: 16 / 9 }}
      className="overflow-hidden rounded-md bg-black">
      {width > 0 ? (
        <YoutubeClipPlayer
          ref={player}
          videoId={videoId}
          start={startSec}
          height={Math.round((width * 9) / 16)}
          onReady={() => player.current?.play()}
          onError={() => onError()}
        />
      ) : null}
    </View>
  );
}
