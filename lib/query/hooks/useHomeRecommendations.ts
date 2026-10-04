import { useRecentPieces } from '@/hooks/use-recent-pieces';
import { type GuestSignals, TasteAPI } from '@/lib/api/taste';
import { TASTE_QUERY_KEYS, useTaste } from '@/lib/hooks/useTaste';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as React from 'react';

const RECENT_DAYS = 7;

/**
 * 홈 추천. 로그인하면 서버가 저장된 취향·담아 둔 것·들은 기록으로 고르고,
 * 아니면 이 기기에 둔 답과 최근 본 작품을 실어 보내 계산만 받는다.
 * 취향을 아직 못 읽었으면(가입 직후 등) 부르지 않고, 홈은 예전 방식으로 보여 준다.
 */
export function useHomeRecommendations() {
  const taste = useTaste();
  const recent = useRecentPieces().data;

  const guestSignals = React.useMemo<GuestSignals>(() => {
    const since = Date.now() - RECENT_DAYS * 86_400_000;
    return {
      answers: taste.guest.answers,
      favoriteComposerIds: taste.guest.favoriteComposerIds,
      favoriteArtistIds: taste.guest.favoriteArtistIds,
      recentPieceIds: (recent ?? [])
        .filter((item) => item.viewedAt >= since)
        .map((item) => item.pieceId),
      notInterestedPieceIds: taste.guest.notInterestedPieceIds,
    };
  }, [recent, taste.guest]);

  const mine = useQuery({
    queryKey: TASTE_QUERY_KEYS.myRecommendations,
    queryFn: TasteAPI.getMyHome,
    enabled: taste.ready && taste.signedIn,
    staleTime: 5 * 60_000,
  });
  const guest = useQuery({
    queryKey: [...TASTE_QUERY_KEYS.guestRecommendations, guestSignals],
    queryFn: () => TasteAPI.getGuestHome(guestSignals),
    enabled: taste.ready && !taste.signedIn,
    staleTime: 5 * 60_000,
    // 답을 바꾸는 동안 이전 추천을 그대로 둬서 홈이 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  });
  return taste.signedIn ? mine : guest;
}
