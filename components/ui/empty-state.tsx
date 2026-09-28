import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

type EmptyStateTone = 'empty' | 'error';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon | React.ComponentType<{ size?: number; color?: string; className?: string }>;
  title: string;
  description?: string;
  /** 프로젝트 지침: 사용자가 할 수 있는 다음 행동을 하나 둔다. */
  action?: EmptyStateAction;
  tone?: EmptyStateTone;
  /** 섹션 안 인라인 표시일 때 여백을 줄인다 (부분 실패). */
  compact?: boolean;
  className?: string;
}

/** 빈 상태·오류 공통 골격 (설계 문서 4.8). 문구는 해요체로 넘긴다. */
function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'empty',
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn('items-center gap-2 px-6', compact ? 'py-6' : 'py-12', className)}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Icon
        as={icon as LucideIcon}
        size={compact ? 24 : 32}
        className={tone === 'error' ? 'text-destructive' : 'text-foreground-faint'}
      />
      <Text variant="headline" className="mt-1 text-center">
        {title}
      </Text>
      {description ? (
        <Text variant="bodySm" className="max-w-sm text-center text-foreground-muted">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button
          variant={tone === 'error' ? 'outline' : 'secondary'}
          size="sm"
          className="mt-2"
          onPress={action.onPress}>
          <Text>{action.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
