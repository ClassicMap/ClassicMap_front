import { useLocale } from '@/lib/i18n';
import {
  CompareMobileCatalog,
  CompareMobileComposerPieces,
  CompareMobilePiece,
} from '@/features/compare/components/compare-mobile';
import { EdgeSwipeBack } from '@/features/compare/components/edge-swipe-back';
import { FocusCompare, parseFocusParam } from '@/features/compare/components/focus-compare';
import { CompareGenrePieces } from '@/features/compare/components/genre-browse';
import { isPieceGenre } from '@/lib/design/genre-palette';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

function toId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** 네이티브와 좁은 웹의 비교 탭: 작곡가 → 작곡가의 작품 → 작품 비교. 주소 파라미터가 곧 상태다 */
export function CompareMobileScreen() {
  useLocale();
  const router = useRouter();
  const params = useLocalSearchParams<{
    pieceId?: string;
    sectorId?: string;
    composerId?: string;
    focus?: string;
    genre?: string;
  }>();
  const genre = isPieceGenre(params.genre) ? params.genre : undefined;
  const pieceId = toId(params.pieceId);
  const composerId = toId(params.composerId);
  const focus = parseFocusParam(params.focus);

  if (pieceId && focus) {
    return (
      <FocusCompare
        pieceId={pieceId}
        composerId={composerId}
        sectorId={toId(params.sectorId)}
        focus={focus}
        onExit={() => router.setParams({ focus: undefined })}
        onChangeSector={(id, a, b) =>
          router.setParams({ sectorId: String(id), focus: `${a},${b}` })
        }
      />
    );
  }

  if (pieceId) {
    return (
      <CompareMobilePiece
        pieceId={pieceId}
        composerId={composerId}
        sectorId={toId(params.sectorId)}
        // 작품에서 나오면 그 작곡가의 작품 목록으로 돌아간다
        onBack={(backComposerId) =>
          router.setParams({
            pieceId: undefined,
            sectorId: undefined,
            composerId: backComposerId ? String(backComposerId) : undefined,
          })
        }
        onSelectSector={(id) => router.setParams({ sectorId: String(id) })}
        onFocus={(a, b) => router.setParams({ focus: `${a},${b}` })}
      />
    );
  }

  if (genre) {
    const back = () => router.setParams({ genre: undefined });
    return (
      <EdgeSwipeBack onBack={back}>
        <CompareGenrePieces
          genre={genre}
          wide={false}
          onBack={back}
          onSelectGenre={(key) => router.setParams({ genre: key })}
          onOpen={(piece) =>
            router.push(`/compare?composerId=${piece.composerId}&pieceId=${piece.pieceId}` as Href)
          }
        />
      </EdgeSwipeBack>
    );
  }

  if (composerId) {
    const back = () => router.setParams({ composerId: undefined });
    return (
      <EdgeSwipeBack onBack={back}>
        <CompareMobileComposerPieces
          composerId={composerId}
          onBack={back}
          onOpen={(piece) =>
            router.setParams({ pieceId: String(piece.pieceId), sectorId: undefined })
          }
        />
      </EdgeSwipeBack>
    );
  }

  return (
    <CompareMobileCatalog
      onOpenGenre={(key) => router.push(`/compare?genre=${key}` as Href)}
      onOpenComposer={(id) => router.setParams({ composerId: String(id) })}
      onOpenPiece={(piece) =>
        router.setParams({
          composerId: String(piece.composerId),
          pieceId: String(piece.pieceId),
          sectorId: undefined,
        })
      }
    />
  );
}
