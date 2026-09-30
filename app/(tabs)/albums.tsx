import { AlbumGrid, AlbumShelf } from '@/components/album/album-card';
import { AlbumDetailModal } from '@/components/album/album-detail-modal';
import { FilterMenu } from '@/components/concert/concert-filter-bar';
import { useTabScrollInsets } from '@/components/navigation/tab-chrome';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRepertoireIds } from '@/hooks/use-repertoire-ids';
import { isApiUnavailable, type RecordingListItem, type RecordingSort } from '@/lib/api/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  type AlbumBrowseFilters,
  useAlbumBrowse,
  useAlbumById,
  useAlbumLabels,
  useNewAlbumsForMe,
  useRepertoireArtistAlbums,
} from '@/lib/query/hooks/useRecordings';
import { cn } from '@/lib/utils';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, BookmarkIcon, CheckIcon, DiscIcon, SearchIcon } from 'lucide-react-native';
import * as React from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, View } from 'react-native';

const FIRST_YEAR = 2000;

const SORT_OPTIONS: { value: RecordingSort; label: string }[] = [
  { value: 'release', label: '최신 발매' },
  { value: 'title', label: '제목' },
];

function paramOf(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw || undefined;
}

function yearOptions(): number[] {
  const current = new Date().getFullYear() + 1; // 예약 앨범이 다음 해로 잡히기도 한다
  return Array.from({ length: current - FIRST_YEAR + 1 }, (_, index) => current - index);
}

/**
 * 앨범 (기획 D): 담은 연주자의 새 앨범을 먼저 보여 주고, 레이블·발매 연도·정렬로 앨범을 찾는다.
 * 필터는 주소 파라미터(label·year·sort·mine·q)에, 연 앨범은 album 에 둔다.
 */
export default function AlbumsScreen() {
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    label?: string;
    year?: string;
    sort?: string;
    mine?: string;
    q?: string;
    album?: string;
  }>();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { isSignedIn } = useClerkAuth();
  const repertoire = useRepertoireIds();

  const label = paramOf(params.label);
  const yearParam = Number(paramOf(params.year));
  const year = Number.isInteger(yearParam) && yearParam >= FIRST_YEAR ? yearParam : undefined;
  const sort: RecordingSort = paramOf(params.sort) === 'title' ? 'title' : 'release';
  const mine = paramOf(params.mine) === '1' && isSignedIn === true;
  const [query, setQuery] = React.useState(paramOf(params.q) ?? '');
  const debounced = useDebounce(query.trim(), 300);

  const albumParam = Number(paramOf(params.album));
  const linkedAlbumId = Number.isInteger(albumParam) && albumParam > 0 ? albumParam : undefined;
  const [opened, setOpened] = React.useState<RecordingListItem | null>(null);
  const linkedAlbum = useAlbumById(opened ? undefined : linkedAlbumId);
  const detail = opened ?? linkedAlbum.data ?? null;

  const setParams = React.useCallback(
    (next: Partial<Record<'label' | 'year' | 'sort' | 'mine' | 'q' | 'album', string | undefined>>) =>
      router.setParams(next),
    [router]
  );

  React.useEffect(() => {
    if ((paramOf(params.q) ?? '') !== debounced) setParams({ q: debounced || undefined });
    // 검색어만 주소로 옮긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AlbumBrowseFilters = React.useMemo(
    () => ({ label, year, q: debounced || undefined, sort }),
    [debounced, label, sort, year]
  );

  const repertoireArtists = React.useMemo(() => [...repertoire.artists], [repertoire.artists]);
  const browse = useAlbumBrowse(filters);
  const mineAlbums = useRepertoireArtistAlbums(repertoireArtists, filters, mine);
  const labels = useAlbumLabels();
  const newAlbums = useNewAlbumsForMe(isSignedIn === true && repertoireArtists.length > 0);

  const browseAlbums = React.useMemo(() => {
    const seen = new Set<number>();
    return (browse.data?.pages.flat() ?? []).filter((album) =>
      seen.has(album.id) ? false : (seen.add(album.id), true)
    );
  }, [browse.data]);
  const albums = mine ? mineAlbums.albums : browseAlbums;
  const loading = mine ? mineAlbums.isLoading : browse.isLoading;
  const error = mine ? mineAlbums.error : browse.error;
  const unavailable = isApiUnavailable(error);

  const isInRepertoire = React.useCallback(
    (album: RecordingListItem) => repertoire.recordings.has(album.id),
    [repertoire.recordings]
  );
  const openAlbum = React.useCallback((album: RecordingListItem) => setOpened(album), []);
  const closeAlbum = React.useCallback(() => {
    setOpened(null);
    if (linkedAlbumId) setParams({ album: undefined });
  }, [linkedAlbumId, setParams]);

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (mine) return;
    const nearEnd =
      nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 600;
    if (nearEnd && browse.hasNextPage && !browse.isFetchingNextPage) void browse.fetchNextPage();
  };

  const activeFilters = [label, year, mine || undefined, debounced || undefined].filter(Boolean).length;
  const resetFilters = () => {
    setQuery('');
    setParams({ label: undefined, year: undefined, mine: undefined, q: undefined });
  };

  const shelf = newAlbums.data ?? [];

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        {...scrollInsets}
        className="flex-1"
        onScroll={onScroll}
        scrollEventThrottle={200}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={browse.isRefetching}
            onRefresh={() => {
              void newAlbums.refetch();
              if (mine) mineAlbums.refetch();
              else void browse.refetch();
            }}
          />
        }
        contentContainerClassName={cn('pb-28', wide ? 'px-7 pt-3' : 'px-4 pt-2')}>
        <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
          <View>
            <Text variant={wide ? 'display' : 'title1'}>앨범</Text>
            <Text variant="bodySm" className="mt-1 text-foreground-muted">
              연주자들의 음반을 발매 순으로 모았어요. 앨범 정보는 Apple Music 카탈로그 기준이에요.
            </Text>
          </View>
          <View className={cn('justify-center', wide && 'w-[380px]')}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="앨범 제목이나 연주자 이름"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="앨범 찾기"
              className="h-11 rounded-full pl-10 sm:h-11"
            />
            <View pointerEvents="none" className="absolute left-3.5">
              <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
            </View>
          </View>
        </View>

        {shelf.length > 0 && !debounced ? (
          <View className="mt-8">
            <View className="mb-3.5 flex-row items-baseline gap-2.5">
              <Text className="text-[18px] font-bold text-foreground">담은 연주자의 새 앨범</Text>
              <Text variant="caption">최근 90일 · 발매 예정 포함</Text>
            </View>
            <AlbumShelf albums={shelf} wide={wide} isInRepertoire={isInRepertoire} onOpen={openAlbum} />
          </View>
        ) : null}

        <View className="mt-8">
          <Text className="text-[18px] font-bold text-foreground">앨범 찾기</Text>
          {/* 배포 전(목록 경로 없음)에는 걸 필터가 없으니 숨긴다 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className={cn('mt-3.5', unavailable && 'hidden')}
            contentContainerClassName="items-center gap-2">
            <FilterMenu label="레이블" value={label} width={300}>
              {(close) => (
                <LabelOptions
                  current={label}
                  labels={labels.data ?? []}
                  loading={labels.isLoading}
                  unavailable={isApiUnavailable(labels.error)}
                  onPick={(value) => {
                    setParams({ label: value });
                    close();
                  }}
                />
              )}
            </FilterMenu>
            <FilterMenu label="발매 연도" value={year ? `${year}년` : undefined} width={280}>
              {(close) => (
                <View className="flex-row flex-wrap gap-1.5">
                  <Chip
                    label="전체"
                    selected={year === undefined}
                    onPress={() => {
                      setParams({ year: undefined });
                      close();
                    }}
                  />
                  {yearOptions().map((option) => (
                    <Chip
                      key={option}
                      label={String(option)}
                      selected={year === option}
                      onPress={() => {
                        setParams({ year: String(option) });
                        close();
                      }}
                    />
                  ))}
                </View>
              )}
            </FilterMenu>
            {/* 기본(최신 발매)은 고른 값으로 강조하지 않는다 */}
            <FilterMenu label="최신 발매 순" value={sort === 'title' ? '제목 순' : undefined} width={200}>
              {(close) => (
                <View className="gap-0.5">
                  {SORT_OPTIONS.map((option) => (
                    <OptionRow
                      key={option.value}
                      label={option.label}
                      selected={sort === option.value}
                      onPress={() => {
                        setParams({ sort: option.value === 'release' ? undefined : option.value });
                        close();
                      }}
                    />
                  ))}
                </View>
              )}
            </FilterMenu>
            {isSignedIn ? (
              <Chip
                label="레퍼토리 연주자만"
                selected={mine}
                leading={<Icon as={BookmarkIcon} size={13} className={mine ? 'fill-primary text-primary' : 'text-foreground-subtle'} />}
                onPress={() => setParams({ mine: mine ? undefined : '1' })}
              />
            ) : null}
            {activeFilters > 0 ? (
              <Pressable onPress={resetFilters} accessibilityRole="button" className="h-9 justify-center rounded-full px-3 active:bg-surface-2 web:hover:bg-surface-2">
                <Text className="text-label text-foreground-muted">초기화 {activeFilters}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {mine && repertoireArtists.length === 0 ? (
            <EmptyState
              icon={BookmarkIcon}
              title="레퍼토리에 담은 연주자가 없어요"
              description="연주자 화면에서 레퍼토리에 담으면 그 연주자의 앨범만 모아 볼 수 있어요."
              action={{ label: '연주자 둘러보기', onPress: () => router.push('/artists?type=artist' as Href) }}
            />
          ) : unavailable ? (
            <EmptyState
              icon={DiscIcon}
              title="앨범 목록을 준비하고 있어요"
              description="앨범 찾기가 곧 열려요. 그동안 연주자 화면에서 연주자별 음반을 볼 수 있어요."
              action={{ label: '연주자 둘러보기', onPress: () => router.push('/artists?type=artist' as Href) }}
            />
          ) : error ? (
            <EmptyState
              icon={AlertCircleIcon}
              tone="error"
              title="앨범을 불러오지 못했어요"
              description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
              action={{ label: '다시 시도', onPress: () => (mine ? mineAlbums.refetch() : void browse.refetch()) }}
            />
          ) : !loading && albums.length === 0 ? (
            <EmptyState
              icon={DiscIcon}
              title={debounced ? `‘${debounced}’에 맞는 앨범이 없어요` : '이 조건에 맞는 앨범이 없어요'}
              description="레이블이나 발매 연도를 바꿔 보세요."
              action={{ label: '필터 초기화', onPress: resetFilters }}
            />
          ) : (
            <View className="mt-5">
              {mine && mineAlbums.truncated ? (
                <Text variant="caption" className="mb-3 text-foreground-subtle">
                  레퍼토리 연주자 중 최근에 담은 12명의 앨범이에요.
                </Text>
              ) : null}
              <AlbumGrid albums={albums} loading={loading} wide={wide} isInRepertoire={isInRepertoire} onOpen={openAlbum} />
              {!mine && browse.isFetchingNextPage ? (
                <Text variant="caption" className="mt-6 text-center">
                  더 불러오는 중…
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <AlbumDetailModal album={detail} onClose={closeAlbum} />
    </View>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'h-9 flex-row items-center justify-between gap-3 rounded-md px-2.5 active:bg-surface-2 web:hover:bg-surface-2',
        selected && 'bg-primary-muted'
      )}>
      <Text numberOfLines={1} className={cn('min-w-0 flex-1 text-body-sm', selected ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
        {label}
      </Text>
      {selected ? <Icon as={CheckIcon} size={15} className="text-primary" /> : null}
    </Pressable>
  );
}

function LabelOptions({
  current,
  labels,
  loading,
  unavailable,
  onPick,
}: {
  current: string | undefined;
  labels: readonly { label: string; albumCount: number }[];
  loading: boolean;
  unavailable: boolean;
  onPick: (label: string | undefined) => void;
}) {
  if (loading) {
    return <Text variant="caption" className="px-1 py-2">레이블을 불러오는 중이에요…</Text>;
  }
  if (unavailable || labels.length === 0) {
    return (
      <Text variant="caption" className="px-1 py-2">
        레이블 목록을 준비하고 있어요. 검색 칸에 레이블 이름을 넣어도 찾을 수 있어요.
      </Text>
    );
  }
  return (
    <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
      <OptionRow label="모든 레이블" selected={current === undefined} onPress={() => onPick(undefined)} />
      {labels.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => onPick(item.label)}
          accessibilityRole="button"
          accessibilityState={{ selected: current === item.label }}
          className={cn(
            'h-9 flex-row items-center gap-3 rounded-md px-2.5 active:bg-surface-2 web:hover:bg-surface-2',
            current === item.label && 'bg-primary-muted'
          )}>
          <Text
            numberOfLines={1}
            className={cn(
              'min-w-0 flex-1 text-body-sm',
              current === item.label ? 'font-semibold text-foreground' : 'text-foreground-muted'
            )}>
            {item.label}
          </Text>
          <Text variant="mono" className="text-caption text-foreground-subtle">
            {item.albumCount}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
