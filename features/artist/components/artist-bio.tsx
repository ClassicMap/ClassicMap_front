import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';

/** 접었을 때 높이. body-sm 한 줄이 21px 이라 다섯 줄 남짓, 아래 두 줄은 흐려진다 */
const COLLAPSED_HEIGHT = 105;
const FADE_HEIGHT = 48;

type ArtistBioProps = {
  bio: string | null | undefined;
  style: string | null | undefined;
};

/**
 * 아티스트 소개 + 연주 스타일.
 * 접힘과 펼침이 같은 문단 배치를 쓰고 높이만 바꾼다. 문단을 합쳐 줄 수로 자르면
 * 펼칠 때 줄바꿈이 전부 다시 잡혀 읽던 줄이 사라지므로, 보이던 글자는 제자리에 두고 아래로만 늘린다.
 */
function ArtistBio({ bio, style }: ArtistBioProps) {
  useLocale();
  const { colorScheme } = useColorScheme();
  const [expanded, setExpanded] = React.useState(false);
  const [contentHeight, setContentHeight] = React.useState(0);

  const paragraphs = React.useMemo(
    () =>
      [bio, style]
        .flatMap((text) => (text ?? '').split(/\n+/))
        .map((line) => line.trim())
        .filter(Boolean),
    [bio, style]
  );
  if (paragraphs.length === 0) return null;

  const truncated = contentHeight > COLLAPSED_HEIGHT + 4;
  const clamped = !expanded && truncated;
  // 화면 바탕과 같은 색으로 흐려야 띠가 보이지 않는다 (웹은 surface-1 위에 놓인다)
  const theme = THEME[colorScheme === 'dark' ? 'dark' : 'light'];
  const fadeColor = Platform.OS === 'web' ? theme.surface1 : theme.background;

  const onContentLayout = (event: LayoutChangeEvent) =>
    setContentHeight(event.nativeEvent.layout.height);

  return (
    <View className="mt-6 max-w-[720px]">
      <View
        className="overflow-hidden"
        style={expanded ? undefined : { maxHeight: COLLAPSED_HEIGHT }}>
        <View onLayout={onContentLayout} className="gap-2.5">
          {paragraphs.map((paragraph, index) => (
            <Text key={index} variant="bodySm" className="text-foreground-muted">
              {paragraph}
            </Text>
          ))}
        </View>
        {clamped ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 bottom-0"
            style={{ height: FADE_HEIGHT }}>
            <Scrim from="bottom" color={fadeColor} opacity={1} extent={100} />
          </View>
        ) : null}
      </View>
      {truncated ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          className="mt-1.5 self-start">
          <Text variant="label" className="text-foreground">
            {expanded ? t('접기') : t('더 보기')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export { ArtistBio };
