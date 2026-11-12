import { useLocale } from '@/lib/i18n';
import { GENRE_ICONS, OtherGenreIcon } from '@/components/shared/icons/genre-icon';
import { genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import * as React from 'react';
import { View } from 'react-native';

/** 장르를 모를 때 칸 색. 장르 단색들과 같은 밝기의 중립색이다 */
const NEUTRAL_MARK = '#5A544C';

/**
 * 장르 표지: 장르 단색 칸에 흰 장르 아이콘을 얹는다(작은 앱 아이콘 꼴).
 * 갈래 칩과 갈래 머리에서 색 점 대신 쓴다. 장르가 없으면 중립색과 '기타' 아이콘이다.
 * 장르 색은 둘러보기 타일과 같은 단색만 쓴다(그라데이션 덧칠은 걷었다).
 */
export function GenreMark({ genre, size = 20 }: { genre: PieceGenre | null; size?: number }) {
  useLocale();
  const color = genreStyle(genre)?.color ?? NEUTRAL_MARK;
  const IconComponent = genre ? GENRE_ICONS[genre] : OtherGenreIcon;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: color }}>
      <IconComponent size={Math.round(size * 0.72)} color="#FFFFFF" />
    </View>
  );
}
