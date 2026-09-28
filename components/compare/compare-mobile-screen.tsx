import { CompareMobileCatalog, CompareMobilePiece } from '@/components/compare/compare-mobile';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

function toId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** 네이티브와 좁은 웹의 비교 탭: 카탈로그 → 작품 비교. 주소 파라미터가 곧 상태다 */
export function CompareMobileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pieceId?: string; sectorId?: string; composerId?: string }>();
  const pieceId = toId(params.pieceId);

  if (!pieceId) {
    return (
      <CompareMobileCatalog
        onOpen={(piece) =>
          router.setParams({ composerId: String(piece.composerId), pieceId: String(piece.pieceId), sectorId: undefined })
        }
      />
    );
  }

  return (
    <CompareMobilePiece
      pieceId={pieceId}
      composerId={toId(params.composerId)}
      sectorId={toId(params.sectorId)}
      onBack={() => router.setParams({ pieceId: undefined, sectorId: undefined, composerId: undefined })}
      onSelectSector={(id) => router.setParams({ sectorId: String(id) })}
    />
  );
}
