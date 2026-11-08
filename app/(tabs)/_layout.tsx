import { useLocale } from '@/lib/i18n';
import { TabsLayout } from '@/components/navigation/tabs-layout';

export default function TabsLayoutNative() {
  useLocale();
  return <TabsLayout />;
}
