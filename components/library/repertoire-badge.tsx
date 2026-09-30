import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { BookmarkIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

/**
 * 레퍼토리에 담긴 대상 표시. 즐겨찾기 버튼과 같은 채운 북마크를 브라스 원 안에 둔다.
 * 사진 모서리에 얹을 때는 RepertoireThumb 로 감싼다.
 */
export function RepertoireBadge({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <View
      accessibilityLabel="레퍼토리에 있어요"
      className={cn('items-center justify-center rounded-full border-2 border-background bg-primary web:border-surface-1', className)}
      style={{ width: size, height: size }}>
      <Icon
        as={BookmarkIcon}
        size={Math.round(size * 0.52)}
        className="fill-primary-foreground text-primary-foreground"
      />
    </View>
  );
}

interface RepertoireThumbProps {
  active: boolean;
  children: React.ReactNode;
  /** 배지 지름. 사진 크기의 1/4 안팎이 알맞다 */
  badgeSize?: number;
  /** 원형 사진이면 배지를 조금 안쪽으로 당겨 원 둘레에 걸치게 한다 */
  shape?: 'circle' | 'square';
  className?: string;
}

/** 사진(EntityThumb 등)을 감싸 오른쪽 아래에 레퍼토리 배지를 얹는다. 담기지 않았으면 그대로 */
export function RepertoireThumb({ active, children, badgeSize = 18, shape = 'circle', className }: RepertoireThumbProps) {
  if (!active) return <>{children}</>;
  const inset = shape === 'circle' ? -1 : -4;
  return (
    <View className={cn('relative', className)}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', right: inset, bottom: inset }}>
        <RepertoireBadge size={badgeSize} />
      </View>
    </View>
  );
}

/** 이름 옆에 붙이는 작은 채운 북마크 */
export function RepertoireMark({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <View accessibilityLabel="레퍼토리에 있어요" className={className}>
      <Icon as={BookmarkIcon} size={size} className="fill-primary text-primary" />
    </View>
  );
}
