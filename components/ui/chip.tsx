import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

/**
 * 필터·섹터·태그 칩 (설계 문서 8.2).
 * 선택 상태만 액센트(brass)를 쓰고, 나머지는 표면 색으로 둔다.
 * 긴 라벨도 줄바꿈되지 않게 `shrink-0` + 웹 `whitespace-nowrap`을 기본으로 건다 (부록 D).
 */
const chipVariants = cva(
  cn(
    'shrink-0 flex-row items-center gap-1.5 rounded-full border',
    Platform.select({
      web: 'whitespace-nowrap outline-none transition-colors duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-ring/60',
    })
  ),
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary-muted',
        false: cn('border-border bg-surface-1', Platform.select({ web: 'hover:bg-surface-2' })),
      },
      size: {
        sm: 'h-[26px] px-2.5',
        md: 'h-8 px-3',
      },
    },
    defaultVariants: { selected: false, size: 'md' },
  }
);

type ChipProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> &
  VariantProps<typeof chipVariants> & {
    label: string;
    /** 라벨 뒤에 붙는 건수 */
    count?: number;
    /** 라벨 앞 요소 (시대 도트, 아이콘 등) */
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
  };

function Chip({
  label,
  count,
  leading,
  trailing,
  selected,
  size,
  className,
  ...props
}: ChipProps) {
  const isSelected = selected === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={cn(chipVariants({ selected: isSelected, size }), className)}
      {...props}>
      {leading}
      <Text
        numberOfLines={1}
        className={cn(
          'text-label',
          isSelected ? 'text-foreground' : 'text-foreground-muted'
        )}>
        {label}
      </Text>
      {count !== undefined && (
        <Text
          className={cn(
            'text-caption tabular-nums',
            isSelected ? 'text-primary' : 'text-foreground-subtle'
          )}>
          {count}
        </Text>
      )}
      {trailing}
    </Pressable>
  );
}

/** 시대 칩 등에 쓰는 6px 색 도트. 색은 데이터 카테고리 색만 넘긴다. */
function ChipDot({ color }: { color: string }) {
  return <View className="size-1.5 rounded-full" style={{ backgroundColor: color }} />;
}

export { Chip, ChipDot, chipVariants };
export type { ChipProps };
