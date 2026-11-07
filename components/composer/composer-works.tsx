import { PieceRow } from '@/components/composer/piece-row';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { genreForeground, genreStyle, type PieceGenre } from '@/lib/design/genre-palette';
import { useComposerCatalog, useComposerPieces } from '@/lib/query/hooks/usePieces';
import type {
  ComposerCatalogForm,
  ComposerCatalogGenre,
  ComposerPiece,
  ComposerPieceFilter,
  ComposerPieceSort,
  Piece,
} from '@/lib/types/models';
import { SearchIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

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
  const catalogQuery = useComposerCatalog(composerId);
  const catalog = catalogQuery.data;
  const [genre, setGenre] = React.useState<GenreKey | 'all'>('all');
  const [sort, setSort] = React.useState<ComposerPieceSort>('catalogue');
  const [notableOnly, setNotableOnly] = React.useState(false);
  const [text, setText] = React.useState('');
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const selected = genre === 'all' ? undefined : catalog?.genres.find((item) => genreKey(item) === genre);

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
        <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
        <Input
          value={text}
          onChangeText={setText}
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

      {q ? (
        <SearchResults {...props} q={q} />
      ) : catalogQuery.isLoading ? (
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
            onChange={(next) => {
              setGenre(next);
              setNotableOnly(false);
            }}
          />
          {genre === 'all' || !selected ? (
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
  onChange,
}: {
  genres: ComposerCatalogGenre[];
  total: number;
  value: GenreKey | 'all';
  onChange: (next: GenreKey | 'all') => void;
}) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      <Chip label="전체" count={total} selected={value === 'all'} onPress={() => onChange('all')} />
      {genres.map((item) => {
        const key = genreKey(item);
        const color = item.genre ? genreForeground(item.genre, scheme) : undefined;
        return (
          <Chip
            key={key}
            label={genreLabel(key)}
            count={item.count}
            selected={value === key}
            onPress={() => onChange(key)}
            leading={
              <View
                className="size-2 rounded-full bg-foreground-subtle"
                style={color ? { backgroundColor: color } : undefined}
              />
            }
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
  const { colorScheme } = useColorScheme();
  const color = genre === 'other' ? undefined : genreForeground(genre, colorScheme === 'dark' ? 'dark' : 'light');
  return (
    <View className="flex-row items-center gap-2">
      <View className="size-2.5 rounded-full bg-foreground-subtle" style={color ? { backgroundColor: color } : undefined} />
      <Text className="text-body font-semibold text-foreground">{genreLabel(genre)}</Text>
      {notableCount > 0 ? (
        <Text variant="caption" className="text-primary">{`대표 ${notableCount}`}</Text>
      ) : null}
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
        <Button variant="outline" size="sm" className="self-start" onPress={onOpen}>
          <Text>{`${genreLabel(key)} ${genre.count.toLocaleString('ko-KR')}곡 모두 보기`}</Text>
        </Button>
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
      <View className="flex-row items-baseline gap-2 border-b border-border pb-1.5">
        <Text className="text-body-sm font-semibold text-foreground-muted">{form.name}</Text>
        <Text variant="caption" className="tabular-nums">{`${total}곡`}</Text>
        {!notableOnly && form.notableCount > 0 ? (
          <Text variant="caption" className="text-primary">{`대표 ${form.notableCount}`}</Text>
        ) : null}
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
            <Button variant="ghost" size="sm" className="self-start" onPress={() => setOpen(true)}>
              <Text>{`${form.name} ${total - FORM_PREVIEW_SIZE}곡 더 보기`}</Text>
            </Button>
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
      <View className="mt-2 flex-row gap-2">
        {query.hasNextPage ? (
          <Button variant="outline" size="sm" onPress={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            <Text>{query.isFetchingNextPage ? '불러오는 중…' : '작품 더 보기'}</Text>
          </Button>
        ) : null}
        {onCollapse ? (
          <Button variant="ghost" size="sm" onPress={onCollapse}>
            <Text>접기</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function SearchResults({ q, ...props }: ComposerWorksProps & { q: string }) {
  const query = useComposerPieces(props.composerId, { q, sort: 'catalogue' }, { pageSize: PAGE_SIZE });
  const pieces = React.useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  if (query.isLoading) return <RowsSkeleton count={4} />;
  if (query.isError) return <RetryRow message="검색하지 못했어요." onRetry={() => query.refetch()} />;
  if (pieces.length === 0) {
    return (
      <Text variant="bodySm" className="text-foreground-muted">
        {`'${q}'에 맞는 작품이 없어요. 작품번호(Op. 28)나 별칭(빗방울)으로 찾아보세요.`}
      </Text>
    );
  }
  return (
    <View className="gap-2">
      <Text variant="caption">{`검색 결과 ${pieces.length}${query.hasNextPage ? '+' : ''}곡`}</Text>
      <Rows pieces={pieces} {...props} />
      {query.hasNextPage ? (
        <Button variant="outline" size="sm" className="self-start" onPress={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          <Text>{query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}</Text>
        </Button>
      ) : null}
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
