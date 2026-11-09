import type { ComparisonPerformance } from '@/lib/types/models';

export interface MobileFullscreenProps {
  performances: ComparisonPerformance[];
  active: ComparisonPerformance | null;
  sectorName: string | null;
  activeId: number | null;
  imageOf: (performance: ComparisonPerformance) => string | null;
  onPick: (performance: ComparisonPerformance) => void;
}

/** 앱(네이티브)은 YouTube 플레이어의 전체 화면을 그대로 쓴다. 웹은 mobile-fullscreen.web.tsx */
export function MobileFullscreen(_props: MobileFullscreenProps) {
  return null;
}
