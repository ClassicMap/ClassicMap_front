import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AreaOption } from '@/lib/data/areas';
import {
  CONCERT_GENRES,
  CONCERT_PERIODS,
  type ConcertFilter,
  countActiveFilters,
  DEFAULT_CONCERT_FILTER,
} from '@/lib/data/concert-filters';
import { cn } from '@/lib/utils';
import { RotateCcwIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

function Divider() {
  return <View className="mx-1 h-5 w-px self-center bg-border" />;
}

interface ConcertSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** 공연 안에서만 찾는 검색 칸 (제목·출연·작곡가·공연장) */
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
        placeholder="공연 제목, 출연자, 공연장"
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

interface ConcertFilterBarProps {
  filter: ConcertFilter;
  areas: AreaOption[];
  onChange: (next: Partial<ConcertFilter>) => void;
  onReset: () => void;
}

/**
 * 장르 · 기간 · 내한/페스티벌 한 줄, 지역 한 줄.
 * 좁은 화면에서도 같은 칩을 가로로 밀어 본다.
 */
export function ConcertFilterBar({ filter, areas, onChange, onReset }: ConcertFilterBarProps) {
  const active = countActiveFilters(filter) + Number(Boolean(filter.area));
  return (
    <View className="gap-2.5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
        {CONCERT_GENRES.map((genre) => (
          <Chip
            key={genre.key}
            label={genre.label}
            selected={filter.genre === genre.key}
            onPress={() => onChange({ genre: genre.key })}
          />
        ))}
        <Divider />
        {CONCERT_PERIODS.map((period) => (
          <Chip
            key={period.key}
            label={period.label}
            selected={filter.period === period.key}
            onPress={() => onChange({ period: period.key })}
          />
        ))}
        <Divider />
        <Chip label="내한" selected={filter.visit} onPress={() => onChange({ visit: !filter.visit })} />
        <Chip label="페스티벌" selected={filter.festival} onPress={() => onChange({ festival: !filter.festival })} />
        {active > 0 ? (
          <Pressable
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={`필터 ${active}개 초기화`}
            className="ml-1 h-8 flex-row items-center gap-1.5 rounded-full px-2.5 web:hover:bg-surface-2">
            <Icon as={RotateCcwIcon} size={13} className="text-foreground-muted" />
            <Text className="text-label text-foreground-muted">초기화 {active}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <Chip
          size="sm"
          label="전국"
          selected={filter.area === DEFAULT_CONCERT_FILTER.area}
          onPress={() => onChange({ area: undefined })}
        />
        {areas.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            label={option.label}
            selected={filter.area === option.value}
            onPress={() => onChange({ area: option.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
