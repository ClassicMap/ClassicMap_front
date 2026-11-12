import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, type PlaylistItem } from '@/lib/player/compare-player-store';
import { type ListPiece, listItems } from '@/lib/player/playlist';
import { cn } from '@/lib/utils';
import {
  ListEndIcon,
  ListStartIcon,
  MoreHorizontalIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable } from 'react-native';

/**
 * 곡 카드·목록 줄의 ⋯ 메뉴. 지금 듣는 것을 끊지 않고 이 곡을 대기열에 끼운다.
 * 「다음에 재생」은 지금 곡 바로 다음, 「대기열에 추가」는 직접 넣은 곡들 맨 뒤다. 둘 다 원래 목록보다 먼저 나온다
 */
export function QueueAddMenu({
  piece,
  title,
  tone = 'plain',
  className,
  openClassName,
}: {
  piece: ListPiece | PlaylistItem;
  /** 접근성 이름에 쓰는 곡 제목 */
  title: string;
  /** 그림 위에 얹을 때는 'onArt'(어두운 동그라미) */
  tone?: 'plain' | 'onArt';
  className?: string;
  /** 메뉴가 열려 있는 동안 단추에 더하는 클래스(호버로만 보이는 단추를 붙잡아 둔다) */
  openClassName?: string;
}) {
  useLocale();
  const [open, setOpen] = React.useState(false);
  const add = (where: 'next' | 'last') => () => {
    setOpen(false);
    const [item] = listItems([piece] as readonly ListPiece[] | readonly PlaylistItem[]);
    if (item) void comparePlayer.enqueue(item, where);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('{title} 대기열에 넣기', { title })}
            hitSlop={4}
            className={cn(
              'size-8 shrink-0 items-center justify-center rounded-full',
              tone === 'onArt' ? 'bg-black/60 web:hover:bg-black/80' : 'web:hover:bg-surface-3',
              className,
              open && openClassName
            )}
          />
        }>
        <Icon
          as={MoreHorizontalIcon}
          size={16}
          className={tone === 'onArt' ? 'text-white' : 'text-foreground-muted'}
        />
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
