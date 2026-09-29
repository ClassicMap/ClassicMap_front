import { PersonCard } from '@/components/home/cards';
import { Skeleton } from '@/components/ui/skeleton';
import * as React from 'react';
import { type LayoutChangeEvent, ScrollView, View } from 'react-native';

export interface PersonItem {
  key: string;
  name: string;
  image?: string | null;
  caption?: string;
  inRepertoire?: boolean;
  onPress: () => void;
}

/** 폭에 맞춰 열 수를 정하는 원형 사진 그리드. 사람은 원, 이름 아래 한 줄 설명 */
export function PeopleGrid({
  items,
  loading,
  wide,
}: {
  items: readonly PersonItem[];
  loading: boolean;
  wide: boolean;
}) {
  const [width, setWidth] = React.useState(0);
  const gap = wide ? 24 : 14;
  const minItem = wide ? 148 : 96;
  const columns = width > 0 ? Math.max(3, Math.floor((width + gap) / (minItem + gap))) : 0;
  const itemWidth = columns > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ columnGap: gap, rowGap: gap + 8 }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {loading
        ? Array.from({ length: Math.max(columns, 3) * 2 }, (_, index) => (
            <View key={index} style={{ width: itemWidth || minItem }} className="items-center gap-2">
              <Skeleton className="aspect-square w-full rounded-full" />
              <Skeleton className="h-3 w-2/3" />
            </View>
          ))
        : itemWidth > 0
          ? items.map((item) => (
              <View key={item.key} style={{ width: itemWidth }}>
                <PersonCard
                  name={item.name}
                  image={item.image}
                  caption={item.caption}
                  width={itemWidth}
                  inRepertoire={item.inRepertoire}
                  onPress={item.onPress}
                />
              </View>
            ))
          : null}
    </View>
  );
}

/** 레퍼토리에 담은 사람을 목록 위에 가로 한 줄로 */
export function PeopleShelf({ items, wide }: { items: readonly PersonItem[]; wide: boolean }) {
  const size = wide ? 112 : 84;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-5">
      {items.map((item) => (
        <View key={item.key} style={{ width: size }}>
          <PersonCard
            name={item.name}
            image={item.image}
            caption={item.caption}
            width={size}
            inRepertoire
            onPress={item.onPress}
          />
        </View>
      ))}
    </ScrollView>
  );
}
