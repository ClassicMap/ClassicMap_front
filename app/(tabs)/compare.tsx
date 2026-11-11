import { useLocale } from '@/lib/i18n';
import { CompareMobileScreen } from '@/features/compare/components/compare-mobile-screen';
import * as React from 'react';

export default function CompareScreen() {
  useLocale();
  return <CompareMobileScreen />;
}
