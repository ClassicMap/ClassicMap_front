import { cn } from '@/lib/utils';
import * as React from 'react';
import { Platform, View } from 'react-native';

/**
 * 로딩 플레이스홀더 (설계 문서 4.8). 목록·카드 로딩은 스피너 대신 이걸 쓴다.
 * 웹은 은은한 펄스, 네이티브는 정지 상태로 둔다 (reduced-motion 처리 부담을 피함).
 */
function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      aria-hidden
      className={cn(
        'rounded-md bg-surface-2',
        Platform.select({ web: 'animate-pulse motion-reduce:animate-none' }),
        className
      )}
      {...props}
    />
  );
}

/** 여러 줄 텍스트. 마지막 줄은 짧게 끝난다. */
function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </View>
  );
}

/** 아바타 + 두 줄 텍스트 행. `avatar="square"`는 작품·앨범처럼 사각 콘텐츠용. */
function SkeletonRow({
  avatar = 'circle',
  className,
}: {
  avatar?: 'circle' | 'square' | 'none';
  className?: string;
}) {
  return (
    <View className={cn('h-16 flex-row items-center gap-3', className)}>
      {avatar !== 'none' && (
        <Skeleton className={cn('size-10', avatar === 'circle' ? 'rounded-full' : 'rounded-md')} />
      )}
      <View className="flex-1 gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </View>
    </View>
  );
}

/** 목록 로딩 기본값: 행 5개 */
function SkeletonList({
  rows = 5,
  avatar,
  className,
}: {
  rows?: number;
  avatar?: 'circle' | 'square' | 'none';
  className?: string;
}) {
  return (
    <View className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} avatar={avatar} />
      ))}
    </View>
  );
}

/** 포스터·커버가 위에 오는 카드 */
function SkeletonCard({ aspect = 'square', className }: { aspect?: 'square' | 'poster'; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      <Skeleton className={cn('w-full rounded-lg', aspect === 'square' ? 'aspect-square' : 'aspect-[3/4]')} />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </View>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonRow, SkeletonText };
