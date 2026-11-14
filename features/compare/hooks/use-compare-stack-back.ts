import { CommonActions, useRoute } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

export interface CompareStackBack {
  /** 앱에서 이 단계 아래에 비교 스택 화면이 쌓여 있다(밀기·시스템 뒤로가 그 화면으로 간다) */
  poppable: boolean;
  /** 화면에 뒤로 단추를 보일지. 웹만 보인다 */
  showBack: boolean;
}

/**
 * 비교 탭 단계의 뒤로. 앱은 단계마다 비교 스택에 화면을 쌓아 밀기·시스템 뒤로가 그대로 꺼낸다.
 * 다른 탭의 링크로 단계가 스택 맨 아래에 바로 열리면 돌아갈 곳이 없으니, 그 아래에 카탈로그를 깔아 둔다.
 * 상세 화면에서 와서 루트에 그 화면이 깔려 있으면 깔지 않는다(밀면 그 상세 화면으로 돌아간다).
 */
export function useCompareStackBack(isTopLevel: boolean): CompareStackBack {
  const navigation = useNavigation();
  const route = useRoute();

  const native = Platform.OS !== 'web';
  const index = navigation.getState()?.routes.findIndex((item) => item.key === route.key) ?? 0;
  const poppable = native && index > 0;
  // 비교 스택 → 탭 → 루트 스택
  const rootCanGoBack = native && (navigation.getParent()?.getParent()?.canGoBack() ?? false);
  const needsCatalog = native && !isTopLevel && index === 0 && !rootCanGoBack;

  React.useEffect(() => {
    if (!needsCatalog) return;
    navigation.dispatch((state) =>
      CommonActions.reset({
        ...state,
        index: state.index + 1,
        routes: [
          { key: `compare-catalog-${route.key}`, name: route.name, params: {} },
          ...state.routes,
        ],
      })
    );
  }, [needsCatalog, navigation, route.key, route.name]);

  return { poppable, showBack: !isTopLevel && !native };
}
