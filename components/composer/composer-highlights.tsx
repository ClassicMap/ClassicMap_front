import { partLabel } from '@/components/composer/piece-row';
import { GenreMark } from '@/components/piece/genre-mark';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { MoreLink } from '@/components/ui/more-link';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import type { ComposerHighlight, ComposerHighlightPart } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 처음에 보이는 곡 수. '더 보기'로 받은 곡(최대 10곡)을 다 편다 */
const HIGHLIGHT_PREVIEW = 5;

/**
 * 작곡가 화면 「처음 듣는다면」: 사람이 고른 작품 5곡을 카드로 보이고 '더 보기'로 10곡까지 편다.
 * 카드에는 제목, 세트면 대표 곡 번호, 한 줄 이유, 비교할 수 있으면 표시가 있다.
 * 누르면 비교할 수 있는 작품은 비교 화면으로, 아니면 아래 작품 목록에서 그 작품을 찾아 보인다.
 * 고른 곡이 없으면 칸을 그리지 않는다.
 */
export function ComposerHighlights({
  highlights,
  wide,
  onCompare,
  onShowInWorks,
}: {
  highlights: readonly ComposerHighlight[];
  wide: boolean;
  onCompare: (pieceId: number) => void;
  /** 작품 목록에서 이 작품을 찾아 보인다(비교할 수 없는 작품) */
  onShowInWorks: (highlight: ComposerHighlight) => void;
}) {
  useLocale();
  const [open, setOpen] = React.useState(false);
  if (highlights.length === 0) return null;
  const shown = open ? highlights : highlights.slice(0, HIGHLIGHT_PREVIEW);
  const hidden = highlights.length - HIGHLIGHT_PREVIEW;
  // 넓은 화면은 두 줄씩 놓는다
  const rows: ComposerHighlight[][] = [];
  const perRow = wide ? 2 : 1;
  for (let index = 0; index < shown.length; index += perRow) {
    rows.push(shown.slice(index, index + perRow));
  }
  return (
    <View>
      <View className="mb-3.5 flex-row items-baseline gap-2">
        <Text variant="title3">{t('처음 듣는다면')}</Text>
      </View>
      <View className="gap-3">
        {rows.map((row) => (
          <View key={row.map((item) => item.pieceId).join('-')} className="flex-row gap-3">
            {/* 칸마다 같은 틀에 넣어 마지막 줄 카드 하나도 반 폭을 지킨다 */}
            {row.map((item) => (
              <View key={item.pieceId} className="min-w-0 flex-1">
                <HighlightCard
                  highlight={item}
                  onPress={() =>
                    item.comparePieceId !== null
                      ? onCompare(item.comparePieceId)
                      : onShowInWorks(item)
                  }
                />
              </View>
            ))}
            {row.length < perRow ? <View className="min-w-0 flex-1" /> : null}
          </View>
        ))}
      </View>
      {hidden > 0 ? (
        open ? (
          <MoreLink label={t('접기')} collapse onPress={() => setOpen(false)} />
        ) : (
          <MoreLink
            label={t('{count}곡 더 보기', { count: hidden })}
            onPress={() => setOpen(true)}
          />
        )
      ) : null}
    </View>
  );
}

/**
 * 대표 곡 이름: 「2번 E♭장조」. 곡 이름이 이미 번호로 시작하면(영어 「No. 2 in E♭ major」) 번호를 겹쳐 쓰지 않는다
 */
function representativeLabel(
  part: ComposerHighlightPart,
  kind: ComposerHighlight['partKind']
): string {
  const label = partLabel(part.sequenceNumber, kind);
  const name = part.name.trim();
  if (!name) return label;
  const numbered = name.startsWith(label) && !/\d/.test(name.charAt(label.length));
  return numbered ? name : `${label} ${name}`;
}

function HighlightCard({
  highlight,
  onPress,
}: {
  highlight: ComposerHighlight;
  onPress: () => void;
}) {
  useLocale();
  const comparable = highlight.comparePieceId !== null;
  const part = highlight.part ? representativeLabel(highlight.part, highlight.partKind) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={
        comparable
          ? t('{title} 비교하기', { title: highlight.title })
          : t('{title} 작품 목록에서 보기', { title: highlight.title })
      }
      className={cn(
        'flex-1 flex-row gap-3 rounded-xl border border-border bg-surface-1 px-3.5 py-3',
        'active:bg-surface-2 web:transition-colors web:duration-instant web:hover:bg-surface-2'
      )}>
      <GenreMark genre={highlight.genre} size={32} />
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={2} className="text-body-sm font-semibold text-foreground">
          {highlight.title}
        </Text>
        {part ? (
          <Text variant="caption" numberOfLines={1} className="text-foreground">
            {`${t('대표 곡')} · ${part}`}
          </Text>
        ) : null}
        {highlight.reason ? (
          <Text variant="caption" numberOfLines={2}>
            {highlight.reason}
          </Text>
        ) : null}
        {comparable ? <Badge tone="accent" label={t('비교 듣기')} className="mt-0.5" /> : null}
      </View>
      <Icon as={ChevronRightIcon} size={16} className="self-center text-foreground-faint" />
    </Pressable>
  );
}
