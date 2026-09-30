import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useUnifiedSearch } from '@/hooks/use-unified-search';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { CornerDownLeftIcon, MoonStarIcon, SearchIcon, type LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { useCommandPalette } from './command-palette-context';
import { Kbd } from './kbd';

const GROUP_LIMIT = 5;

type ResultKind = 'composer' | 'piece' | 'artist' | 'concert' | 'action';

interface PaletteItem {
  key: string;
  kind: ResultKind;
  title: string;
  meta?: string;
  image?: string | null;
  /** 작품이면 작곡가. 목록에 초상이 없을 때 작곡가 초상을 찾는 데 쓴다 */
  composerId?: number;
  /** 사람은 원, 콘텐츠는 사각 */
  shape: 'circle' | 'square';
  icon?: LucideIcon;
  run: () => void;
}

interface PaletteGroup {
  label: string;
  items: PaletteItem[];
}

const GROUP_LABELS: Record<Exclude<ResultKind, 'action'>, string> = {
  composer: '작곡가',
  piece: '작품',
  artist: '아티스트',
  concert: '공연',
};

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { toggleColorScheme } = useColorScheme();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounced = useDebounce(query, 300);
  const result = useUnifiedSearch(debounced, { enabled: open, limit: GROUP_LIMIT });

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, [setOpen]);

  const go = React.useCallback(
    (href: Href) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const groups: PaletteGroup[] = React.useMemo(() => {
    const list: PaletteGroup[] = [];
    if (debounced.trim()) {
      const composers: PaletteItem[] = result.composers.map((composer) => ({
        key: `composer-${composer.id}`,
        kind: 'composer',
        title: composer.name,
        meta: [composer.period, composer.birthYear ? `${composer.birthYear}–${composer.deathYear ?? ''}` : '']
          .filter(Boolean)
          .join(' · '),
        image: composer.avatarUrl,
        shape: 'circle',
        run: () => go(`/composer/${composer.id}`),
      }));
      const pieces: PaletteItem[] = result.pieces.map((piece) => ({
        key: `piece-${piece.id}`,
        kind: 'piece',
        title: piece.title,
        meta: [piece.composerName, piece.opusNumber].filter(Boolean).join(' · '),
        image: piece.composerAvatarUrl,
        composerId: piece.composerId,
        shape: 'square',
        run: () => go(`/compare?composerId=${piece.composerId}&pieceId=${piece.id}`),
      }));
      const artists: PaletteItem[] = result.artists.map((artist) => ({
        key: `artist-${artist.id}`,
        kind: 'artist',
        title: artist.name,
        meta: getArtistCategoryLabel(artist.category),
        image: artist.imageUrl,
        shape: 'circle',
        run: () => go(`/artist/${artist.id}`),
      }));
      const concerts: PaletteItem[] = result.concerts.map((concert) => ({
        key: `concert-${concert.id}`,
        kind: 'concert',
        title: concert.title,
        meta: [concert.startDate, concert.facilityName].filter(Boolean).join(' · '),
        image: concert.posterUrl,
        shape: 'square',
        run: () => go(`/concert/${concert.id}`),
      }));
      for (const [kind, items] of [
        ['composer', composers],
        ['piece', pieces],
        ['artist', artists],
        ['concert', concerts],
      ] as const) {
        if (items.length > 0) list.push({ label: GROUP_LABELS[kind], items });
      }
    }
    list.push({
      label: '액션',
      items: [
        {
          key: 'action-theme',
          kind: 'action',
          title: '다크 모드 전환',
          shape: 'square',
          icon: MoonStarIcon,
          run: () => {
            toggleColorScheme();
            close();
          },
        },
      ],
    });
    return list;
  }, [debounced, result.composers, result.pieces, result.artists, result.concerts, go, toggleColorScheme, close]);

  const flat = React.useMemo(() => groups.flatMap((group) => group.items), [groups]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
      } else if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        flat[activeIndex]?.run();
      }
    }
    // 입력 칸(RN TextInput)은 키 이벤트 전파를 끊으므로 캡처 단계에서 먼저 받는다
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, flat, activeIndex, close]);

  if (!open) return null;

  const trimmed = debounced.trim();
  const hasResults = groups.length > 1;
  let running = -1;

  return (
    <View className="absolute inset-0 z-50" style={{ position: 'fixed' as 'absolute' }}>
      <Pressable
        accessibilityLabel="검색 닫기"
        className="absolute inset-0 bg-black/50"
        onPress={close}
      />
      <View
        accessibilityRole="search"
        className="mx-auto mt-[12vh] w-[640px] max-w-[92vw] overflow-hidden rounded-xl border border-border-strong bg-surface-2"
        style={{ maxHeight: 480, boxShadow: '0 16px 48px -12px rgba(0,0,0,0.7)' } as object}>
        <View className="h-12 flex-row items-center gap-3 border-b border-border px-4">
          <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="작곡가, 작품, 아티스트, 공연 검색"
            placeholderTextColor="hsl(var(--foreground-faint))"
            className="flex-1 font-sans text-body text-foreground outline-none"
            accessibilityLabel="검색어"
          />
          <Kbd>esc</Kbd>
        </View>
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {trimmed && !hasResults && !result.isFetching ? (
            <View className="items-center px-6 py-10">
              <Text variant="bodySm" className="text-foreground-muted">
                “{trimmed}”에 맞는 결과가 없어요. 다른 이름이나 영문 표기로 찾아보세요.
              </Text>
            </View>
          ) : null}
          {result.failedCount > 0 ? (
            <View className="px-4 pt-3">
              <Text variant="caption" className="text-destructive">
                일부 검색이 실패했어요. 잠시 뒤 다시 입력해 보세요.
              </Text>
            </View>
          ) : null}
          {groups.map((group) => (
            <View key={group.label} className="py-1.5">
              <Text variant="micro" className="px-4 pb-1 pt-2 uppercase">
                {group.label}
              </Text>
              {group.items.map((item) => {
                running += 1;
                const index = running;
                const active = index === activeIndex;
                return (
                  <Pressable
                    key={item.key}
                    onPress={item.run}
                    onHoverIn={() => setActiveIndex(index)}
                    className={cn(
                      'mx-1.5 h-10 flex-row items-center gap-3 rounded-md px-2.5',
                      active && 'bg-surface-3'
                    )}>
                    <PaletteThumb item={item} />
                    <Text numberOfLines={1} className="flex-1 text-body-sm text-foreground">
                      {item.title}
                    </Text>
                    {item.meta ? (
                      <Text numberOfLines={1} className="max-w-[40%] text-caption text-foreground-subtle">
                        {item.meta}
                      </Text>
                    ) : null}
                    <View className={cn('w-4', !active && 'opacity-0')}>
                      <Icon as={CornerDownLeftIcon} size={14} className="text-foreground-subtle" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
        <View className="h-9 flex-row items-center gap-3 border-t border-border px-4">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <Text variant="caption" className="text-foreground-subtle">
            이동
          </Text>
          <Kbd>↵</Kbd>
          <Text variant="caption" className="text-foreground-subtle">
            열기
          </Text>
        </View>
      </View>
    </View>
  );
}

function PaletteThumb({ item }: { item: PaletteItem }) {
  const image = useComposerAvatar(item.composerId, item.image);
  if (item.icon) {
    return (
      <View className="size-6 items-center justify-center rounded-sm bg-surface-3">
        <Icon as={item.icon} size={14} className="text-foreground-muted" />
      </View>
    );
  }
  return <EntityThumb name={item.title} image={image} shape={item.shape} size={24} />;
}
