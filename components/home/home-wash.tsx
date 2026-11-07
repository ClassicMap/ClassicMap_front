import { GradientWash } from '@/components/ui/gradient-wash';
import { type ColorScheme } from '@/lib/design/tokens';
import { genreStyle, type PieceGenre, washColor } from '@/lib/design/genre-palette';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

/**
 * 홈 위쪽 색 번짐이 따라갈 호버 장르. 홈 화면 상태로 두면 호버할 때마다 홈 전체(카드 수십 장)가
 * 다시 그려져서, 번짐 층만 구독하는 작은 저장소로 뺐다.
 * undefined = 호버 없음(오늘의 비교 색), null = 장르 없는 작품에 호버(브랜드 색)
 */
let hovered: PieceGenre | null | undefined;
const listeners = new Set<() => void>();

export const homeWashHover = {
  set(genre: PieceGenre | null | undefined) {
    if (genre === hovered) return;
    hovered = genre;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => hovered,
};

/** 홈 번짐 색. 장르가 없으면 브랜드(브라스) 색을 옅게 */
export function homeWashColor(genre: PieceGenre | null | undefined, scheme: ColorScheme): string {
  const style = genreStyle(genre);
  if (style) return washColor(scheme === 'dark' ? style.from : style.to, scheme, 0.7);
  return scheme === 'dark' ? 'hsla(38, 62%, 60%, 0.12)' : 'hsla(36, 62%, 40%, 0.07)';
}

/** 홈 스크롤 내용 맨 위에 까는 번짐 층. 평소엔 오늘의 비교 색, 최근 본 작품에 호버하면 그 작품 색 */
export function HomeWash({ todayGenre, height }: { todayGenre: PieceGenre | null | undefined; height: number }) {
  const { colorScheme } = useColorScheme();
  const hover = React.useSyncExternalStore(homeWashHover.subscribe, homeWashHover.get, homeWashHover.get);
  // 홈을 떠날 때 호버가 남아 있으면(호버 아웃 없이 이동) 돌아왔을 때 엉뚱한 색이 되지 않게 지운다
  React.useEffect(() => () => homeWashHover.set(undefined), []);
  const color = homeWashColor(hover !== undefined ? hover : todayGenre, colorScheme === 'dark' ? 'dark' : 'light');
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0" style={{ height }}>
      <GradientWash color={color} />
    </View>
  );
}
