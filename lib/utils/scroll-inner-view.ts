import type { ScrollView, View } from 'react-native';

/** react-native 의 TS 선언에는 빠져 있지만 ScrollView 인스턴스에 있는 메서드 */
interface InnerViewRefSource {
  getInnerViewRef?: () => View | null;
}

/**
 * measureLayout 기준으로 쓸 ScrollView 안쪽 뷰.
 * 새 아키텍처(Fabric)는 숫자 핸들(getInnerViewNode)을 받지 않아 측정이 조용히 실패하므로 뷰 ref 를 먼저 쓴다.
 */
export function scrollInnerView(scroll: ScrollView): View | number {
  const inner = (scroll as ScrollView & InnerViewRefSource).getInnerViewRef?.();
  if (inner) return inner;
  const node: unknown = scroll.getInnerViewNode();
  return typeof node === 'number' ? node : 0;
}
