import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useFavorite } from '@/features/library/hooks/use-favorite';
import type { FavoriteTargetType } from '@/lib/api/client';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BookmarkIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

interface FavoriteButtonProps {
  kind: FavoriteTargetType;
  id: number;
  /** 스크린 리더와 툴팁에 쓰는 대상 이름 */
  name: string;
  /** labeled: 상세 머리의 글자 버튼, icon: 목록 행의 아이콘 버튼 */
  variant?: 'labeled' | 'icon';
  className?: string;
}

/** 레퍼토리 담기. 담기면 브라스로 채운다 (1차 시안 북마크) */
export function FavoriteButton({ kind, id, name, variant = 'icon', className }: FavoriteButtonProps) {
  useLocale();
  const { active, toggle, pending } = useFavorite(kind, id);
  const label = active ? t('{name} 레퍼토리에서 빼기', { name }) : t('{name} 레퍼토리에 담기', { name });
  // 눌러서 담긴 순간에만 아이콘이 톡 튄다 (처음 불러올 때 담겨 있던 건 가만히)
  const pressed = React.useRef(false);
  const [pop, setPop] = React.useState(false);
  React.useEffect(() => {
    if (!active || !pressed.current) return;
    pressed.current = false;
    setPop(true);
    const timer = setTimeout(() => setPop(false), 480);
    // 끝나기 전에 다시 누르면 타이머만 지워져 톡 튐이 켜진 채로 남았다. 같이 끈다
    return () => {
      clearTimeout(timer);
      setPop(false);
    };
  }, [active]);
  const onPress = () => {
    pressed.current = !active;
    toggle();
  };

  if (variant === 'labeled') {
    return (
      <Pressable
        onPress={onPress}
        disabled={pending}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        className={cn(
          'h-11 flex-row items-center gap-2 rounded-full border px-4 web:transition-colors web:duration-fast',
          active ? 'border-primary bg-primary-muted' : 'border-border-strong web:hover:bg-surface-2',
          className
        )}>
        <View className={pop && Platform.OS === 'web' ? 'cm-pop' : undefined}>
          <Icon as={BookmarkIcon} size={16} className={active ? 'fill-primary text-primary' : 'text-foreground'} />
        </View>
        <Text className={cn('text-label font-semibold', active ? 'text-primary' : 'text-foreground')}>
          {active ? t('레퍼토리에 있어요') : t('레퍼토리에 담기')}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className={cn(
        'size-9 items-center justify-center rounded-full web:transition-colors web:duration-fast web:hover:bg-surface-3',
        className
      )}>
      <View className={pop && Platform.OS === 'web' ? 'cm-pop' : undefined}>
        <Icon as={BookmarkIcon} size={17} className={active ? 'fill-primary text-primary' : 'text-foreground-subtle'} />
      </View>
    </Pressable>
  );
}
