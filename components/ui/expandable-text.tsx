import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';

type ExpandableTextProps = {
  /** 줄바꿈은 문단 경계로 본다 */
  text: string;
  /** 접었을 때 보여 줄 줄 수. 마지막 두 줄쯤이 흐려진다 */
  lines: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
  className?: string;
  toggleClassName?: string;
  /** 흐림 끝 색. 글이 놓인 바탕과 같아야 띠가 보이지 않는다. 기본은 화면 바탕 */
  fadeColor?: string;
};

/**
 * 긴 글을 높이로 접고 아래를 바탕색으로 흐린다. 실제로 넘칠 때만 '더 보기'를 낸다.
 * 접힘과 펼침이 같은 문단 배치를 쓰고 높이만 바꾼다. 줄 수로 자르거나 문단을 합치면
 * 펼칠 때 줄바꿈이 다시 잡혀 읽던 줄을 잃으므로, 보이던 글자는 제자리에 두고 아래로만 늘린다.
 */
function ExpandableText({
  text,
  lines,
  variant = 'body',
  className,
  toggleClassName,
  fadeColor,
}: ExpandableTextProps) {
  useLocale();
  const { colorScheme } = useColorScheme();
  const [expanded, setExpanded] = React.useState(false);
  // 한 줄 높이는 같은 글꼴의 숨은 한 줄로 잰다. 재기 전에는 body 줄 높이로 가늠한다
  const [lineHeight, setLineHeight] = React.useState(23);
  const [contentHeight, setContentHeight] = React.useState(0);

  const paragraphs = React.useMemo(
    () =>
      text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    [text]
  );

  const collapsedHeight = Math.round(lineHeight * lines);
  const truncated = contentHeight > collapsedHeight + 4;
  const theme = THEME[colorScheme === 'dark' ? 'dark' : 'light'];
  // 상세 화면은 웹에서 surface-1, 앱에서 background 위에 놓인다
  const fade = fadeColor ?? (Platform.OS === 'web' ? theme.surface1 : theme.background);

  const onLineLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0) setLineHeight(height);
  };
  const onContentLayout = (event: LayoutChangeEvent) =>
    setContentHeight(event.nativeEvent.layout.height);

  return (
    <View>
      <View
        className="overflow-hidden"
        style={expanded ? undefined : { maxHeight: collapsedHeight }}>
        <View onLayout={onContentLayout} style={{ gap: Math.round(lineHeight / 2) }}>
          {paragraphs.map((paragraph, index) => (
            <Text key={index} variant={variant} className={className}>
              {paragraph}
            </Text>
          ))}
        </View>
        {!expanded && truncated ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 bottom-0"
            style={{ height: Math.round(lineHeight * 2.25) }}>
            <Scrim from="bottom" color={fade} opacity={1} extent={100} />
          </View>
        ) : null}
        <View
          pointerEvents="none"
          className="absolute left-0 top-0 opacity-0"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Text variant={variant} numberOfLines={1} onLayout={onLineLayout} className={className}>
            M
          </Text>
        </View>
      </View>
      {truncated ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          className="mt-1.5 self-start"
          hitSlop={8}>
          <Text variant="label" className={cn('text-foreground-muted', toggleClassName)}>
            {expanded ? t('접기') : t('더 보기')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export { ExpandableText };
