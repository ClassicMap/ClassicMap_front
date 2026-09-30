import { TabsLayout } from '@/components/navigation/tabs-layout';
import { useBreakpoint } from '@/hooks/use-breakpoint';

/** 웹: 좁으면 기존 하단 탭, 넓으면 탭 크롬을 숨긴다. 셸은 루트(RootChrome)가 씌운다. */
export default function TabsLayoutWeb() {
  const { nav } = useBreakpoint();
  return <TabsLayout hideChrome={nav !== 'tabs'} />;
}
