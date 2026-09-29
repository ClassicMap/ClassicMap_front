import { RepertoireMark, RepertoireThumb } from '@/components/library/repertoire-badge';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { ComparableComposer, ComparableComposers } from '@/lib/query/hooks/useComparisonPerformances';
import { EMPTY_REPERTOIRE_IDS, repertoireFirst, type RepertoireIds } from '@/lib/data/library';
import type { ComparisonPiece } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { searchMatchIndex } from '@/lib/utils/hangul-search';
import { ChevronRightIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

const PIECE_RESULT_LIMIT = 30;

export interface CompareSearchResult {
  composers: ComparableComposer[];
  pieces: ComparisonPiece[];
}

/**
 * 비교 탭 검색. 작곡가 이름(초성 포함)과 작품 제목·작품번호를 카탈로그 안에서 찾는다.
 * 이름 앞부분이 맞을수록, 같으면 비교할 수 있는 작품이 많을수록 위로 온다.
 */
export function searchComparable(
  data: ComparableComposers | undefined,
  query: string,
  repertoire: RepertoireIds = EMPTY_REPERTOIRE_IDS
): CompareSearchResult {
  if (!data || !query.trim()) return { composers: [], pieces: [] };
  const composers = data.composers
    .map((composer) => ({ composer, at: searchMatchIndex(composer.composerName, query) }))
    .filter((item) => item.at >= 0)
    .sort((a, b) => a.at - b.at || b.composer.pieceCount - a.composer.pieceCount)
    .map((item) => item.composer);
  const composerIds = new Set(composers.map((composer) => composer.composerId));
  // 초성만 친 검색어는 긴 작품 제목 중간에서 우연히 맞기 쉬워 작곡가 이름에만 쓴다
  const choseongOnly = /^[ㄱ-ㅎ\s]+$/.test(query.trim());
  const pieces = data.pieces
    .map((piece) => {
      const titleAt = choseongOnly ? -1 : searchMatchIndex(`${piece.pieceTitle} ${piece.opusNumber ?? ''}`, query);
      // 작곡가 이름이 맞으면 그 작곡가의 작품도 뒤에 붙인다
      const rank = titleAt >= 0 ? titleAt : composerIds.has(piece.composerId) ? 1000 : -1;
      return { piece, rank };
    })
    .filter((item) => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || b.piece.performerCount - a.piece.performerCount)
    .slice(0, PIECE_RESULT_LIMIT)
    .map((item) => item.piece);
  // 맞는 것 중 레퍼토리에 담은 것을 위로 (엔터로 여는 첫 결과도 그것)
  return {
    composers: repertoireFirst(composers, (composer) => repertoire.composers.has(composer.composerId)),
    pieces: repertoireFirst(pieces, (piece) => repertoire.pieces.has(piece.pieceId)),
  };
}

interface CompareSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** 엔터: 첫 결과 열기 */
  onSubmit: () => void;
  className?: string;
}

/** 작곡가·작품 검색 칸. 웹에서는 '/'를 누르면 바로 입력할 수 있다 */
export function CompareSearchField({ value, onChange, onSubmit, className }: CompareSearchFieldProps) {
  const inputRef = React.useRef<TextInput>(null);
  // 키보드가 있는 넓은 웹에서만 '/' 단축키를 알려 준다
  const { nav } = useBreakpoint();
  const showShortcut = Platform.OS === 'web' && nav !== 'tabs';

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <View
      className={cn(
        'h-11 flex-row items-center gap-2.5 rounded-full border border-border-strong bg-surface-2 px-4',
        className
      )}>
      <Icon as={SearchIcon} size={18} className="text-foreground-subtle" />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="작곡가나 작품 이름 (초성도 돼요)"
        placeholderTextColor="hsl(33 6% 46%)"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="비교할 작곡가나 작품 찾기"
        className="min-w-0 flex-1 text-base text-foreground web:outline-none"
      />
      {value ? (
        <Pressable accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => onChange('')}>
          <Icon as={XIcon} size={16} className="text-foreground-subtle" />
        </Pressable>
      ) : showShortcut ? (
        <View className="rounded border border-border px-1.5 py-0.5">
          <Text className="text-[11px] text-foreground-subtle">/</Text>
        </View>
      ) : null}
    </View>
  );
}

interface CompareSearchResultsProps {
  query: string;
  result: CompareSearchResult;
  repertoire?: RepertoireIds;
  onOpenComposer: (composerId: number) => void;
  onOpenPiece: (piece: ComparisonPiece) => void;
  onClear: () => void;
}

/** 검색 결과: 작곡가 줄 다음 작품 줄. 결과가 없으면 지우고 전체를 보게 한다 */
export function CompareSearchResults({
  query,
  result,
  repertoire = EMPTY_REPERTOIRE_IDS,
  onOpenComposer,
  onOpenPiece,
  onClear,
}: CompareSearchResultsProps) {
  if (result.composers.length === 0 && result.pieces.length === 0) {
    return (
      <View className="mt-10 items-center gap-2">
        <Text className="text-body font-semibold text-foreground">‘{query.trim()}’에 맞는 작곡가나 작품이 없어요</Text>
        <Text variant="caption">비교할 수 있는 작품만 찾아요. 다른 이름이나 초성으로 찾아보세요.</Text>
        <Pressable onPress={onClear} accessibilityRole="button" className="mt-2 rounded-full bg-surface-2 px-4 py-2">
          <Text className="text-body-sm font-semibold text-foreground">전체 작곡가 보기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mt-6 gap-7">
      {result.composers.length > 0 ? (
        <View>
          <Text variant="caption" className="mb-1.5 font-semibold text-foreground-subtle">
            작곡가 {result.composers.length}
          </Text>
          {result.composers.map((composer) => (
            <ResultRow
              key={composer.composerId}
              onPress={() => onOpenComposer(composer.composerId)}
              label={`${composer.composerName}${repertoire.composers.has(composer.composerId) ? ', 레퍼토리에 있어요' : ''}, 비교할 수 있는 작품 ${composer.pieceCount}곡`}
              thumb={
                <RepertoireThumb active={repertoire.composers.has(composer.composerId)} badgeSize={16}>
                  <EntityThumb name={composer.composerName} image={composer.composerAvatarUrl} shape="circle" size={44} />
                </RepertoireThumb>
              }
              inRepertoire={repertoire.composers.has(composer.composerId)}
              title={composer.composerName}
              meta={`비교할 수 있는 작품 ${composer.pieceCount}곡`}
            />
          ))}
        </View>
      ) : null}
      {result.pieces.length > 0 ? (
        <View>
          <Text variant="caption" className="mb-1.5 font-semibold text-foreground-subtle">
            작품 {result.pieces.length}
          </Text>
          {result.pieces.map((piece) => (
            <ResultRow
              key={piece.pieceId}
              onPress={() => onOpenPiece(piece)}
              label={`${piece.composerName} ${piece.pieceTitle}${repertoire.pieces.has(piece.pieceId) ? ', 레퍼토리에 있어요' : ''} 비교하기`}
              thumb={
                <RepertoireThumb active={repertoire.pieces.has(piece.pieceId)} badgeSize={16} shape="square">
                  <EntityThumb name={piece.pieceTitle} image={piece.composerAvatarUrl} shape="square" size={44} />
                </RepertoireThumb>
              }
              inRepertoire={repertoire.pieces.has(piece.pieceId)}
              title={piece.pieceTitle}
              meta={[piece.composerName, piece.opusNumber, `연주자 ${piece.performerCount}`].filter(Boolean).join(' · ')}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ResultRow({
  onPress,
  label,
  thumb,
  title,
  meta,
  inRepertoire = false,
}: {
  onPress: () => void;
  label: string;
  thumb: React.ReactNode;
  title: string;
  meta: string;
  inRepertoire?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="-mx-2 flex-row items-center gap-3.5 rounded-lg px-2 py-2 active:bg-surface-2 web:hover:bg-surface-2">
      {thumb}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
            {title}
          </Text>
          {inRepertoire ? <RepertoireMark /> : null}
        </View>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {meta}
        </Text>
      </View>
      <Icon as={ChevronRightIcon} size={18} className="text-foreground-subtle" />
    </Pressable>
  );
}

/** 엔터로 열 첫 결과. 작곡가가 맞으면 작곡가, 아니면 첫 작품 */
export function openFirstResult(
  result: CompareSearchResult,
  onOpenComposer: (composerId: number) => void,
  onOpenPiece: (piece: ComparisonPiece) => void
) {
  const composer = result.composers[0];
  if (composer) return onOpenComposer(composer.composerId);
  const piece = result.pieces[0];
  if (piece) onOpenPiece(piece);
}
