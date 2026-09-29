import { cn } from '@/lib/utils';
import { Image, View } from 'react-native';

const LOGO_MARK = require('@/assets/images/logo-mark.png');

/** 클래식맵 로고(높은음자리표 + 지도 등고선). 앱 아이콘·파비콘과 같은 그림이다 */
export function BrandLogo({ size, className }: { size: number; className?: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="ClassicMap"
      className={cn('overflow-hidden border border-border bg-[#FBFBFA]', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      <Image source={LOGO_MARK} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}
