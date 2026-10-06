import type { ScreenClipPlayerProps } from '@/components/screen/screen-clip-player';
import * as React from 'react';
import { View } from 'react-native';

/**
 * 웹은 YouTube 임베드(쿠키 없는 주소)를 그대로 띄운다. 누른 뒤에 띄우므로 바로 재생된다.
 * 퍼가기가 막힌 영상은 YouTube 가 플레이어 안에 'YouTube에서 보기'를 보여 준다
 */
export function ScreenClipPlayer({ videoId, startSec, title }: ScreenClipPlayerProps) {
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', start: String(Math.max(0, Math.floor(startSec))) });
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9 }} className="overflow-hidden rounded-md bg-black">
      {React.createElement('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`,
        title,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: { width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}
