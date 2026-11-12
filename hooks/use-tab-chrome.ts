import { HeaderHeightContext } from '@react-navigation/elements';
import * as React from 'react';
import { Platform, type ScrollViewProps } from 'react-native';

/**
 * iOS는 탭 헤더·탭바를 콘텐츠 위에 띄우고 뒤를 흐린다 (설계 5.4).
 * 안드로이드·웹은 불투명 크롬이라 화면이 따로 여백을 둘 필요가 없다.
 */
export const TAB_CHROME_TRANSLUCENT = Platform.OS === 'ios';

/** 떠 있는 탭 헤더에 가려지는 높이. 불투명 크롬이거나 헤더가 없으면 0 */
export function useTabHeaderInset(): number {
  const headerHeight = React.useContext(HeaderHeightContext) ?? 0;
  return TAB_CHROME_TRANSLUCENT ? headerHeight : 0;
}

type TabScrollInsets = Pick<
  ScrollViewProps,
  'contentInset' | 'contentOffset' | 'scrollIndicatorInsets' | 'contentInsetAdjustmentBehavior'
>;

/**
 * 탭 화면의 세로 스크롤에 붙인다. 패딩이 아니라 contentInset이라
 * 당겨서 새로고침 표시가 헤더 아래에서 나오고, 스크롤하면 콘텐츠가 헤더 뒤로 지나간다.
 */
export function useTabScrollInsets(): TabScrollInsets {
  const inset = useTabHeaderInset();
  return React.useMemo(
    () =>
      inset > 0
        ? {
            contentInset: { top: inset },
            contentOffset: { x: 0, y: -inset },
            scrollIndicatorInsets: { top: inset },
            contentInsetAdjustmentBehavior: 'never',
          }
        : {},
    [inset]
  );
}
