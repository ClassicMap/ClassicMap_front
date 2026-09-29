import {
  AreaPanel,
  type ArtistChoice,
  ArtistPanel,
  GenrePanel,
  InstrumentPanel,
  PeriodPanel,
  ToggleRow,
} from '@/components/concert/concert-filter-panels';
import { InstrumentIcon } from '@/components/concert/instrument-icon';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import type { AreaOption } from '@/lib/data/areas';
import {
  type ConcertFilter,
  type ConcertInstrumentKey,
  countActiveFilters,
  DEFAULT_CONCERT_FILTER,
  formatRange,
  genreLabel,
  instrumentLabel,
  periodLabel,
  periodRange,
} from '@/lib/data/concert-filters';
import { cn } from '@/lib/utils';
import type { TriggerRef } from '@rn-primitives/popover';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  MapPinIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ConcertSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** 공연 안에서만 찾는 검색 칸. 프로그램에 적힌 작곡가 이름으로도 찾는다 */
export function ConcertSearchField({ value, onChange, className }: ConcertSearchFieldProps) {
  return (
    <View
      className={cn(
        'h-10 flex-row items-center gap-2 rounded-full border border-border-strong bg-surface-2 px-3.5',
        className
      )}>
      <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="공연 제목, 출연자, 작곡가, 공연장"
        placeholderTextColor="hsl(33 6% 46%)"
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="공연 검색어"
        className="min-w-0 flex-1 text-body-sm text-foreground web:outline-none"
      />
      {value ? (
        <Pressable accessibilityLabel="검색어 지우기" hitSlop={10} onPress={() => onChange('')}>
          <Icon as={XIcon} size={15} className="text-foreground-subtle" />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface ConcertFilterBarProps {
  filter: ConcertFilter;
  areas: AreaOption[];
  /** 고른 연주자 (이름·사진). 주소에는 id만 있어 호출부가 찾아 준다 */
  artist?: ArtistChoice;
  favoriteArtists: readonly ArtistChoice[];
  instrumentCounts?: Partial<Record<ConcertInstrumentKey, number>>;
  onChange: (next: Partial<ConcertFilter>) => void;
  onArtistChange: (artist: ArtistChoice | undefined) => void;
  onReset: () => void;
}

// ─── 데스크톱: 드롭다운 버튼 한 줄 ───────────────────────────────────────────────

interface FilterMenuProps {
  label: string;
  /** 고른 값이 있으면 버튼이 그 값을 보여 준다 */
  value?: string;
  leading?: React.ReactNode;
  width: number;
  children: (close: () => void) => React.ReactNode;
}

function FilterMenu({ label, value, leading, width, children }: FilterMenuProps) {
  const triggerRef = React.useRef<TriggerRef>(null);
  const close = React.useCallback(() => triggerRef.current?.close(), []);
  const active = value !== undefined;
  return (
    <Popover>
      <PopoverTrigger ref={triggerRef} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={active ? `${label}: ${value}` : label}
          className={cn(
            'h-9 shrink-0 flex-row items-center gap-1.5 rounded-full border pl-3 pr-2.5 web:transition-colors',
            active
              ? 'border-primary bg-primary-muted'
              : 'border-border bg-surface-1 active:bg-surface-2 web:hover:bg-surface-2'
          )}>
          {leading}
          <Text
            numberOfLines={1}
            className={cn('max-w-[180px] text-label', active ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
            {value ?? label}
          </Text>
          <Icon as={ChevronDownIcon} size={14} className={active ? 'text-foreground' : 'text-foreground-subtle'} />
        </Pressable>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={8} className="p-3" style={{ width }}>
        <Text variant="micro" className="mb-2 px-1 uppercase tracking-wider">
          {label}
        </Text>
        {children(close)}
      </PopoverContent>
    </Popover>
  );
}

function periodValue(filter: ConcertFilter): string | undefined {
  if (filter.period === DEFAULT_CONCERT_FILTER.period) return undefined;
  return `${periodLabel(filter.period)} · ${formatRange(periodRange(filter.period))}`;
}

/**
 * 데스크톱 필터 바. 칩을 늘어놓지 않고 조건마다 버튼 하나를 두고, 누르면 그 조건에 맞는 모양으로 고른다:
 * 기간은 실제 날짜가 붙은 목록, 지역은 권역별 묶음, 편성은 아이콘 타일, 연주자는 검색.
 */
export function ConcertFilterBar(props: ConcertFilterBarProps) {
  const { filter, areas, artist, favoriteArtists, instrumentCounts, onChange, onArtistChange } = props;
  const areaLabel = areas.find((area) => area.value === filter.area)?.label ?? filter.area;
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <FilterMenu label="장르" value={genreLabel(filter.genre)} width={220}>
          {(close) => (
            <GenrePanel
              value={filter.genre}
              onSelect={(genre) => {
                onChange({ genre });
                close();
              }}
            />
          )}
        </FilterMenu>
        <FilterMenu
          label="날짜"
          value={periodValue(filter)}
          leading={<Icon as={CalendarDaysIcon} size={14} className="text-foreground-subtle" />}
          width={260}>
          {(close) => (
            <PeriodPanel
              value={filter.period}
              onSelect={(period) => {
                onChange({ period });
                close();
              }}
            />
          )}
        </FilterMenu>
        <FilterMenu
          label="지역"
          value={filter.area ? areaLabel : undefined}
          leading={<Icon as={MapPinIcon} size={14} className="text-foreground-subtle" />}
          width={360}>
          {(close) => (
            <AreaPanel
              areas={areas}
              value={filter.area}
              onSelect={(area) => {
                onChange({ area });
                close();
              }}
            />
          )}
        </FilterMenu>
        <FilterMenu
          label="편성"
          value={filter.instrument ? instrumentLabel(filter.instrument) : undefined}
          leading={
            filter.instrument ? <InstrumentIcon code={filter.instrument} size={14} className="text-foreground" /> : null
          }
          width={456}>
          {(close) => (
            <InstrumentPanel
              value={filter.instrument}
              counts={instrumentCounts}
              onSelect={(instrument) => {
                onChange({ instrument });
                close();
              }}
            />
          )}
        </FilterMenu>
        <FilterMenu
          label="연주자"
          value={filter.artist ? artist?.name ?? '연주자 1명' : undefined}
          leading={
            artist ? (
              <EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={18} />
            ) : (
              <Icon as={UserRoundIcon} size={14} className="text-foreground-subtle" />
            )
          }
          width={340}>
          {(close) => (
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <ArtistPanel
                value={filter.artist}
                favorites={favoriteArtists}
                autoFocus
                onSelect={(next) => {
                  onArtistChange(next);
                  close();
                }}
              />
            </ScrollView>
          )}
        </FilterMenu>
        <View className="mx-1 h-5 w-px bg-border" />
        <Chip label="내한" selected={filter.visit} onPress={() => onChange({ visit: !filter.visit })} />
        <Chip label="페스티벌" selected={filter.festival} onPress={() => onChange({ festival: !filter.festival })} />
      </View>
      <AppliedFilters {...props} />
    </View>
  );
}

// ─── 적용된 조건 요약 ─────────────────────────────────────────────────────────

interface AppliedChip {
  key: string;
  label: string;
  leading?: React.ReactNode;
  clear: () => void;
}

function appliedChips({ filter, areas, artist, onChange, onArtistChange }: ConcertFilterBarProps): AppliedChip[] {
  const chips: AppliedChip[] = [];
  if (filter.genre !== DEFAULT_CONCERT_FILTER.genre) {
    chips.push({ key: 'genre', label: genreLabel(filter.genre), clear: () => onChange({ genre: DEFAULT_CONCERT_FILTER.genre }) });
  }
  if (filter.period !== DEFAULT_CONCERT_FILTER.period) {
    chips.push({ key: 'period', label: periodValue(filter) ?? '', clear: () => onChange({ period: 'all' }) });
  }
  if (filter.area) {
    const label = areas.find((area) => area.value === filter.area)?.label ?? filter.area;
    chips.push({ key: 'area', label, clear: () => onChange({ area: undefined }) });
  }
  if (filter.instrument) {
    const code = filter.instrument;
    chips.push({
      key: 'instrument',
      label: instrumentLabel(code),
      leading: <InstrumentIcon code={code} size={13} className="text-foreground-muted" />,
      clear: () => onChange({ instrument: undefined }),
    });
  }
  if (filter.artist) {
    chips.push({
      key: 'artist',
      label: artist?.name ?? '연주자',
      leading: artist ? <EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={16} /> : undefined,
      clear: () => onArtistChange(undefined),
    });
  }
  if (filter.visit) chips.push({ key: 'visit', label: '내한', clear: () => onChange({ visit: false }) });
  if (filter.festival) chips.push({ key: 'festival', label: '페스티벌', clear: () => onChange({ festival: false }) });
  return chips;
}

/** 지금 걸린 조건을 한 줄로. 하나씩 빼거나 한 번에 초기화한다. 기본값(클래식)은 조건으로 치지 않는다 */
function AppliedFilters(props: ConcertFilterBarProps) {
  const chips = appliedChips(props);
  if (chips.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-1.5">
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.clear}
          accessibilityRole="button"
          accessibilityLabel={`${chip.label} 조건 빼기`}
          className="h-7 flex-row items-center gap-1.5 rounded-full bg-surface-2 pl-2.5 pr-2 active:bg-surface-3 web:hover:bg-surface-3">
          {chip.leading}
          <Text className="text-caption font-medium text-foreground">{chip.label}</Text>
          <Icon as={XIcon} size={12} className="text-foreground-subtle" />
        </Pressable>
      ))}
      <Pressable
        onPress={props.onReset}
        accessibilityRole="button"
        accessibilityLabel={`조건 ${chips.length}개 모두 빼기`}
        className="ml-1 h-7 flex-row items-center gap-1 rounded-full px-2 web:hover:bg-surface-2">
        <Icon as={RotateCcwIcon} size={12} className="text-foreground-muted" />
        <Text className="text-caption text-foreground-muted">초기화</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── 모바일: 필터 버튼 + 바텀 시트 ─────────────────────────────────────────────

interface MobileFilterProps extends ConcertFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** 지금 조건으로 보이는 공연 수. 더 불러올 게 있으면 `more` */
  resultCount: number;
  more: boolean;
}

/**
 * 모바일 필터. 검색 칸 옆 '필터' 버튼이 조건 수를 보여 주고, 누르면 시트에서 조건을 한꺼번에 고른다.
 * 자주 쓰는 오늘·이번 주말·내한만 바로 누를 수 있게 밖에 둔다.
 */
export function ConcertMobileFilter(props: MobileFilterProps) {
  const { filter, query, onQueryChange, onChange } = props;
  const [open, setOpen] = React.useState(false);
  const count = countActiveFilters(filter);
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <ConcertSearchField value={query} onChange={onQueryChange} className="flex-1" />
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `필터, 조건 ${count}개` : '필터'}
          className={cn(
            'h-10 flex-row items-center gap-1.5 rounded-full border px-3.5',
            count > 0 ? 'border-primary bg-primary-muted' : 'border-border-strong bg-surface-2'
          )}>
          <Icon as={SlidersHorizontalIcon} size={16} className="text-foreground" />
          <Text className="text-label font-semibold text-foreground">필터</Text>
          {count > 0 ? (
            <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
              <Text className="text-micro font-bold text-primary-foreground">{count}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
        <Chip
          size="sm"
          label="오늘"
          selected={filter.period === 'today'}
          onPress={() => onChange({ period: filter.period === 'today' ? 'all' : 'today' })}
        />
        <Chip
          size="sm"
          label="이번 주말"
          selected={filter.period === 'weekend'}
          onPress={() => onChange({ period: filter.period === 'weekend' ? 'all' : 'weekend' })}
        />
        <Chip size="sm" label="내한" selected={filter.visit} onPress={() => onChange({ visit: !filter.visit })} />
        <Chip
          size="sm"
          label="페스티벌"
          selected={filter.festival}
          onPress={() => onChange({ festival: !filter.festival })}
        />
      </ScrollView>
      <AppliedFilters {...props} />
      <FilterSheet {...props} visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5 border-b border-border py-5">
      <Text className="text-body font-bold text-foreground">{title}</Text>
      {children}
    </View>
  );
}

function FilterSheet({
  visible,
  onClose,
  resultCount,
  more,
  ...props
}: MobileFilterProps & { visible: boolean; onClose: () => void }) {
  const { filter, areas, favoriteArtists, instrumentCounts, onChange, onArtistChange, onReset } = props;
  const insets = useSafeAreaInsets();
  const count = countActiveFilters(filter);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="필터 닫기"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        <View className="max-h-[88%] rounded-t-2xl bg-background" style={{ paddingBottom: insets.bottom }}>
          <View className="items-center pt-2">
            <View className="h-1 w-10 rounded-full bg-border-strong" />
          </View>
          <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
            <Text variant="headline">필터</Text>
            <View className="flex-row items-center gap-1">
              {count > 0 ? (
                <Pressable onPress={onReset} accessibilityRole="button" hitSlop={6} className="h-9 justify-center px-2">
                  <Text className="text-label text-foreground-muted">초기화</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                className="size-9 items-center justify-center rounded-full bg-surface-2">
                <Icon as={XIcon} size={16} className="text-foreground" />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerClassName="px-4 pb-4" keyboardShouldPersistTaps="handled">
            <SheetSection title="장르">
              <View className="flex-row flex-wrap gap-2">
                {(['classic', 'gugak', 'musical', 'all'] as const).map((key) => (
                  <Chip key={key} label={genreLabel(key)} selected={filter.genre === key} onPress={() => onChange({ genre: key })} />
                ))}
              </View>
            </SheetSection>
            <SheetSection title="날짜">
              <PeriodPanel value={filter.period} onSelect={(period) => onChange({ period })} />
            </SheetSection>
            <SheetSection title="편성">
              <InstrumentPanel
                value={filter.instrument}
                counts={instrumentCounts}
                onSelect={(instrument) => onChange({ instrument })}
              />
            </SheetSection>
            <SheetSection title="지역">
              <AreaPanel areas={areas} value={filter.area} onSelect={(area) => onChange({ area })} />
            </SheetSection>
            <SheetSection title="연주자">
              <ArtistPanel value={filter.artist} favorites={favoriteArtists} onSelect={onArtistChange} />
            </SheetSection>
            <View className="pt-2">
              <ToggleRow
                label="내한 공연"
                description="해외 연주자·단체가 한국에 와서 여는 공연"
                value={filter.visit}
                onChange={(visit) => onChange({ visit })}
              />
              <ToggleRow
                label="페스티벌"
                description="음악제·축제 안에서 열리는 공연"
                value={filter.festival}
                onChange={(festival) => onChange({ festival })}
              />
            </View>
          </ScrollView>
          <View className="border-t border-border px-4 pt-3">
            <Button className="h-12 rounded-full" onPress={onClose}>
              <Text className="font-semibold text-primary-foreground">
                {resultCount === 0 && !more ? '조건에 맞는 공연이 없어요' : `공연 ${resultCount}${more ? '개 이상' : '개'} 보기`}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
