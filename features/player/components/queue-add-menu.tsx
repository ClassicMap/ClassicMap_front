import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { addToQueue, queueActionSheet } from '@/features/player/lib/queue-actions';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { type ComparePlayerTrack, type PlaylistItem } from '@/lib/player/compare-player-store';
import { type ListPiece } from '@/lib/player/playlist';
import { cn } from '@/lib/utils';
import {
  ListEndIcon,
  ListStartIcon,
  MoreHorizontalIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable } from 'react-native';

/**
 * 곡 카드·목록 줄·비교 화면 연주 카드의 ⋯ 메뉴. 지금 듣는 것을 끊지 않고 이 곡을 대기열에 끼운다.
 * 「다음에 재생」은 지금 곡 바로 다음, 「대기열에 추가」는 지금 보이는 목록의 맨 끝이다.
 * 넓은 웹은 그 자리에 작은 메뉴가 뜨고, 앱과 좁은 웹은 아래에서 올라오는 시트(`QueueActionSheet`)를 연다
 */
export function QueueAddMenu({
  piece,
  track,
  title,
  subtitle,
  onDismiss,
  tone = 'plain',
  hoverOnly = false,
  className,
  openClassName,
}: {
  /** 곡을 넣는다(연주는 듣던 연주자 또는 대표 연주로 고른다) */
  piece?: ListPiece | PlaylistItem;
  /** 이 연주를 그대로 넣는다(비교 화면의 연주 카드) */
  track?: ComparePlayerTrack;
  /** 접근성 이름에 쓰는 곡 제목 */
  title: string;
  /** 시트 제목 아래 줄(작곡가·연주자) */
  subtitle?: string;
  /** 터치 화면의 시트에 「관심 없음」을 함께 둔다(추천 카드) */
  onDismiss?: () => void;
  /** 그림 위에 얹을 때는 'onArt'(어두운 동그라미) */
  tone?: 'plain' | 'onArt';
  /** 넓은 웹에서 줄에 마우스를 올렸을 때만 보인다(감싼 줄에 `group` 이 있어야 한다). 터치 화면에서는 늘 보인다 */
  hoverOnly?: boolean;
  className?: string;
  /** 메뉴가 열려 있는 동안 단추에 더하는 클래스(호버로만 보이는 단추를 붙잡아 둔다) */
  openClassName?: string;
}) {
  useLocale();
  const [open, setOpen] = React.useState(false);
  const { nav } = useBreakpoint();
  const add = (where: 'next' | 'last') => () => {
    setOpen(false);
    void addToQueue({ piece, track }, where);
  };
  const buttonClassName = cn(
    'size-8 shrink-0 items-center justify-center rounded-full',
    tone === 'onArt' ? 'bg-black/60 web:hover:bg-black/80' : 'web:hover:bg-surface-3',
    className
  );
  const dots = (
    <Icon
      as={MoreHorizontalIcon}
      size={16}
      className={tone === 'onArt' ? 'text-white' : 'text-foreground-muted'}
    />
  );
  if (Platform.OS !== 'web' || nav === 'tabs') {
    return (
      <Pressable
        onPress={() => queueActionSheet.open({ piece, track, title, subtitle, onDismiss })}
        accessibilityRole="button"
        accessibilityLabel={t('{title} 대기열에 넣기', { title })}
        hitSlop={8}
        className={cn(buttonClassName, 'active:bg-surface-3')}>
        {dots}
      </Pressable>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('{title} 대기열에 넣기', { title })}
            hitSlop={4}
            className={cn(
              buttonClassName,
              hoverOnly &&
                !open &&
                'opacity-0 web:focus-visible:opacity-100 web:group-hover:opacity-100',
              open && openClassName
            )}
          />
        }>
        {dots}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-52 gap-0 p-1.5">
        <MenuRow icon={ListStartIcon} label={t('menu::다음에 재생')} onPress={add('next')} />
        <MenuRow icon={ListEndIcon} label={t('대기열에 추가')} onPress={add('last')} />
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-9 flex-row items-center gap-2.5 rounded-md px-2.5 web:hover:bg-surface-2">
      <Icon as={icon} size={15} className="text-foreground-muted" />
      <Text numberOfLines={1} className="flex-1 text-body-sm text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
