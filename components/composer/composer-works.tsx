import { NotableStar, PieceRow } from '@/components/composer/piece-row';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { GenreMark } from '@/components/piece/genre-mark';
import { genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import { useComposerCatalog, useComposerPieces } from '@/lib/query/hooks/usePieces';
import type {
  ComposerCatalogForm,
  ComposerCatalogGenre,
  ComposerPiece,
  ComposerPieceFilter,
  ComposerPieceSort,
  Piece,
} from '@/lib/types/models';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from 'lucide-react-native';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';

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
    for (const [alias, canonical] of SEARCH_ALIASES) normalized = normalized.split(alias).join(canonical);
    terms.add(normalized);
  }
  return [...terms];
}

const SEARCH_DEBOUNCE_MS = 200;

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
}

/**
 * 작곡가 작품 영역: 작곡가 안 검색, 갈래 칩, 전체 보기(갈래마다 5곡), 갈래 보기(형식 묶음·정렬·대표곡만).
 * 갈래 안 기본 순서는 작품번호순이고 대표곡은 자리를 옮기지 않고 표시만 한다.
 */
export function ComposerWorks(props: ComposerWorksProps) {
  const { composerId, composerName, headerAction } = props;
  const { colorScheme } = useColorScheme();
  const catalogQuery = useComposerCatalog(composerId);
  const catalog = catalogQuery.data;
  const [genre, setGenre] = React.useState<GenreKey | 'all'>('all');
  const [sort, setSort] = React.useState<ComposerPieceSort>('catalogue');
  const [notableOnly, setNotableOnly] = React.useState(false);
  const [text, setText] = React.useState('');
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const selected = genre === 'all' ? undefined : catalog?.genres.find((item) => genreKey(item) === genre);
  const searching = q.length > 0;
  // 검색은 고른 갈래 안에서 하고, 관련도순으로 받는다. 검색어가 바뀌는 동안 앞 결과를 그대로 둔다
  const searchQuery = useComposerPieces(
    composerId,
    { q, sort: 'relevance', genre: genre === 'all' ? undefined : genre },
    { pageSize: PAGE_SIZE, enabled: searching, keepPrevious: true }
  );
  const pendingSearch = text.trim() !== q || (searching && searchQuery.isFetching);

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
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

      <View className="flex-row items-center gap-2 rounded-full border border-border bg-surface-1 px-3 web:focus-within:border-ring">
        {text && pendingSearch ? (
          <ActivityIndicator size="small" color={THEME[colorScheme === 'dark' ? 'dark' : 'light'].mutedForeground} style={{ width: 16, height: 16 }} />
        ) : (
          <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
        )}
        <Input
          value={text}
          onChangeText={setText}
          onKeyPress={(event) => {
            if (Platform.OS === 'web' && event.nativeEvent.key === 'Escape') setText('');
          }}
          placeholder={`${composerName} 작품에서 찾기 · 제목, 작품번호, 별칭`}
          accessibilityLabel={`${composerName} 작품에서 찾기`}
          returnKeyType="search"
          className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent web:focus-visible:border-transparent web:focus-visible:ring-0"
        />
        {text ? (
          <Pressable onPress={() => setText('')} accessibilityLabel="검색어 지우기" hitSlop={8}>
            <Icon as={XIcon} size={16} className="text-foreground-subtle" />
          </Pressable>
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
        <>
          <GenreChips
            genres={catalog.genres}
            total={catalog.total}
            value={genre}
            showCounts={!searching}
            onChange={(next) => {
              setGenre(next);
              setNotableOnly(false);
            }}
          />
          {searching ? (
            <SearchResults
              {...props}
              q={q}
              query={searchQuery}
              genreLabel={genre === 'all' ? null : genreLabel(genre)}
              onSearchAll={() => setGenre('all')}
              onClear={() => setText('')}
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
        </>
      )}
    </View>
  );
}

function GenreChips({
  genres,
  total,
  value,
  showCounts,
  onChange,
}: {
  genres: ComposerCatalogGenre[];
  total: number;
  value: GenreKey | 'all';
  /** 검색 중에는 전체 작품 수가 결과 수로 오해되지 않게 숨긴다 */
  showCounts: boolean;
  onChange: (next: GenreKey | 'all') => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      <Chip label="전체" count={showCounts ? total : undefined} selected={value === 'all'} onPress={() => onChange('all')} />
      {genres.map((item) => {
        const key = genreKey(item);
        return (
          <Chip
            key={key}
            label={genreLabel(key)}
            count={showCounts ? item.count : undefined}
            selected={value === key}
            onPress={() => onChange(key)}
            className="pl-1"
            leading={<GenreMark genre={item.genre} size={24} />}
          />
        );
      })}
    </ScrollView>
  );
}

type RowActions = Pick<ComposerWorksProps, 'comparableIds' | 'canEdit' | 'onCompare' | 'onEdit' | 'onDelete'>;

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

function GenrePreview({ genre, onOpen, ...props }: ComposerWorksProps & { genre: ComposerCatalogGenre; onOpen: () => void }) {
  const key = genreKey(genre);
  const query = useComposerPieces(props.composerId, { genre: key, sort: 'notable' }, { pageSize: PREVIEW_SIZE });
  const pieces = query.data?.pages[0] ?? [];
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <GenreHeader genre={key} notableCount={genre.notableCount} />
        <Text variant="caption" className="tabular-nums">{`${genre.count.toLocaleString('ko-KR')}곡`}</Text>
      </View>
      {query.isLoading ? (
        <RowsSkeleton count={Math.min(genre.count, PREVIEW_SIZE)} />
      ) : query.isError ? (
        <RetryRow message={`${genreLabel(key)} 작품을 불러오지 못했어요.`} onRetry={() => query.refetch()} />
      ) : (
        <Rows pieces={pieces} {...props} />
      )}
      {genre.count > PREVIEW_SIZE ? (
        <MoreLink label={`${genreLabel(key)} ${genre.count.toLocaleString('ko-KR')}곡 모두 보기`} onPress={onOpen} />
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
          <Chip key={item.key} size="sm" label={item.label} selected={sort === item.key} onPress={() => onSort(item.key)} />
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
}: ComposerWorksProps & { form: ComposerCatalogForm; filter: ComposerPieceFilter; notableOnly: boolean }) {
  const [open, setOpen] = React.useState(false);
  const total = notableOnly ? form.notableCount : form.count;
  const preview = useComposerPieces(props.composerId, filter, { pageSize: FORM_PREVIEW_SIZE, enabled: !open });
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
        <RetryRow message={`${form.name} 작품을 불러오지 못했어요.`} onRetry={() => preview.refetch()} />
      ) : (
        <>
          <Rows pieces={preview.data?.pages[0] ?? []} {...props} />
          {total > FORM_PREVIEW_SIZE ? (
            <MoreLink label={`${total - FORM_PREVIEW_SIZE}곡 더 보기`} onPress={() => setOpen(true)} />
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
  if (query.isError) return <RetryRow message="작품 목록을 불러오지 못했어요." onRetry={() => query.refetch()} />;
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
  // 첫 검색에만 자리표시를 보이고, 그 뒤로는 앞 결과를 흐리게 둔 채 새 결과를 기다린다
  if (query.isLoading && pieces.length === 0) return <RowsSkeleton count={3} />;
  if (query.isError) return <RetryRow message="검색하지 못했어요." onRetry={() => query.refetch()} />;
  const stale = query.isPlaceholderData;
  const where = scope ? `${scope}에서 ` : '';
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <Text variant="caption" accessibilityLiveRegion="polite">
          {stale
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
      {pieces.length === 0 && !stale ? (
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
        <View className="web:transition-opacity web:duration-150" style={{ opacity: stale ? 0.55 : 1 }}>
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

/** 목록 아래 '더 보기'·'접기'. 모든 목록이 같은 모양을 쓴다 */
function MoreLink({
  label,
  onPress,
  disabled,
  collapse,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  collapse?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={6}
      className="mt-1 flex-row items-center gap-1 self-start rounded-full py-1.5 pr-2 web:transition-opacity web:hover:opacity-80">
      <Text variant="label" className="text-foreground-muted">
        {label}
      </Text>
      <Icon as={collapse ? ChevronUpIcon : ChevronDownIcon} size={14} className="text-foreground-subtle" />
    </Pressable>
  );
}
