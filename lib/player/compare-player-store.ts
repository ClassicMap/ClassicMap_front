import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

/**
 * 비교 재생 상태. 화면 컴포넌트가 아니라 앱 전역에 두어, 다른 화면으로 가도 무엇을 어디까지
 * 들었는지 남는다 (전역 미니 플레이어가 같은 스토어를 읽는다).
 *
 * 실제 재생은 미디어(웹은 셸에 하나만 둔 <video>, 네이티브는 비교 화면의 YouTube)가 하고,
 * 스토어에는 `registerMedia`로 조작 손잡이만 건다. 재생 바·단축키·미니 플레이어는 손잡이로 조작한다.
 *
 * 연주별 위치·마지막 트랙은 저장해 두어 새로고침·앱 재시작 뒤에도 이어 들을 수 있다.
 */

/** 지금 고른 연주. 미니 플레이어가 제목·사진을 그리고 비교 화면으로 되돌아갈 때 쓴다 */
export interface ComparePlayerTrack {
  performanceId: number;
  pieceId: number;
  composerId: number;
  sectorId: number;
  pieceTitle: string;
  sectorName: string;
  artistId: number | null;
  artistName: string;
  artistImageUrl: string | null;
  /** 클립 길이(초) */
  durationSec: number;
  clipUrl?: string;
  videoId?: string;
  startMs: number;
  endMs: number;
}

/**
 * 연주자를 바꿀 때 어디서 이어 들을지.
 * - resume: 연주자마다 듣던 자리에서 이어 듣는다 (기본)
 * - align: 방금 듣던 지점과 같은 비율 지점으로 맞춰 듣는다 (같은 대목을 번갈아 비교)
 */
export type SwitchMode = 'resume' | 'align';

/** 웹 셸의 영상이 지금 어디에 떠 있는지. 'slot'이면 비교 화면 안, 'mini'면 미니 플레이어 */
export type PlayerSurface = 'slot' | 'mini' | 'none';

export interface ComparePlayerState {
  current: ComparePlayerTrack | null;
  playing: boolean;
  /** 사용자가 방금 재생을 눌러 고른 연주. 미디어가 붙으면 바로 재생하고 지운다 */
  playIntent: number | null;
  /** 현재 연주의 재생 위치(초)와 길이(초) */
  progress: { current: number; duration: number };
  /** 연주(performance id)별로 마지막으로 듣던 위치(초) */
  positions: Readonly<Record<number, number>>;
  volume: number;
  muted: boolean;
  switchMode: SwitchMode;
  /** 비교 화면 크게 보기 */
  theater: boolean;
  /** 같은 구간의 재생 가능한 연주들. 미니 플레이어의 이전·다음 연주자에 쓴다 */
  queue: readonly ComparePlayerTrack[];
  /** 새로고침 뒤 되살린 트랙이라 아직 한 번도 재생하지 않았다 */
  restored: boolean;
  surface: PlayerSurface;
  /** 셸 영상이 전체 화면이다 */
  fullscreen: boolean;
  /** 두 연주자 집중 비교 중이면 셸 영상은 쉬고 집중 비교 화면이 재생을 맡는다 */
  focus: { a: number; b: number } | null;
  /** 재생을 맡은 미디어가 붙어 있다. 네이티브에서 비교 화면이 사라지면 false */
  mediaAttached: boolean;
}

/** 화면에 붙은 미디어를 조작하는 손잡이 */
export interface ComparePlayerMedia {
  performanceId: number;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  applyVolume: (volume: number, muted: boolean) => void;
}

/** 비교 화면이 셸 영상에 내주는 자리 (웹) */
export interface PlayerSlot {
  performanceId: number;
  element: HTMLElement;
  fit: 'cover' | 'contain';
  radius: number;
  /** 영상 기본 조작부를 보인다 (좁은 화면) */
  controls: boolean;
}

/** 셸 영상이 화면들에 빌려주는 것: 영상 위에 겹칠 자리와 전체 화면 */
export interface PlayerHostHandle {
  overlay: HTMLElement;
  requestFullscreen: () => Promise<void>;
}

const VOLUME_KEY = 'classicmap.player.volume';
const MUTED_KEY = 'classicmap.player.muted';
const SWITCH_MODE_KEY = 'classicmap.player.switch-mode';
const SESSION_KEY = 'classicmap.player.session.v1';
/** 끝에서 이만큼 안쪽이면 다 들은 것으로 보고 다음에는 처음부터 */
const END_MARGIN_SEC = 0.75;
/** 연주별 위치는 최근 것만 이만큼 남긴다 */
const MAX_POSITIONS = 200;
const SAVE_THROTTLE_MS = 2000;

function readStored(key: string): string | null {
  if (Platform.OS !== 'web') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  if (Platform.OS !== 'web') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 사생활 보호 창 등에서는 기억하지 못해도 재생에는 지장이 없다
  }
}

function initialVolume(): number {
  const raw = readStored(VOLUME_KEY);
  const stored = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 1;
}

// ─── 저장: 마지막 트랙 + 연주별 위치 ─────────────────────────────

interface StoredSession {
  current: ComparePlayerTrack | null;
  /** [performanceId, 초] 오래된 것부터 */
  positions: [number, number][];
}

function isTrack(value: unknown): value is ComparePlayerTrack {
  if (!value || typeof value !== 'object') return false;
  const track = value as Record<string, unknown>;
  return (
    typeof track.performanceId === 'number' &&
    typeof track.pieceId === 'number' &&
    typeof track.composerId === 'number' &&
    typeof track.sectorId === 'number' &&
    typeof track.pieceTitle === 'string' &&
    typeof track.sectorName === 'string' &&
    typeof track.artistName === 'string' &&
    typeof track.durationSec === 'number' &&
    typeof track.startMs === 'number' &&
    typeof track.endMs === 'number'
  );
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as { current?: unknown; positions?: unknown };
    const positions = Array.isArray(record.positions)
      ? record.positions.filter(
          (entry): entry is [number, number] =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === 'number' &&
            typeof entry[1] === 'number' &&
            Number.isFinite(entry[1])
        )
      : [];
    return { current: isTrack(record.current) ? record.current : null, positions };
  } catch {
    return null;
  }
}

/** 최근에 적은 연주가 뒤로 오는 순서. 잘라 낼 때 앞(오래된 것)부터 버린다 */
let positionOrder: number[] = [];

function touchOrder(performanceId: number) {
  const index = positionOrder.indexOf(performanceId);
  if (index >= 0) positionOrder.splice(index, 1);
  positionOrder.push(performanceId);
}

function serializeSession(): string {
  const keep = positionOrder.slice(-MAX_POSITIONS);
  const positions: [number, number][] = keep
    .filter((id) => state.positions[id] !== undefined)
    .map((id) => [id, Math.round(state.positions[id] * 10) / 10]);
  return JSON.stringify({ current: state.current, positions } satisfies StoredSession);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

function flushSession() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!dirty) return;
  dirty = false;
  const value = serializeSession();
  if (Platform.OS === 'web') writeStored(SESSION_KEY, value);
  else void AsyncStorage.setItem(SESSION_KEY, value).catch(() => undefined);
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(flushSession, SAVE_THROTTLE_MS);
}

function sessionPatch(session: StoredSession | null): Partial<ComparePlayerState> {
  if (!session) return {};
  const positions: Record<number, number> = {};
  for (const [id, seconds] of session.positions) positions[id] = seconds;
  positionOrder = session.positions.map(([id]) => id);
  const current = session.current;
  const resumeAt = current ? positions[current.performanceId] ?? 0 : 0;
  return {
    positions,
    current,
    restored: current !== null,
    progress: { current: resumeAt, duration: current?.durationSec ?? 0 },
  };
}

// ─── 상태 ─────────────────────────────────────────────────────

let state: ComparePlayerState = {
  current: null,
  playing: false,
  playIntent: null,
  progress: { current: 0, duration: 0 },
  positions: {},
  volume: initialVolume(),
  muted: readStored(MUTED_KEY) === '1',
  switchMode: readStored(SWITCH_MODE_KEY) === 'align' ? 'align' : 'resume',
  theater: false,
  queue: [],
  restored: false,
  surface: 'none',
  fullscreen: false,
  focus: null,
  mediaAttached: false,
  // 웹은 동기로 바로 되살린다
  ...(Platform.OS === 'web' ? sessionPatch(parseSession(readStored(SESSION_KEY))) : {}),
};

let media: ComparePlayerMedia | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<ComparePlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState(): ComparePlayerState {
  return state;
}

// 네이티브는 저장소가 비동기라 켜진 뒤 되살린다. 그 사이에 고른 연주가 있으면 위치만 합친다
if (Platform.OS !== 'web') {
  void AsyncStorage.getItem(SESSION_KEY)
    .then((raw) => {
      const patch = sessionPatch(parseSession(raw));
      if (!patch.positions) return;
      const merged = { ...patch.positions, ...state.positions };
      if (state.current) setState({ positions: merged });
      else setState({ ...patch, positions: merged });
    })
    .catch(() => undefined);
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') flushSession();
  });
} else if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSession();
  });
}

function clampPosition(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  if (duration > 0 && seconds >= duration - END_MARGIN_SEC) return 0;
  return seconds;
}

/** 이 연주를 고르면 어디서부터 틀지 (초). 스토어의 전환 방식을 따른다 */
function startPositionFor(track: Pick<ComparePlayerTrack, 'performanceId' | 'durationSec'>, mode: SwitchMode): number {
  const { current, progress, positions } = state;
  if (
    mode === 'align' &&
    current &&
    current.performanceId !== track.performanceId &&
    progress.duration > 0 &&
    track.durationSec > 0
  ) {
    return clampPosition((progress.current / progress.duration) * track.durationSec, track.durationSec);
  }
  return clampPosition(positions[track.performanceId] ?? 0, track.durationSec);
}

function savePosition(performanceId: number, seconds: number, duration?: number) {
  const value = duration !== undefined ? clampPosition(seconds, duration) : Math.max(0, seconds);
  touchOrder(performanceId);
  scheduleSave();
  if (state.positions[performanceId] === value) return;
  // 재생 중 초마다 부르므로 구독자에게 알리지 않고 조용히 적는다
  state = { ...state, positions: { ...state.positions, [performanceId]: value } };
}

// ─── 웹 셸 영상의 자리 ─────────────────────────────────────────

const slots = new Set<PlayerSlot>();
let miniTarget: HTMLElement | null = null;
let host: PlayerHostHandle | null = null;
const surfaceListeners = new Set<() => void>();

function notifySurface() {
  surfaceListeners.forEach((listener) => listener());
}

export const comparePlayer = {
  getState,
  subscribe,

  /**
   * 연주를 고른다. `play`면 미디어가 붙는 대로 재생한다 (사용자가 누른 경우).
   * 떠나는 연주의 위치는 먼저 적어 둔다. `queue`를 주면 미니 플레이어의 이전·다음이 그 순서를 따른다.
   */
  select(track: ComparePlayerTrack, options: { play: boolean; queue?: readonly ComparePlayerTrack[]; mode?: SwitchMode }) {
    const { current, progress } = state;
    if (current && current.performanceId !== track.performanceId && progress.duration > 0) {
      savePosition(current.performanceId, progress.current, progress.duration);
    }
    const start = startPositionFor(track, options.mode ?? state.switchMode);
    savePosition(track.performanceId, start);
    // 같은 연주가 이미 붙어 있으면 주소가 그대로라 미디어가 다시 싣지 않는다. 바로 옮기고 튼다
    const sameMedia = current?.performanceId === track.performanceId && media?.performanceId === track.performanceId;
    setState({
      current: track,
      playIntent: options.play && !sameMedia ? track.performanceId : null,
      progress: { current: start, duration: track.durationSec },
      restored: false,
      ...(options.queue ? { queue: options.queue } : null),
    });
    if (sameMedia && media) {
      media.seek(start);
      if (options.play) media.play();
    }
    flushSession();
  },

  /** 미니 플레이어의 이전·다음 연주자 (같은 구간 안에서 돈다) */
  step(direction: 1 | -1) {
    const { queue, current } = state;
    if (queue.length < 2 || !current) return;
    const index = queue.findIndex((track) => track.performanceId === current.performanceId);
    const next = queue[(index + direction + queue.length) % queue.length];
    comparePlayer.select(next, { play: true });
  },

  /** 같은 연주를 다시 누르면 재생·일시정지 */
  togglePlay() {
    if (!media) return false;
    if (state.playing) media.pause();
    else {
      if (state.restored) setState({ restored: false });
      media.play();
    }
    return true;
  },

  play() {
    if (state.restored) setState({ restored: false });
    media?.play();
  },

  pause() {
    media?.pause();
  },

  /** 미니 플레이어의 ✕: 멈추고 비운다. 연주별 위치는 남긴다 */
  close() {
    const { current, progress } = state;
    media?.pause();
    if (current && progress.duration > 0) savePosition(current.performanceId, progress.current, progress.duration);
    setState({ current: null, playing: false, playIntent: null, queue: [], restored: false, progress: { current: 0, duration: 0 } });
    dirty = true;
    flushSession();
  },

  seek(seconds: number) {
    const current = state.current;
    if (!current) return;
    const duration = state.progress.duration || current.durationSec;
    const target = Math.max(0, Math.min(seconds, duration));
    savePosition(current.performanceId, target);
    setState({ progress: { current: target, duration } });
    media?.seek(target);
  },

  seekBy(deltaSeconds: number) {
    comparePlayer.seek(state.progress.current + deltaSeconds);
  },

  setVolume(volume: number) {
    const next = Math.max(0, Math.min(1, volume));
    // 소리를 올리면 음소거를 푼다
    const muted = next === 0 ? state.muted : false;
    writeStored(VOLUME_KEY, String(next));
    writeStored(MUTED_KEY, muted ? '1' : '0');
    setState({ volume: next, muted });
    media?.applyVolume(next, muted);
  },

  /** 미디어 자체 조작부(기본 컨트롤)에서 바꾼 볼륨을 받아 적는다. 미디어에 되돌려 걸지 않는다 */
  syncVolume(volume: number, muted: boolean) {
    const next = Math.max(0, Math.min(1, volume));
    if (next === state.volume && muted === state.muted) return;
    writeStored(VOLUME_KEY, String(next));
    writeStored(MUTED_KEY, muted ? '1' : '0');
    setState({ volume: next, muted });
  },

  toggleMute() {
    const muted = !state.muted;
    writeStored(MUTED_KEY, muted ? '1' : '0');
    // 0에서 음소거를 풀면 들리게 조금 올린다
    const volume = !muted && state.volume === 0 ? 0.5 : state.volume;
    setState({ muted, volume });
    media?.applyVolume(volume, muted);
  },

  setSwitchMode(mode: SwitchMode) {
    writeStored(SWITCH_MODE_KEY, mode);
    setState({ switchMode: mode });
  },

  /** 웹은 영상이 셸에 하나뿐이라 보기 방식을 바꿔도 영상은 그대로 이어진다 */
  setTheater(theater: boolean) {
    if (theater === state.theater) return;
    setState({ theater });
  },

  /** 집중 비교를 열고 닫는다. 여는 동안 셸 영상은 멈추고 집중 비교 화면이 재생을 맡는다 */
  setFocus(focus: { a: number; b: number } | null) {
    if (focus && state.playing) media?.pause();
    setState({ focus });
  },

  /** 미디어가 보고하는 상태 */
  reportPlaying(performanceId: number, playing: boolean) {
    if (state.current?.performanceId !== performanceId) return;
    if (state.playing !== playing) setState({ playing, ...(playing ? { restored: false } : null) });
  },

  reportProgress(performanceId: number, current: number, duration: number) {
    if (state.current?.performanceId !== performanceId) return;
    savePosition(performanceId, current);
    setState({ progress: { current, duration: duration || state.current.durationSec } });
  },

  reportEnded(performanceId: number) {
    savePosition(performanceId, 0);
    if (state.current?.performanceId === performanceId) setState({ playing: false });
  },

  /** 사용자가 고른 재생 의도를 미디어가 가져갔다 */
  consumePlayIntent(performanceId: number): boolean {
    if (state.playIntent !== performanceId) return false;
    setState({ playIntent: null });
    return true;
  },

  /** 스토어 밖에서 재생한 연주(집중 비교)의 위치를 적어 둔다. 비교 화면으로 돌아가면 여기서 이어진다 */
  rememberPosition(performanceId: number, seconds: number, duration?: number) {
    savePosition(performanceId, seconds, duration);
  },

  /** 이 연주를 붙일 때 어디서부터 틀지 (초) */
  positionFor(performanceId: number): number {
    return state.positions[performanceId] ?? 0;
  },

  /** 화면의 미디어를 건다. 떼는 함수를 돌려준다 */
  registerMedia(handle: ComparePlayerMedia) {
    media = handle;
    handle.applyVolume(state.volume, state.muted);
    if (!state.mediaAttached) setState({ mediaAttached: true });
    return () => {
      if (media !== handle) return;
      media = null;
      const stopped = state.current?.performanceId === handle.performanceId && state.playing;
      setState({ mediaAttached: false, ...(stopped ? { playing: false } : null) });
    };
  },

  hasMedia() {
    return media !== null;
  },

  // ─── 웹 셸 영상 ───

  /** 비교 화면이 자리를 낸다. 셸 영상이 그 자리에 겹쳐 뜬다 */
  registerSlot(slot: PlayerSlot) {
    slots.add(slot);
    notifySurface();
    return () => {
      slots.delete(slot);
      notifySurface();
    };
  },

  /** 미니 플레이어 안의 작은 영상 자리 */
  registerMiniTarget(element: HTMLElement) {
    miniTarget = element;
    notifySurface();
    return () => {
      if (miniTarget !== element) return;
      miniTarget = null;
      notifySurface();
    };
  },

  getSlots(): readonly PlayerSlot[] {
    return [...slots];
  },

  getMiniTarget(): HTMLElement | null {
    return miniTarget;
  },

  subscribeSurface(listener: () => void) {
    surfaceListeners.add(listener);
    return () => surfaceListeners.delete(listener);
  },

  reportSurface(surface: PlayerSurface) {
    if (state.surface !== surface) setState({ surface });
  },

  reportFullscreen(fullscreen: boolean) {
    if (state.fullscreen !== fullscreen) setState({ fullscreen });
  },

  registerHost(handle: PlayerHostHandle) {
    host = handle;
    notifySurface();
    return () => {
      if (host !== handle) return;
      host = null;
      notifySurface();
    };
  },

  getHost(): PlayerHostHandle | null {
    return host;
  },

  /** 셸 영상을 전체 화면으로. 셸이 없으면(네이티브) false */
  requestFullscreen(): boolean {
    if (!host) return false;
    void host.requestFullscreen().catch(() => undefined);
    return true;
  },
};

/** 스토어 구독. 고른 값이 바뀔 때만 다시 그린다 */
export function useComparePlayer<T>(selector: (state: ComparePlayerState) => T): T {
  const selectorRef = React.useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = React.useCallback(() => selectorRef.current(getState()), []);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 셸 영상 위에 겹칠 자리. 영상이 비교 화면 자리에 떠 있을 때만 준다 */
export function usePlayerOverlay(): HTMLElement | null {
  const surface = useComparePlayer((snapshot) => snapshot.surface);
  const hostElement = React.useSyncExternalStore(
    comparePlayer.subscribeSurface,
    () => comparePlayer.getHost()?.overlay ?? null,
    () => null
  );
  return surface === 'slot' ? hostElement : null;
}
