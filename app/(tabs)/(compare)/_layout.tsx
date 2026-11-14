import { useLocale } from '@/lib/i18n';
import { Stack } from 'expo-router';
import * as React from 'react';

export const unstable_settings = { initialRouteName: 'compare' };

/**
 * 앱 비교 탭: 작곡가 → 작품 → 1:1 단계를 이 스택에 쌓는다. 같은 /compare 화면을 주소 파라미터만 달리해
 * 쌓으므로 iOS 는 화면 어디서 밀어도, 안드로이드는 시스템 뒤로로 한 단계씩 돌아간다.
 * 폴더가 아니라 묶음(괄호)이라 웹 정적 export 에 compare/ 폴더가 생기지 않는다. 웹은 _layout.web.tsx
 */
export default function CompareStackLayout() {
  useLocale();
  return <Stack screenOptions={SCREEN_OPTIONS} />;
}

const SCREEN_OPTIONS = {
  headerShown: false,
  fullScreenGestureEnabled: true,
};
