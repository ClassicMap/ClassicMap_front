import { LAYER } from '@/lib/design/layers';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import * as React from 'react';
import { createPortal } from 'react-dom';

/** 영상이 지금 들어가 있는 자리의 모양 */
interface Placement {
  kind: 'slot' | 'mini' | 'parked';
  fit: 'cover' | 'contain';
  radius: number;
  controls: boolean;
}

const PARKED: Placement = { kind: 'parked', fit: 'cover', radius: 0, controls: false };

/**
 * 전체 화면 자리. 연주자 카드의 자리를 그대로 전체 화면으로 띄우면, 연주자를 바꿀 때 그 카드 자리가 빠지면서
 * 브라우저가 전체 화면을 풀었다. 그래서 루트에 늘 붙어 있는 이 자리로 영상을 옮긴 뒤 이 자리를 전체 화면으로 띄운다.
 * 옮기는 즉시 화면에 맞춰(contain) 그리고, 전체 화면이 되면 서서히 나타나게 한다.
 */
const FULLSCREEN_ROOT_CSS = `
[data-cm-fsroot] { position: fixed; left: -10000px; top: 0; width: 16px; height: 9px; overflow: hidden; background: #000; }
[data-cm-fsroot] video { object-fit: contain !important; }
[data-cm-fsroot]:fullscreen > div { animation: cm-fs-in 320ms ease-out both; }
[data-cm-fsroot][data-idle] { cursor: none; }
[data-cm-fsroot][data-pseudo] { left: 0; top: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: ${LAYER.fullscreen}; }
[data-cm-fsroot][data-pseudo] > div { animation: cm-fs-in 320ms ease-out both; }
@keyframes cm-fs-in { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { [data-cm-fsroot]:fullscreen > div, [data-cm-fsroot][data-pseudo] > div { animation: none; } }
`;

function samePlacement(a: Placement, b: Placement): boolean {
  return a.kind === b.kind && a.fit === b.fit && a.radius === b.radius && a.controls === b.controls;
}

type MovableParent = HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void };

/**
 * 영상 무대를 다른 자리로 옮긴다. 같은 task 안에서 다시 붙이면 브라우저가 재생을 멈추지 않는다.
 * moveBefore 가 있으면 그 상태(재생·포커스)를 더 온전히 지킨다
 */
function moveInto(target: HTMLElement, stage: HTMLElement) {
  if (stage.parentElement === target) return;
  const parent = target as MovableParent;
  if (typeof parent.moveBefore === 'function' && stage.isConnected && target.isConnected) {
    try {
      parent.moveBefore(stage, null);
      return;
    } catch {
      // 옮길 수 없는 조합이면 그냥 붙인다
    }
  }
  target.appendChild(stage);
}

/**
 * 화면에 실제로 보이는 자리인가. 탭 내비게이터는 떠난 화면을 지우지 않고 aria-hidden 으로 뒤에 숨겨 두므로
 * 크기뿐 아니라 숨김 조상도 본다.
 */
function isShown(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return false;
  for (
    let node: HTMLElement | null = element;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (node.getAttribute('aria-hidden') === 'true') return false;
  }
  return true;
}

type WebkitVideo = HTMLVideoElement & { webkitExitFullscreen?: () => void };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
  unlock?: () => void;
};

/** 이 요소를 전체 화면으로 띄우는 함수. 영상이 아닌 요소의 전체 화면을 막은 브라우저(아이폰 사파리)면 null */
function fullscreenRequest(element: HTMLElement): (() => Promise<void>) | null {
  if (typeof element.requestFullscreen === 'function') return () => element.requestFullscreen();
  const webkit = (element as WebkitElement).webkitRequestFullscreen;
  if (typeof webkit === 'function') return async () => webkit.call(element);
  return null;
}

/** 손가락으로 쓰는 화면에서 가로 영상이면 전체 화면을 가로로 돌린다(안드로이드). 못 하면 그대로 둔다 */
function lockLandscape(video: HTMLVideoElement | null) {
  if (!video || video.videoWidth <= video.videoHeight) return;
  if (!window.matchMedia?.('(pointer: coarse)').matches) return;
  const orientation = screen.orientation as LockableOrientation | undefined;
  orientation?.lock?.('landscape').catch(() => undefined);
}

function unlockOrientation() {
  const orientation = screen.orientation as LockableOrientation | undefined;
  try {
    orientation?.unlock?.();
  } catch {
    // 돌리지 않았으면 풀 것도 없다
  }
}

/**
 * 웹 비교 영상은 앱 전체에 <video> 하나다. 라우트 밖(루트)에서 한 번 만든 무대(stage)에 그리고,
 * 그 무대를 비교 화면이 낸 자리(슬롯)나 미니 플레이어의 작은 자리 안으로 DOM 째 옮긴다.
 * 자리 안에 들어가 있으니 스크롤·잘림·둥근 모서리를 브라우저가 그대로 처리하고,
 * 요소를 새로 만들지 않으니 화면을 오가도 재생이 끊기지 않는다.
 */
export function ComparePlayerHost() {
  useLocale();
  const current = useComparePlayer((state) => state.current);
  const focus = useComparePlayer((state) => state.focus);
  const fullscreen = useComparePlayer((state) => state.fullscreen);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const parkingRef = React.useRef<HTMLDivElement | null>(null);
  const fullscreenRootRef = React.useRef<HTMLDivElement | null>(null);
  /** 전체 화면을 청해 두고 아직 바뀌지 않은 동안. 이때 무대를 다른 자리로 옮기면 안 된다 */
  const enteringRef = React.useRef(false);
  /**
   * 화면을 덮은 상태. 아이폰 사파리처럼 영상이 아닌 요소의 전체 화면을 막은 브라우저에서는
   * 전체 화면 자리를 화면에 꽉 차게 고정해 대신한다(연주자 칩·조작부를 그대로 쓴다)
   */
  const pseudoRef = React.useRef(false);
  /** 지금 자리를 다시 고른다(전체 화면에 실패했을 때 제자리로 돌린다) */
  const placeRef = React.useRef<(() => void) | null>(null);
  // 정적 렌더링과 어긋나지 않게 무대는 화면에 붙은 뒤 만든다
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null);
  const [placement, setPlacement] = React.useState<Placement>(PARKED);
  const [failed, setFailed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const performanceId = current?.performanceId ?? null;
  const clipUrl = current?.clipUrl ?? null;

  React.useLayoutEffect(() => {
    const element = document.createElement('div');
    // 무대 자체는 누름을 받지 않는다. 조작부가 있는 자리에서만 안쪽 영상이 받는다
    element.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
    parkingRef.current?.appendChild(element);
    setStage(element);
    return () => element.remove();
  }, []);

  // 주소를 바꾸면 브라우저가 새 영상을 싣기 전에 0초 위치를 먼저 알린다. 그대로 적으면 새 연주의
  // 기억해 둔 위치가 0으로 덮이므로, 메타데이터를 받아 위치를 잡은 뒤부터만 위치를 적는다
  const readyFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    setFailed(false);
    readyFor.current = null;
  }, [clipUrl, reloadKey]);

  // 전체 화면·겹칠 자리를 화면들에 빌려준다
  React.useEffect(() => {
    const overlay = overlayRef.current;
    const root = fullscreenRootRef.current;
    if (!stage || !overlay || !root) return;
    // 나온 뒤: 바로 제자리(지금 연주자 카드)로 돌리고, 그 카드가 화면 밖이면 보이게 굴린다.
    // 전체 화면에서 연주자를 바꿨으면 그 카드가 아래에 있을 수 있다
    const afterExit = () => {
      placeRef.current?.();
      unlockOrientation();
      requestAnimationFrame(() => {
        const parent = stage.parentElement;
        if (!parent || parent === parkingRef.current || parent === comparePlayer.getMiniTarget())
          return;
        parent.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    };
    const enterPseudo = () => {
      moveInto(root, stage);
      stage.style.borderRadius = '0px';
      root.setAttribute('data-pseudo', '');
      document.documentElement.style.overflow = 'hidden';
      pseudoRef.current = true;
      comparePlayer.reportFullscreen(true);
    };
    const leavePseudo = () => {
      if (!pseudoRef.current) return;
      pseudoRef.current = false;
      root.removeAttribute('data-pseudo');
      document.documentElement.style.overflow = '';
      comparePlayer.reportFullscreen(false);
      afterExit();
    };
    const unregister = comparePlayer.registerHost({
      overlay,
      requestFullscreen: async () => {
        if (pseudoRef.current || document.fullscreenElement === root) return;
        const request = fullscreenRequest(root);
        if (!request) {
          enterPseudo();
          return;
        }
        enteringRef.current = true;
        moveInto(root, stage);
        stage.style.borderRadius = '0px';
        try {
          await request();
          lockLandscape(videoRef.current);
        } catch {
          // 전체 화면을 거절하면(권한·브라우저 제한) 화면을 덮는 방식으로 대신한다
          enteringRef.current = false;
          enterPseudo();
        }
      },
      exitFullscreen: () => {
        if (pseudoRef.current) leavePseudo();
        else if (document.fullscreenElement === root)
          void document.exitFullscreen().catch(() => undefined);
      },
    });
    const onChange = () => {
      enteringRef.current = false;
      const inFullscreen = document.fullscreenElement === root;
      comparePlayer.reportFullscreen(inFullscreen);
      if (inFullscreen) return;
      afterExit();
    };
    // 화면을 덮은 상태에서는 Esc 로 나간다(진짜 전체 화면은 브라우저가 처리)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pseudoRef.current) leavePseudo();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      leavePseudo();
      unregister();
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, [stage]);

  // 아이폰 사파리는 영상 기본 조작부의 전체 화면 단추를 숨길 수 없다. 그 전체 화면으로 들어가면
  // 연주자를 바꿀 수 없으니 바로 나와서 이 앱의 전체 화면(화면 덮기)으로 바꾼다
  React.useEffect(() => {
    const video = videoRef.current as WebkitVideo | null;
    if (!video) return;
    const onBegin = () => {
      setTimeout(() => {
        video.webkitExitFullscreen?.();
        comparePlayer.requestFullscreen();
      }, 0);
    };
    video.addEventListener('webkitbeginfullscreen', onBegin);
    return () => video.removeEventListener('webkitbeginfullscreen', onBegin);
  }, [clipUrl, reloadKey]);

  // 미디어 손잡이: 지금 트랙이 바뀔 때마다 새로 건다 (요소는 그대로)
  React.useEffect(() => {
    const video = videoRef.current;
    if (!stage || !video || performanceId === null) return;
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
      currentTime: () => video.currentTime,
    });
  }, [stage, performanceId, reloadKey]);

  // 집중 비교가 열려도 바로 쉬지 않는다. 집중 비교 화면의 영상이 소리를 내기 시작하면 그 화면이 멈춘다

  // 자리 고르기: 보이는 슬롯 → 미니 자리 → 주차. 자리가 바뀔 때만 무대를 옮긴다.
  // 자리가 등록·해제되면 바로(같은 커밋 안에서) 옮겨, 사라지는 자리와 함께 영상이 문서에서 빠지지 않게 한다.
  // 화면이 aria-hidden 으로 숨는 것은 등록 변화가 없어 매 프레임 가볍게 확인한다
  React.useLayoutEffect(() => {
    const parking = parkingRef.current;
    if (!stage || !parking) return;
    let raf = 0;
    let last = PARKED;

    const choose = (): { element: HTMLElement; placement: Placement } => {
      if (performanceId === null || comparePlayer.getState().focus)
        return { element: parking, placement: PARKED };
      for (const slot of comparePlayer.getSlots()) {
        if (slot.performanceId === performanceId && isShown(slot.element)) {
          return {
            element: slot.element,
            placement: {
              kind: 'slot',
              fit: slot.fit,
              radius: slot.radius,
              controls: slot.controls,
            },
          };
        }
      }
      const mini = comparePlayer.getMiniTarget();
      if (mini && isShown(mini)) {
        return {
          element: mini,
          placement: { kind: 'mini', fit: 'cover', radius: 6, controls: false },
        };
      }
      return { element: parking, placement: PARKED };
    };

    const place = () => {
      // 전체 화면(또는 청하는 중)이면 영상이 온전히 보이는 상태라 화면들이 조작부를 겹칠 수 있게 'slot'으로 둔다.
      // 전체 화면 자리에서 꺼내면 전체 화면이 풀리므로 그대로 둔다
      const root = fullscreenRootRef.current;
      if (
        root &&
        (enteringRef.current || pseudoRef.current || document.fullscreenElement === root)
      ) {
        comparePlayer.reportSurface('slot');
        return;
      }
      const next = choose();
      moveInto(next.element, stage);
      stage.style.borderRadius = `${next.placement.radius}px`;
      comparePlayer.reportSurface(next.placement.kind === 'parked' ? 'none' : next.placement.kind);
      if (!samePlacement(next.placement, last)) {
        last = next.placement;
        setPlacement(next.placement);
      }
    };

    placeRef.current = place;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      place();
    };
    place();
    raf = requestAnimationFrame(tick);
    const unsubscribe = comparePlayer.subscribeSurface(place);
    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      if (placeRef.current === place) placeRef.current = null;
    };
  }, [stage, performanceId]);

  const hidden = performanceId === null || placement.kind === 'parked' || Boolean(focus);

  const player = (
    <div
      ref={wrapperRef}
      aria-hidden={hidden}
      style={
        fullscreen
          ? { position: 'absolute', inset: 0, background: '#000' }
          : {
              position: 'absolute',
              inset: 0,
              borderRadius: placement.radius,
              overflow: 'hidden',
              background: '#000',
              pointerEvents: placement.controls ? 'auto' : 'none',
            }
      }>
      {clipUrl ? (
        <video
          key={reloadKey}
          ref={videoRef}
          src={clipUrl}
          playsInline
          controls={placement.controls && !fullscreen}
          // 기본 조작부의 전체 화면 단추는 영상만 띄워 연주자를 못 바꾼다. 화면 위 전체 화면 단추를 쓴다
          controlsList="nofullscreen noremoteplayback"
          preload={comparePlayer.getState().restored ? 'metadata' : 'auto'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fullscreen ? 'contain' : placement.fit,
            display: 'block',
            background: '#000',
          }}
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
          onPause={() =>
            performanceId !== null && comparePlayer.reportPlaying(performanceId, false)
          }
          onEnded={() => performanceId !== null && comparePlayer.reportEnded(performanceId)}
          onTimeUpdate={(event) =>
            performanceId !== null &&
            readyFor.current === performanceId &&
            comparePlayer.reportProgress(
              performanceId,
              event.currentTarget.currentTime,
              event.currentTarget.duration || 0
            )
          }
          onVolumeChange={(event) =>
            comparePlayer.syncVolume(event.currentTarget.volume, event.currentTarget.muted)
          }
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed && placement.kind === 'slot' ? (
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
          <span>{t('영상 구간을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.')}</span>
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
            {t('다시 시도')}
          </button>
        </div>
      ) : null}
      {/* 화면들이 영상 위에 겹치는 조작부(전체 화면 버튼·전체 화면 조작부)를 여기에 그린다 */}
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  );

  return (
    <>
      {/* 보일 자리가 없을 때 영상을 세워 두는 곳. 화면 밖이라 보이지 않지만 문서 안이라 재생은 이어진다 */}
      <div
        ref={parkingRef}
        aria-hidden
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: 16,
          height: 9,
          overflow: 'hidden',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />
      <style>{FULLSCREEN_ROOT_CSS}</style>
      <div ref={fullscreenRootRef} data-cm-fsroot="" />
      {stage ? createPortal(player, stage) : null}
    </>
  );
}
