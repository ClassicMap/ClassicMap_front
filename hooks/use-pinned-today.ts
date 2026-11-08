import { getLocale, relocalize, useLocale } from '@/lib/i18n';
import type { RecommendedPiece } from '@/lib/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

const STORAGE_KEY = 'classicmap.today-pin.v1';

interface TodayPin {
  /** 이 기기 날짜 YYYY-MM-DD */
  day: string;
  /** 고를 때의 취향 답·로그인 상태. 바뀌면 새로 고른다 */
  context: string;
  piece: RecommendedPiece;
}

/** 추천 응답이 언제 받은 것인지. 옛 추천을 새 조건으로 고정하지 않으려고 본다 */
export interface TodaySource {
  /** 응답을 받은 시각(ms). 받은 적 없으면 0 */
  updatedAt: number;
  /** 이전 조건의 응답을 자리만 지키려고 보여 주는 중인지 (keepPreviousData) */
  placeholder: boolean;
}

function localDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${date}`;
}

function startOfDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function isPin(value: unknown): value is TodayPin {
  if (typeof value !== 'object' || value === null) return false;
  const pin = value as Record<string, unknown>;
  const piece = pin.piece as Record<string, unknown> | null | undefined;
  return (
    typeof pin.day === 'string' &&
    typeof pin.context === 'string' &&
    typeof piece === 'object' &&
    piece !== null &&
    typeof piece.pieceId === 'number' &&
    typeof piece.pieceTitle === 'string' &&
    Array.isArray(piece.performers)
  );
}

/**
 * 오늘의 비교를 하루 동안 고정한다. 추천은 최근 본 작품이 바뀔 때마다 다시 계산돼서,
 * 작품 하나를 보고 홈으로 돌아오면 오늘의 비교가 다른 곡으로 바뀌었다.
 * 같은 날·같은 취향 답이면 처음 보여 준 곡을 그대로 쓰고, 날짜나 답이 바뀌면 새 추천을 받는다.
 *
 * 답이 바뀐 직후에는 화면에 아직 옛 추천이 남아 있다(로그인은 낙관 갱신 뒤 서버 저장을 기다리고,
 * 게스트는 이전 응답을 자리 지킴으로 보여 준다). 그 옛 곡을 새 조건으로 고정하지 않도록,
 * 조건이 바뀐 뒤(그리고 오늘) 새로 받은 응답만 고정한다. 저장소를 못 쓰면 추천을 그대로 쓴다.
 * 반환: undefined = 아직 저장소를 읽는 중, null = 오늘의 비교 없음
 */
export function usePinnedToday(
  candidate: RecommendedPiece | null,
  context: string,
  source: TodaySource
): RecommendedPiece | null | undefined {
  const [stored, setStored] = React.useState<TodayPin | null | undefined>(undefined);
  // 조건이 마지막으로 바뀐 시각. 처음 그릴 때의 조건은 바뀐 것으로 치지 않는다
  const contextSince = React.useRef<{ context: string; since: number } | null>(null);
  if (contextSince.current === null) contextSince.current = { context, since: 0 };
  else if (contextSince.current.context !== context) contextSince.current = { context, since: Date.now() };

  React.useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        setStored(isPin(parsed) ? parsed : null);
      })
      .catch(() => !cancelled && setStored(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const day = localDay(now);
  const pinned = stored && stored.day === day && stored.context === context ? stored.piece : null;
  const freshSince = Math.max(startOfDay(now), contextSince.current.since);
  const pinnable = Boolean(candidate) && !source.placeholder && source.updatedAt >= freshSince;

  React.useEffect(() => {
    if (stored === undefined || !candidate || pinned || !pinnable) return;
    const next: TodayPin = { day, context, piece: candidate };
    setStored(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [candidate, context, day, pinnable, pinned, stored]);

  const { locale } = useLocale();
  const shown = pinned ?? candidate;
  // 고정해 둔 곡은 고를 때 언어로 이름이 저장돼 있다. 남겨 둔 두 언어 값으로 지금 언어를 다시 고른다
  const localized = React.useMemo(() => (shown ? relocalizeRecommended(shown) : shown), [shown, locale]);
  if (stored === undefined) return undefined;
  return localized;
}

function relocalizeRecommended(piece: RecommendedPiece): RecommendedPiece {
  const base = relocalize(piece);
  const reasons = piece.reasonsByLocale;
  return {
    ...base,
    performers: base.performers.map((performer) => relocalize(performer)),
    reasons: reasons ? (getLocale() === 'en' && reasons.en.length > 0 ? reasons.en : reasons.ko) : piece.reasons,
  };
}
