import { TasteAPI } from '@/lib/api/taste';
import { comparePlayer } from '@/lib/player/compare-player-store';
import type { ListeningEvent } from '@/lib/types/models';
import { AppState, Platform } from 'react-native';

/**
 * 들은 기록(작품 열기·끝까지 들음·넘김)을 모아 서버로 보낸다.
 * 로그인했고 설정에서 기록을 켠 사람만 보낸다. 상태는 useTasteSync 가 정한다.
 * - off: 버린다(로그인 전이거나 기록을 껐다)
 * - pending: 로그인했는데 설정을 아직 못 읽었다. 모아 두었다가 켜지면 보내고 꺼지면 버린다
 * - on: 모아서 보낸다
 * 보내지 못한 기록은 버린다. 추천을 조금 덜 맞출 뿐이라 다시 보내려고 붙잡지 않는다.
 */
const FLUSH_DELAY_MS = 4_000;
const FLUSH_SIZE = 20;
const MAX_BATCH = 50;
/** 설정을 기다리는 동안 모아 둘 최대 수 */
const MAX_PENDING = 100;

export type ListeningHistoryMode = 'off' | 'pending' | 'on';

let mode: ListeningHistoryMode = 'off';
let queue: ListeningEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (mode !== 'on' || queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  void TasteAPI.sendEvents(batch).catch(() => undefined);
  if (queue.length > 0) flush();
}

export function setListeningHistoryMode(next: ListeningHistoryMode) {
  mode = next;
  if (next === 'off') {
    queue = [];
    if (timer) clearTimeout(timer);
    timer = null;
  } else if (next === 'on' && queue.length > 0) {
    flush();
  }
}

export function recordListeningEvent(event: ListeningEvent) {
  if (mode === 'off') return;
  queue.push(event);
  if (mode === 'pending') {
    if (queue.length > MAX_PENDING) queue = queue.slice(-MAX_PENDING);
    return;
  }
  if (queue.length >= FLUSH_SIZE) flush();
  else if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS);
}

comparePlayer.onListening(({ kind, track }) =>
  recordListeningEvent({
    pieceId: track.pieceId,
    sectorId: track.sectorId,
    performanceId: track.performanceId,
    kind,
  })
);

// 앱을 내리거나 탭을 숨기면 모아 둔 것을 바로 보낸다
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
} else {
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') flush();
  });
}
