import { recordListeningEvent } from '@/lib/data/listening-events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

/**
 * 최근 본 비교 작품. 이 기기에만 남는 편의 기록이라 서버에 보내지 않는다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 빈 목록으로 둔다.
 */
export interface RecentPiece {
  pieceId: number;
  pieceTitle: string;
  composerId: number;
  composerName: string;
  composerAvatarUrl: string | null;
  sectorId: number | null;
  sectorName: string | null;
  viewedAt: number;
}

const STORAGE_KEY = 'classicmap.recent-pieces.v1';
const MAX_ITEMS = 12;
/** 같은 작품을 이만큼 지나 다시 열면 새로 연 것으로 센다 */
const REOPEN_AFTER_MS = 30 * 60_000;
const QUERY_KEY = ['recent-pieces'] as const;

function isRecentPiece(value: unknown): value is RecentPiece {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.pieceId === 'number' &&
    typeof item.pieceTitle === 'string' &&
    typeof item.composerId === 'number' &&
    typeof item.composerName === 'string' &&
    typeof item.viewedAt === 'number'
  );
}

async function readRecentPieces(): Promise<RecentPiece[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecentPiece) : [];
  } catch {
    return [];
  }
}

export function useRecentPieces() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: readRecentPieces,
    staleTime: Infinity,
  });
}

/** 작품을 열 때 부른다. 같은 작품은 맨 앞으로 옮긴다. */
export function useRecordRecentPiece() {
  const queryClient = useQueryClient();
  return React.useCallback(
    async (piece: Omit<RecentPiece, 'viewedAt'>) => {
      const current = await readRecentPieces();
      // 들은 기록의 '열기'는 작품을 새로 열었을 때만 남긴다. 구간만 바꾼 것은 세지 않는다
      const previous = current[0];
      if (!previous || previous.pieceId !== piece.pieceId || Date.now() - previous.viewedAt > REOPEN_AFTER_MS) {
        recordListeningEvent({ pieceId: piece.pieceId, sectorId: piece.sectorId, kind: 'open' });
      }
      const next = [
        { ...piece, viewedAt: Date.now() },
        ...current.filter((item) => item.pieceId !== piece.pieceId),
      ].slice(0, MAX_ITEMS);
      queryClient.setQueryData(QUERY_KEY, next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장하지 못해도 이번 세션 목록은 유지된다
      }
    },
    [queryClient]
  );
}
