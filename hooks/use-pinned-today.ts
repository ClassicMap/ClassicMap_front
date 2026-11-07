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

function localDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${date}`;
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
 * 저장소를 못 쓰면 그냥 추천 그대로 쓴다.
 * 반환: undefined = 아직 저장소를 읽는 중, null = 오늘의 비교 없음
 */
export function usePinnedToday(candidate: RecommendedPiece | null, context: string): RecommendedPiece | null | undefined {
  const [stored, setStored] = React.useState<TodayPin | null | undefined>(undefined);

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

  const day = localDay(new Date());
  const pinned = stored && stored.day === day && stored.context === context ? stored.piece : null;

  React.useEffect(() => {
    if (stored === undefined || !candidate || pinned) return;
    const next: TodayPin = { day, context, piece: candidate };
    setStored(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [candidate, context, day, pinned, stored]);

  if (stored === undefined) return undefined;
  return pinned ?? candidate;
}
