import { TabsLayout } from '@/components/navigation/tabs-layout';
import { AppShell } from '@/components/shell/app-shell';
import { useBreakpoint } from '@/hooks/use-breakpoint';

/** 웹: 좁으면 기존 하단 탭, 넓으면 사이드바 셸 (설계 문서 5.3). */
export default function TabsLayoutWeb() {
  const { nav } = useBreakpoint();
  if (nav === 'tabs') return <TabsLayout />;
  return (
    <AppShell nav={nav}>
      <TabsLayout hideChrome />
    </AppShell>
  );
}
