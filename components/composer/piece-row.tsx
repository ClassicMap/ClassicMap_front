import { FavoriteButton } from '@/components/favorite-button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { usePieceParts } from '@/lib/query/hooks/usePieces';
import type { ComposerPiece, Piece, PiecePart, PiecePartKind } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import type { UseQueryResult } from '@tanstack/react-query';
import { THEME } from '@/lib/theme';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, ExternalLinkIcon, StarIcon, TrashIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';

interface ListenLink {
  label: string;
  url: string;
}

interface ListenUrls {
  appleMusicUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeMusicUrl?: string | null;
}

export function listenLinks(urls: ListenUrls): ListenLink[] {
  return [
    urls.appleMusicUrl ? { label: 'Apple Music', url: urls.appleMusicUrl } : null,
    urls.spotifyUrl ? { label: 'Spotify', url: urls.spotifyUrl } : null,
    urls.youtubeMusicUrl ? { label: 'YouTube Music', url: urls.youtubeMusicUrl } : null,
  ].filter((link): link is ListenLink => link !== null);
}

/** 묶음 안 곡을 세는 단위. 악장으로 나뉜 작품만 악장이고 나머지는 곡이다 */
export function partUnit(kind: PiecePartKind | null | undefined): string {
  return kind === 'movement' ? '악장' : '곡';
}

interface OrderedPart {
  part: PiecePart;
  depth: number;
}

/**
 * 안의 곡을 순서대로 펴고, 하위 곡은 부모 바로 아래에 한 단계 들여 놓는다.
 * 목록에 없는 부모를 가리키면 맨 위로 올리고, 맨 위에 닿지 않는 곡(부모끼리 고리)도 버리지 않고 뒤에 붙인다
 */
function orderParts(parts: readonly PiecePart[]): OrderedPart[] {
  const ids = new Set(parts.map((part) => part.id));
  const childrenOf = new Map<number | null, PiecePart[]>();
  for (const part of parts) {
    const parentId =
      part.parentPartId !== null && part.parentPartId !== part.id && ids.has(part.parentPartId)
        ? part.parentPartId
        : null;
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(part);
    childrenOf.set(parentId, siblings);
  }
  const bySequence = (a: PiecePart, b: PiecePart) => a.sequenceNumber - b.sequenceNumber || a.id - b.id;
  const ordered: OrderedPart[] = [];
  const placed = new Set<number>();
  const visit = (parentId: number | null, depth: number) => {
    for (const part of (childrenOf.get(parentId) ?? []).sort(bySequence)) {
      ordered.push({ part, depth });
      placed.add(part.id);
      visit(part.id, depth + 1);
    }
  };
  visit(null, 0);
  for (const part of parts.filter((item) => !placed.has(item.id)).sort(bySequence)) {
    ordered.push({ part, depth: 0 });
  }
  return ordered;
}

/** 대표곡 별. 채운 별을 강조색으로 그린다 */
export function NotableStar({ size = 13, label = '대표곡' }: { size?: number; label?: string }) {
  const { colorScheme } = useColorScheme();
  const color = THEME[colorScheme === 'dark' ? 'dark' : 'light'].primary;
  return (
    <View accessible accessibilityLabel={label} className="shrink-0">
      <Icon as={StarIcon} size={size} color={color} fill={color} />
    </View>
  );
}

/** 목록에 쓰는 작품번호. 목록 체계·번호가 있으면 그것(Op. 10, K. 331), 없으면 opusNumber */
export function catalogueLabel(piece: Piece): string | null {
  const number = piece.catalogueNumber?.trim();
  if (number) return [piece.catalogueSystem?.trim(), number].filter(Boolean).join(' ');
  return piece.opusNumber?.trim() || null;
}

/**
 * 글에서 검색 낱말이 맞은 곳을 모두 강조한다. 대소문자는 가리지 않고, 긴 낱말을 먼저 맞춘다.
 * 맞는 곳이 없으면 글을 그대로 둔다
 */
export function Highlighted({ text, terms }: { text: string; terms?: readonly string[] }) {
  const words = (terms ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const pieces = text.split(pattern);
  if (pieces.length === 1) return <>{text}</>;
  return (
    <>
      {pieces.map((piece, index) =>
        index % 2 === 1 ? (
          <Text key={index} className="font-bold text-primary">
            {piece}
          </Text>
        ) : (
          piece
        )
      )}
    </>
  );
}

function isComposerPiece(piece: Piece | ComposerPiece): piece is ComposerPiece {
  return 'notableParts' in piece;
}

/** 세트 안 곡 번호를 화면 이름으로. 악장이면 「2악장」, 아니면 「3번」 */
function partLabel(sequence: number, kind: PiecePartKind | null | undefined): string {
  return kind === 'movement' ? `${sequence}악장` : `${sequence}번`;
}

export function PieceRow({
  piece,
  comparable,
  canEdit,
  onCompare,
  onComparePart,
  onEdit,
  onDelete,
  highlight,
  leading,
}: {
  piece: Piece | ComposerPiece;
  /** 검색어. 제목과 걸린 세트 안 곡에서 맞은 곳을 강조한다 */
  highlight?: readonly string[];
  /** 제목 앞 표지(검색 결과의 장르 표지 등) */
  leading?: React.ReactNode;
  comparable: boolean;
  canEdit: boolean;
  onCompare: () => void;
  onComparePart: (pieceId: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const partCount = piece.partCount ?? 0;
  const unit = partUnit(piece.partKind);
  const partsQuery = usePieceParts(piece.id, expanded);
  const links = listenLinks(piece);
  const notableParts = isComposerPiece(piece) ? piece.notableParts : [];
  const matchedPart = isComposerPiece(piece) ? piece.matchedPart : null;
  const detail = [catalogueLabel(piece), piece.compositionYear ? `${piece.compositionYear}` : null].filter(Boolean);
  return (
    <View className="border-b border-border">
      <View className="flex-row items-center gap-3 py-2.5">
        {leading}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {piece.notable ? <NotableStar /> : null}
            <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
              <Highlighted text={piece.title} terms={highlight} />
            </Text>
            {partCount > 0 ? (
              <Pressable
                onPress={() => setExpanded((value) => !value)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${piece.title} 안의 ${unit} ${partCount}개 ${expanded ? '접기' : '펼치기'}`}
                hitSlop={8}
                className="shrink-0 flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5 active:bg-surface-2 web:transition-colors web:duration-instant web:hover:bg-surface-2">
                <Text variant="caption" className="tabular-nums">
                  {`${partCount}${unit}`}
                </Text>
                <Icon as={expanded ? ChevronUpIcon : ChevronDownIcon} size={14} className="text-foreground-subtle" />
              </Pressable>
            ) : null}
          </View>
          {detail.length > 0 || links.length > 0 || notableParts.length > 0 ? (
            <View className="mt-0.5 flex-row flex-wrap items-center gap-x-2.5 gap-y-1">
              {detail.length > 0 ? (
                <Text variant="caption" className="tabular-nums">
                  {detail.join(' · ')}
                </Text>
              ) : null}
              {notableParts.length > 0 ? (
                <View className="flex-row items-center gap-1">
                  <NotableStar size={11} label="대표 곡" />
                  <Text variant="caption" className="text-foreground">
                    {notableParts.map((sequence) => partLabel(sequence, piece.partKind)).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {links.length > 0 ? <ListenLinks name={piece.title} links={links} /> : null}
            </View>
          ) : null}
          {matchedPart ? (
            <Text variant="caption" numberOfLines={1} className="mt-0.5 text-foreground">
              {`→ ${partLabel(matchedPart.sequenceNumber, piece.partKind)} `}
              <Highlighted text={matchedPart.name} terms={highlight} />
            </Text>
          ) : null}
        </View>
        {comparable ? (
          <Chip size="sm" label="비교 듣기" onPress={onCompare} accessibilityLabel={`${piece.title} 비교 듣기`} />
        ) : null}
        <FavoriteButton kind="pieces" id={piece.id} name={piece.title} />
        {canEdit ? (
          <View className="flex-row">
            <Pressable onPress={onEdit} accessibilityLabel={`${piece.title} 수정`} hitSlop={6} className="size-8 items-center justify-center">
              <Icon as={EditIcon} size={15} className="text-foreground-muted" />
            </Pressable>
            <Pressable onPress={onDelete} accessibilityLabel={`${piece.title} 삭제`} hitSlop={6} className="size-8 items-center justify-center">
              <Icon as={TrashIcon} size={15} className="text-destructive" />
            </Pressable>
          </View>
        ) : null}
      </View>
      {expanded ? (
        <PiecePartList query={partsQuery} partCount={partCount} partKind={piece.partKind} onCompare={onComparePart} />
      ) : null}
    </View>
  );
}

function ListenLinks({ name, links }: { name: string; links: ListenLink[] }) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={() => Linking.openURL(link.url)}
          accessibilityRole="link"
          accessibilityLabel={`${name} ${link.label}에서 듣기`}
          hitSlop={6}
          className="flex-row items-center gap-1">
          <Icon as={ExternalLinkIcon} size={11} className="text-foreground-subtle" />
          <Text className="text-micro text-foreground-subtle">{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PiecePartList({
  query,
  partCount,
  partKind,
  onCompare,
}: {
  query: UseQueryResult<PiecePart[]>;
  partCount: number;
  partKind: PiecePartKind | null | undefined;
  onCompare: (pieceId: number) => void;
}) {
  const unit = partUnit(partKind);
  const ordered = React.useMemo(() => orderParts(query.data ?? []), [query.data]);

  if (query.isLoading) {
    return (
      <View className="mb-3 ml-1 gap-2 border-l border-border pl-3">
        {Array.from({ length: Math.min(partCount, 3) }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="mb-3 flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
        <Text variant="bodySm" className="flex-1 text-foreground-muted">
          {`안의 ${unit}을 불러오지 못했어요.`}
        </Text>
        <Pressable onPress={() => query.refetch()} disabled={query.isFetching} hitSlop={8}>
          <Text variant="label" className="text-primary">
            {query.isFetching ? '불러오는 중…' : '다시 시도'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (ordered.length === 0) {
    return (
      <View className="mb-3 ml-1 border-l border-border py-1 pl-3">
        <Text variant="caption">{`안의 ${unit} 정보가 아직 없어요.`}</Text>
      </View>
    );
  }

  return (
    <View className="mb-3 ml-1 border-l border-border pl-3">
      {ordered.map(({ part, depth }) => (
        <PiecePartRow key={part.id} part={part} depth={depth} partKind={partKind} onCompare={onCompare} />
      ))}
    </View>
  );
}

function PiecePartRow({
  part,
  depth,
  partKind,
  onCompare,
}: {
  part: PiecePart;
  depth: number;
  partKind: PiecePartKind | null | undefined;
  onCompare: (pieceId: number) => void;
}) {
  // 묶음 안 소나타의 악장처럼 묶음 단위가 곡이어도 악장 번호가 있는 줄은 악장으로 센다
  const movement = partKind === 'movement' || Boolean(part.movementNumber?.trim());
  const linked = part.linkedPiece;
  // 따로 작품 행으로 이어진 곡은 그 작품의 링크를, 아니면 이 곡의 트랙 링크를 쓴다
  const links = linked
    ? listenLinks(linked)
    : listenLinks({ appleMusicUrl: part.appleMusicUrl, spotifyUrl: part.spotifyUrl });
  return (
    <View className="flex-row items-center gap-3 py-2" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
      <Text variant="mono" className={cn('text-right text-foreground-subtle', movement ? 'w-11' : 'w-6')}>
        {movement ? `${part.sequenceNumber}악장` : `${part.sequenceNumber}.`}
      </Text>
      <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <View className="min-w-0 shrink flex-row items-center gap-1.5">
          {part.notable ? <NotableStar size={12} label="대표 곡" /> : null}
          <Text numberOfLines={2} className="shrink text-body-sm text-foreground">
            {part.name}
          </Text>
        </View>
        {links.length > 0 ? <ListenLinks name={part.name} links={links} /> : null}
      </View>
      {linked?.comparable ? (
        <Chip
          size="sm"
          label="비교 듣기"
          onPress={() => onCompare(linked.id)}
          accessibilityLabel={`${part.name} 비교 듣기`}
        />
      ) : null}
    </View>
  );
}
