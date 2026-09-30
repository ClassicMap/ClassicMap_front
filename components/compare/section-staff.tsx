import { NotationGlyph } from '@/components/ui/notation-glyph';
import { Text } from '@/components/ui/text';
import { primaryCredit } from '@/lib/data/comparison';
import { placeSections } from '@/lib/design/section-timeline';
import { useAllSectorPerformances } from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, ComparisonSector } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const LINE_GAP = 7;
const STAFF_HEIGHT = LINE_GAP * 4;
/** 높은음자리표 자리. 구간 면은 그 뒤에서 시작한다 */
const CLEF_WIDTH = 26;

interface SectionStaffProps {
  sectors: readonly ComparisonSector[];
  activeSectorId?: number;
  /** 기준 연주. 이 연주가 실린 영상의 시각으로 구간을 놓는다 */
  reference?: ComparisonPerformance;
  onSelect: (sectorId: number) => void;
  /** 좁은 화면은 칩에 이름이 있으니 고른 구간 이름만 쓴다 */
  labels?: 'all' | 'active';
}

/**
 * 구간은 오선 위에 앉힌다 (설계 문서 4.7.5).
 * 같은 원본 영상 안에서 각 구간이 어디쯤인지를 실제 시작·끝 시각으로 그린다.
 * 선은 한 곳에서만 긋고(부록 D-15) 강조 면은 모서리 없이 선 사이에 둔다(D-14).
 */
export function SectionStaff({ sectors, activeSectorId, reference, onSelect, labels = 'all' }: SectionStaffProps) {
  const queries = useAllSectorPerformances(sectors.map((sector) => sector.id));
  const referenceArtist = reference ? primaryCredit(reference)?.artistId : undefined;

  // 기준 연주와 같은 원본 영상의 구간만 놓는다. 다른 영상의 시각은 같은 축에 올릴 수 없다
  const clips = sectors
    .map((sector, index) => {
      const list = queries[index]?.data ?? [];
      const match =
        list.find((item) => reference && item.sourceId === reference.sourceId) ??
        list.find((item) => referenceArtist !== undefined && primaryCredit(item)?.artistId === referenceArtist);
      return match && (!reference || match.sourceId === reference.sourceId) ? { sector, clip: match } : null;
    })
    .filter((item): item is { sector: ComparisonSector; clip: ComparisonPerformance } => item !== null);

  const placements = placeSections(clips.map((item) => item.clip));
  if (clips.length < 2 || placements.length !== clips.length) return null;

  return (
    <View accessibilityLabel="곡 안에서 구간 위치" className="pb-5">
      <View style={{ height: STAFF_HEIGHT + 1 }}>
        {/* 높은음자리표: SMuFL 원점이 G선(아래에서 둘째 줄)에 오도록 캔버스 가운데를 맞춘다 */}
        <View pointerEvents="none" className="absolute left-1" style={{ top: LINE_GAP * 3 - LINE_GAP * 4 }}>
          <NotationGlyph glyph="gClef" lineSpacing={LINE_GAP} className="text-foreground-muted" />
        </View>
        <View className="absolute bottom-0 right-1 top-0" style={{ left: CLEF_WIDTH }}>
        {clips.map(({ sector }, index) => {
          const placement = placements[index];
          const active = sector.id === activeSectorId;
          return (
            <Pressable
              key={sector.id}
              onPress={() => onSelect(sector.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${sector.sectorName} ${placement.startLabel}부터`}
              className={cn('absolute', active ? 'bg-primary/80' : 'bg-foreground-subtle/30 web:hover:bg-foreground-subtle/50')}
              style={{
                left: `${placement.leftPercent}%`,
                width: `${Math.max(1.2, placement.widthPercent)}%`,
                top: 1,
                height: STAFF_HEIGHT - 1,
              }}
            />
          );
        })}
        </View>
        {/* 다섯 줄은 여기서만 긋는다 */}
        {Array.from({ length: 5 }, (_, line) => (
          <View
            key={line}
            pointerEvents="none"
            className="absolute left-0 right-0 h-px bg-foreground-faint"
            style={{ top: line * LINE_GAP }}
          />
        ))}
        <View pointerEvents="none" className="absolute bottom-0 left-0 top-0 w-px bg-foreground-faint" />
        <View pointerEvents="none" className="absolute bottom-0 right-0 top-0 w-[3px] bg-foreground-faint" />
      </View>
      <View pointerEvents="none" className="absolute bottom-0 right-1 top-0" style={{ left: CLEF_WIDTH }}>
      {clips.map(({ sector }, index) => {
        if (labels === 'active' && sector.id !== activeSectorId) return null;
        const { leftPercent, widthPercent } = placements[index];
        // 오른쪽 끝 구간은 라벨을 구간 오른쪽 끝에 맞춰 화면 밖으로 나가지 않게 한다
        const alignEnd = leftPercent > 65;
        return (
          <Text
            key={sector.id}
            numberOfLines={1}
            className={cn(
              'absolute text-micro',
              alignEnd && 'text-right',
              sector.id === activeSectorId ? 'text-primary' : 'text-foreground-subtle'
            )}
            style={{
              ...(alignEnd ? { right: `${Math.max(0, 100 - leftPercent - widthPercent)}%` } : { left: `${leftPercent}%` }),
              top: STAFF_HEIGHT + 5,
              maxWidth: 96,
            }}>
            {sector.sectorName}
          </Text>
        );
      })}
      </View>
    </View>
  );
}
