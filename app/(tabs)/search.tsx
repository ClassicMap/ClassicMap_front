import { Chip, ChipDot } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { CompareIcon, ComposerKindIcon, EraIcon, PerformerKindIcon } from '@/components/ui/icons';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUnifiedSearch } from '@/hooks/use-unified-search';
import { type ArtistCategoryCode, getArtistCategoryLabel } from '@/lib/design/artist-category';
import { getEraForeground } from '@/lib/design/era-palette';
import { PERIODS } from '@/lib/data/periods';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useComposerAvatar } from '@/lib/query/hooks/useComposers';
import type { Artist, Composer, Concert, PieceSearchResult, ScreenTitleSummary } from '@/lib/types/models';
import { titleMeta } from '@/components/screen/labels';
import { ScreenPoster } from '@/components/screen/screen-poster';
import { cn } from '@/lib/utils';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, ClapperboardIcon, DiscIcon, SearchIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTabHeaderInset } from '@/components/navigation/tab-chrome';

type ResultType = 'all' | 'composer' | 'piece' | 'artist' | 'concert' | 'screen';

const TYPE_CHIPS: { key: ResultType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'composer', label: '작곡가' },
  { key: 'piece', label: '작품' },
  { key: 'artist', label: '연주자' },
  { key: 'concert', label: '공연' },
  { key: 'screen', label: '영화·드라마' },
];

/** 한 종류만 볼 때는 더 많이 가져온다. */
const LIMIT_ALL = 5;
const LIMIT_SINGLE = 20;

interface BrowseTile {
  label: string;
  description: string;
  href: Href;
  renderIcon: (className: string) => React.ReactNode;
}

const PEOPLE_TILES: BrowseTile[] = [
  {
    label: '작곡가',
    description: '시대별로 추천 순',
    href: '/artists',
    renderIcon: (className) => <ComposerKindIcon size={22} className={className} />,
  },
  {
    label: '연주자',
    description: '피아니스트부터 오케스트라까지',
    href: '/artists?type=artist',
    renderIcon: (className) => <PerformerKindIcon size={22} className={className} />,
  },
];

const MORE_TILES: BrowseTile[] = [
  {
    label: '앨범',
    description: '담은 연주자의 새 앨범과 레이블별 음반',
    href: '/albums',
    renderIcon: (className) => <Icon as={DiscIcon} size={22} className={className} />,
  },
  {
    label: '타임라인',
    description: '작곡가들이 살았던 시간을 겹쳐 봐요',
    href: '/timeline',
    renderIcon: (className) => <EraIcon size={22} className={className} />,
  },
  {
    label: '비교할 수 있는 작품',
    description: '같은 구간을 연주자별로 들어 봐요',
    href: '/compare',
    renderIcon: (className) => <CompareIcon size={22} className={className} />,
  },
  {
    label: '영화 속 클래식',
    description: '영화·드라마·애니에서 들은 그 곡',
    href: '/films' as Href,
    renderIcon: (className) => <Icon as={ClapperboardIcon} size={22} className={className} />,
  },
];

/** 작곡가가 있는 시대만. 누르면 아티스트 탭의 그 시대로 */
const ERA_LINKS = PERIODS.filter((era) => era.id !== 'medieval');

/** 악기·편성 바로가기. 누르면 아티스트 탭의 연주자 그 분류로 */
const CATEGORY_LINKS: ArtistCategoryCode[] = [
  'pianist',
  'violinist',
  'cellist',
  'vocalist',
  'conductor',
  'orchestra',
  'ensemble',
  'choir',
];

function formatLife(composer: Composer): string {
  if (!composer.birthYear) return '';
  return `${composer.birthYear}–${composer.deathYear ?? ''}`;
}

function formatShortDate(date: string): string {
  const [, month, day] = date.split('-');
  if (!month || !day) return date;
  return `${Number(month)}.${Number(day)}`;
}

/** 이름이 검색어로 시작하는 결과를 "가장 근접"으로 올린다. 없으면 카드를 그리지 않는다. */
function pickTopHit(
  query: string,
  composers: Composer[],
  artists: Artist[]
): { kind: 'composer'; item: Composer } | { kind: 'artist'; item: Artist } | null {
  const q = query.toLowerCase();
  const composer = composers.find(
    (c) => c.name.toLowerCase().startsWith(q) || c.englishName?.toLowerCase().startsWith(q)
  );
  if (composer) return { kind: 'composer', item: composer };
  const artist = artists.find(
    (a) => a.name.toLowerCase().startsWith(q) || a.englishName?.toLowerCase().startsWith(q)
  );
  if (artist) return { kind: 'artist', item: artist };
  return null;
}

export default function SearchScreen() {
  const headerInset = useTabHeaderInset();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { layout } = useBreakpoint();
  const isWide = layout === 'desktop' || layout === 'wide';
  const [query, setQuery] = React.useState(typeof params.q === 'string' ? params.q : '');
  const [type, setType] = React.useState<ResultType>('all');
  const debounced = useDebounce(query, 300);
  const result = useUnifiedSearch(debounced, { limit: type === 'all' ? LIMIT_ALL : LIMIT_SINGLE });

  React.useEffect(() => {
    router.setParams({ q: debounced.trim() || undefined });
  }, [debounced, router]);

  const show = (kind: Exclude<ResultType, 'all'>) => type === 'all' || type === kind;
  const topHit = type === 'all' ? pickTopHit(result.query, result.composers, result.artists) : null;
  // 가장 근접 카드에 올린 항목은 아래 묶음에서 빼서 같은 줄이 두 번 보이지 않게 한다.
  const composers = result.composers.filter(
    (item) => !(topHit?.kind === 'composer' && topHit.item.id === item.id)
  );
  const artists = result.artists.filter(
    (item) => !(topHit?.kind === 'artist' && topHit.item.id === item.id)
  );
  const total =
    result.composers.length +
    result.pieces.length +
    result.artists.length +
    result.concerts.length +
    result.screenTitles.length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: headerInset }}>
      <View className={cn('gap-3 px-4 pb-2 pt-3', isWide && 'mx-auto w-full max-w-[880px] px-6')}>
        <View className="h-11 flex-row items-center gap-2.5 rounded-full border border-border-strong bg-surface-2 px-4">
          <Icon as={SearchIcon} size={18} className="text-foreground-subtle" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="작곡가, 작품, 연주자, 공연, 영화"
            placeholderTextColor="hsl(33 6% 46%)"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="검색어"
            className="flex-1 text-base text-foreground web:outline-none"
          />
          {query ? (
            <Pressable accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => setQuery('')}>
              <Icon as={XIcon} size={16} className="text-foreground-subtle" />
            </Pressable>
          ) : null}
        </View>
        {result.query ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {TYPE_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected={type === chip.key}
                onPress={() => setType(chip.key)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn('px-4 pb-16', isWide && 'mx-auto w-full max-w-[880px] px-6')}>
        {!result.query ? (
          <BrowseLanding isWide={isWide} />
        ) : result.isLoading ? (
          <SkeletonList rows={6} className="mt-2" />
        ) : total === 0 && result.failedCount === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title={`“${result.query}”에 맞는 결과가 없어요`}
            description="다른 표기나 영문 이름으로 찾아보세요."
          />
        ) : (
          <View>
            {result.failedCount > 0 ? (
              <Pressable
                onPress={result.retry}
                className="mt-3 flex-row items-center gap-2.5 rounded-lg bg-surface-2 p-3">
                <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
                <Text variant="bodySm" className="flex-1 text-foreground-muted">
                  일부 검색이 실패했어요. 눌러서 다시 시도해 주세요.
                </Text>
              </Pressable>
            ) : null}

            {topHit ? (
              <Pressable
                onPress={() =>
                  router.push(
                    topHit.kind === 'composer'
                      ? `/composer/${topHit.item.id}`
                      : `/artist/${topHit.item.id}`
                  )
                }
                className="mt-4 flex-row items-center gap-4 rounded-xl bg-surface-2 p-4 active:bg-surface-3 web:hover:bg-surface-3">
                <EntityThumb
                  name={topHit.item.name}
                  image={topHit.kind === 'composer' ? topHit.item.avatarUrl : topHit.item.imageUrl}
                  shape="circle"
                  size={64}
                />
                <View className="flex-1">
                  <Text className="text-title-3">{topHit.item.name}</Text>
                  <Text variant="caption" className="mt-1">
                    {topHit.kind === 'composer'
                      ? ['작곡가', formatLife(topHit.item)].filter(Boolean).join(' · ')
                      : getArtistCategoryLabel(topHit.item.category)}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {show('composer') && composers.length > 0 ? (
              <ResultGroup title="작곡가">
                {composers.map((composer) => (
                  <ResultRow
                    key={composer.id}
                    title={composer.name}
                    subtitle={[composer.period, formatLife(composer)].filter(Boolean).join(' · ')}
                    thumb={<EntityThumb name={composer.name} image={composer.avatarUrl} shape="circle" size={44} />}
                    onPress={() => router.push(`/composer/${composer.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('piece') && result.pieces.length > 0 ? (
              <ResultGroup title="작품">
                {result.pieces.map((piece: PieceSearchResult) => (
                  <ResultRow
                    key={piece.id}
                    title={piece.title}
                    subtitle={[piece.composerName, piece.opusNumber].filter(Boolean).join(' · ')}
                    thumb={<PieceThumb piece={piece} />}
                    onPress={() =>
                      router.push(`/compare?composerId=${piece.composerId}&pieceId=${piece.id}`)
                    }
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('artist') && artists.length > 0 ? (
              <ResultGroup title="연주자">
                {artists.map((artist) => (
                  <ResultRow
                    key={artist.id}
                    title={artist.name}
                    subtitle={getArtistCategoryLabel(artist.category)}
                    thumb={<EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={44} />}
                    onPress={() => router.push(`/artist/${artist.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('screen') && result.screenTitles.length > 0 ? (
              <ResultGroup title="영화·드라마">
                {result.screenTitles.map((title: ScreenTitleSummary) => (
                  <ResultRow
                    key={title.id}
                    title={title.titleKo}
                    subtitle={`${titleMeta(title.kind, title.releaseYear)} · 클래식 ${title.cueCount}곡`}
                    thumb={<ScreenPoster title={title.titleKo} posterPath={title.posterPath} width={30} />}
                    onPress={() => router.push(`/film/${title.id}` as Href)}
                  />
                ))}
              </ResultGroup>
            ) : null}

            {show('concert') && result.concerts.length > 0 ? (
              <ResultGroup title="공연">
                {result.concerts.map((concert: Concert) => (
                  <ResultRow
                    key={concert.id}
                    title={concert.title}
                    subtitle={[formatShortDate(concert.startDate), concert.facilityName]
                      .filter(Boolean)
                      .join(' · ')}
                    thumb={
                      <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={44} aspect={4 / 3} />
                    }
                    onPress={() => router.push(`/concert/${concert.id}`)}
                  />
                ))}
              </ResultGroup>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text variant="headline" className="mb-1.5">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ResultRow({
  title,
  subtitle,
  thumb,
  onPress,
}: {
  title: string;
  subtitle?: string;
  thumb: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="-mx-2 min-h-14 flex-row items-center gap-3 rounded-md px-2 py-1.5 active:bg-surface-2 web:hover:bg-surface-2">
      {thumb}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** 작품은 사각. 음반 그림이 없어 작곡가 초상을 쓴다 */
function PieceThumb({ piece }: { piece: PieceSearchResult }) {
  const image = useComposerAvatar(piece.composerId, piece.composerAvatarUrl);
  return <EntityThumb name={piece.title} image={image} shape="square" size={44} />;
}

function BrowseTileRow({ tiles, isWide }: { tiles: readonly BrowseTile[]; isWide: boolean }) {
  const router = useRouter();
  return (
    <View className={cn('gap-3', isWide && 'flex-row flex-wrap')}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.label}
          onPress={() => router.push(tile.href)}
          accessibilityRole="link"
          className={cn(
            'flex-row items-center gap-4 rounded-lg bg-surface-2 p-4 active:bg-surface-3 web:hover:bg-surface-3',
            isWide && 'w-[calc(50%-6px)]'
          )}>
          <View className="size-11 items-center justify-center rounded-md bg-surface-3">{tile.renderIcon('text-primary')}</View>
          <View className="flex-1">
            <Text variant="headline">{tile.label}</Text>
            <Text variant="caption" className="mt-0.5">
              {tile.description}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** 검색어가 없을 때: 아티스트 · 시대 · 악기 · 더 둘러보기 입구 */
function BrowseLanding({ isWide }: { isWide: boolean }) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <View className="mt-4 gap-8">
      <View className="gap-3">
        <Text variant="title3">아티스트</Text>
        <BrowseTileRow tiles={PEOPLE_TILES} isWide={isWide} />
      </View>

      <View className="gap-3">
        <Text variant="headline">시대로 찾기</Text>
        <View className="flex-row flex-wrap gap-2">
          {ERA_LINKS.map((era) => {
            const color = getEraForeground(era.name, scheme);
            return (
              <Chip
                key={era.id}
                label={era.name}
                leading={color ? <ChipDot color={color} /> : undefined}
                onPress={() => router.push(`/artists?period=${era.id}` as Href)}
              />
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text variant="headline">악기·편성으로 찾기</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_LINKS.map((code) => (
            <Chip
              key={code}
              label={getArtistCategoryLabel(code)}
              onPress={() => router.push(`/artists?type=artist&category=${code}` as Href)}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Text variant="headline">더 둘러보기</Text>
        <BrowseTileRow tiles={MORE_TILES} isWide={isWide} />
      </View>
    </View>
  );
}
