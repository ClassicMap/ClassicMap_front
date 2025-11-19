/**
 * React Query 훅 통합 Export
 * 모든 데이터 페칭 훅을 한 곳에서 import 가능
 */

// 작곡가 훅
export {
  useComposers,
  useComposer,
  useCreateComposer,
  useUpdateComposer,
  useDeleteComposer,
  COMPOSER_QUERY_KEYS,
} from './useComposers';

// 아티스트 훅
export {
  useArtists,
  useArtist,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  ARTIST_QUERY_KEYS,
} from './useArtists';

// 공연 훅
export {
  useConcerts,
  useConcert,
  useCreateConcert,
  useUpdateConcert,
  useDeleteConcert,
  CONCERT_QUERY_KEYS,
} from './useConcerts';

// 곡/작품 훅
export {
  usePiece,
  usePiecesByComposer,
  useCreatePiece,
  useUpdatePiece,
  useDeletePiece,
  PIECE_QUERY_KEYS,
} from './usePieces';
