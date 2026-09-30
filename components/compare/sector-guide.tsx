import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { isArrangementSector, splitEmphasis } from '@/lib/data/comparison';
import type { ComparisonSector } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 접힌 안내에서 더 보기를 내는 길이. 두 줄을 넘길 만한 문장만 접는다 */
const COLLAPSE_MIN_LENGTH = 70;

/** 구간 칩 뒤에 붙는 편곡 표. 해석 비교 구간과 섞이지 않게 한다 */
export function SectorTypeBadge({ sector }: { sector: Pick<ComparisonSector, 'sectorType'> }) {
  return isArrangementSector(sector) ? <Badge tone="accent" label="편곡" className="self-center" /> : null;
}

interface SectorGuideProps {
  sector: Pick<ComparisonSector, 'id' | 'sectorType' | 'description'>;
  /** 두 줄만 보여 주고 더 보기로 펼친다 (모바일, 크게 보기) */
  collapsible?: boolean;
  className?: string;
}

/**
 * 고른 구간의 듣기 안내. 설명이 없는 해석 비교 구간은 아무것도 그리지 않는다.
 * 편곡 비교 구간은 설명이 없어도 무엇을 견주는 자리인지 밝힌다.
 */
export function SectorGuide({ sector, collapsible = false, className }: SectorGuideProps) {
  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => setExpanded(false), [sector.id]);

  const arrangement = isArrangementSector(sector);
  const description = sector.description;
  if (!description && !arrangement) return null;

  const canCollapse = collapsible && description !== null && description.length > COLLAPSE_MIN_LENGTH;
  const collapsed = canCollapse && !expanded;

  return (
    <View className={cn('gap-1 rounded-lg bg-surface-2 px-4 py-3', className)}>
      <Text className="text-micro text-primary">
        {arrangement ? '편곡 비교 · 같은 작품을 다른 편성으로 들어요' : '이 구간 듣기'}
      </Text>
      {description ? (
        <Text numberOfLines={collapsed ? 2 : undefined} className="text-body-sm text-foreground">
          {splitEmphasis(description).map((segment, index) =>
            segment.strong ? (
              <Text key={index} className="font-semibold text-foreground">
                {segment.text}
              </Text>
            ) : (
              segment.text
            )
          )}
        </Text>
      ) : null}
      {canCollapse ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          className="self-start">
          <Text className="text-caption font-semibold text-primary">{expanded ? '접기' : '더 보기'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
