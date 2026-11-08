import { useLocale } from '@/lib/i18n';
import { CompareMobileScreen } from '@/components/compare/compare-mobile-screen';
import * as React from 'react';

export default function CompareScreen() {
  useLocale();
  return <CompareMobileScreen />;
}
