/**
 * 1:1에서 연주자를 바꿀 때 두 영상 소리를 잠깐 겹쳐 넘긴다 (웹 전용).
 *
 * 보통은 영상의 volume 값을 프레임마다 바꾼다. iPhone Safari는 volume 값을 무시하므로,
 * 그때만 Web Audio 볼륨 노드로 소리를 거친다. 다른 출처의 클립을 Web Audio로 거치면 소리가
 * 사라지므로 같은 출처 클립에서만 그렇게 하고, 아니면 겹치지 않고 바로 바꾼다.
 */

/** 자동 전환 간격(초)별 겹치는 길이. 간격의 5분의 1을 넘지 않는다 */
const AUTO_FADE_SEC: Record<number, number> = { 2: 0.4, 4: 0.8, 8: 1 };
/** 손으로 바꿀 때 겹치는 길이 */
const MANUAL_FADE_SEC = 0.6;

export type SwitchCause = 'manual' | 'auto';

export function fadeSeconds(cause: SwitchCause, autoInterval: number): number {
  return cause === 'auto' ? AUTO_FADE_SEC[autoInterval] ?? MANUAL_FADE_SEC : MANUAL_FADE_SEC;
}

let volumeWritable: boolean | null = null;

/** 이 브라우저가 영상 volume 값을 바꿀 수 있는지. iOS Safari는 늘 1로 돌아온다 */
function canSetVolume(): boolean {
  if (volumeWritable !== null) return volumeWritable;
  try {
    const probe = document.createElement('video');
    probe.volume = 0.5;
    volumeWritable = Math.abs(probe.volume - 0.5) < 0.01;
  } catch {
    volumeWritable = false;
  }
  return volumeWritable;
}

let context: AudioContext | null = null;
const gains = new WeakMap<HTMLMediaElement, GainNode>();

function sameOrigin(element: HTMLMediaElement): boolean {
  try {
    return new URL(element.currentSrc || element.src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** 영상에 Web Audio 볼륨 노드를 붙인다. 한 영상에 한 번만 붙일 수 있어 기억해 둔다 */
function gainFor(element: HTMLMediaElement): GainNode | null {
  const existing = gains.get(element);
  if (existing) return existing;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  const source = context.createMediaElementSource(element);
  const gain = context.createGain();
  source.connect(gain).connect(context.destination);
  gains.set(element, gain);
  return gain;
}

type LevelSetter = (element: HTMLMediaElement, level: number) => void;

/** 두 영상의 소리 크기를 바꾸는 방법. 쓸 수 없으면 null (그냥 바로 바꾼다) */
function levelSetter(from: HTMLMediaElement, to: HTMLMediaElement): LevelSetter | null {
  if (canSetVolume()) {
    return (element, level) => {
      element.volume = Math.max(0, Math.min(1, level));
    };
  }
  if (!sameOrigin(from) || !sameOrigin(to)) return null;
  const fromGain = gainFor(from);
  const toGain = gainFor(to);
  if (!fromGain || !toGain) return null;
  void context?.resume();
  return (element, level) => {
    const gain = element === from ? fromGain : toGain;
    gain.gain.value = Math.max(0, Math.min(1, level));
  };
}

export interface Fade {
  /** 남은 페이드를 건너뛰고 끝 상태로 맞춘다 */
  finish: () => void;
}

/**
 * `from`을 줄이고 `to`를 키운다. 둘의 합이 일정하게 들리도록 cos·sin 곡선을 쓴다.
 * `to`가 실제로 소리를 내기 시작한 뒤에 페이드를 시작해 빈틈이 없게 한다.
 * 겹칠 수 없는 환경이면 null을 돌려준다. 그때는 부르는 쪽이 바로 바꾼다.
 */
export function crossfade(
  from: HTMLMediaElement,
  to: HTMLMediaElement,
  seconds: number,
  level: number,
  onDone: () => void
): Fade | null {
  const setLevel = levelSetter(from, to);
  if (!setLevel) return null;
  // Web Audio를 거치면 기기 볼륨이 곧 크기라 끝 크기는 1이다
  const top = canSetVolume() ? level : 1;
  let frame = 0;
  let done = false;

  const end = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    from.pause();
    setLevel(from, top);
    setLevel(to, top);
    onDone();
  };

  const run = (startedAt: number) => {
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (seconds * 1000));
      setLevel(from, Math.cos((progress * Math.PI) / 2) * top);
      setLevel(to, Math.sin((progress * Math.PI) / 2) * top);
      if (progress >= 1) end();
      else frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  setLevel(to, 0);
  to.muted = false;
  from.muted = false;
  void to
    .play()
    .then(() => {
      if (!done) run(performance.now());
    })
    .catch(end);

  return { finish: end };
}
