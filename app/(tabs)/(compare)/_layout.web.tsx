import { useLocale } from '@/lib/i18n';
import { Slot } from 'expo-router';
import * as React from 'react';

/** 웹 비교 탭은 쌓지 않고 주소 파라미터로 단계를 바꾼다(브라우저 뒤로·화면 뒤로 단추) */
export default function CompareLayoutWeb() {
  useLocale();
  return <Slot />;
}
