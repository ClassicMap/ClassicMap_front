import { InstrumentIcon } from '@/components/concert/instrument-icon';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { ConcertArtistOption } from '@/lib/api/client';
import type { AreaOption } from '@/lib/data/areas';
import {
  AREA_REGIONS,
  CONCERT_GENRES,
  CONCERT_INSTRUMENTS,
  CONCERT_PERIODS,
  type ConcertGenreKey,
  type ConcertInstrumentKey,
  type ConcertPeriodKey,
  formatRange,
  periodRange,
} from '@/lib/data/concert-filters';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useConcertArtistOptions } from '@/lib/query/hooks/useConcerts';
import { cn } from '@/lib/utils';
import { CheckIcon, HeartIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

/**
 * 공연 필터 선택지. 데스크톱 팝오버와 모바일 시트가 같은 패널을 쓴다.
 * 고르는 즉시 적용되고, 팝오버는 호출부가 닫는다.
 */

function OptionRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'h-10 flex-row items-center gap-3 rounded-md px-3 active:bg-surface-2 web:hover:bg-surface-2',
        selected && 'bg-primary-muted web:hover:bg-primary-muted'
      )}>
      <Text className={cn('flex-1 text-body-sm', selected ? 'font-semibold text-foreground' : 'text-foreground')}>
        {label}
      </Text>
      {detail ? <Text variant="mono" className="text-foreground-subtle">{detail}</Text> : null}
      <View className="w-4">
        {selected ? <Icon as={CheckIcon} size={16} className="text-primary" /> : null}
      </View>
    </Pressable>
  );
}

export function GenrePanel({ value, onSelect }: { value: ConcertGenreKey; onSelect: (key: ConcertGenreKey) => void }) {
  return (
    <View className="gap-0.5">
      {CONCERT_GENRES.map((genre) => (
        <OptionRow
          key={genre.key}
          label={genre.label}
          selected={value === genre.key}
          onPress={() => onSelect(genre.key)}
        />
      ))}
    </View>
  );
}

/** 기간 프리셋. 오른쪽에 실제 날짜를 붙여 '이번 주'가 언제까지인지 바로 보이게 한다 */
export function PeriodPanel({ value, onSelect }: { value: ConcertPeriodKey; onSelect: (key: ConcertPeriodKey) => void }) {
  const now = new Date();
  return (
    <View className="gap-0.5">
      {CONCERT_PERIODS.map((period) => (
        <OptionRow
          key={period.key}
          label={period.label}
          detail={period.key === 'all' ? '오늘부터' : formatRange(periodRange(period.key, now))}
          selected={value === period.key}
          onPress={() => onSelect(period.key)}
        />
      ))}
    </View>
  );
}

function AreaPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'h-9 min-w-[64px] items-center justify-center rounded-md border px-3',
        selected
          ? 'border-primary bg-primary-muted'
          : 'border-border bg-surface-1 active:bg-surface-2 web:hover:bg-surface-2'
      )}>
      <Text className={cn('text-label', selected ? 'font-semibold text-foreground' : 'text-foreground-muted')}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 지역은 권역으로 묶어 18개를 한눈에 훑게 한다. 백엔드가 한 지역만 받아 하나만 고른다 */
export function AreaPanel({
  areas,
  value,
  onSelect,
}: {
  areas: AreaOption[];
  value?: string;
  onSelect: (value: string | undefined) => void;
}) {
  const byValue = new Map(areas.map((area) => [area.value, area]));
  const grouped = new Set(AREA_REGIONS.flatMap((region) => region.areas));
  const others = areas.filter((area) => !grouped.has(area.value));
  const regions = [
    ...AREA_REGIONS.map((region) => ({
      label: region.label,
      areas: region.areas.map((value) => byValue.get(value)).filter((area): area is AreaOption => Boolean(area)),
    })),
    { label: '그 밖', areas: others },
  ].filter((region) => region.areas.length > 0);

  return (
    <View className="gap-3.5">
      <View className="flex-row">
        <AreaPill label="전국" selected={!value} onPress={() => onSelect(undefined)} />
      </View>
      {regions.map((region) => (
        <View key={region.label} className="gap-1.5">
          <Text variant="micro" className="uppercase tracking-wider">
            {region.label}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {region.areas.map((area) => (
              <AreaPill
                key={area.value}
                label={area.label}
                selected={value === area.value}
                onPress={() => onSelect(area.value)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 편성 타일. 아이콘과 대표 악기를 같이 적어 '관악'이 무엇을 말하는지 몰라도 고를 수 있게 한다.
 * 개수는 지금 불러온 목록 기준이라 대략 값이다.
 */
export function InstrumentPanel({
  value,
  counts,
  columns = 3,
  onSelect,
}: {
  value?: ConcertInstrumentKey;
  counts?: Partial<Record<ConcertInstrumentKey, number>>;
  columns?: number;
  onSelect: (key: ConcertInstrumentKey | undefined) => void;
}) {
  return (
    <View className="gap-2.5">
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {CONCERT_INSTRUMENTS.map((instrument) => {
          const selected = value === instrument.key;
          const count = counts?.[instrument.key];
          return (
            <View key={instrument.key} style={{ width: `${100 / columns}%`, padding: 4 }}>
              <Pressable
                onPress={() => onSelect(selected ? undefined : instrument.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${instrument.label}, ${instrument.hint}`}
                className={cn(
                  'gap-2 rounded-lg border p-3',
                  selected
                    ? 'border-primary bg-primary-muted'
                    : 'border-border bg-surface-1 active:bg-surface-2 web:hover:bg-surface-2'
                )}>
                <View className="flex-row items-start justify-between">
                  <InstrumentIcon
                    code={instrument.key}
                    size={22}
                    className={selected ? 'text-primary' : 'text-foreground-muted'}
                  />
                  {count !== undefined ? (
                    <Text
                      variant="mono"
                      className={cn(count === 0 ? 'text-foreground-subtle/60' : 'text-foreground-subtle')}>
                      {count}
                    </Text>
                  ) : null}
                </View>
                <View>
                  <Text className="text-body-sm font-semibold text-foreground">{instrument.label}</Text>
                  <Text variant="micro" numberOfLines={1} className="mt-0.5">
                    {instrument.hint}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
      {counts ? (
        <Text variant="micro">숫자는 지금 불러온 공연 기준이에요. 공연 제목으로 나눠 조금 다를 수 있어요.</Text>
      ) : null}
    </View>
  );
}

export interface ArtistChoice {
  artistId: number;
  name: string;
  imageUrl?: string | null;
}

function ArtistRow({
  option,
  selected,
  favorite,
  onPress,
}: {
  option: ConcertArtistOption;
  selected: boolean;
  favorite: boolean;
  onPress: () => void;
}) {
  const meta = [option.category ? getArtistCategoryLabel(option.category) : null, option.englishName]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'min-h-12 flex-row items-center gap-3 rounded-md px-2 py-1.5 active:bg-surface-2 web:hover:bg-surface-2',
        selected && 'bg-primary-muted web:hover:bg-primary-muted'
      )}>
      <EntityThumb name={option.name} image={option.imageUrl} shape="circle" size={34} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-body-sm font-semibold text-foreground">
            {option.name}
          </Text>
          {favorite ? <Icon as={HeartIcon} size={12} className="text-primary" /> : null}
        </View>
        {meta ? (
          <Text variant="micro" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {option.concertCount !== undefined ? (
        <Text variant="caption" className="tabular-nums text-foreground-subtle">
          공연 {option.concertCount}
        </Text>
      ) : null}
      <View className="w-4">{selected ? <Icon as={CheckIcon} size={16} className="text-primary" /> : null}</View>
    </Pressable>
  );
}

/**
 * 연주자 고르기. 찜한 아티스트가 먼저 오고, 그 아래 앞으로 공연이 많은 연주자.
 * 검색어를 치면 이름으로 좁힌다.
 */
export function ArtistPanel({
  value,
  favorites,
  onSelect,
  autoFocus = false,
}: {
  value?: number;
  favorites: readonly ArtistChoice[];
  onSelect: (artist: ArtistChoice | undefined) => void;
  autoFocus?: boolean;
}) {
  const [search, setSearch] = React.useState('');
  const debounced = useDebounce(search, 250);
  const { options, hasCounts, isLoading, isError, refetch } = useConcertArtistOptions(debounced);
  const favoriteIds = new Set(favorites.map((artist) => artist.artistId));
  const needle = debounced.trim().toLowerCase();
  const favoriteOptions: ConcertArtistOption[] = favorites
    .filter((artist) => !needle || artist.name.toLowerCase().includes(needle))
    .map((artist) => ({
      artistId: artist.artistId,
      name: artist.name,
      imageUrl: artist.imageUrl ?? null,
      concertCount: options.find((option) => option.artistId === artist.artistId)?.concertCount,
    }));
  const rest = options.filter((option) => !favoriteIds.has(option.artistId));
  const pick = (option: ConcertArtistOption) =>
    onSelect(
      value === option.artistId ? undefined : { artistId: option.artistId, name: option.name, imageUrl: option.imageUrl }
    );

  return (
    <View className="gap-2">
      <View className="h-10 flex-row items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3">
        <Icon as={SearchIcon} size={15} className="text-foreground-subtle" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="연주자 이름"
          placeholderTextColor="hsl(33 6% 46%)"
          autoFocus={autoFocus && Platform.OS === 'web'}
          autoCorrect={false}
          accessibilityLabel="연주자 이름으로 찾기"
          className="min-w-0 flex-1 text-body-sm text-foreground web:outline-none"
        />
        {search ? (
          <Pressable accessibilityLabel="이름 지우기" hitSlop={10} onPress={() => setSearch('')}>
            <Icon as={XIcon} size={14} className="text-foreground-subtle" />
          </Pressable>
        ) : null}
      </View>

      {favoriteOptions.length > 0 ? (
        <View>
          <Text variant="micro" className="mb-1 mt-1 px-2 uppercase tracking-wider">
            찜한 연주자
          </Text>
          {favoriteOptions.map((option) => (
            <ArtistRow
              key={`fav-${option.artistId}`}
              option={option}
              favorite
              selected={value === option.artistId}
              onPress={() => pick(option)}
            />
          ))}
        </View>
      ) : null}

      <View>
        {hasCounts || needle ? (
          <Text variant="micro" className="mb-1 mt-1 px-2 uppercase tracking-wider">
            {needle ? '검색 결과' : '공연이 많은 연주자'}
          </Text>
        ) : null}
        {isLoading ? (
          <View className="gap-2 px-2 py-1">
            {Array.from({ length: 4 }, (_, index) => (
              <View key={index} className="flex-row items-center gap-3">
                <Skeleton className="size-[34px] rounded-full" />
                <Skeleton className="h-3.5 w-1/2" />
              </View>
            ))}
          </View>
        ) : isError ? (
          <View className="flex-row items-center gap-2 px-2 py-2">
            <Text variant="caption">연주자 목록을 불러오지 못했어요.</Text>
            <Pressable onPress={refetch} accessibilityRole="button" hitSlop={8}>
              <Text className="text-caption font-semibold text-primary">다시 시도</Text>
            </Pressable>
          </View>
        ) : !hasCounts && !needle ? (
          <Text variant="caption" className="px-2 py-2">
            찾을 연주자 이름을 입력해 주세요.
          </Text>
        ) : rest.length === 0 ? (
          <Text variant="caption" className="px-2 py-2">
            {needle ? `'${debounced.trim()}' 이름의 연주자가 없어요. 철자를 바꿔 보세요.` : '앞으로 공연이 잡힌 연주자가 아직 없어요.'}
          </Text>
        ) : (
          rest.map((option) => (
            <ArtistRow
              key={option.artistId}
              option={option}
              favorite={false}
              selected={value === option.artistId}
              onPress={() => pick(option)}
            />
          ))
        )}
      </View>
    </View>
  );
}

/** 내한·페스티벌 같은 켜고 끄는 조건. 설명을 붙여 뜻이 모호하지 않게 한다 */
export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="min-h-12 flex-row items-center gap-3 py-1.5">
      <View className="min-w-0 flex-1">
        <Text className="text-body-sm font-semibold text-foreground">{label}</Text>
        <Text variant="caption">{description}</Text>
      </View>
      <View
        className={cn(
          'h-7 w-12 justify-center rounded-full px-0.5',
          value ? 'items-end bg-primary' : 'items-start bg-surface-3'
        )}>
        <View className="size-6 rounded-full bg-white" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </View>
    </Pressable>
  );
}
