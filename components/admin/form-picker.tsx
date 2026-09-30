import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

interface PickerTriggerProps {
  /** 스크린 리더에 읽힐 필드 이름 */
  label: string;
  /** 고른 값의 표시 이름. 없으면 placeholder를 흐리게 보여 준다 */
  value?: string;
  placeholder: string;
  onPress: () => void;
  /** 목록 펼침 상태. icon이 없을 때 화살표 방향에 쓴다 */
  open?: boolean;
  /** 날짜·시간처럼 목록이 아닌 선택기를 여는 경우의 아이콘 */
  icon?: LucideIcon;
  invalid?: boolean;
}

/** 인풋 모양의 선택 버튼. 목록(PickerPanel)이나 날짜 선택기를 연다. */
export function PickerTrigger({
  label,
  value,
  placeholder,
  onPress,
  open = false,
  icon,
  invalid = false,
}: PickerTriggerProps) {
  const TrailingIcon = icon ?? (open ? ChevronUpIcon : ChevronDownIcon);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      accessibilityState={icon ? undefined : { expanded: open }}
      className={cn(
        'h-10 flex-row items-center gap-2 rounded-md border border-input bg-background px-3 dark:bg-input/30 sm:h-9',
        invalid && 'border-destructive',
        Platform.select({
          web: 'outline-none transition-colors duration-fast hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        })
      )}>
      <Text
        numberOfLines={1}
        className={cn(
          'flex-1 text-base leading-5',
          value ? 'text-foreground' : 'text-muted-foreground',
          Platform.select({ web: 'md:text-sm' })
        )}>
        {value ?? placeholder}
      </Text>
      <Icon as={TrailingIcon} size={16} className="text-foreground-subtle" />
    </Pressable>
  );
}

interface PickerPanelProps {
  /** 목록 위 검색 칸. 없으면 목록만 보여 준다 */
  search?: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
  };
  children: React.ReactNode;
}

/** 트리거 아래에 펼쳐지는 목록 */
export function PickerPanel({ search, children }: PickerPanelProps) {
  return (
    <View className="mt-1.5 overflow-hidden rounded-md border border-border-strong bg-surface-2">
      {search ? (
        <View className="border-b border-border p-2">
          <Input
            value={search.value}
            onChangeText={search.onChangeText}
            placeholder={search.placeholder}
            accessibilityLabel={search.placeholder}
            autoCorrect={false}
            autoFocus={Platform.OS === 'web'}
            className="h-9"
          />
        </View>
      ) : null}
      <ScrollView
        className="max-h-60"
        contentContainerClassName="p-1"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

interface PickerOptionProps {
  title: string;
  description?: string;
  meta?: string;
  selected: boolean;
  onPress: () => void;
}

export function PickerOption({ title, description, meta, selected, onPress }: PickerOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center gap-3 rounded-sm px-2.5 py-2',
        selected ? 'bg-primary-muted' : 'active:bg-surface-3',
        !selected && Platform.select({ web: 'hover:bg-surface-3' })
      )}>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {title}
        </Text>
        {description ? (
          <Text variant="caption" numberOfLines={2} className="mt-0.5">
            {description}
          </Text>
        ) : null}
        {meta ? (
          <Text variant="micro" className="mt-1">
            {meta}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon as={CheckIcon} size={16} className="text-primary" /> : null}
    </Pressable>
  );
}

/** 목록이 비었거나 불러오는 중일 때의 한 줄 안내 */
export function PickerMessage({ children }: { children: string }) {
  return (
    <View className="items-center px-4 py-6">
      <Text variant="bodySm" className="text-center text-foreground-muted">
        {children}
      </Text>
    </View>
  );
}
