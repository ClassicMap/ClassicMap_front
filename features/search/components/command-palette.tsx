import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useUnifiedSearch } from '@/features/search/hooks/use-unified-search';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { msg, t, useLocale } from '@/lib/i18n';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import { type PrefetchTarget, prefetchTarget } from '@/lib/navigation/prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { CornerDownLeftIcon, MoonStarIcon, SearchIcon, type LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { useCommandPalette } from './command-palette-context';
import { Kbd } from '@/components/ui/kbd';
import { titleMeta } from '@/features/film/lib/labels';
import { tmdbImageUrl, youtubeClipThumbnail } from '@/lib/utils/tmdb';

const GROUP_LIMIT = 5;
/** 고른 줄에 이만큼 머물면 그 화면 데이터를 미리 받는다 (화살표로 훑을 때는 부르지 않는다) */
const PREFETCH_DELAY_MS = 120;
/** 닫는 움직임 길이 (global.css .cm-layer-out) */
const CLOSE_MS = 80;

type ResultKind = 'composer' | 'piece' | 'artist' | 'concert' | 'screen' | 'action';

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
  /** 이 줄을 고르고 있으면 미리 받을 화면 데이터 */
  prefetch?: PrefetchTarget;
  run: () => void;
}

interface PaletteGroup {
  label: string;
  items: PaletteItem[];
}

const GROUP_LABELS: Record<Exclude<ResultKind, 'action'>, string> = {
  composer: msg('작곡가'),
  piece: msg('작품'),
  artist: msg('아티스트'),
  concert: msg('공연'),
  screen: msg('영화·드라마'),
};

export function CommandPalette() {
  const { locale } = useLocale();
  const { open, setOpen } = useCommandPalette();
  const queryClient = useQueryClient();
  const router = useRouter();
  // 닫을 때도 잠깐(80ms) 그려 두고 0.98배로 줄며 사라지게 한다
  const [closing, setClosing] = React.useState(false);
  const wasOpen = React.useRef(open);
  const { toggleColorScheme } = useColorScheme();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounced = useDebounce(query, 300);
  const result = useUnifiedSearch(debounced, { enabled: open, limit: GROUP_LIMIT });

  const close = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  React.useEffect(() => {
    if (open) {
      setClosing(false);
    } else if (wasOpen.current) {
      setClosing(true);
      const timer = setTimeout(() => {
        setClosing(false);
        setQuery('');
        setActiveIndex(0);
      }, CLOSE_MS);
      wasOpen.current = open;
      return () => clearTimeout(timer);
    }
    wasOpen.current = open;
  }, [open]);

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
        meta: [t(composer.period), composer.birthYear ? `${composer.birthYear}–${composer.deathYear ?? ''}` : '']
          .filter(Boolean)
          .join(' · '),
        image: composer.avatarUrl,
        shape: 'circle',
        prefetch: { kind: 'composer', composerId: composer.id },
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
        prefetch: { kind: 'piece', pieceId: piece.id, composerId: piece.composerId },
        run: () => go(`/compare?composerId=${piece.composerId}&pieceId=${piece.id}`),
      }));
      const artists: PaletteItem[] = result.artists.map((artist) => ({
        key: `artist-${artist.id}`,
        kind: 'artist',
        title: artist.name,
        meta: getArtistCategoryLabel(artist.category),
        image: artist.imageUrl,
        shape: 'circle',
        prefetch: { kind: 'artist', artistId: artist.id },
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
      const screenTitles: PaletteItem[] = result.screenTitles.map((title) => ({
        key: `screen-${title.id}`,
        kind: 'screen',
        title: title.titleKo,
        meta: titleMeta(title.kind, title.releaseYear),
        image: tmdbImageUrl(title.posterPath, 'w185') ?? youtubeClipThumbnail(title.coverVideoId)?.fallback ?? null,
        shape: 'square',
        run: () => go(`/film/${title.id}`),
      }));
      for (const [kind, items] of [
        ['composer', composers],
        ['piece', pieces],
        ['artist', artists],
        ['concert', concerts],
        ['screen', screenTitles],
      ] as const) {
        if (items.length > 0) list.push({ label: GROUP_LABELS[kind], items });
      }
    }
    list.push({
      label: msg('액션'),
      items: [
        {
          key: 'action-theme',
          kind: 'action',
          title: t('다크 모드 전환'),
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
  }, [
    debounced,
    result.composers,
    result.pieces,
    result.artists,
    result.concerts,
    result.screenTitles,
    go,
    toggleColorScheme,
    close,
   locale,]);

  const flat = React.useMemo(() => groups.flatMap((group) => group.items), [groups, locale]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  const activePrefetch = open ? flat[activeIndex]?.prefetch : undefined;
  React.useEffect(() => {
    if (!activePrefetch) return;
    const timer = setTimeout(() => void prefetchTarget(queryClient, activePrefetch), PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activePrefetch, queryClient]);

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

  if (!open && !closing) return null;

  const trimmed = debounced.trim();
  const hasResults = groups.length > 1;
  let running = -1;

  return (
    <View className="absolute inset-0 z-50" style={{ position: 'fixed' as 'absolute' }}>
      <Pressable
        accessibilityLabel={t('검색 닫기')}
        className={cn('absolute inset-0 bg-black/50', closing ? 'cm-scrim-out' : 'cm-scrim-in')}
        onPress={close}
      />
      <View
        accessibilityRole="search"
        className={cn(
          'mx-auto mt-[12vh] w-[640px] max-w-[92vw] overflow-hidden rounded-xl border border-border-strong bg-surface-2',
          closing ? 'cm-layer-out' : 'cm-layer-in'
        )}
        style={{ maxHeight: 480, boxShadow: '0 16px 48px -12px rgba(0,0,0,0.7)', transformOrigin: '50% 0' } as object}>
        <View className="h-12 flex-row items-center gap-3 border-b border-border px-4">
          <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('작곡가, 작품, 아티스트, 공연 검색')}
            placeholderTextColor="hsl(var(--foreground-faint))"
            className="flex-1 font-sans text-body text-foreground outline-none"
            accessibilityLabel={t('검색어')}
          />
          <Kbd>esc</Kbd>
        </View>
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {trimmed && !hasResults && !result.isFetching ? (
            <View className="items-center px-6 py-10">
              <Text variant="bodySm" className="text-foreground-muted">
                {t('“{q}”에 맞는 결과가 없어요. 다른 이름이나 영문 표기로 찾아보세요.', { q: trimmed })}
              </Text>
            </View>
          ) : null}
          {result.failedCount > 0 ? (
            <View className="px-4 pt-3">
              <Text variant="caption" className="text-destructive">
                {t('일부 검색이 실패했어요. 잠시 뒤 다시 입력해 보세요.')}
              </Text>
            </View>
          ) : null}
          {groups.map((group) => (
            <View key={group.label} className="py-1.5">
              <Text variant="micro" className="px-4 pb-1 pt-2 uppercase">
                {t(group.label)}
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
            {t('이동')}
          </Text>
          <Kbd>↵</Kbd>
          <Text variant="caption" className="text-foreground-subtle">
            {t('열기')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PaletteThumb({ item }: { item: PaletteItem }) {
  useLocale();
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
