import * as React from 'react';
import { Linking, Platform, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

/** YouTube 임베드가 요청 출처(referrer)로 쓸 주소. 없으면 일부 영상이 재생 오류(153)를 낸다 */
const EMBED_ORIGIN = 'https://kang1027.com';
/** 안드로이드 WebView의 YouTube는 모바일 UA면 코드로 튼 재생을 막는다 */
const ANDROID_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** YouTube IFrame API 상태 값 */
export const YT_STATE = { ended: 0, playing: 1, paused: 2, buffering: 3, cued: 5 } as const;

export interface YoutubeClipHandle {
  play: () => void;
  pause: () => void;
  /** 영상 전체 기준 초 */
  seekTo: (seconds: number) => void;
  setVolume: (volume: number, muted: boolean) => void;
}

interface YoutubeClipPlayerProps {
  videoId: string;
  /** 처음 틀 위치(영상 전체 기준 초) */
  start: number;
  /** 구간 끝(영상 전체 기준 초). 여기서 멈춘다. 없으면 영상 끝까지 */
  end?: number;
  height: number;
  onReady?: () => void;
  onState?: (state: number) => void;
  /** 재생 중 0.5초마다 (영상 전체 기준 초) */
  onTime?: (seconds: number) => void;
  onError?: (code: number) => void;
}

function playerHtml(videoId: string, start: number, end: number | undefined): string {
  const vars = JSON.stringify({
    start: Math.max(0, Math.floor(start)),
    ...(end !== undefined && end > start ? { end: Math.ceil(end) } : {}),
    playsinline: 1,
    controls: 1,
    rel: 0,
    modestbranding: 1,
    enablejsapi: 1,
    origin: EMBED_ORIGIN,
  });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;top:0;left:0;width:100%;height:100%}</style>
</head><body><div id="p"></div><script>
var player; var ready = false;
function send(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
var tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag);
function onYouTubeIframeAPIReady(){
  player = new YT.Player('p', { width: '100%', height: '100%', videoId: ${JSON.stringify(videoId)}, playerVars: ${vars},
    events: {
      onReady: function(){ ready = true; send({ type: 'ready' }); },
      onStateChange: function(e){ send({ type: 'state', state: e.data }); },
      onError: function(e){ send({ type: 'error', code: e.data }); }
    } });
  setInterval(function(){
    if (ready && player.getPlayerState && player.getPlayerState() === 1) send({ type: 'time', time: player.getCurrentTime() });
  }, 500);
}
</script></body></html>`;
}

interface PlayerMessage {
  type: 'ready' | 'state' | 'time' | 'error';
  state?: number;
  time?: number;
  code?: number;
}

function parseMessage(raw: string): PlayerMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const message = value as PlayerMessage;
    return ['ready', 'state', 'time', 'error'].includes(message.type) ? message : null;
  } catch {
    return null;
  }
}

/**
 * 네이티브 YouTube 구간 플레이어. react-native-webview 위에 IFrame API를 직접 올린다.
 * 명령은 스크립트 주입으로 보내고(라이브러리의 postMessage 명령은 iOS·안드로이드에서 전달되지 않았다),
 * 상태·위치는 페이지가 알려 준다. 준비 전에 받은 명령은 준비되면 한꺼번에 적용한다.
 */
export const YoutubeClipPlayer = React.forwardRef<YoutubeClipHandle, YoutubeClipPlayerProps>(function YoutubeClipPlayer(
  { videoId, start, end, height, onReady, onState, onTime, onError },
  ref
) {
  const webView = React.useRef<WebView>(null);
  const ready = React.useRef(false);
  // 준비 전에 받은 명령. 준비되면 이 순서로 적용한다
  const pending = React.useRef<{ sound?: string; seek?: string; play?: boolean }>({});
  // 처음 만들 때만 정한다. 바꾸면 페이지를 새로 싣는다
  const [html] = React.useState(() => playerHtml(videoId, start, end));

  const run = React.useCallback((script: string) => {
    webView.current?.injectJavaScript(`try { ${script} } catch (e) {} true;`);
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (ready.current) run('player.playVideo();');
        else pending.current.play = true;
      },
      pause: () => {
        if (ready.current) run('player.pauseVideo();');
        else pending.current.play = false;
      },
      seekTo: (seconds: number) => {
        const script = `player.seekTo(${Number(seconds.toFixed(2))}, true);`;
        if (ready.current) run(script);
        else pending.current.seek = script;
      },
      setVolume: (volume: number, muted: boolean) => {
        const script = `player.setVolume(${Math.round(volume * 100)}); ${muted ? 'player.mute();' : 'player.unMute();'}`;
        if (ready.current) run(script);
        else pending.current.sound = script;
      },
    }),
    [run]
  );

  const onMessage = (event: WebViewMessageEvent) => {
    const message = parseMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'ready') {
      ready.current = true;
      const { sound, seek, play } = pending.current;
      pending.current = {};
      if (sound) run(sound);
      if (seek) run(seek);
      if (play) run('player.playVideo();');
      onReady?.();
    } else if (message.type === 'state' && typeof message.state === 'number') {
      onState?.(message.state);
    } else if (message.type === 'time' && typeof message.time === 'number') {
      onTime?.(message.time);
    } else if (message.type === 'error' && typeof message.code === 'number') {
      onError?.(message.code);
    }
  };

  // 영상 안의 링크(YouTube로 보기 등)는 앱 밖에서 연다
  const onShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    if (request.isTopFrame === false) return true;
    if (request.url.startsWith(EMBED_ORIGIN) || request.url.startsWith('about:')) return true;
    void Linking.openURL(request.url).catch(() => undefined);
    return false;
  };

  return (
    <View style={{ height, backgroundColor: '#000000' }}>
      <WebView
        ref={webView}
        source={{ html, baseUrl: EMBED_ORIGIN }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        bounces={false}
        scrollEnabled={false}
        androidLayerType="hardware"
        userAgent={Platform.OS === 'android' ? ANDROID_DESKTOP_UA : undefined}
        style={{ backgroundColor: '#000000' }}
      />
    </View>
  );
});
