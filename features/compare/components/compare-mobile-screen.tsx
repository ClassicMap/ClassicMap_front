import { useLocale } from '@/lib/i18n';
import {
  CompareMobileCatalog,
  CompareMobileComposerPieces,
  CompareMobilePiece,
} from '@/features/compare/components/compare-mobile';
import { FocusCompare, parseFocusParam } from '@/features/compare/components/focus-compare';
import { CompareGenrePieces } from '@/features/compare/components/genre-browse';
import { useCompareStackBack } from '@/features/compare/hooks/use-compare-stack-back';
import { isPieceGenre } from '@/lib/design/genre-palette';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

function toId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** 앱은 다음 단계를 비교 스택에 새 화면으로 쌓고, 좁은 웹은 지금 주소의 파라미터만 바꾼다 */
const STACKED = Platform.OS !== 'web';

type CompareParams = Partial<
  Record<'composerId' | 'pieceId' | 'sectorId' | 'focus' | 'genre', string | number>
>;

function compareHref(params: CompareParams): Href {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `/compare${query ? `?${query}` : ''}` as Href;
}

/** 네이티브와 좁은 웹의 비교 탭: 작곡가 → 작곡가의 작품 → 작품 비교 → 1:1. 주소 파라미터가 곧 상태다 */
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
  const sectorId = toId(params.sectorId);
  const composerId = toId(params.composerId);
  const focus = parseFocusParam(params.focus);

  const isTopLevel = !pieceId && !genre && !composerId;
  const { poppable, showBack } = useCompareStackBack(isTopLevel);
  // 앱에서 아래에 쌓인 화면이 있으면 그 화면으로, 없으면 위 단계로
  const back = (fallback: () => void) => (poppable ? router.back() : fallback());

  if (pieceId && focus) {
    return (
      <FocusCompare
        pieceId={pieceId}
        composerId={composerId}
        sectorId={sectorId}
        focus={focus}
        showExit={showBack}
        onExit={() => back(() => router.setParams({ focus: undefined }))}
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
        sectorId={sectorId}
        // 작품에서 나오면 그 작곡가의 작품 목록으로 돌아간다
        showBack={showBack}
        onBack={(backComposerId) =>
          back(() =>
            router.setParams({
              pieceId: undefined,
              sectorId: undefined,
              composerId: backComposerId ? String(backComposerId) : undefined,
            })
          )
        }
        onSelectSector={(id) => router.setParams({ sectorId: String(id) })}
        onFocus={(a, b) =>
          STACKED
            ? router.push(compareHref({ composerId, pieceId, sectorId, focus: `${a},${b}` }))
            : router.setParams({ focus: `${a},${b}` })
        }
      />
    );
  }

  if (genre) {
    return (
      <CompareGenrePieces
        genre={genre}
        wide={false}
        showBack={showBack}
        onBack={() => back(() => router.setParams({ genre: undefined }))}
        onSelectGenre={(key) => router.setParams({ genre: key })}
        onOpen={(piece) =>
          router.push(compareHref({ composerId: piece.composerId, pieceId: piece.pieceId }))
        }
      />
    );
  }

  if (composerId) {
    return (
      <CompareMobileComposerPieces
        composerId={composerId}
        showBack={showBack}
        onBack={() => back(() => router.setParams({ composerId: undefined }))}
        onOpen={(piece) =>
          STACKED
            ? router.push(compareHref({ composerId, pieceId: piece.pieceId }))
            : router.setParams({ pieceId: String(piece.pieceId), sectorId: undefined })
        }
      />
    );
  }

  return (
    <CompareMobileCatalog
      onOpenGenre={(key) => router.push(compareHref({ genre: key }))}
      onOpenComposer={(id) =>
        STACKED
          ? router.push(compareHref({ composerId: id }))
          : router.setParams({ composerId: String(id) })
      }
      onOpenPiece={(piece) =>
        STACKED
          ? router.push(compareHref({ composerId: piece.composerId, pieceId: piece.pieceId }))
          : router.setParams({
              composerId: String(piece.composerId),
              pieceId: String(piece.pieceId),
              sectorId: undefined,
            })
      }
    />
  );
}
