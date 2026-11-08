import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { PieceAPI } from '@/lib/api/client';
import { AdminPieceAPI } from '@/lib/api/admin';
import type { ComposerPieceFilter, Piece } from '@/lib/types/models';

/**
 * 쿼리 키 상수
 */
export const PIECE_QUERY_KEYS = {
  all: ['pieces'] as const,
  detail: (id: number) => ['pieces', id] as const,
  byComposer: (composerId: number) => ['pieces', 'composer', composerId] as const,
  parts: (id: number) => ['pieces', id, 'parts'] as const,
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

const COMPOSER_PIECES_PAGE = 30;

/**
 * 작곡가 작품 목록 쿼리 설정. 화면 훅과 미리 부르기(lib/navigation/prefetch)가 같이 쓴다.
 * 페이지를 이어 붙인다(프로젝트 지침: 전체를 한 번에 받지 않는다). 거르기마다 따로 캐시한다
 */
export function composerPiecesQueryOptions(
  composerId: number,
  filter: ComposerPieceFilter = {},
  pageSize: number = COMPOSER_PIECES_PAGE
) {
  return infiniteQueryOptions({
    queryKey: [...PIECE_QUERY_KEYS.byComposer(composerId), 'pages', filter, pageSize] as const,
    queryFn: ({ pageParam }) =>
      PieceAPI.getPageByComposer(composerId, { offset: pageParam, limit: pageSize, ...filter }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < pageSize ? undefined : pages.length * pageSize,
    initialPageParam: 0,
    staleTime: 5 * 60_000,
  });
}

export function useComposerPieces(
  composerId: number | undefined,
  filter: ComposerPieceFilter = {},
  options: { pageSize?: number; enabled?: boolean; keepPrevious?: boolean } = {}
) {
  return useInfiniteQuery({
    ...composerPiecesQueryOptions(composerId ?? 0, filter, options.pageSize),
    enabled: (composerId ?? 0) > 0 && options.enabled !== false,
    // 검색어가 바뀌는 동안 앞 결과를 그대로 두어 목록이 깜빡이지 않게 한다
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

/** 작곡가 작품의 갈래·형식별 개수 */
export function composerCatalogQueryOptions(composerId: number, q = '') {
  return queryOptions({
    queryKey: [...PIECE_QUERY_KEYS.byComposer(composerId), 'catalog', q] as const,
    queryFn: () => PieceAPI.getCatalog(composerId, q || undefined),
    staleTime: 5 * 60_000,
  });
}

/** q 를 주면 검색 결과의 갈래별 수다. 검색어가 바뀌는 동안 앞 수를 그대로 둔다 */
export function useComposerCatalog(composerId: number | undefined, q = '') {
  return useQuery({
    ...composerCatalogQueryOptions(composerId ?? 0, q),
    enabled: (composerId ?? 0) > 0,
    placeholderData: q ? keepPreviousData : undefined,
  });
}

/**
 * 묶음 작품 안의 곡. 목록 행마다 붙으므로 펼쳤을 때만(enabled) 받는다
 */
export function usePieceParts(pieceId: number, enabled: boolean) {
  return useQuery({
    queryKey: PIECE_QUERY_KEYS.parts(pieceId),
    queryFn: () => PieceAPI.getParts(pieceId),
    enabled: enabled && pieceId > 0,
    staleTime: 5 * 60_000,
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
