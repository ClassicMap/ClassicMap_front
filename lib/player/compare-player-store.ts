import { sectorNames } from '@/lib/data/legacy-names';
import { type NameSidecar } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sameMoment } from '@/lib/player/focus-align';
import { type AutoplayCandidate, pickAutoplay } from '@/lib/player/autoplay';
import { resolvePlaylistItem, resolveSectorQueue } from '@/lib/player/playlist';
import type { ClipAlignment } from '@/lib/types/models';
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
  /** 같은 구간 기준 연주에 맞춘 정렬 지도. 있으면 같은 지점 전환이 같은 마디로 간다 */
  alignment?: ClipAlignment | null;
  /** 제목·연주자 이름의 한국어·영어. 그릴 때 relocalize 로 지금 언어를 고른다 */
  names?: NameSidecar;
}

/**
 * 듣던 구간 안에서 연주자를 바꿀 때 어디서 이어 들을지. 다른 곡(구간)으로 넘어가면 늘 처음부터 튼다.
 * - resume: 연주자마다 듣던 자리에서 이어 듣는다 (기본)
 * - align: 방금 듣던 지점과 같은 마디로 맞춰 듣는다 (정렬 지도, 없으면 같은 비율 지점)
 */
export type SwitchMode = 'resume' | 'align';

/** 대기열 줄에 보일 것. 연주를 미리 고르지 않고 목록 화면이 이미 가진 작품 정보만 담는다 */
export interface QueueItemMeta {
  title: string;
  composer: string;
  /** 줄 그림: 대표 연주 영상 썸네일이나 작곡가 사진 */
  image: string | null;
  /** 자동 재생 줄에 보이는 고른 까닭 */
  reason?: string;
}

/** 재생 목록의 한 곡(작품의 한 구간). 어느 연주로 틀지는 그 곡 차례가 올 때 정한다 */
export interface PlaylistItem {
  pieceId: number;
  /** 정해진 구간. 없으면 그 작품에서 처음 여는 구간 */
  sectorId: number | null;
  meta?: QueueItemMeta;
}

/**
 * 재생을 누른 화면의 곡 목록(대기열의 「이어서 재생」).
 * - list: 영화·홈·작곡가·둘러보기 목록
 * - compare: 비교 화면의 구간들
 */
export interface Playlist {
  kind: 'list' | 'compare';
  items: readonly PlaylistItem[];
  /** 이 목록에서 마지막으로 튼 자리. 남은 곡은 items[index + 1] 부터. 아직 안 틀었으면 -1 */
  index: number;
  /** 대기열 패널에 보일 출처 이름 */
  name?: string;
  /** 셔플했을 때 원래 순서. 셔플을 끄면 지금 곡 다음부터 이 순서로 돌아간다 */
  original?: readonly PlaylistItem[];
}

/** 지금 곡이 어디서 왔나: 이어서 재생 목록, 목록 밖에서 끼운 곡(비교 화면 카드 등), 자동 재생 */
export type QueueOrigin = 'source' | 'insert' | 'autoplay';

/** 들은 곡 한 줄. 다시 틀 때 그 연주 그대로 튼다 */
export interface QueueEntry {
  track: ComparePlayerTrack;
  origin: QueueOrigin;
  /** 이어서 재생 목록에서 온 곡이면 그 자리 */
  sourceIndex: number | null;
  meta?: QueueItemMeta;
}

export type RepeatMode = 'off' | 'all' | 'one';

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
  /** 1:1에서 연주자를 바꿀 때 두 소리를 잠깐 겹쳐 넘긴다 (웹). 기본은 끔 */
  crossfade: boolean;
  /** 비교 화면 크게 보기 */
  theater: boolean;
  /** 지금 곡(구간)의 재생 가능한 연주들. 재생 바의 이전·다음 연주자가 이 순서를 돈다 */
  queue: readonly ComparePlayerTrack[];
  /** 재생을 누른 화면의 곡 목록(이어서 재생). 없으면 자동 재생만 이어진다 */
  playlist: Playlist | null;
  /** 지금 곡이 어디서 왔나 */
  origin: QueueOrigin;
  /** 들은 곡(오래된 것부터). 이전 곡은 이 순서를 거슬러 간다 */
  history: readonly QueueEntry[];
  /** 이전 곡으로 돌아오며 뒤로 미룬 곡. 다음 곡은 이것부터 튼다(대기열의 「다음에 재생」) */
  forward: readonly QueueEntry[];
  /** 목록이 끝나면 비슷한 곡을 이어 튼다 */
  autoplay: boolean;
  /** 자동 재생으로 이어질 곡(앞에서부터). 지금 곡이 바뀔 때마다 다시 고른다 */
  autoplayItems: readonly PlaylistItem[];
  /** 자동 재생 곡을 고르는 중인지, 골랐는지, 못 찾았는지 */
  autoplayStatus: 'idle' | 'loading' | 'ready' | 'empty';
  shuffle: boolean;
  repeat: RepeatMode;
  /** 데스크톱 대기열 패널이 열려 있다 */
  queueOpen: boolean;
  /**
   * 재생 바의 이전·다음 곡(또는 끝나서 넘어감)으로 곡이 바뀔 때마다 늘어난다.
   * 그 작품의 비교 화면이 열려 있으면 화면도 그 구간으로 따라간다
   */
  navigation: { seq: number; pieceId: number; sectorId: number };
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
  /** 지금 재생 위치(초). 진행 알림보다 촘촘해야 할 때(1:1 비교로 넘겨줄 때) 읽는다 */
  currentTime?: () => number;
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
  /** 전체 화면(또는 화면을 덮은 상태)에서 나온다 */
  exitFullscreen: () => void;
}

/**
 * 들은 기록 신호. 끝까지(90% 이상) 들었는지, 몇 초 안에 넘겼는지만 알린다.
 * 추천을 사용자에 맞게 고치는 데 쓰고, 보낼지는 듣는 쪽(listening-events)이 정한다
 */
export interface ListeningSignal {
  kind: 'finish' | 'skip';
  track: ComparePlayerTrack;
}

/** 이 지점까지 가면 끝까지 들은 것으로 본다 */
const FINISH_RATIO = 0.9;
/** 그러려면 이만큼은 실제로 재생했어야 한다 */
const FINISH_PLAYED_RATIO = 0.5;
/** 작품을 떠날 때 이보다 적게 재생했으면 넘긴 것으로 본다 */
const SKIP_SEC = 10;
/** 재생 위치가 한 번에 이보다 많이 움직이면 탐색으로 보고 재생 시간에 넣지 않는다 */
const MAX_TICK_SEC = 2;

const VOLUME_KEY = 'classicmap.player.volume';
const MUTED_KEY = 'classicmap.player.muted';
const SWITCH_MODE_KEY = 'classicmap.player.switch-mode';
const CROSSFADE_KEY = 'classicmap.player.crossfade';
const AUTOPLAY_KEY = 'classicmap.player.autoplay';
const SHUFFLE_KEY = 'classicmap.player.shuffle';
const REPEAT_KEY = 'classicmap.player.repeat';
const QUEUE_OPEN_KEY = 'classicmap.player.queue-open';
const SESSION_KEY = 'classicmap.player.session.v1';
/** 들은 곡은 최근 것만 이만큼 남긴다 */
const MAX_HISTORY = 30;
/** 자동 재생으로 미리 골라 둘 곡 수 */
const AUTOPLAY_COUNT = 3;
/** 끝에서 이만큼 안쪽이면 다 들은 것으로 보고 다음에는 처음부터 */
const END_MARGIN_SEC = 0.75;
/** 연주별 위치는 최근 것만 이만큼 남긴다 */
const MAX_POSITIONS = 200;
const SAVE_THROTTLE_MS = 2000;
/** 재생 바의 이전 버튼: 이보다 더 들었으면 지금 곡을 처음으로 돌리고, 아니면 이전 곡으로 간다 */
const RESTART_SEC = 3;
/** 틀 연주가 없는 곡을 건너뛰며 찾을 때 이만큼까지만 본다 */
const MAX_SKIP = 5;

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
  playlist: Playlist | null;
  origin?: QueueOrigin;
  history?: QueueEntry[];
  forward?: QueueEntry[];
}

function isPlaylistItem(value: unknown): value is PlaylistItem {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.pieceId === 'number' && (entry.sectorId === null || typeof entry.sectorId === 'number');
}

function isPlaylist(value: unknown): value is Playlist {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.kind !== 'list' && record.kind !== 'compare') return false;
  if (!Array.isArray(record.items) || typeof record.index !== 'number') return false;
  const items = record.items as unknown[];
  if (record.index < -1 || record.index >= items.length) return false;
  if (record.original !== undefined && !(Array.isArray(record.original) && record.original.every(isPlaylistItem))) return false;
  return items.every(isPlaylistItem);
}

function isOrigin(value: unknown): value is QueueOrigin {
  return value === 'source' || value === 'insert' || value === 'autoplay';
}

function parseEntries(value: unknown): QueueEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is QueueEntry => {
    if (!entry || typeof entry !== 'object') return false;
    const record = entry as Record<string, unknown>;
    return isTrack(record.track) && isOrigin(record.origin) && (record.sourceIndex === null || typeof record.sourceIndex === 'number');
  });
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
    const record = parsed as {
      current?: unknown;
      positions?: unknown;
      playlist?: unknown;
      origin?: unknown;
      history?: unknown;
      forward?: unknown;
    };
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
    const current = isTrack(record.current) ? record.current : null;
    return {
      current,
      positions,
      playlist: current && isPlaylist(record.playlist) ? record.playlist : null,
      origin: isOrigin(record.origin) ? record.origin : undefined,
      history: parseEntries(record.history).slice(-MAX_HISTORY),
      forward: current ? parseEntries(record.forward) : [],
    };
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
  return JSON.stringify({
    current: state.current,
    positions,
    playlist: state.playlist,
    origin: state.origin,
    history: [...state.history],
    forward: [...state.forward],
  } satisfies StoredSession);
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
    playlist: session.playlist,
    // 대기열 전에 저장한 세션은 출처 목록에서 튼 곡으로 본다
    origin: session.origin ?? (session.playlist ? 'source' : 'insert'),
    history: session.history ?? [],
    forward: session.forward ?? [],
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
  // 연주자를 바꾸면 기본으로 같은 대목에서 잇는다(직접 「이어서」를 고른 사람은 그대로)
  switchMode: readStored(SWITCH_MODE_KEY) === 'resume' ? 'resume' : 'align',
  crossfade: readStored(CROSSFADE_KEY) === 'on',
  theater: false,
  queue: [],
  playlist: null,
  origin: 'insert',
  history: [],
  forward: [],
  autoplay: readStored(AUTOPLAY_KEY) !== 'off',
  autoplayItems: [],
  autoplayStatus: 'idle',
  shuffle: readStored(SHUFFLE_KEY) === 'on',
  repeat: (() => {
    const stored = readStored(REPEAT_KEY);
    return stored === 'all' || stored === 'one' ? stored : 'off';
  })(),
  queueOpen: readStored(QUEUE_OPEN_KEY) === '1',
  navigation: { seq: 0, pieceId: 0, sectorId: 0 },
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

const listeningListeners = new Set<(signal: ListeningSignal) => void>();

/** 지금 듣는 작품. 연주자를 바꿔도 같은 작품이면 이어진다 */
interface PieceVisit {
  pieceId: number;
  /** 이 작품에서 실제로 재생한 초 */
  playedSec: number;
  started: boolean;
  /** 1:1 집중 비교를 열었다. 집중 비교는 스토어 밖에서 재생해 시간을 못 세니 넘김으로 보지 않는다 */
  engaged: boolean;
  lastTrack: ComparePlayerTrack;
  /** 이번 방문에서 끝까지 들었다고 알린 연주. A→B→A 로 돌아와도 다시 알리지 않는다 */
  finished: Set<number>;
}

let visit: PieceVisit | null = null;
/** 지금 연주에서 실제로 재생한 초와 마지막으로 본 위치 */
let listen: { performanceId: number; playedSec: number; lastSec: number | null } = {
  performanceId: 0,
  playedSec: 0,
  lastSec: null,
};

function emitListening(kind: ListeningSignal['kind'], track: ComparePlayerTrack) {
  for (const listener of listeningListeners) listener({ kind, track });
}

/** 이 연주를 듣기 시작한다. 다른 작품으로 넘어가면 떠나는 작품을 짧게 들었는지 본다 */
function beginListening(track: ComparePlayerTrack) {
  if (visit && visit.pieceId !== track.pieceId) {
    if (visit.started && !visit.engaged && visit.playedSec < SKIP_SEC) emitListening('skip', visit.lastTrack);
    visit = null;
  }
  if (!visit) {
    visit = { pieceId: track.pieceId, playedSec: 0, started: false, engaged: false, lastTrack: track, finished: new Set() };
  }
  visit.lastTrack = track;
  if (listen.performanceId !== track.performanceId) {
    listen = { performanceId: track.performanceId, playedSec: 0, lastSec: null };
  }
}

/** 재생 위치가 조금씩 나아간 만큼만 재생 시간으로 센다 */
function countPlayback(track: ComparePlayerTrack, current: number, total: number) {
  if (!visit || visit.pieceId !== track.pieceId || listen.performanceId !== track.performanceId) beginListening(track);
  const delta = listen.lastSec === null ? 0 : current - listen.lastSec;
  listen.lastSec = current;
  if (visit && delta > 0 && delta <= MAX_TICK_SEC) {
    listen.playedSec += delta;
    visit.playedSec += delta;
  }
  noteFinished(track, current, total);
}

function noteFinished(track: ComparePlayerTrack, current: number, total: number) {
  if (!visit || total <= 0 || visit.finished.has(track.performanceId)) return;
  if (current >= total * FINISH_RATIO && listen.playedSec >= total * FINISH_PLAYED_RATIO) {
    visit.finished.add(track.performanceId);
    emitListening('finish', track);
  }
}

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

/** 영어판 전에 저장한 재생 곡은 두 언어 이름(names)이 없다. 구간 연주에서 받아 채우고 다시 저장한다 */
function fillLegacyNames() {
  const track = state.current;
  if (!track || track.names) return;
  void sectorNames(track.sectorId).then((names) => {
    const current = state.current;
    if (!names || !current || current.performanceId !== track.performanceId || current.names) return;
    setState({
      current: {
        ...current,
        names: {
          pieceTitle: names.pieceTitle,
          sectorName: names.sectorName,
          artistName: names.artistByPerformance.get(current.performanceId),
        },
      },
    });
    scheduleSave();
  });
}

/** 되살린 곡은 연주자 차례가 없다(저장하지 않는다). 그 구간의 연주를 받아 연주자 넘기기를 되살린다 */
function refillQueue() {
  const track = state.current;
  if (!track || state.queue.length > 0) return;
  void resolveSectorQueue(track.sectorId)
    .then((queue) => {
      if (state.current?.performanceId !== track.performanceId || state.queue.length > 0 || queue.length === 0) return;
      setState({ queue });
    })
    .catch(() => undefined);
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
      fillLegacyNames();
      refillQueue();
      refreshAutoplay();
    })
    .catch(() => undefined);
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') flushSession();
  });
} else if (typeof window !== 'undefined') {
  fillLegacyNames();
  refillQueue();
  // 자동 재생 값들은 이 파일 아래쪽에서 만들어지므로 다 읽힌 뒤에 고른다
  setTimeout(refreshAutoplay, 0);
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
function startPositionFor(
  track: Pick<ComparePlayerTrack, 'performanceId' | 'durationSec' | 'alignment'>,
  mode: SwitchMode
): number {
  const { current, progress, positions } = state;
  if (
    mode === 'align' &&
    current &&
    current.performanceId !== track.performanceId &&
    progress.duration > 0 &&
    track.durationSec > 0
  ) {
    const target = sameMoment(
      progress.current,
      { id: current.performanceId, lengthSec: progress.duration, alignment: current.alignment ?? null },
      { id: track.performanceId, lengthSec: track.durationSec, alignment: track.alignment ?? null }
    );
    return clampPosition(target, track.durationSec);
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

/** 이 연주들의 기억해 둔 위치를 버린다 */
function forgetPositions(performanceIds: readonly number[]) {
  const positions = { ...state.positions };
  let changed = false;
  for (const id of performanceIds) {
    if (positions[id] === undefined) continue;
    delete positions[id];
    changed = true;
  }
  if (!changed) return;
  positionOrder = positionOrder.filter((id) => positions[id] !== undefined);
  scheduleSave();
  state = { ...state, positions };
}

// ─── 웹 셸 영상의 자리 ─────────────────────────────────────────

const slots = new Set<PlayerSlot>();
let miniTarget: HTMLElement | null = null;
let host: PlayerHostHandle | null = null;
const surfaceListeners = new Set<() => void>();

function notifySurface() {
  surfaceListeners.forEach((listener) => listener());
}

interface SelectOptions {
  play: boolean;
  queue?: readonly ComparePlayerTrack[];
  mode?: SwitchMode;
  startAt?: number;
  /** 재생을 누른 화면의 곡 목록. 주면 그 목록이 새 「이어서 재생」이 된다 */
  playlist?: Playlist | null;
  /** 하던 목록은 그대로 두고 이 곡을 끼워 튼다(비교 화면에서 목록 밖의 곡을 고를 때) */
  insert?: boolean;
}

/** 대기열 상태 한 벌. 곡을 넘길 때 통째로 바꾼다 */
interface QueuePatch {
  playlist: Playlist | null;
  origin: QueueOrigin;
  history: readonly QueueEntry[];
  forward: readonly QueueEntry[];
}

/**
 * 재생 바의 이전·다음 곡이 고르는 중인 곡. 사용자가 그사이 다른 연주를 고르거나 닫으면 늘어나서,
 * 늦게 도착한 결과가 사용자의 선택을 덮지 않게 한다
 */
let navToken = 0;
/** 끝나서 다음 곡으로 넘기는 중인 연주 */
let advancedFrom: number | null = null;

/** 무작위로 섞은 새 배열 */
function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 지금 곡 다음 목록만 섞는다(지금 곡과 이미 튼 곡은 그대로) */
function shufflePlaylist(playlist: Playlist): Playlist {
  const head = playlist.items.slice(0, playlist.index + 1);
  const rest = playlist.items.slice(playlist.index + 1);
  return { ...playlist, items: [...head, ...shuffled(rest)], original: playlist.original ?? playlist.items };
}

/** 새 목록을 셔플로 받는다: 누른 곡을 맨 앞에 두고 나머지를 모두 섞는다(누른 곡 앞의 곡도 빠지지 않게) */
function shuffleAround(playlist: Playlist): Playlist {
  const picked = playlist.items[playlist.index];
  if (!picked) return shufflePlaylist(playlist);
  const others = playlist.items.filter((_, i) => i !== playlist.index);
  return { ...playlist, items: [picked, ...shuffled(others)], index: 0, original: playlist.items };
}

/** 셔플을 끈다: 지금 곡(또는 마지막으로 튼 곡) 다음부터 원래 순서 */
function unshufflePlaylist(playlist: Playlist): Playlist {
  if (!playlist.original) return playlist;
  const anchor = playlist.items[playlist.index];
  const index = anchor
    ? playlist.original.findIndex((item) => item.pieceId === anchor.pieceId && item.sectorId === anchor.sectorId)
    : -1;
  return { kind: playlist.kind, name: playlist.name, items: playlist.original, index };
}

/** 이 곡이 목록의 어디에 있나. 셔플을 켜고 끄면 적어 둔 자리가 바뀌므로 작품·구간으로 다시 찾는다 */
function placeOf(playlist: Playlist, track: Pick<ComparePlayerTrack, 'pieceId' | 'sectorId'>, hint: number | null): number {
  const matches = (item: PlaylistItem | undefined) =>
    Boolean(item && item.pieceId === track.pieceId && (item.sectorId === null || item.sectorId === track.sectorId));
  if (hint !== null && matches(playlist.items[hint])) return hint;
  return playlist.items.findIndex(matches);
}

function remainingOf(playlist: Playlist | null): readonly PlaylistItem[] {
  return playlist ? playlist.items.slice(playlist.index + 1) : [];
}

function entryOfCurrent(): QueueEntry | null {
  const { current, origin, playlist } = state;
  if (!current) return null;
  const sourceIndex = origin === 'source' && playlist ? playlist.index : null;
  const meta = sourceIndex !== null ? playlist?.items[sourceIndex]?.meta : undefined;
  return { track: current, origin, sourceIndex, meta };
}

function withHistory(history: readonly QueueEntry[], entry: QueueEntry | null): readonly QueueEntry[] {
  return entry ? [...history, entry].slice(-MAX_HISTORY) : history;
}

/** 사용자가 직접 고른 연주의 대기열: 새 목록이면 그 목록, 끼우면 하던 목록 유지, 같은 곡이면 그대로 */
function userQueuePatch(track: ComparePlayerTrack, options: SelectOptions): QueuePatch {
  const { current, playlist, origin, history, forward } = state;
  const sameSong = current?.sectorId === track.sectorId;
  if (sameSong && options.playlist === undefined) return { playlist, origin, history, forward };
  const nextHistory = sameSong ? history : withHistory(history, entryOfCurrent());
  if (options.playlist !== undefined) {
    // 셔플 중이면 새 목록은 지금 곡 다음부터 섞는다(이미 섞인 목록에서 자리만 옮기면 그대로)
    const next =
      options.playlist &&
      state.shuffle &&
      !options.playlist.original &&
      // 같은 목록에서 자리만 옮기는 거면(비교 화면 카드) 다시 섞지 않는다
      options.playlist.items !== state.playlist?.items
        ? shuffleAround(options.playlist)
        : options.playlist;
    return { playlist: next, origin: next ? 'source' : 'insert', history: nextHistory, forward: [] };
  }
  if (options.insert) return { playlist, origin: 'insert', history: nextHistory, forward };
  return { playlist: null, origin: 'insert', history: nextHistory, forward: [] };
}

function selectTrack(track: ComparePlayerTrack, options: SelectOptions, patch: QueuePatch) {
  const { current, progress } = state;
  if (current && current.performanceId !== track.performanceId && progress.duration > 0) {
    savePosition(current.performanceId, progress.current, progress.duration);
  }
  const sameSong = current?.sectorId === track.sectorId;
  // 새 곡이면 이 곡의 다른 연주자에 남은 옛 위치도 버린다. 연주자를 바꿔 이어 듣는 건 이번에 듣는 동안만이다
  if (!sameSong && options.queue) forgetPositions(options.queue.map((item) => item.performanceId));
  beginListening(track);
  const start =
    options.startAt !== undefined
      ? clampPosition(options.startAt, track.durationSec)
      : sameSong
        ? startPositionFor(track, options.mode ?? state.switchMode)
        : 0;
  listen.lastSec = start;
  savePosition(track.performanceId, start);
  // 같은 연주가 이미 붙어 있으면 주소가 그대로라 미디어가 다시 싣지 않는다. 바로 옮기고 튼다
  const sameMedia = current?.performanceId === track.performanceId && media?.performanceId === track.performanceId;
  setState({
    current: track,
    playIntent: options.play && !sameMedia ? track.performanceId : null,
    progress: { current: start, duration: track.durationSec },
    restored: false,
    // 곡이 바뀌었는데 차례 목록을 안 받았으면 떠난 곡의 목록을 남기지 않는다
    queue: options.queue ?? (sameSong ? state.queue : []),
    ...patch,
    ...(sameSong ? null : { autoplayItems: [], autoplayStatus: state.autoplay ? 'loading' : 'idle' }),
  });
  if (sameMedia && media) {
    media.seek(start);
    if (options.play) media.play();
  }
  flushSession();
  if (!sameSong) {
    refillQueue();
    refreshAutoplay();
  }
}

/** 곡이 바뀌었음을 비교 화면에 알린다(그 작품 화면이면 그 구간으로 따라간다) */
function announce(track: ComparePlayerTrack) {
  setState({ navigation: { seq: state.navigation.seq + 1, pieceId: track.pieceId, sectorId: track.sectorId } });
}

/** 들은 곡·미룬 곡처럼 연주가 정해진 줄을 그대로 튼다 */
function playEntry(entry: QueueEntry, patch: QueuePatch) {
  navToken += 1;
  selectTrack(entry.track, { play: true, startAt: 0 }, patch);
  announce(entry.track);
}

/**
 * 목록의 한 곡을 튼다. 같은 연주자가 그 곡에도 있으면 그 연주로, 없으면 그 곡의 대표 연주로 처음부터 튼다.
 * 틀 연주가 없는 곡은 건너뛴다(목록 줄이면 그다음 줄로). 튼 곡이 없으면 false
 */
async function playItems(
  candidates: readonly { item: PlaylistItem; patch: (resolvedIndex: number) => QueuePatch }[]
): Promise<boolean> {
  const current = state.current;
  const token = ++navToken;
  for (let index = 0; index < candidates.length && index < MAX_SKIP; index += 1) {
    let resolved: Awaited<ReturnType<typeof resolvePlaylistItem>> = null;
    try {
      resolved = await resolvePlaylistItem(candidates[index].item, current?.artistId);
    } catch {
      resolved = null;
    }
    // 그사이 다른 연주를 골랐거나 닫았다
    if (token !== navToken) return false;
    if (!resolved) continue;
    selectTrack(resolved.track, { play: true, queue: resolved.queue, startAt: 0 }, candidates[index].patch(index));
    announce(resolved.track);
    return true;
  }
  return false;
}

/** 이어서 재생의 from 자리부터 차례로 튼다 */
function playFromSource(playlist: Playlist, from: number, base: Omit<QueuePatch, 'playlist' | 'origin'>) {
  const items = playlist.items.slice(from).map((item, offset) => ({
    item,
    patch: (): QueuePatch => ({ ...base, playlist: { ...playlist, index: from + offset }, origin: 'source' }),
  }));
  return playItems(items);
}

/**
 * 다음 곡: 미룬 곡 → 이어서 재생 → (전체 반복이면 목록 처음) → 자동 재생. 갈 곳이 없으면 false
 */
async function advance(): Promise<boolean> {
  const { playlist, forward, history, repeat } = state;
  const nextHistory = withHistory(history, entryOfCurrent());
  if (forward.length) {
    const [entry, ...rest] = forward;
    const at = entry.origin === 'source' && playlist ? placeOf(playlist, entry.track, entry.sourceIndex) : -1;
    const nextPlaylist = playlist && at >= 0 ? { ...playlist, index: at } : playlist;
    playEntry(entry, { playlist: nextPlaylist, origin: at >= 0 ? 'source' : entry.origin === 'source' ? 'insert' : entry.origin, history: nextHistory, forward: rest });
    return true;
  }
  if (playlist && remainingOf(playlist).length) {
    return playFromSource(playlist, playlist.index + 1, { history: nextHistory, forward: [] });
  }
  if (playlist && repeat === 'all' && playlist.items.length) {
    return playFromSource(playlist, 0, { history: nextHistory, forward: [] });
  }
  if (!state.autoplay) return false;
  const picks = state.autoplayItems.length ? state.autoplayItems : await computeAutoplay();
  return playItems(
    picks.map((item) => ({
      item,
      patch: (): QueuePatch => ({ playlist: state.playlist, origin: 'autoplay', history: nextHistory, forward: [] }),
    }))
  );
}

// ─── 자동 재생 ───────────────────────────────────────────────

/** 취향 추천(홈 추천과 같은 것). 루트의 연결 컴포넌트가 채운다 */
let tastePool: readonly AutoplayCandidate[] = [];
let autoplayToken = 0;

/** 지금 곡 다음에 이어질 비슷한 곡을 고른다. 들은 곡·대기열에 이미 있는 곡은 빼고 고른다 */
async function computeAutoplay(): Promise<readonly PlaylistItem[]> {
  const current = state.current;
  if (!current) return [];
  const exclude = new Set<number>([
    current.pieceId,
    ...state.history.map((entry) => entry.track.pieceId),
    ...state.forward.map((entry) => entry.track.pieceId),
    ...remainingOf(state.playlist).map((item) => item.pieceId),
  ]);
  return pickAutoplay({ basis: current, exclude, taste: tastePool, count: AUTOPLAY_COUNT });
}

function refreshAutoplay() {
  const token = ++autoplayToken;
  if (!state.autoplay || !state.current) {
    if (state.autoplayItems.length || state.autoplayStatus !== 'idle') setState({ autoplayItems: [], autoplayStatus: 'idle' });
    return;
  }
  const basis = state.current.performanceId;
  // 이미 골라 둔 곡이 있으면 새로 고르는 동안에도 그대로 보인다(깜빡이지 않게)
  if (!state.autoplayItems.length) setState({ autoplayStatus: 'loading' });
  const settle = (items: readonly PlaylistItem[]) => {
    if (token !== autoplayToken || state.current?.performanceId !== basis) return;
    setState({ autoplayItems: items, autoplayStatus: items.length ? 'ready' : 'empty' });
  };
  void computeAutoplay()
    .then(settle)
    .catch(() => settle([]));
}

export const comparePlayer = {
  getState,
  subscribe,

  /**
   * 연주를 고른다. `play`면 미디어가 붙는 대로 재생한다 (사용자가 누른 경우).
   * 떠나는 연주의 위치는 먼저 적어 둔다. `queue`를 주면 재생 바의 다음 연주자가 그 순서를 따른다.
   * 듣던 구간 안에서 연주자만 바꾸면 전환 방식대로 이어 듣고, 다른 곡(구간)을 틀면 처음부터 튼다.
   * `startAt`(초)을 주면 어느 쪽이든 그 지점부터 튼다 (들을 곳)
   */
  select(track: ComparePlayerTrack, options: SelectOptions) {
    navToken += 1;
    selectTrack(track, options, userQueuePatch(track, options));
  },

  /** 들은 기록 신호를 받는다. 떼는 함수를 돌려준다 */
  onListening(listener: (signal: ListeningSignal) => void) {
    listeningListeners.add(listener);
    return () => {
      listeningListeners.delete(listener);
    };
  },

  /**
   * 재생 바의 이전 버튼. 3초 넘게 들었으면 지금 곡을 처음으로 돌리고, 그 안이면 들은 순서의 이전 곡으로 간다.
   * 들은 곡이 없으면 처음으로만 돌린다
   */
  previous() {
    const { current, progress } = state;
    if (!current) return;
    if (progress.current > RESTART_SEC) {
      comparePlayer.seek(0);
      return;
    }
    comparePlayer.previousSong();
  },

  /** 들은 순서의 이전 곡으로 바로 간다(미니 플레이어를 오른쪽으로 밀 때). 들은 곡이 없으면 처음으로 */
  previousSong() {
    const { current, history, origin, playlist, forward } = state;
    if (!current) return;
    const last = history[history.length - 1];
    if (!last) {
      comparePlayer.seek(0);
      return;
    }
    // 지금 곡은 다시 앞으로 미룬다. 이어서 재생의 바로 다음 자리면 목록 자리만 되돌리고, 아니면 「다음에 재생」 맨 앞에 둔다
    const leaving = entryOfCurrent();
    let nextPlaylist = playlist;
    let nextForward = forward;
    const found = last.origin === 'source' && playlist ? placeOf(playlist, last.track, last.sourceIndex) : -1;
    const lastIndex = found >= 0 ? found : null;
    const leavingIndex = origin === 'source' && playlist && leaving ? placeOf(playlist, leaving.track, leaving.sourceIndex) : -1;
    if (playlist && leaving && leavingIndex >= 0) {
      if (lastIndex !== null && lastIndex < leavingIndex) {
        nextPlaylist = { ...playlist, index: lastIndex };
        // 바로 다음 자리가 아니면(셔플을 껐거나 줄을 눌러 건너뛰었으면) ⏭가 방금 곡으로 돌아오게 미뤄 둔다
        if (leavingIndex !== lastIndex + 1) nextForward = [leaving, ...forward];
      } else if (lastIndex === null) nextPlaylist = { ...playlist, index: leavingIndex - 1 };
      else {
        // 목록 처음으로 돌아갔던 경우(전체 반복): 지금 곡은 미뤄 두고 목록 자리는 이전 곡으로
        nextForward = [leaving, ...forward];
        nextPlaylist = { ...playlist, index: lastIndex };
      }
    } else if (leaving) {
      nextForward = [leaving, ...forward];
      if (playlist && lastIndex !== null) nextPlaylist = { ...playlist, index: lastIndex };
    }
    playEntry(last, {
      playlist: nextPlaylist,
      origin: last.origin === 'source' && lastIndex === null ? 'insert' : last.origin,
      history: history.slice(0, -1),
      forward: nextForward,
    });
  },

  /** 재생 바의 다음 버튼. 대기열의 다음 곡으로 간다 */
  next() {
    if (!state.current) return;
    void advance();
  },

  /** 같은 곡의 이전·다음 연주자. 듣던 자리는 연주자 전환 방식(이어서·같은 지점)을 따른다 */
  stepPerformer(direction: 1 | -1) {
    const { queue, current } = state;
    if (queue.length < 2 || !current) return;
    const index = queue.findIndex((track) => track.performanceId === current.performanceId);
    const track = queue[(index + direction + queue.length) % queue.length];
    navToken += 1;
    selectTrack(track, { play: true }, userQueuePatch(track, { play: true }));
  },

  /** 같은 곡의 연주자 묶음에서 이 연주로 바로 간다(연주자 사진을 눌렀을 때) */
  choosePerformer(performanceId: number) {
    const track = state.queue.find((item) => item.performanceId === performanceId);
    if (!track || !state.current || track.performanceId === state.current.performanceId) return;
    navToken += 1;
    selectTrack(track, { play: true }, userQueuePatch(track, { play: true }));
  },

  // ─── 대기열 ───

  /** 다음 곡이 있나. 자동 재생이 켜져 있으면 늘 있다(고르는 중이어도) */
  hasNext(): boolean {
    const { current, forward, playlist, repeat, autoplay } = state;
    if (!current) return false;
    return forward.length > 0 || remainingOf(playlist).length > 0 || (repeat === 'all' && Boolean(playlist?.items.length)) || autoplay;
  },

  /** 다음에 나올 곡의 작품(없거나 아직 모르면 null) */
  upcomingPieceId(): number | null {
    const { forward, playlist, repeat, autoplayItems } = state;
    if (forward.length) return forward[0].track.pieceId;
    const rest = remainingOf(playlist);
    if (rest.length) return rest[0].pieceId;
    if (repeat === 'all' && playlist?.items.length) return playlist.items[0].pieceId;
    return autoplayItems[0]?.pieceId ?? null;
  },

  /** 대기열 패널에서 줄을 눌렀다. 그 곡부터 틀고 그 사이 곡은 건너뛴다 */
  playFromQueue(section: 'history' | 'forward' | 'source' | 'autoplay', index: number) {
    const { history, forward, playlist } = state;
    const nextHistory = withHistory(history, entryOfCurrent());
    if (section === 'history') {
      const entry = history[index];
      if (entry) playEntry(entry, { playlist, origin: 'insert', history: nextHistory, forward });
      return;
    }
    if (section === 'forward') {
      const entry = forward[index];
      if (!entry) return;
      const at = entry.origin === 'source' && playlist ? placeOf(playlist, entry.track, entry.sourceIndex) : -1;
      const nextPlaylist = playlist && at >= 0 ? { ...playlist, index: at } : playlist;
      playEntry(entry, {
        playlist: nextPlaylist,
        origin: at >= 0 ? 'source' : entry.origin === 'source' ? 'insert' : entry.origin,
        history: nextHistory,
        forward: forward.slice(index + 1),
      });
      return;
    }
    if (section === 'source') {
      if (!playlist) return;
      void playFromSource(playlist, playlist.index + 1 + index, { history: nextHistory, forward });
      return;
    }
    const picks = state.autoplayItems.slice(index);
    void playItems(
      picks.map((item) => ({
        item,
        patch: (): QueuePatch => ({ playlist: state.playlist, origin: 'autoplay', history: nextHistory, forward }),
      }))
    );
  },

  /** 대기열에서 한 줄을 뺀다 */
  removeFromQueue(section: 'forward' | 'source', index: number) {
    const { forward, playlist } = state;
    if (section === 'forward') {
      setState({ forward: forward.filter((_, i) => i !== index) });
    } else if (playlist) {
      const at = playlist.index + 1 + index;
      const removed = playlist.items[at];
      const items = playlist.items.filter((_, i) => i !== at);
      // 새로고침 뒤에는 같은 객체가 아니라서 작품·구간으로 찾아 하나만 뺀다
      const originalAt = removed
        ? (playlist.original ?? []).findIndex((item) => item.pieceId === removed.pieceId && item.sectorId === removed.sectorId)
        : -1;
      const original = playlist.original?.filter((_, i) => i !== originalAt);
      setState({ playlist: { ...playlist, items, ...(original ? { original } : null) } });
    }
    dirty = true;
    flushSession();
    refreshAutoplay();
  },

  /** 비우기: 지금 곡만 남기고 다음에 나올 곡을 비운다. 자동 재생은 그대로 이어진다 */
  clearQueue() {
    const { playlist } = state;
    setState({
      forward: [],
      playlist: playlist ? { ...playlist, items: playlist.items.slice(0, playlist.index + 1), original: undefined } : null,
    });
    dirty = true;
    flushSession();
    refreshAutoplay();
  },

  setShuffle(on: boolean) {
    writeStored(SHUFFLE_KEY, on ? 'on' : 'off');
    const { playlist } = state;
    setState({
      shuffle: on,
      playlist: playlist ? (on ? shufflePlaylist(playlist) : unshufflePlaylist(playlist)) : null,
    });
    dirty = true;
    flushSession();
  },

  /** 끔 → 전체 → 한 곡 → 끔 */
  cycleRepeat() {
    const repeat: RepeatMode = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
    writeStored(REPEAT_KEY, repeat);
    setState({ repeat });
  },

  setAutoplay(on: boolean) {
    writeStored(AUTOPLAY_KEY, on ? 'on' : 'off');
    setState({ autoplay: on });
    // 끌 때는 골라 둔 곡을 지우지 않는다(패널에서 흐리게 남겨 두고, 다시 켜면 바로 쓴다)
    if (on && !state.autoplayItems.length) refreshAutoplay();
  },

  /** 자동 재생 곡을 다시 고른다(못 찾았을 때 「다시 시도」) */
  retryAutoplay() {
    refreshAutoplay();
  },

  setQueueOpen(open: boolean) {
    writeStored(QUEUE_OPEN_KEY, open ? '1' : '0');
    setState({ queueOpen: open });
  },

  /** 취향 추천 목록을 받는다(로그인하면 서버가 고른 것, 아니면 이 기기의 답으로 고른 것) */
  setTastePool(items: readonly AutoplayCandidate[]) {
    tastePool = items;
    if (state.current && state.autoplay) refreshAutoplay();
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

  /** 재생 바의 ✕: 멈추고 재생 목록까지 비운다. 연주별 위치는 남긴다 */
  close() {
    const { current, progress } = state;
    navToken += 1;
    media?.pause();
    if (current && progress.duration > 0) savePosition(current.performanceId, progress.current, progress.duration);
    setState({
      current: null,
      playing: false,
      playIntent: null,
      queue: [],
      playlist: null,
      origin: 'insert',
      history: [],
      forward: [],
      autoplayItems: [],
      autoplayStatus: 'idle',
      restored: false,
      progress: { current: 0, duration: 0 },
    });
    autoplayToken += 1;
    dirty = true;
    flushSession();
  },

  seek(seconds: number) {
    const current = state.current;
    if (!current) return;
    const duration = state.progress.duration || current.durationSec;
    const target = Math.max(0, Math.min(seconds, duration));
    savePosition(current.performanceId, target);
    if (listen.performanceId === current.performanceId) listen.lastSec = target;
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

  setCrossfade(on: boolean) {
    writeStored(CROSSFADE_KEY, on ? 'on' : 'off');
    setState({ crossfade: on });
  },

  /** 웹은 영상이 셸에 하나뿐이라 보기 방식을 바꿔도 영상은 그대로 이어진다 */
  setTheater(theater: boolean) {
    if (theater === state.theater) return;
    setState({ theater });
  },

  /**
   * 집중 비교를 열고 닫는다. 웹은 집중 비교 화면의 두 영상이 재생을 맡는데, 그 영상이 소리를 내기 시작할 때까지
   * 셸 영상이 이어서 울리다가 집중 비교 화면이 멈춘다(끊기지 않게). 네이티브는 루트의 영상 하나가
   * 집중 비교 자리로 옮겨 가 그대로 이어진다
   */
  setFocus(focus: { a: number; b: number } | null) {
    if (focus && visit) visit.engaged = true;
    setState({ focus });
  },

  /** 미디어가 보고하는 상태 */
  reportPlaying(performanceId: number, playing: boolean) {
    if (state.current?.performanceId !== performanceId) return;
    if (playing && state.current) {
      if (!visit || listen.performanceId !== performanceId) beginListening(state.current);
      if (visit) visit.started = true;
    }
    if (state.playing !== playing) setState({ playing, ...(playing ? { restored: false } : null) });
  },

  reportProgress(performanceId: number, current: number, duration: number) {
    const track = state.current;
    if (track?.performanceId !== performanceId) return;
    const total = duration || track.durationSec;
    if (state.playing) countPlayback(track, current, total);
    else listen.lastSec = current;
    savePosition(performanceId, current);
    setState({ progress: { current, duration: total } });
  },

  reportEnded(performanceId: number) {
    const track = state.current;
    if (track?.performanceId === performanceId && listen.performanceId === performanceId) {
      const total = state.progress.duration || track.durationSec;
      noteFinished(track, total, total);
    }
    savePosition(performanceId, 0);
    if (state.current?.performanceId !== performanceId) return;
    // 한 곡 반복: 같은 연주를 처음부터 다시
    if (state.repeat === 'one' && media?.performanceId === performanceId) {
      media.seek(0);
      media.play();
      return;
    }
    setState({ playing: false });
    // 비교 화면에서 그 영상을 보는 중이면(나란히 듣는 중) 멈춘다. 아니면 대기열의 다음 곡으로 넘어간다.
    // 앱은 끝을 두 번 알릴 때가 있어 같은 연주에서 한 번만 넘긴다
    if (state.surface === 'slot' || advancedFrom === performanceId) return;
    advancedFrom = performanceId;
    void advance().finally(() => {
      if (advancedFrom === performanceId) advancedFrom = null;
    });
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

  /** 이 연주가 지금 앱 플레이어에서 나오고 있으면 그 위치(초), 아니면 null */
  livePosition(performanceId: number): number | null {
    if (state.current?.performanceId !== performanceId || media?.performanceId !== performanceId) return null;
    return media.currentTime?.() ?? state.progress.current;
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

  exitFullscreen() {
    host?.exitFullscreen();
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
