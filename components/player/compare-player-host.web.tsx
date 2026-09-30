import { comparePlayer, type PlayerSlot, useComparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';

interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 스크롤 영역 밖으로 나간 만큼 잘라 낸다 (위·오른쪽·아래·왼쪽) */
  clip: [number, number, number, number];
  radius: number;
  fit: 'cover' | 'contain';
  controls: boolean;
  kind: 'slot' | 'mini';
}

const HIDDEN: Frame = {
  left: -10000,
  top: 0,
  width: 16,
  height: 9,
  clip: [0, 0, 0, 0],
  radius: 0,
  fit: 'cover',
  controls: false,
  kind: 'mini',
};

/**
 * 화면에 실제로 보이는 자리인가. 탭 내비게이터는 떠난 화면을 지우지 않고 aria-hidden 으로 뒤에 숨겨 두므로
 * 크기뿐 아니라 숨김 조상도 본다.
 */
function isShown(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return false;
  for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true') return false;
  }
  return true;
}

/** 넘치는 부분을 자르는 조상들 (스크롤 영역). 이 사각형들과 겹치는 부분만 보인다 */
function clippingAncestors(element: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  let node = element.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') found.push(node);
    node = node.parentElement;
  }
  return found;
}

function frameFor(element: HTMLElement, ancestors: HTMLElement[], base: Omit<Frame, 'left' | 'top' | 'width' | 'height' | 'clip'>): Frame {
  const rect = element.getBoundingClientRect();
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  let left = rect.left;
  for (const ancestor of ancestors) {
    const box = ancestor.getBoundingClientRect();
    top = Math.max(top, box.top);
    right = Math.min(right, box.right);
    bottom = Math.min(bottom, box.bottom);
    left = Math.max(left, box.left);
  }
  const clip: [number, number, number, number] = [
    Math.max(0, top - rect.top),
    Math.max(0, rect.right - right),
    Math.max(0, rect.bottom - bottom),
    Math.max(0, left - rect.left),
  ];
  return { ...base, left: rect.left, top: rect.top, width: rect.width, height: rect.height, clip };
}

function sameFrame(a: Frame, b: Frame): boolean {
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.radius === b.radius &&
    a.fit === b.fit &&
    a.controls === b.controls &&
    a.kind === b.kind &&
    a.clip.every((value, index) => value === b.clip[index])
  );
}

/**
 * 웹 비교 영상은 앱 전체에 <video> 하나다. 라우트 밖(루트)에 두고, 비교 화면이 낸 자리(슬롯)나
 * 미니 플레이어의 작은 자리 위에 화면 좌표로 겹쳐 띄운다. 요소를 옮겨 붙이지 않으니 화면을
 * 오가도 재생이 끊기지 않는다.
 */
export function ComparePlayerHost() {
  const current = useComparePlayer((state) => state.current);
  const focus = useComparePlayer((state) => state.focus);
  const fullscreen = useComparePlayer((state) => state.fullscreen);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = React.useState<Frame>(HIDDEN);
  const [failed, setFailed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const performanceId = current?.performanceId ?? null;
  const clipUrl = current?.clipUrl ?? null;

  // 주소를 바꾸면 브라우저가 새 영상을 싣기 전에 0초 위치를 먼저 알린다. 그대로 적으면 새 연주의
  // 기억해 둔 위치가 0으로 덮이므로, 메타데이터를 받아 위치를 잡은 뒤부터만 위치를 적는다
  const readyFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    setFailed(false);
    readyFor.current = null;
  }, [clipUrl, reloadKey]);

  // 전체 화면·겹칠 자리를 화면들에 빌려준다
  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    const overlay = overlayRef.current;
    if (!wrapper || !overlay) return;
    const unregister = comparePlayer.registerHost({
      overlay,
      requestFullscreen: () => wrapper.requestFullscreen(),
    });
    const onChange = () => comparePlayer.reportFullscreen(document.fullscreenElement === wrapper);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      unregister();
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, []);

  // 미디어 손잡이: 지금 트랙이 바뀔 때마다 새로 건다 (요소는 그대로)
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || performanceId === null) return;
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
  }, [performanceId, reloadKey]);

  // 집중 비교가 열리면 쉰다
  React.useEffect(() => {
    if (focus) videoRef.current?.pause();
  }, [focus]);

  // 자리 추적: 보이는 슬롯 → 미니 자리 → 숨김. 스크롤·크기 변화를 매 프레임 따라간다
  React.useEffect(() => {
    let raf = 0;
    let lastFrame = HIDDEN;
    let ancestorsFor: HTMLElement | null = null;
    let ancestors: HTMLElement[] = [];

    const pickSlot = (): PlayerSlot | null => {
      if (performanceId === null) return null;
      for (const slot of comparePlayer.getSlots()) {
        if (slot.performanceId === performanceId && isShown(slot.element)) return slot;
      }
      return null;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      // 전체 화면이면 영상이 온전히 보이는 상태라 화면들이 조작부를 겹칠 수 있게 'slot'으로 둔다
      if (document.fullscreenElement && document.fullscreenElement === wrapperRef.current) {
        comparePlayer.reportSurface('slot');
        return;
      }
      let next = HIDDEN;
      let surface: 'slot' | 'mini' | 'none' = 'none';
      const slot = comparePlayer.getState().focus ? null : pickSlot();
      if (slot) {
        if (ancestorsFor !== slot.element) {
          ancestorsFor = slot.element;
          ancestors = clippingAncestors(slot.element);
        }
        next = frameFor(slot.element, ancestors, {
          radius: slot.radius,
          fit: slot.fit,
          controls: slot.controls,
          kind: 'slot',
        });
        surface = 'slot';
      } else {
        const mini = comparePlayer.getMiniTarget();
        if (mini && performanceId !== null && isShown(mini)) {
          if (ancestorsFor !== mini) {
            ancestorsFor = mini;
            ancestors = clippingAncestors(mini);
          }
          next = frameFor(mini, ancestors, { radius: 6, fit: 'cover', controls: false, kind: 'mini' });
          surface = 'mini';
        }
      }
      comparePlayer.reportSurface(surface);
      if (!sameFrame(next, lastFrame)) {
        lastFrame = next;
        setFrame(next);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [performanceId]);

  const [clipTop, clipRight, clipBottom, clipLeft] = frame.clip;
  const clipped = clipTop + clipRight + clipBottom + clipLeft > 0;
  const hidden = performanceId === null || frame === HIDDEN || Boolean(focus);

  return (
    <div
      ref={wrapperRef}
      aria-hidden={hidden}
      style={
        fullscreen
          ? { position: 'fixed', inset: 0, background: '#000', zIndex: 40 }
          : {
              position: 'fixed',
              left: frame.left,
              top: frame.top,
              width: frame.width,
              height: frame.height,
              borderRadius: frame.radius,
              overflow: 'hidden',
              background: '#000',
              // 미니 플레이어는 화면 위에 떠 있는 카드라 영상이 그보다 위에 와야 보인다
              zIndex: frame.kind === 'mini' ? 35 : 20,
              visibility: hidden ? 'hidden' : 'visible',
              pointerEvents: frame.controls ? 'auto' : 'none',
              clipPath: clipped
                ? `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`
                : undefined,
            }
      }>
      {clipUrl ? (
        <video
          key={reloadKey}
          ref={videoRef}
          src={clipUrl}
          playsInline
          controls={frame.controls && !fullscreen}
          preload={comparePlayer.getState().restored ? 'metadata' : 'auto'}
          style={{ width: '100%', height: '100%', objectFit: fullscreen ? 'contain' : frame.fit, display: 'block', background: '#000' }}
          onLoadedMetadata={(event) => {
            if (performanceId === null) return;
            const video = event.currentTarget;
            video.volume = comparePlayer.getState().volume;
            video.muted = comparePlayer.getState().muted;
            const resume = comparePlayer.positionFor(performanceId);
            if (resume > 0 && resume < video.duration) video.currentTime = resume;
            readyFor.current = performanceId;
            comparePlayer.reportProgress(performanceId, video.currentTime, video.duration);
            if (comparePlayer.consumePlayIntent(performanceId)) {
              void video.play().catch(() => comparePlayer.reportPlaying(performanceId, false));
            }
          }}
          onPlay={() => performanceId !== null && comparePlayer.reportPlaying(performanceId, true)}
          onPause={() => performanceId !== null && comparePlayer.reportPlaying(performanceId, false)}
          onEnded={() => performanceId !== null && comparePlayer.reportEnded(performanceId)}
          onTimeUpdate={(event) =>
            performanceId !== null &&
            readyFor.current === performanceId &&
            comparePlayer.reportProgress(performanceId, event.currentTarget.currentTime, event.currentTarget.duration || 0)
          }
          onVolumeChange={(event) => comparePlayer.syncVolume(event.currentTarget.volume, event.currentTarget.muted)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed && frame.kind === 'slot' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14,
            pointerEvents: 'auto',
          }}>
          <span>영상 구간을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.</span>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setReloadKey((key) => key + 1);
            }}
            style={{
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 999,
              padding: '6px 16px',
              background: 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            다시 시도
          </button>
        </div>
      ) : null}
      {/* 화면들이 영상 위에 겹치는 조작부(전체 화면 버튼·전체 화면 조작부)를 여기에 그린다 */}
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
