import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

/** 상태·카운트·출처 배지 (설계 문서 8.2). 누르는 동작은 없다. 누를 거면 Chip을 쓴다. */
const badgeVariants = cva('shrink-0 flex-row items-center gap-1 self-start rounded-xs px-1.5 py-0.5', {
  variants: {
    tone: {
      neutral: 'bg-surface-2',
      accent: 'bg-primary-muted',
      success: 'bg-success/15',
      warning: 'bg-warning/15',
      danger: 'bg-destructive/15',
      info: 'bg-info/15',
      outline: 'border border-border',
      // 영상·사진 위: 테마와 상관없이 어두운 바탕에 흰 글자 (썸네일에 박힌 글자 위에서도 읽혀야 한다)
      media: 'bg-black/80',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const badgeTextVariants = cva('text-micro', {
  variants: {
    tone: {
      neutral: 'text-foreground-muted',
      accent: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-destructive',
      info: 'text-info',
      outline: 'text-foreground-muted',
      media: 'font-semibold text-white',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type BadgeProps = React.ComponentProps<typeof View> &
  VariantProps<typeof badgeVariants> & {
    label: string;
    leading?: React.ReactNode;
  };

function Badge({ label, leading, tone, className, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ tone }), className)} {...props}>
      {leading}
      <Text numberOfLines={1} className={badgeTextVariants({ tone })}>
        {label}
      </Text>
    </View>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
