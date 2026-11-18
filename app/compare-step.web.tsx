import { useLocale } from '@/lib/i18n';
import { type Href, Redirect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

/** 웹은 비교 단계도 비교 탭 주소(`/compare?…`)를 쓴다. 이 주소로 들어오면 그리로 보낸다 */
export default function CompareStepWeb() {
  useLocale();
  const params = useLocalSearchParams<Record<string, string>>();
  const query = new URLSearchParams(params).toString();
  return <Redirect href={`/compare${query ? `?${query}` : ''}` as Href} />;
}
