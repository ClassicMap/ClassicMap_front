import { cn } from '@/lib/utils';
import * as React from 'react';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * 로딩 플레이스홀더 (설계 문서 4.8). 목록·카드 로딩은 스피너 대신 이걸 쓴다.
 * 웹은 화면 전체를 한 줄기로 지나가는 쉬머(global.css `.cm-shimmer`),
 * 네이티브는 은은하게 숨 쉬듯 밝아졌다 어두워진다. 움직임 줄이기 설정이면 둘 다 멈춘다.
 */
function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  if (Platform.OS === 'web') {
    return <View aria-hidden className={cn('cm-shimmer rounded-md', className)} {...props} />;
  }
  return <NativeSkeleton className={className} {...props} />;
}

function NativeSkeleton({ className, children, ...props }: React.ComponentProps<typeof View>) {
  const reduceMotion = useReducedMotion();
  const { colorScheme } = useColorScheme();
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const highlightStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View aria-hidden className={cn('overflow-hidden rounded-md bg-surface-2', className)} {...props}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: THEME[colorScheme === 'dark' ? 'dark' : 'light'].surface3 },
          highlightStyle,
        ]}
      />
      {children}
    </View>
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

/**
 * 영상·히어로 자리. 빈 네모 대신 재생 버튼과 연주자 원을 흐리게 깔아
 * 무엇이 올지 미리 보여 준다.
 */
function SkeletonMedia({ performers = 3, className }: { performers?: number; className?: string }) {
  return (
    <Skeleton className={cn('w-full items-center justify-center rounded-xl', className)}>
      <View className="size-14 items-center justify-center rounded-full bg-background/40">
        <View
          className="ml-1 border-y-[9px] border-l-[14px] border-y-transparent border-l-foreground/15"
          style={{ width: 0, height: 0 }}
        />
      </View>
      {performers > 0 ? (
        <View className="absolute bottom-4 left-4 flex-row">
          {Array.from({ length: performers }, (_, index) => (
            <View
              key={index}
              className={cn('size-8 rounded-full border-2 border-surface-2 bg-background/40', index > 0 && '-ml-2')}
            />
          ))}
        </View>
      ) : null}
    </Skeleton>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonMedia, SkeletonRow, SkeletonText };
