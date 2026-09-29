import { FavoriteButton } from '@/components/favorite-button';
import { Chip } from '@/components/ui/chip';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Text } from '@/components/ui/text';
import type { FavoriteGroups, FavoriteTargetType } from '@/lib/api/client';
import { buildLibraryEntries, libraryKindLabel, type LibraryEntry, type LibraryKind } from '@/lib/data/library';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

type Filter = 'all' | LibraryKind;

const FILTERS: Filter[] = ['all', 'composer', 'artist', 'piece', 'concert'];

const FAVORITE_KIND: Record<LibraryKind, FavoriteTargetType> = {
  composer: 'composers',
  artist: 'artists',
  piece: 'pieces',
  concert: 'concerts',
};

function addedDay(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}.${date.getDate()} 담음`;
}

interface RepertoireListProps {
  favorites: FavoriteGroups;
  /** 내 레퍼토리면 행마다 빼기 버튼을 둔다. 남의 공개 프로필에서는 끈다 */
  editable?: boolean;
  /** 표시할 최대 행 수. 넘치면 onShowAll로 전체 보기를 연다 */
  limit?: number;
  onShowAll?: () => void;
}

/** 레퍼토리 목록: 종류 칩 + 담은 순서 행 (레퍼토리 탭·마이페이지·공개 프로필이 같이 쓴다) */
export function RepertoireList({ favorites, editable = false, limit, onShowAll }: RepertoireListProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>('all');
  const entries = React.useMemo(() => buildLibraryEntries(favorites), [favorites]);
  const counts = React.useMemo(() => {
    const map: Record<Filter, number> = { all: entries.length, composer: 0, artist: 0, piece: 0, concert: 0 };
    for (const entry of entries) map[entry.kind] += 1;
    return map;
  }, [entries]);
  const filtered = filter === 'all' ? entries : entries.filter((entry) => entry.kind === filter);
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {FILTERS.filter((key) => key === 'all' || counts[key] > 0).map((key) => (
          <Chip
            key={key}
            label={key === 'all' ? '전체' : libraryKindLabel(key)}
            count={counts[key]}
            selected={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </ScrollView>
      <View className="mt-3">
        {visible.map((entry) => (
          <RepertoireRow
            key={entry.key}
            entry={entry}
            editable={editable}
            onPress={() => router.push(entry.href as Href)}
          />
        ))}
      </View>
      {limit && filtered.length > limit && onShowAll ? (
        <Pressable onPress={onShowAll} accessibilityRole="link" className="mt-2 self-start px-1 py-1.5">
          <Text variant="label" className="text-foreground-muted">
            {`${filtered.length}개 모두 보기`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RepertoireRow({ entry, editable, onPress }: { entry: LibraryEntry; editable: boolean; onPress: () => void }) {
  const meta =
    entry.kind === 'composer' || entry.kind === 'artist'
      ? entry.subtitle
      : `${libraryKindLabel(entry.kind)} · ${entry.subtitle}`;
  const image = useComposerAvatar(entry.composerId, entry.image);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className="-mx-2 min-h-16 flex-row items-center gap-3 rounded-md px-2 py-2 active:bg-surface-2 web:hover:bg-surface-2">
      <EntityThumb
        name={entry.title}
        image={image}
        shape={entry.shape}
        size={48}
        aspect={entry.kind === 'concert' ? 4 / 3 : 1}
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body font-semibold text-foreground">
          {entry.title}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {[meta, addedDay(entry.createdAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {editable ? <FavoriteButton kind={FAVORITE_KIND[entry.kind]} id={entry.id} name={entry.title} /> : null}
    </Pressable>
  );
}
