import * as React from 'react';
import { Platform } from 'react-native';

/**
 * 비교 재생 상태. 화면 컴포넌트가 아니라 앱 전역에 두어, 다른 화면으로 가도 무엇을 어디까지
 * 들었는지 남는다 (전역 미니 플레이어가 같은 스토어를 읽는다).
 *
 * 실제 재생은 화면에 붙은 미디어(웹 <video>, 네이티브 YouTube)가 하고, 스토어에는
 * `registerMedia`로 조작 손잡이만 건다. 재생 바·단축키·미니 플레이어는 손잡이로 조작한다.
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
}

/** 화면에 붙은 미디어를 조작하는 손잡이 */
export interface ComparePlayerMedia {
  performanceId: number;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  applyVolume: (volume: number, muted: boolean) => void;
}

const VOLUME_KEY = 'classicmap.player.volume';
const MUTED_KEY = 'classicmap.player.muted';
const SWITCH_MODE_KEY = 'classicmap.player.switch-mode';
/** 끝에서 이만큼 안쪽이면 다 들은 것으로 보고 다음에는 처음부터 */
const END_MARGIN_SEC = 0.75;

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

function clampPosition(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  if (duration > 0 && seconds >= duration - END_MARGIN_SEC) return 0;
  return seconds;
}

/** 이 연주를 고르면 어디서부터 틀지 (초). 스토어의 전환 방식을 따른다 */
function startPositionFor(track: Pick<ComparePlayerTrack, 'performanceId' | 'durationSec'>): number {
  const { current, progress, positions, switchMode } = state;
  if (
    switchMode === 'align' &&
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
  if (state.positions[performanceId] === value) return;
  // 재생 중 초마다 부르므로 구독자에게 알리지 않고 조용히 적는다
  state = { ...state, positions: { ...state.positions, [performanceId]: value } };
}

export const comparePlayer = {
  getState,
  subscribe,

  /**
   * 연주를 고른다. `play`면 미디어가 붙는 대로 재생한다 (사용자가 누른 경우).
   * 떠나는 연주의 위치는 먼저 적어 둔다.
   */
  select(track: ComparePlayerTrack, options: { play: boolean }) {
    const { current, progress } = state;
    if (current && current.performanceId !== track.performanceId && progress.duration > 0) {
      savePosition(current.performanceId, progress.current, progress.duration);
    }
    const start = startPositionFor(track);
    savePosition(track.performanceId, start);
    setState({
      current: track,
      playIntent: options.play ? track.performanceId : null,
      progress: { current: start, duration: track.durationSec },
    });
  },

  /** 같은 연주를 다시 누르면 재생·일시정지 */
  togglePlay() {
    if (!media) return false;
    if (state.playing) media.pause();
    else media.play();
    return true;
  },

  play() {
    media?.play();
  },

  pause() {
    media?.pause();
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

  /** 보기 방식을 바꾸면 영상이 새 자리에 다시 붙는다. 듣던 중이었으면 새 자리에서 이어 재생한다 */
  setTheater(theater: boolean) {
    if (theater === state.theater) return;
    const handoff = state.playing && state.current ? state.current.performanceId : state.playIntent;
    setState({ theater, playIntent: handoff });
  },

  /** 미디어가 보고하는 상태 */
  reportPlaying(performanceId: number, playing: boolean) {
    if (state.current?.performanceId !== performanceId) return;
    if (state.playing !== playing) setState({ playing });
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

  /** 이 연주를 붙일 때 어디서부터 틀지 (초) */
  positionFor(performanceId: number): number {
    return state.positions[performanceId] ?? 0;
  },

  /** 화면의 미디어를 건다. 떼는 함수를 돌려준다 */
  registerMedia(handle: ComparePlayerMedia) {
    media = handle;
    handle.applyVolume(state.volume, state.muted);
    return () => {
      if (media !== handle) return;
      media = null;
      if (state.current?.performanceId === handle.performanceId && state.playing) setState({ playing: false });
    };
  },

  hasMedia() {
    return media !== null;
  },
};

/** 스토어 구독. 고른 값이 바뀔 때만 다시 그린다 */
export function useComparePlayer<T>(selector: (state: ComparePlayerState) => T): T {
  const selectorRef = React.useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = React.useCallback(() => selectorRef.current(getState()), []);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
