import { useLocale } from '@/lib/i18n';
import { TabsLayout } from '@/components/layout/tabs-layout';

export default function TabsLayoutNative() {
  useLocale();
  return <TabsLayout />;
}
