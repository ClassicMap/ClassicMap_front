import { useRoute } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from 'expo-router';
import * as React from 'react';
import { BackHandler, Platform } from 'react-native';

export interface CompareStackBack {
  /** 앱에서 이 단계 아래에 비교 스택 화면이 쌓여 있다(밀기·시스템 뒤로가 그 화면으로 간다) */
  poppable: boolean;
  /** 화면에 뒤로 단추를 보일지 */
  showBack: boolean;
}

/**
 * 비교 탭 단계의 뒤로. 앱은 단계마다 비교 스택에 화면을 쌓아 밀기·시스템 뒤로가 그대로 꺼낸다.
 * 뒤로 단추는 웹과, 앱에서 돌아갈 화면이 아무 데도 없는 단계(다른 탭의 링크로 스택 맨 아래에 바로 열림)에만 보이고,
 * 그때 안드로이드 뒤로도 단추처럼 위 단계로 보낸다.
 */
export function useCompareStackBack(isTopLevel: boolean, toParent: () => void): CompareStackBack {
  const navigation = useNavigation();
  const route = useRoute();
  const latest = React.useRef(toParent);
  latest.current = toParent;

  const native = Platform.OS !== 'web';
  const index = navigation.getState()?.routes.findIndex((item) => item.key === route.key) ?? 0;
  const poppable = native && index > 0;
  // 비교 스택 → 탭 → 루트 스택. 루트에 상세 화면이 깔려 있으면 밀기·시스템 뒤로가 그리로 돌아간다
  const rootCanGoBack = native && (navigation.getParent()?.getParent()?.canGoBack() ?? false);
  const showBack = !isTopLevel && (!native || (!poppable && !rootCanGoBack));
  const androidFallback = Platform.OS === 'android' && showBack;

  useFocusEffect(
    React.useCallback(() => {
      if (!androidFallback) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        latest.current();
        return true;
      });
      return () => subscription.remove();
    }, [androidFallback])
  );

  return { poppable, showBack };
}
