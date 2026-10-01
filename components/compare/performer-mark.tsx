import { EntityThumb } from '@/components/ui/entity-thumb';
import { primaryCredit } from '@/lib/data/comparison';
import type { ComparisonPerformance } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** 1:1 의 두 연주자 색. 첫째는 브랜드 금색, 둘째는 파랑이다. none 은 테두리 없음 */
export type PerformerTone = 'a' | 'b' | 'none';

const RING: Record<PerformerTone, string> = {
  a: 'border-primary',
  b: 'border-info',
  none: 'border-transparent',
};

export interface Performer {
  name: string;
  image: string | null;
}

/** 연주의 주 연주자 이름·사진. `imageOf` 가 있으면 그 사진을 먼저 쓴다 */
export function performerOf(
  performance: ComparisonPerformance,
  imageOf?: (performance: ComparisonPerformance) => string | null
): Performer {
  const credit = primaryCredit(performance);
  return {
    name: credit?.artistName ?? '연주자 정보 없음',
    image: imageOf ? imageOf(performance) : credit?.imageUrl ?? null,
  };
}

/**
 * A·B 글자 대신 쓰는 연주자 얼굴. 연주자 색은 얼굴 테두리로 둔다. 사진이 없으면 이니셜 원이다.
 * `size` 는 얼굴 지름이고 테두리는 바깥에 붙는다.
 */
export function PerformerMark({
  performer,
  tone = 'none',
  size = 22,
  dim = false,
  className,
}: {
  performer: Performer;
  tone?: PerformerTone;
  size?: number;
  /** 지금 듣지 않는 쪽 */
  dim?: boolean;
  className?: string;
}) {
  return (
    <View
      accessible={false}
      className={cn('rounded-full border-2 p-px', RING[tone], dim && 'opacity-50', className)}>
      <EntityThumb name={performer.name} image={performer.image} shape="circle" size={size} />
    </View>
  );
}
