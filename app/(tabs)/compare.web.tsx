import { CompareMobileScreen } from '@/components/compare/compare-mobile-screen';
import { CompareCatalog } from '@/components/shell/compare/compare-catalog';
import { ComparePieceView } from '@/components/shell/compare/compare-piece-view';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

function toId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * 웹 비교 화면 (설계 문서 5.2). 좁은 웹은 모바일 비교 화면을 쓰고,
 * 데스크톱은 새 비교 API(공개 섹터·구간 연주)로 카탈로그 → 작품 비교를 보여 준다.
 */
export default function CompareScreenWeb() {
  const { nav } = useBreakpoint();
  const router = useRouter();
  const params = useLocalSearchParams<{ pieceId?: string; sectorId?: string; composerId?: string }>();
  const pieceId = toId(params.pieceId);
  const sectorId = toId(params.sectorId);
  const composerId = toId(params.composerId);

  if (nav === 'tabs') return <CompareMobileScreen />;

  return (
    <View className="flex-1 bg-surface-1">
      {pieceId ? (
        <ComparePieceView
          pieceId={pieceId}
          composerId={composerId}
          sectorId={sectorId}
          onBack={() => router.setParams({ pieceId: undefined, sectorId: undefined, composerId: undefined })}
          onSelectSector={(id) => router.setParams({ sectorId: String(id) })}
        />
      ) : (
        <CompareCatalog
          onOpen={(piece) =>
            router.setParams({
              composerId: String(piece.composerId),
              pieceId: String(piece.pieceId),
              sectorId: undefined,
            })
          }
        />
      )}
    </View>
  );
}
