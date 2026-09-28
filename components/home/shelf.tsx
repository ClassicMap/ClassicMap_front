import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';

interface ShelfHeaderProps {
  title: string;
  /** 제목 옆 보조 정보 (건수·기준) */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  wide: boolean;
}

export function ShelfHeader({ title, meta, actionLabel = '전체 보기', onAction, wide }: ShelfHeaderProps) {
  return (
    <View className="mb-3.5 flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
        <Text variant={wide ? 'title2' : 'title3'} numberOfLines={1}>
          {title}
        </Text>
        {meta ? <Text variant="caption">{meta}</Text> : null}
      </View>
      {onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="link"
          hitSlop={8}
          className="flex-row items-center gap-0.5 rounded-full px-1 py-0.5 web:hover:opacity-80">
          <Text variant="label" className="text-foreground-muted">
            {actionLabel}
          </Text>
          <Icon as={ChevronRightIcon} size={14} className="text-foreground-subtle" />
        </Pressable>
      ) : null}
    </View>
  );
}

interface ShelfRowProps<T> {
  items: readonly T[];
  /** 이 폭보다 좁아지지 않게 칸 수를 정한다 */
  minItemWidth: number;
  gap?: number;
  keyOf: (item: T) => string | number;
  renderItem: (item: T, width: number) => React.ReactNode;
  /** 폭을 재기 전 첫 렌더에서 쓸 칸 수 */
  initialColumns?: number;
}

/**
 * 데스크톱 셸프: 폭에 맞는 칸 수만큼 한 줄만 보여 준다 (Spotify 셸프 규칙).
 * 칸 폭은 남는 폭을 나눠 늘린다. 그리드 칸이 콘텐츠에 밀리지 않게 폭을 직접 계산한다 (부록 D-1).
 */
export function ShelfRow<T>({ items, minItemWidth, gap = 20, keyOf, renderItem, initialColumns = 5 }: ShelfRowProps<T>) {
  const [width, setWidth] = React.useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const columns = width > 0 ? Math.max(1, Math.floor((width + gap) / (minItemWidth + gap))) : initialColumns;
  const itemWidth = width > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : minItemWidth;
  return (
    <View onLayout={onLayout} className="flex-row" style={{ gap }}>
      {items.slice(0, columns).map((item) => (
        <View key={keyOf(item)} style={{ width: itemWidth }}>
          {renderItem(item, itemWidth)}
        </View>
      ))}
    </View>
  );
}

interface GridProps<T> {
  items: readonly T[];
  columns: number;
  gap?: number;
  keyOf: (item: T) => string | number;
  renderItem: (item: T, width: number) => React.ReactNode;
}

/** 모바일 n열 그리드. 칸 폭을 계산해 넘긴다. */
export function Grid<T>({ items, columns, gap = 12, keyOf, renderItem }: GridProps<T>) {
  const [width, setWidth] = React.useState(0);
  const itemWidth = width > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="flex-row flex-wrap"
      style={{ columnGap: gap, rowGap: gap + 6 }}>
      {itemWidth > 0
        ? items.map((item) => (
            <View key={keyOf(item)} style={{ width: itemWidth }}>
              {renderItem(item, itemWidth)}
            </View>
          ))
        : null}
    </View>
  );
}

/**
 * 모바일 가로 스크롤 셸프. 본문 좌우 여백을 뚫고 화면 끝까지 흘려서
 * 더 있다는 게 보이게 한다 (설계 문서 7.1).
 */
export function ScrollShelf({ children, gap = 14, className }: { children: React.ReactNode; gap?: number; className?: string }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn('-mx-4', className)}
      contentContainerStyle={{ paddingHorizontal: 16, gap }}>
      {children}
    </ScrollView>
  );
}
