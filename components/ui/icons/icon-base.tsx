import { cssInterop } from 'nativewind';
import type * as React from 'react';
import Svg, { type SvgProps } from 'react-native-svg';

/**
 * ClassicMap 고유 아이콘의 공통 계약.
 *
 * lucide-react-native와 동일한 `size` / `color` / `strokeWidth` props를 받으므로
 * 호출부에서 lucide 아이콘과 같은 방식으로 쓸 수 있습니다.
 * 색은 `color="currentColor"` 기본값과 `style.color`로 결정되며,
 * NativeWind `className`(예: `text-foreground`)이 그대로 동작합니다.
 */
export type ClassicIconProps = Omit<SvgProps, 'viewBox' | 'width' | 'height'> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** 기본 캔버스는 24px, 시각 무게는 1.75 스트로크로 맞춥니다. */
export const CLASSIC_ICON_SIZE = 24;
export const CLASSIC_ICON_STROKE = 1.75;

type RenderArgs = { color: string; strokeWidth: number };

/**
 * 24×24 viewBox와 스트로크 규칙을 공유하는 아이콘 컴포넌트를 만듭니다.
 * `render`는 Svg 자식 노드만 반환하고, 캔버스·스트로크·색은 여기서 처리합니다.
 */
export function createClassicIcon(
  displayName: string,
  render: (args: RenderArgs) => React.ReactNode
) {
  function ClassicIcon({
    size = CLASSIC_ICON_SIZE,
    color = 'currentColor',
    strokeWidth = CLASSIC_ICON_STROKE,
    ...rest
  }: ClassicIconProps) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}>
        {render({ color, strokeWidth })}
      </Svg>
    );
  }

  ClassicIcon.displayName = displayName;

  cssInterop(ClassicIcon, {
    className: {
      target: 'style',
      nativeStyleToProp: {
        height: 'size',
        width: 'size',
      },
    },
  });

  return ClassicIcon;
}
