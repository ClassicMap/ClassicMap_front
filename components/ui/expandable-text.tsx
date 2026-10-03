import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

type ExpandableTextProps = {
  text: string;
  /** 접었을 때 보여 줄 줄 수 */
  lines: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
  className?: string;
  toggleClassName?: string;
};

/**
 * 접으면 `lines` 줄까지만 보이고, 실제로 잘릴 때만 '더 보기'를 낸다.
 * 글자 수로 가늠하면 좁은 칸에서 잘리는데 버튼이 없는 일이 생겨, 전체 높이를 숨은 사본으로 재서 견준다.
 */
export function ExpandableText({ text, lines, variant = 'body', className, toggleClassName }: ExpandableTextProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [fullHeight, setFullHeight] = React.useState(0);
  const [clampedHeight, setClampedHeight] = React.useState(0);
  const [truncated, setTruncated] = React.useState(false);

  React.useEffect(() => {
    // 펼친 동안은 접힌 높이를 다시 못 재므로 직전 판단을 둔다
    if (!expanded && fullHeight > 0 && clampedHeight > 0) setTruncated(fullHeight > clampedHeight + 1);
  }, [expanded, fullHeight, clampedHeight]);

  const onFullLayout = (event: LayoutChangeEvent) => setFullHeight(event.nativeEvent.layout.height);
  const onVisibleLayout = (event: LayoutChangeEvent) => {
    if (!expanded) setClampedHeight(event.nativeEvent.layout.height);
  };

  return (
    <View>
      <View>
        <Text
          variant={variant}
          numberOfLines={expanded ? undefined : lines}
          onLayout={onVisibleLayout}
          className={className}>
          {text}
        </Text>
        <View pointerEvents="none" className="absolute inset-x-0 top-0 opacity-0" accessibilityElementsHidden>
          <Text variant={variant} onLayout={onFullLayout} className={className}>
            {text}
          </Text>
        </View>
      </View>
      {truncated ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          className="mt-2 self-start"
          hitSlop={8}>
          <Text variant="label" className={cn('text-foreground-muted', toggleClassName)}>
            {expanded ? '접기' : '더 보기'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
