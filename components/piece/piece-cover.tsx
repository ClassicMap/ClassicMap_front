import { CoverPortrait } from '@/components/piece/cover-portrait';
import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import { genreGradient, genreStyle } from '@/lib/design/genre-palette';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface PieceCoverProps {
  /** 접근성·폴백용 작품 이름 */
  title: string;
  genre?: string | null;
  /** 작곡가 초상. 없으면 색 면과 장르 글자만 */
  portrait?: string | null;
  size: number;
  /** 커버 위 장르 글자. 기본은 96px 이상일 때만 */
  showLabel?: boolean;
  radius?: number;
  className?: string;
}

/**
 * 작품 커버 (스포티파이 플레이리스트 커버 꼴). 작품에 앨범 아트가 없어 작곡가 초상만 쓰면
 * 베토벤 작품 열네 곡이 똑같아 보였다. 장르 색 그라데이션 위에 초상을 흑백으로 녹여
 * 같은 작곡가라도 장르가 다르면 다른 커버가 되게 한다.
 */
export function PieceCover({
  title,
  genre,
  portrait,
  size,
  showLabel,
  radius,
  className,
}: PieceCoverProps) {
  const gradientId = `cover-${React.useId().replace(/:/g, '')}`;
  const { from, to } = genreGradient(genre);
  const style = genreStyle(genre);
  const labelVisible = (showLabel ?? size >= 96) && Boolean(style);
  const corner = radius ?? Math.max(4, Math.round(size * 0.05));
  const fontSize = Math.max(10, Math.min(16, Math.round(size * 0.085)));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('overflow-hidden', className)}
      style={[
        { width: size, height: size, borderRadius: corner },
        // 초상 블렌드가 커버 밖(페이지 배경)과 섞이지 않게 쌓임 맥락을 가둔다
        Platform.OS === 'web' ? ({ isolation: 'isolate' } as object) : null,
      ]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${gradientId})`} />
      </Svg>
      {portrait ? <CoverPortrait uri={portrait} size={size} /> : null}
      {/* 네이티브는 마스크가 없어 왼쪽을 시작색으로 덮어 초상 경계를 지운다 */}
      {portrait && Platform.OS !== 'web' ? (
        <Scrim from="left" color={from} opacity={0.95} extent={58} />
      ) : null}
      <Scrim from="bottom" opacity={0.28} extent={45} />
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
      {/* 장르가 없고 초상도 없으면 제목 첫 글자로 빈 면을 채운다 */}
      {!style && !portrait ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text
            className="font-semibold text-white/80"
            style={{ fontSize: Math.round(size * 0.32) }}>
            {title.trim()[0] ?? '?'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
