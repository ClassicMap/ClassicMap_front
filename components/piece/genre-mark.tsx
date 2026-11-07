import { GENRE_ICONS, OtherGenreIcon } from '@/components/ui/icons/genre-icon';
import { genreStyle, NEUTRAL_COVER, type PieceGenre } from '@/lib/design/genre-palette';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * 장르 표지: 장르 색 그라데이션 칸에 흰 장르 아이콘을 얹는다(작은 앱 아이콘 꼴).
 * 갈래 칩과 갈래 머리에서 색 점 대신 쓴다. 장르가 없으면 중립색과 '기타' 아이콘이다.
 */
export function GenreMark({ genre, size = 20 }: { genre: PieceGenre | null; size?: number }) {
  const style = genreStyle(genre);
  const from = style?.from ?? NEUTRAL_COVER.from;
  const to = style?.to ?? NEUTRAL_COVER.to;
  const IconComponent = genre ? GENRE_ICONS[genre] : OtherGenreIcon;
  const id = `genre-mark-${React.useId().replace(/:/g, '')}`;
  const radius = Math.round(size * 0.28);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: radius }}>
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={radius} fill={`url(#${id})`} />
      </Svg>
      {/* 절대 위치로 깐 그라데이션 위에 오도록 아이콘도 자리를 갖는 View 로 감싼다(웹 쌓임 순서) */}
      <View style={{ position: 'relative' }}>
        <IconComponent size={Math.round(size * 0.72)} color="#FFFFFF" />
      </View>
    </View>
  );
}
