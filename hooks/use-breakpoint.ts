import { Platform, useWindowDimensions } from 'react-native';

import { resolveLayout, type LayoutInfo } from '@/lib/design/breakpoints';

export function useBreakpoint(): LayoutInfo {
  const { width } = useWindowDimensions();
  return resolveLayout(width, Platform.OS === 'web');
}
