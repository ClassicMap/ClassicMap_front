// 레거시 호환성을 위한 Mock 데이터
// 새 코드에서는 lib/data/mockDatabase.ts 사용 권장

import { MOCK_ARTISTS } from './data/mockDatabase';

// 기존 형식과 호환되도록 변환
export const ARTISTS = MOCK_ARTISTS.map(artist => ({
  id: String(artist.id),
  name: artist.name,
  category: artist.category,
  tier: artist.tier as 'S' | 'Rising',
  rating: artist.rating,
  image: artist.imageUrl || '',
}));
