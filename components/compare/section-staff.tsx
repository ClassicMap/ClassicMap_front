import { NotationGlyph } from '@/components/ui/notation-glyph';
import { Text } from '@/components/ui/text';
import { isWholeWorkSector, primaryCredit } from '@/lib/data/comparison';
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

  // 전곡은 오선 전체다. 위치를 잴 필요 없이 다른 구간 밑에 깔고, 고르면 전체를 칠한다
  const whole = sectors.find(isWholeWorkSector);
  const parts = sectors
    .map((sector, index) => ({ sector, list: queries[index]?.data ?? [] }))
    .filter(({ sector }) => !isWholeWorkSector(sector));

  // 기준 연주와 같은 원본 영상의 구간만 놓는다. 다른 영상의 시각은 같은 축에 올릴 수 없다.
  // 기준이 전곡 영상처럼 발췌와 다른 영상이면, 발췌 구간을 가장 많이 담은 영상을 기준으로 삼는다
  const sourceId = sourceForStaff(parts, activeSectorId, reference, referenceArtist);
  const clips = parts
    .map(({ sector, list }) => {
      const match = list.find((item) => item.sourceId === sourceId);
      return match ? { sector, clip: match } : null;
    })
    .filter((item): item is { sector: ComparisonSector; clip: ComparisonPerformance } => item !== null);

  const placements = placeSections(clips.map((item) => item.clip));
  if (clips.length < (whole ? 1 : 2) || placements.length !== clips.length) return null;
  const wholeActive = whole !== undefined && whole.id === activeSectorId;

  return (
    <View accessibilityLabel="곡 안에서 구간 위치" className="pb-5">
      <View style={{ height: STAFF_HEIGHT + 1 }}>
        {/* 높은음자리표: SMuFL 원점이 G선(아래에서 둘째 줄)에 오도록 캔버스 가운데를 맞춘다 */}
        <View pointerEvents="none" className="absolute left-1" style={{ top: LINE_GAP * 3 - LINE_GAP * 4 }}>
          <NotationGlyph glyph="gClef" lineSpacing={LINE_GAP} className="text-foreground-muted" />
        </View>
        <View className="absolute bottom-0 right-1 top-0" style={{ left: CLEF_WIDTH }}>
        {wholeActive ? (
          <Pressable
            onPress={() => onSelect(whole.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            accessibilityLabel={whole.sectorName}
            className="absolute bg-primary/80"
            style={{ left: 0, right: 0, top: 1, height: STAFF_HEIGHT - 1 }}
          />
        ) : null}
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
              className={cn(
                'absolute',
                active
                  ? 'bg-primary/80'
                  : wholeActive
                    ? 'bg-black/25 web:hover:bg-black/40'
                    : 'bg-foreground-subtle/30 web:hover:bg-foreground-subtle/50'
              )}
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
      {wholeActive && labels === 'active' ? (
        <Text numberOfLines={1} className="absolute text-micro text-primary" style={{ left: 0, top: STAFF_HEIGHT + 5 }}>
          {whole.sectorName}
        </Text>
      ) : null}
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

/**
 * 오선의 시간 축으로 쓸 원본 영상. 기준 연주의 영상이 발췌 구간을 둘 이상 담으면 그것을,
 * 아니면 같은 연주자의 영상, 그것도 아니면 지금 구간을 담은 영상 중 발췌 구간을 가장 많이 담은 것을 쓴다
 */
function sourceForStaff(
  parts: readonly { sector: ComparisonSector; list: readonly ComparisonPerformance[] }[],
  activeSectorId: number | undefined,
  reference: ComparisonPerformance | undefined,
  referenceArtist: number | undefined
): number | undefined {
  const counts = new Map<number, number>();
  for (const { list } of parts) {
    for (const id of new Set(list.map((item) => item.sourceId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const enough = (id: number | undefined) => id !== undefined && (counts.get(id) ?? 0) >= Math.min(2, parts.length);
  if (enough(reference?.sourceId)) return reference?.sourceId;
  const sameArtist = parts
    .flatMap(({ list }) => list)
    .find((item) => referenceArtist !== undefined && primaryCredit(item)?.artistId === referenceArtist && enough(item.sourceId));
  if (sameArtist) return sameArtist.sourceId;
  const holdsActive = new Set(
    parts.filter(({ sector }) => sector.id === activeSectorId).flatMap(({ list }) => list.map((item) => item.sourceId))
  );
  const score = (id: number) => (holdsActive.has(id) ? 1000 : 0) + (counts.get(id) ?? 0);
  let best: number | undefined;
  for (const id of counts.keys()) if (best === undefined || score(id) > score(best)) best = id;
  return best;
}
