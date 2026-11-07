import { NotableStar, PieceRow } from '@/components/composer/piece-row';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { MoreLink } from '@/components/ui/more-link';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { GenreMark } from '@/components/piece/genre-mark';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import {
  PIECE_QUERY_KEYS,
  useComposerCatalog,
  useComposerPieces,
} from '@/lib/query/hooks/usePieces';
import type {
  ComposerCatalogForm,
  ComposerCatalogGenre,
  ComposerPiece,
  ComposerPieceFilter,
  ComposerPieceSort,
  Piece,
} from '@/lib/types/models';
import { SearchIcon, XIcon } from 'lucide-react-native';
import { THEME } from '@/lib/theme';
import { useIsFetching } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

type GenreKey = PieceGenre | 'other';

/** 갈래가 이 수보다 많으면 형식으로 묶는다 */
const GROUP_BY_FORM_FROM = 12;
/** 전체 보기에서 갈래마다 보이는 작품 수 */
const PREVIEW_SIZE = 5;
/** 형식 묶음에서 처음 보이는 작품 수 */
const FORM_PREVIEW_SIZE = 6;
const PAGE_SIZE = 30;

const SORTS: { key: ComposerPieceSort; label: string }[] = [
  { key: 'catalogue', label: '작품번호순' },
  { key: 'year', label: '작곡 연도순' },
  { key: 'notable', label: '대표곡 먼저' },
];

/** 검색어를 데이터 표기로도 한 번 더 강조한다(서버 검색의 별칭과 같다): 야상곡 → 녹턴, op 9 → Op. 9 */
const SEARCH_ALIASES: [string, string][] = [
  ['야상곡', '녹턴'],
  ['에튀드', '연습곡'],
  ['폴로네이즈', '폴로네즈'],
  ['프렐류드', '전주곡'],
  ['판타지', '환상곡'],
  ['랩소디', '광시곡'],
];

function highlightTerms(q: string): string[] {
  // 서버처럼 낱말마다 찾고, 작품번호 머리(Op.·K.·BWV)는 뒤 숫자와 붙여 한 낱말로 본다
  const words = q.replace(/\b(op\.?|k\.?|kv|bwv|hob\.|rv)\s+(?=\d)/gi, '$1\u0001').split(/\s+/);
  const terms = new Set<string>();
  for (const raw of words) {
    const word = raw.replace(/\u0001/g, ' ').trim();
    if (!word) continue;
    terms.add(word);
    let normalized = word.replace(/^op\.?\s*(\d)/i, 'Op. $1');
    for (const [alias, canonical] of SEARCH_ALIASES)
      normalized = normalized.split(alias).join(canonical);
    terms.add(normalized);
  }
  return [...terms];
}

const SEARCH_DEBOUNCE_MS = 200;
/** 작품 영역 안 칸 사이 간격. 검색 칸의 제자리를 셈할 때도 쓴다 */
const SECTION_GAP = 16;
/** 웹에서 위에 붙은 검색 칸의 위아래 여백. 제자리를 지키도록 같은 만큼 바깥 여백을 당긴다 */
const STICKY_PAD = Platform.OS === 'web' ? 8 : 0;
const STICKY_STYLE = { marginVertical: -STICKY_PAD, paddingVertical: STICKY_PAD };
/** 입력을 멈추고 결과가 다 온 뒤 이만큼 지나면 잡아 둔 빈자리를 거둔다 */
const SETTLE_MS = 700;
/** 빈자리를 거두는 시간(웹 transition-[min-height] duration-300 과 같다) */
const RELEASE_MS = 300;

function genreKey(genre: ComposerCatalogGenre): GenreKey {
  return genre.genre ?? 'other';
}

function genreLabel(key: GenreKey): string {
  return key === 'other' ? '기타' : (genreStyle(key)?.label ?? key);
}

export interface ComposerWorksProps {
  composerId: number;
  composerName: string;
  comparableIds: ReadonlySet<number>;
  canEdit: boolean;
  /** 섹션 머리 오른쪽(작품 추가 등) */
  headerAction?: React.ReactNode;
  onCompare: (pieceId: number) => void;
  onEdit: (piece: Piece) => void;
  onDelete: (piece: Piece) => void;
  /** 작품 영역을 품은 화면 스크롤. 검색 칸을 화면 위로 맞추는 데 쓴다 */
  scrollRef?: React.RefObject<ScrollView | null>;
}

type AlignMode = 'focus' | 'reset';

/**
 * 작곡가 작품 영역: 작곡가 안 검색, 갈래 칩, 전체 보기(갈래마다 5곡), 갈래 보기(형식 묶음·정렬·대표곡만).
 * 갈래 안 기본 순서는 작품번호순이고 대표곡은 자리를 옮기지 않고 표시만 한다.
 *
 * 검색·갈래를 바꿀 때 화면이 움직이지 않게 한다.
 * - 검색창과 갈래 칩은 웹에서 화면 위에 붙는다(sticky).
 * - 검색어·갈래가 바뀌면 아래 칸이 화면 높이만큼 자리를 잡는다. 결과가 짧아져도 문서가 줄어 스크롤이
 *   밀리는 일이 없어서 치는 동안 화면이 가만히 있다. 입력을 멈추고 결과가 다 오면 그 빈자리를 부드럽게
 *   거두어 보통 페이지 끝처럼 둔다(좁은 화면은 키보드가 떠 있는 동안 거두지 않는다).
 * - 검색 칸이 위에 붙어 있을 때 검색어·갈래가 바뀌면 그 칸의 제자리로 스크롤을 돌린다. 붙은 칸은 그대로
 *   보이고 아래 목록만 처음부터 다시 보인다.
 * - 좁은 화면은 검색창을 누르면 화면 위로 올린다(모바일 검색 화면처럼 위는 검색창, 아래는 결과).
 */
export function ComposerWorks(props: ComposerWorksProps) {
  const { composerId, composerName, headerAction, scrollRef } = props;
  const { colorScheme } = useColorScheme();
  const { layout } = useBreakpoint();
  const narrow = layout !== 'desktop' && layout !== 'wide';
  const { height: windowHeight } = useWindowDimensions();
  const headerRef = React.useRef<View>(null);
  const catalogQuery = useComposerCatalog(composerId);
  const catalog = catalogQuery.data;
  const [genre, setGenre] = React.useState<GenreKey | 'all'>('all');
  const [sort, setSort] = React.useState<ComposerPieceSort>('catalogue');
  const [notableOnly, setNotableOnly] = React.useState(false);
  const [text, setText] = React.useState('');
  const [q, setQ] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const selected =
    genre === 'all' ? undefined : catalog?.genres.find((item) => genreKey(item) === genre);
  const searching = q.length > 0;
  // 검색은 고른 갈래 안에서 하고, 관련도순으로 받는다. 검색어가 바뀌는 동안 앞 결과를 그대로 둔다
  const searchQuery = useComposerPieces(
    composerId,
    { q, sort: 'relevance', genre: genre === 'all' ? undefined : genre },
    { pageSize: PAGE_SIZE, enabled: searching, keepPrevious: true }
  );
  const pendingSearch = text.trim() !== q || (searching && searchQuery.isFetching);
  // 검색 중 갈래 칩에는 그 갈래의 결과 수를 보인다(검색어와 상관없는 갈래 순서·이름은 전체 목록 그대로)
  const resultCatalog = useComposerCatalog(composerId, q).data;
  const resultCounts = React.useMemo(() => {
    if (!searching || !resultCatalog) return null;
    const byGenre = new Map<GenreKey, number>();
    for (const item of resultCatalog.genres) byGenre.set(genreKey(item), item.count);
    return { total: resultCatalog.total, byGenre };
  }, [searching, resultCatalog]);

  const alignSearchBlock = React.useCallback(
    (mode: AlignMode) => {
      const scroll = scrollRef?.current;
      const header = headerRef.current;
      const viewport = scroll?.getNativeScrollRef();
      if (!scroll || !header || !viewport) return;
      header.measureLayout(scroll.getInnerViewNode(), (_x, headerY, _width, headerHeight) => {
        // 검색 칸의 제자리(스크롤 안 위치). 붙어 있어도 머리 줄은 제자리에 있어서 머리 줄로 잰다
        const homeY = headerY + headerHeight + SECTION_GAP - STICKY_PAD;
        header.measureInWindow((_hx, headerTop) => {
          viewport.measureInWindow((_vx, viewportTop, _vw, viewportHeight) => {
            const screenY = headerTop + headerHeight + SECTION_GAP - STICKY_PAD - viewportTop;
            const move = mode === 'focus' ? screenY > viewportHeight * 0.3 : screenY < 0;
            if (move) scroll.scrollTo({ y: homeY, animated: mode === 'focus' });
          });
        });
      });
    },
    [scrollRef]
  );

  // 검색어·갈래가 바뀐 그 렌더부터 빈자리를 잡고(holding), 입력이 멈추고 받을 것이 없으면 거둔다
  const viewKey = `${genre}\u0000${q}`;
  const [settledKey, setSettledKey] = React.useState(viewKey);
  const holding = settledKey !== viewKey;
  // 거둘 때는 실제 목록 높이까지만 줄여서 움직임이 그 높이에서 부드럽게 멎게 한다
  const [contentHeight, setContentHeight] = React.useState(0);
  const [releasing, setReleasing] = React.useState(false);
  const fetching = useIsFetching({ queryKey: PIECE_QUERY_KEYS.byComposer(composerId) }) > 0;
  const typing = text.trim() !== q;
  const keyboardUp = narrow && focused;
  React.useEffect(() => {
    if (!holding || typing || fetching || keyboardUp) return;
    const timer = setTimeout(() => {
      setSettledKey(viewKey);
      setReleasing(true);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [holding, typing, fetching, keyboardUp, viewKey]);
  React.useEffect(() => {
    if (!releasing) return;
    const timer = setTimeout(() => setReleasing(false), RELEASE_MS + 50);
    return () => clearTimeout(timer);
  }, [releasing]);
  const reserveHeight = holding ? windowHeight : releasing ? contentHeight : 0;

  // 검색어·갈래가 바뀌면 새 목록을 처음부터 보인다(검색 칸이 위에 붙어 있을 때만 움직인다)
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    alignSearchBlock('reset');
  }, [q, genre, alignSearchBlock]);

  const clearSearch = React.useCallback(() => {
    setText('');
    setQ('');
  }, []);

  return (
    <View style={{ gap: SECTION_GAP }}>
      <View ref={headerRef} className="flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-2">
          <Text variant="title3">작품</Text>
          {catalog ? (
            <Text variant="caption" className="tabular-nums">
              {`${catalog.total.toLocaleString('ko-KR')}곡`}
            </Text>
          ) : null}
        </View>
        {headerAction}
      </View>

      {/* 검색창과 갈래 칩: 웹에서는 화면 위에 붙는다 */}
      <View className="gap-3 web:sticky web:top-0 web:z-10 web:bg-surface-1" style={STICKY_STYLE}>
        <View className="flex-row items-center gap-2 rounded-full border border-border bg-surface-1 px-3 web:focus-within:border-ring">
          {text && pendingSearch ? (
            <ActivityIndicator
              size="small"
              color={THEME[colorScheme === 'dark' ? 'dark' : 'light'].mutedForeground}
              style={{ width: 16, height: 16 }}
            />
          ) : (
            <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
          )}
          <Input
            value={text}
            onChangeText={setText}
            onKeyPress={(event) => {
              if (Platform.OS === 'web' && event.nativeEvent.key === 'Escape') clearSearch();
            }}
            onFocus={() => {
              setFocused(true);
              if (narrow) alignSearchBlock('focus');
            }}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => setQ(text.trim())}
            placeholder={`${composerName} 작품에서 찾기 · 제목, 작품번호, 별칭`}
            accessibilityLabel={`${composerName} 작품에서 찾기`}
            returnKeyType="search"
            className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none web:focus-visible:border-transparent web:focus-visible:ring-0 dark:bg-transparent"
          />
          {text ? (
            <Pressable onPress={clearSearch} accessibilityLabel="검색어 지우기" hitSlop={8}>
              <Icon as={XIcon} size={16} className="text-foreground-subtle" />
            </Pressable>
          ) : null}
        </View>
        {catalog && catalog.total > 0 ? (
          <GenreChips
            genres={catalog.genres}
            total={catalog.total}
            value={genre}
            resultCounts={resultCounts}
            onChange={(next) => {
              setGenre(next);
              setNotableOnly(false);
            }}
          />
        ) : null}
        {/* 위에 붙었을 때 아래로 지나가는 목록과의 경계를 부드럽게 한다(붙지 않으면 칸 사이 빈자리에 깔린다) */}
        {Platform.OS === 'web' ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 top-full h-2 bg-gradient-to-b from-surface-1 to-transparent"
          />
        ) : null}
      </View>

      {catalogQuery.isLoading ? (
        <RowsSkeleton count={6} />
      ) : catalogQuery.isError || !catalog ? (
        <RetryRow message="작품 목록을 불러오지 못했어요." onRetry={() => catalogQuery.refetch()} />
      ) : catalog.total === 0 ? (
        <Text variant="bodySm" className="text-foreground-muted">
          아직 등록된 작품이 없어요.
        </Text>
      ) : (
        // 바뀌는 동안은 화면 높이만큼 자리를 잡고(바로), 거둘 때는 줄어드는 것을 부드럽게 보인다(웹)
        <View
          className={cn(
            !holding && releasing && 'web:transition-[min-height] web:duration-300 web:ease-out'
          )}
          style={{ minHeight: reserveHeight }}>
          <View onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>
            {searching ? (
              <SearchResults
                {...props}
                q={q}
                query={searchQuery}
                genreLabel={genre === 'all' ? null : genreLabel(genre)}
                onSearchAll={() => setGenre('all')}
                onClear={clearSearch}
              />
            ) : genre === 'all' || !selected ? (
              <View className="gap-8">
                {catalog.genres.map((item) => (
                  <GenrePreview
                    key={genreKey(item)}
                    {...props}
                    genre={item}
                    onOpen={() => setGenre(genreKey(item))}
                  />
                ))}
              </View>
            ) : (
              <GenreView
                {...props}
                genre={selected}
                sort={sort}
                onSort={setSort}
                notableOnly={notableOnly}
                onNotableOnly={setNotableOnly}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function GenreChips({
  genres,
  total,
  value,
  resultCounts,
  onChange,
}: {
  genres: ComposerCatalogGenre[];
  total: number;
  value: GenreKey | 'all';
  /** 검색 중이면 갈래마다 검색 결과 수. 칩 순서와 이름은 그대로 두고 수만 바꾼다(결과 0 인 갈래는 흐리게) */
  resultCounts: { total: number; byGenre: ReadonlyMap<GenreKey, number> } | null;
  onChange: (next: GenreKey | 'all') => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      <Chip
        label="전체"
        count={resultCounts ? resultCounts.total : total}
        selected={value === 'all'}
        onPress={() => onChange('all')}
      />
      {genres.map((item) => {
        const key = genreKey(item);
        const count = resultCounts ? (resultCounts.byGenre.get(key) ?? 0) : item.count;
        return (
          <Chip
            key={key}
            label={genreLabel(key)}
            count={count}
            selected={value === key}
            onPress={() => onChange(key)}
            className={cn('pl-1', count === 0 && value !== key && 'opacity-40')}
            leading={<GenreMark genre={item.genre} size={24} />}
          />
        );
      })}
    </ScrollView>
  );
}

type RowActions = Pick<
  ComposerWorksProps,
  'comparableIds' | 'canEdit' | 'onCompare' | 'onEdit' | 'onDelete'
>;

function Rows({ pieces, ...actions }: RowActions & { pieces: readonly ComposerPiece[] }) {
  return (
    <View className="border-t border-border">
      {pieces.map((piece) => (
        <PieceRow
          key={piece.id}
          piece={piece}
          comparable={actions.comparableIds.has(piece.id)}
          canEdit={actions.canEdit}
          onCompare={() => actions.onCompare(piece.id)}
          onComparePart={actions.onCompare}
          onEdit={() => actions.onEdit(piece)}
          onDelete={() => actions.onDelete(piece)}
        />
      ))}
    </View>
  );
}

function GenreHeader({ genre, notableCount }: { genre: GenreKey; notableCount: number }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <GenreMark genre={genre === 'other' ? null : genre} size={28} />
      <Text className="text-body font-semibold text-foreground">{genreLabel(genre)}</Text>
      {notableCount > 0 ? <StarCount count={notableCount} /> : null}
    </View>
  );
}

function GenrePreview({
  genre,
  onOpen,
  ...props
}: ComposerWorksProps & { genre: ComposerCatalogGenre; onOpen: () => void }) {
  const key = genreKey(genre);
  const query = useComposerPieces(
    props.composerId,
    { genre: key, sort: 'notable' },
    { pageSize: PREVIEW_SIZE }
  );
  const pieces = query.data?.pages[0] ?? [];
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <GenreHeader genre={key} notableCount={genre.notableCount} />
        <Text
          variant="caption"
          className="tabular-nums">{`${genre.count.toLocaleString('ko-KR')}곡`}</Text>
      </View>
      {query.isLoading ? (
        <RowsSkeleton count={Math.min(genre.count, PREVIEW_SIZE)} />
      ) : query.isError ? (
        <RetryRow
          message={`${genreLabel(key)} 작품을 불러오지 못했어요.`}
          onRetry={() => query.refetch()}
        />
      ) : (
        <Rows pieces={pieces} {...props} />
      )}
      {genre.count > PREVIEW_SIZE ? (
        <MoreLink
          label={`${genreLabel(key)} ${genre.count.toLocaleString('ko-KR')}곡 모두 보기`}
          onPress={onOpen}
        />
      ) : null}
    </View>
  );
}

function GenreView({
  genre,
  sort,
  onSort,
  notableOnly,
  onNotableOnly,
  ...props
}: ComposerWorksProps & {
  genre: ComposerCatalogGenre;
  sort: ComposerPieceSort;
  onSort: (sort: ComposerPieceSort) => void;
  notableOnly: boolean;
  onNotableOnly: (value: boolean) => void;
}) {
  const key = genreKey(genre);
  const grouped = genre.count >= GROUP_BY_FORM_FROM && genre.forms.length > 1;
  const forms = notableOnly ? genre.forms.filter((form) => form.notableCount > 0) : genre.forms;
  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap items-center gap-2">
        {SORTS.map((item) => (
          <Chip
            key={item.key}
            size="sm"
            label={item.label}
            selected={sort === item.key}
            onPress={() => onSort(item.key)}
          />
        ))}
        {genre.notableCount > 0 ? (
          <Chip
            size="sm"
            label="대표곡만"
            count={genre.notableCount}
            leading={<NotableStar size={11} />}
            selected={notableOnly}
            onPress={() => onNotableOnly(!notableOnly)}
          />
        ) : null}
      </View>
      {grouped ? (
        forms.length === 0 ? (
          <Text variant="bodySm" className="text-foreground-muted">
            이 갈래에는 대표곡 표시가 붙은 작품이 없어요. '대표곡만'을 끄면 전체가 보여요.
          </Text>
        ) : (
          <View className="gap-6">
            {forms.map((form) => (
              <FormGroup
                key={form.formKey}
                {...props}
                filter={{ genre: key, form: form.formKey, sort, notable: notableOnly || undefined }}
                form={form}
                notableOnly={notableOnly}
              />
            ))}
          </View>
        )
      ) : (
        <PagedList {...props} filter={{ genre: key, sort, notable: notableOnly || undefined }} />
      )}
    </View>
  );
}

function FormGroup({
  form,
  filter,
  notableOnly,
  ...props
}: ComposerWorksProps & {
  form: ComposerCatalogForm;
  filter: ComposerPieceFilter;
  notableOnly: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const total = notableOnly ? form.notableCount : form.count;
  const preview = useComposerPieces(props.composerId, filter, {
    pageSize: FORM_PREVIEW_SIZE,
    enabled: !open,
  });
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2 pb-1.5">
        <Text className="text-body-sm font-semibold text-foreground-muted">{form.name}</Text>
        <Text variant="caption" className="tabular-nums">{`${total}곡`}</Text>
        {!notableOnly && form.notableCount > 0 ? <StarCount count={form.notableCount} /> : null}
      </View>
      {open ? (
        <PagedList {...props} filter={filter} bare onCollapse={() => setOpen(false)} />
      ) : preview.isLoading ? (
        <RowsSkeleton count={Math.min(total, FORM_PREVIEW_SIZE)} />
      ) : preview.isError ? (
        <RetryRow
          message={`${form.name} 작품을 불러오지 못했어요.`}
          onRetry={() => preview.refetch()}
        />
      ) : (
        <>
          <Rows pieces={preview.data?.pages[0] ?? []} {...props} />
          {total > FORM_PREVIEW_SIZE ? (
            <MoreLink
              label={`${total - FORM_PREVIEW_SIZE}곡 더 보기`}
              onPress={() => setOpen(true)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function PagedList({
  filter,
  bare,
  onCollapse,
  ...props
}: ComposerWorksProps & { filter: ComposerPieceFilter; bare?: boolean; onCollapse?: () => void }) {
  const query = useComposerPieces(props.composerId, filter, { pageSize: PAGE_SIZE });
  const pieces = React.useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  if (query.isLoading) return <RowsSkeleton count={6} />;
  if (query.isError)
    return <RetryRow message="작품 목록을 불러오지 못했어요." onRetry={() => query.refetch()} />;
  return (
    <View className={bare ? undefined : 'gap-2'}>
      <Rows pieces={pieces} {...props} />
      <View className="flex-row gap-4">
        {query.hasNextPage ? (
          <MoreLink
            label={query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
            onPress={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          />
        ) : null}
        {onCollapse ? <MoreLink label="접기" onPress={onCollapse} collapse /> : null}
      </View>
    </View>
  );
}

function SearchResults({
  q,
  query,
  genreLabel: scope,
  onSearchAll,
  onClear,
  ...props
}: ComposerWorksProps & {
  q: string;
  query: ReturnType<typeof useComposerPieces>;
  /** 고른 갈래 이름. null 이면 전체에서 찾는다 */
  genreLabel: string | null;
  onSearchAll: () => void;
  onClear: () => void;
}) {
  const pieces = React.useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const terms = React.useMemo(() => highlightTerms(q), [q]);
  // 첫 검색에만 자리표시를 보이고, 그 뒤로는 앞 결과를 흐리게 둔 채 새 결과를 기다린다.
  // 결과 수 줄은 어느 때나 같은 자리에 한 줄로 두어 아래 목록이 위아래로 밀리지 않게 한다
  const firstLoad = query.isLoading && pieces.length === 0;
  const stale = query.isPlaceholderData || firstLoad;
  const where = scope ? `${scope}에서 ` : '';
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text
          variant="caption"
          numberOfLines={1}
          className="flex-1"
          accessibilityLiveRegion="polite">
          {query.isError
            ? `${where}'${q}' 검색하지 못했어요`
            : stale
              ? `${where}'${q}' 찾는 중…`
              : pieces.length === 0
                ? `${where}'${q}'에 맞는 작품이 없어요`
                : `${where}'${q}' ${pieces.length}${query.hasNextPage ? '+' : ''}곡`}
        </Text>
        <Pressable onPress={onClear} hitSlop={6} accessibilityRole="button">
          <Text variant="label" className="text-foreground-muted">
            검색 지우기
          </Text>
        </Pressable>
      </View>
      {query.isError ? (
        <RetryRow message="검색하지 못했어요." onRetry={() => query.refetch()} />
      ) : firstLoad ? (
        <RowsSkeleton count={3} />
      ) : pieces.length === 0 && !stale ? (
        <View className="gap-2 rounded-lg bg-surface-2 px-4 py-3.5">
          <Text variant="bodySm" className="text-foreground-muted">
            작품번호(Op. 28, K. 331), 별칭(빗방울, 운명), 형식(녹턴, 소나타)으로도 찾을 수 있어요.
          </Text>
          {scope ? (
            <Pressable onPress={onSearchAll} hitSlop={6} className="self-start">
              <Text variant="label" className="text-primary">
                {`전체 갈래에서 '${q}' 찾기`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          className="web:transition-opacity web:duration-150"
          style={{ opacity: stale ? 0.55 : 1 }}>
          <View className="border-t border-border">
            {pieces.map((piece) => (
              <PieceRow
                key={piece.id}
                piece={piece}
                highlight={terms}
                leading={<GenreMark genre={piece.genre ?? null} size={22} />}
                comparable={props.comparableIds.has(piece.id)}
                canEdit={props.canEdit}
                onCompare={() => props.onCompare(piece.id)}
                onComparePart={props.onCompare}
                onEdit={() => props.onEdit(piece)}
                onDelete={() => props.onDelete(piece)}
              />
            ))}
          </View>
          {query.hasNextPage ? (
            <MoreLink
              label={query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
              onPress={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function RowsSkeleton({ count }: { count: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </View>
  );
}

function RetryRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
      <Text variant="bodySm" className="flex-1 text-foreground-muted">
        {message}
      </Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text variant="label" className="text-primary">
          다시 시도
        </Text>
      </Pressable>
    </View>
  );
}

function StarCount({ count }: { count: number }) {
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={`대표곡 ${count}곡`}>
      <NotableStar size={11} />
      <Text variant="caption" className="tabular-nums">
        {count}
      </Text>
    </View>
  );
}
