import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieceAPI } from '@/lib/api/client';
import { AdminPieceAPI } from '@/lib/api/admin';
import type { Piece } from '@/lib/types/models';

/**
 * 쿼리 키 상수
 */
export const PIECE_QUERY_KEYS = {
  all: ['pieces'] as const,
  detail: (id: number) => ['pieces', id] as const,
  byComposer: (composerId: number) => ['pieces', 'composer', composerId] as const,
};

/**
 * 특정 곡 조회 훅
 * - 비교 페이지에서 사용
 * - 자동 캐싱 (5분 stale, 24시간 gc)
 */
export function usePiece(id: number | undefined) {
  return useQuery({
    queryKey: PIECE_QUERY_KEYS.detail(id!),
    queryFn: () => PieceAPI.getById(id!),
    enabled: !!id && id > 0,
  });
}

/**
 * 작곡가별 곡 목록 조회 훅
 */
export function usePiecesByComposer(composerId: number | undefined) {
  return useQuery({
    queryKey: PIECE_QUERY_KEYS.byComposer(composerId!),
    queryFn: () => PieceAPI.getByComposer(composerId!),
    enabled: !!composerId && composerId > 0,
  });
}

/**
 * 곡 생성 뮤테이션 훅
 */
export function useCreatePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof AdminPieceAPI.create>[0]) =>
      AdminPieceAPI.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.all });
      if (variables.composerId) {
        queryClient.invalidateQueries({
          queryKey: PIECE_QUERY_KEYS.byComposer(variables.composerId)
        });
      }
    },
  });
}

/**
 * 곡 수정 뮤테이션 훅
 */
export function useUpdatePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof AdminPieceAPI.update>[1] }) =>
      AdminPieceAPI.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.all });
    },
  });
}

/**
 * 곡 삭제 뮤테이션 훅
 */
export function useDeletePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => AdminPieceAPI.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PIECE_QUERY_KEYS.all });
    },
  });
}
