import { useLocale } from '@/lib/i18n';
import { go } from '@/lib/navigation/go';
import { StackActions } from '@react-navigation/native';
import { Redirect, useFocusEffect, useNavigation } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

/** 첫 진입은 홈으로 보낸다. 첫 방문 안내는 홈 위 카드가 맡는다 (설계 문서 7.11) */
export default function Screen() {
  useLocale();
  if (Platform.OS === 'web') return <Redirect href="/(tabs)/home" />;
  return <NativeIndex />;
}

/**
 * 앱은 루트 스택 맨 아래에 탭 묶음을 깔아 둔다(`app/_layout.tsx` 의 unstable_settings). 그래서 이 화면은
 * 탭 묶음 위에 열리고, replace 로 홈을 열면 탭 묶음이 두 개가 된다. 탭 묶음까지 비우고 홈으로 옮긴다
 */
function NativeIndex() {
  const navigation = useNavigation();
  // 라우터 상태가 다 올라온 뒤에 옮긴다(expo-router 의 Redirect 와 같은 useFocusEffect).
  // 막 열린 참이라 라우터가 아는 상태는 아직 이 화면을 모른다. 이 화면이 속한 루트 스택에 직접 보낸다
  useFocusEffect(
    React.useCallback(() => {
      if (navigation.canGoBack()) navigation.dispatch(StackActions.popToTop());
      else go('/home');
    }, [navigation])
  );
  return null;
}
