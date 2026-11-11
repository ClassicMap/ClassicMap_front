import { useTaste } from '@/lib/hooks/useTaste';
import { candidateFromPiece, tasteGenres } from '@/lib/player/autoplay';
import { comparePlayer } from '@/lib/player/compare-player-store';
import { useHomeRecommendations } from '@/lib/query/hooks/useHomeRecommendations';
import * as React from 'react';

/**
 * 자동 재생에 취향 추천을 넘긴다. 홈 추천과 같은 것(로그인하면 서버가 저장된 취향·들은 기록으로 고른 것,
 * 아니면 이 기기의 답으로 고른 것)이라, 목록이 끝나도 취향에 맞춘 하이라이트가 이어진다. 그리는 것은 없다
 */
export function AutoplayTasteFeed() {
  const recommendations = useHomeRecommendations().data;
  const sounds = useTaste().answers.sounds;
  React.useEffect(() => {
    if (!recommendations) return;
    const seen = new Set<number>();
    const candidates = [
      recommendations.today,
      ...recommendations.shelves.flatMap((shelf) => shelf.items),
    ]
      .filter((piece): piece is NonNullable<typeof piece> => {
        if (!piece || seen.has(piece.pieceId)) return false;
        seen.add(piece.pieceId);
        return true;
      })
      .map((piece) => candidateFromPiece(piece, piece.sectorId, piece.reasons[0]));
    comparePlayer.setTastePool(candidates, tasteGenres(sounds));
  }, [recommendations, sounds]);
  return null;
}
