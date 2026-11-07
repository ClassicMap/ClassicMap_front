import { CoverPortrait } from '@/components/piece/cover-portrait';
import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import { genreGradient, genreStyle, NEUTRAL_COVER } from '@/lib/design/genre-palette';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface PieceCoverProps {
  /** 접근성·폴백용 작품 이름 */
  title: string;
  genre?: string | null;
  /** 작곡가 초상. 없으면 장르 색 면에 작곡가 첫 글자를 옅게 깐다 */
  portrait?: string | null;
  /** 초상이 없을 때 첫 글자를 따 올 이름(작곡가). 없으면 작품 이름 */
  initialOf?: string;
  size: number;
  /** 커버 위 장르 글자. 기본은 96px 이상일 때만. 한 장르만 모인 화면에서는 끈다 */
  showLabel?: boolean;
  radius?: number;
  className?: string;
}

/**
 * 작품 커버. 작품에 앨범 아트가 없어 작곡가 초상을 쓰되, 왼쪽에서 장르 색이 번져 들어오고
 * 그 위에 장르 이름을 둔다. 초상은 원래 색 그대로 둔다(초상까지 장르 색으로 물들이니 한 장르 화면이
 * 온통 한 색이 됐다). 같은 작곡가 작품도 왼쪽 색과 글자로 장르가 갈린다.
 */
export function PieceCover({ title, genre, portrait, initialOf, size, showLabel, radius, className }: PieceCoverProps) {
  const gradientId = `cover-${React.useId().replace(/:/g, '')}`;
  const { from, to } = genreGradient(genre);
  const style = genreStyle(genre);
  const labelVisible = (showLabel ?? size >= 96) && Boolean(style);
  const corner = radius ?? Math.max(4, Math.round(size * 0.05));
  const fontSize = Math.max(10, Math.min(16, Math.round(size * 0.085)));
  const initial = (initialOf ?? title).trim()[0] ?? '?';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: corner, backgroundColor: NEUTRAL_COVER.to }}>
      {portrait ? (
        <>
          <CoverPortrait key={portrait} uri={portrait} size={size} />
          {/* 왼쪽에서 장르 색이 번져 들어와 초상 경계를 덮는다 */}
          <Scrim from="left" color={from} opacity={0.96} extent={64} />
        </>
      ) : (
        <>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={from} />
                <Stop offset="1" stopColor={to} />
              </LinearGradient>
            </Defs>
            <Rect width={size} height={size} fill={`url(#${gradientId})`} />
          </Svg>
          {/* 초상이 없으면 빈 색 면이 되지 않게 이름 첫 글자를 크게 옅게 */}
          <View className="absolute inset-0 items-end justify-end" style={{ padding: Math.round(size * 0.06) }}>
            <Text
              className="font-extrabold text-white/20"
              style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.56) }}>
              {initial}
            </Text>
          </View>
        </>
      )}
      <Scrim from="bottom" opacity={0.25} extent={40} />
      {labelVisible && style ? (
        <View className="absolute left-0 top-0" style={{ padding: Math.round(size * 0.075) }}>
          <Text
            numberOfLines={1}
            className="font-extrabold text-white"
            style={{ fontSize, lineHeight: Math.round(fontSize * 1.2), letterSpacing: -0.2 }}>
            {style.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

