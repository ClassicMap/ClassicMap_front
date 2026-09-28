import { type FavoriteGroups, type FavoriteTargetType, MyPageAPI } from '@/lib/api/client';
import { MY_PAGE_QUERY_KEYS, useMyFavorites } from '@/lib/query/hooks/useMyPage';
import { Alert } from '@/lib/utils/alert';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';

function isFavorite(groups: FavoriteGroups | undefined, kind: FavoriteTargetType, id: number): boolean {
  if (!groups) return false;
  switch (kind) {
    case 'concerts':
      return groups.concerts.some((item) => item.concertId === id);
    case 'artists':
      return groups.artists.some((item) => item.artistId === id);
    case 'composers':
      return groups.composers.some((item) => item.composerId === id);
    case 'pieces':
      return groups.pieces.some((item) => item.pieceId === id);
  }
}

function save(kind: FavoriteTargetType, id: number, next: boolean): Promise<void> {
  switch (kind) {
    case 'concerts':
      return next ? MyPageAPI.addFavoriteConcert(id) : MyPageAPI.deleteFavoriteConcert(id);
    case 'artists':
      return next ? MyPageAPI.addFavoriteArtist(id) : MyPageAPI.deleteFavoriteArtist(id);
    case 'composers':
      return next ? MyPageAPI.addFavoriteComposer(id) : MyPageAPI.deleteFavoriteComposer(id);
    case 'pieces':
      return next ? MyPageAPI.addFavoritePiece(id) : MyPageAPI.deleteFavoritePiece(id);
  }
}

/**
 * 레퍼토리(즐겨찾기) 담기·빼기. 누르는 즉시 표시를 바꾸고, 실패하면 되돌린다.
 * 로그인 전이면 로그인으로 안내한다.
 */
export function useFavorite(kind: FavoriteTargetType, id: number) {
  const { isSignedIn } = useClerkAuth();
  const favorites = useMyFavorites(Boolean(isSignedIn));
  const queryClient = useQueryClient();
  const router = useRouter();
  const [optimistic, setOptimistic] = React.useState<boolean | null>(null);
  const saved = isFavorite(favorites.data, kind, id);
  const active = optimistic ?? saved;

  const mutation = useMutation({
    mutationFn: (next: boolean) => save(kind, id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEYS.favorites }),
    onError: () => {
      setOptimistic(null);
      Alert.alert('레퍼토리에 반영하지 못했어요', '연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 눌러 주세요.');
    },
  });

  // 서버 목록이 따라오면 임시 표시를 걷는다
  React.useEffect(() => {
    if (optimistic !== null && optimistic === saved) setOptimistic(null);
  }, [optimistic, saved]);

  const toggle = React.useCallback(() => {
    if (!isSignedIn) {
      Alert.alert('로그인이 필요해요', '로그인하면 레퍼토리에 담아 두고 언제든 다시 볼 수 있어요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/(auth)/sign-in' as Href) },
      ]);
      return;
    }
    const next = !active;
    setOptimistic(next);
    mutation.mutate(next);
  }, [active, isSignedIn, mutation, router]);

  return { active, toggle, pending: mutation.isPending };
}
