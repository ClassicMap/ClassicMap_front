import { EMPTY_REPERTOIRE_IDS, type RepertoireIds, toRepertoireIds } from '@/lib/data/library';
import { useMyRepertoire } from '@/lib/query/hooks/useRecordings';
import { useAuth } from '@clerk/clerk-expo';
import * as React from 'react';

/**
 * 내 레퍼토리에 담긴 id. 로그인 전이거나 아직 못 불러왔으면 빈 집합이라 표시가 없다.
 * 레퍼토리 목록과 같은 쿼리를 써서 담기·빼기가 바로 반영된다.
 */
export function useRepertoireIds(): RepertoireIds {
  const { isSignedIn } = useAuth();
  const favorites = useMyRepertoire(isSignedIn === true);
  const data = isSignedIn ? favorites.data : undefined;
  return React.useMemo(() => (data ? toRepertoireIds(data) : EMPTY_REPERTOIRE_IDS), [data]);
}
