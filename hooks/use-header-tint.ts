import { THEME } from '@/lib/theme';
import { useNavigation } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';

/**
 * 좁은 웹의 탭 상단바를 화면 머리 색 번짐과 같은 색으로 물들인다.
 * 상단바가 배경색 그대로면 바로 아래에서 시작하는 색 번짐과 띠처럼 경계가 생겼다.
 * 네이티브는 상단바가 따로(iOS 반투명 흐림) 있어 건드리지 않는다. 화면을 떠나면 원래 색으로 돌린다.
 */
export function useHeaderTint(color: string | null | undefined) {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  React.useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const base = THEME[colorScheme === 'dark' ? 'dark' : 'light'].background;
    navigation.setOptions({ headerStyle: { backgroundColor: color ?? base } });
    return () => navigation.setOptions({ headerStyle: { backgroundColor: base } });
  }, [color, colorScheme, navigation]);
}
