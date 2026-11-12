import { Icon } from '@/components/ui/icon';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { KeyboardIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * 비교 화면의 키보드 단축키 안내(웹). 재생 바는 곡을 틀어야 뜨므로, 틀기 전에도 볼 수 있게 도구 줄에 둔다.
 * 여기 적는 키는 `ComparePieceView` 의 keydown 처리와 같아야 한다
 */
export function ShortcutHelp({ className }: { className?: string }) {
  useLocale();
  const [open, setOpen] = React.useState(false);
  const rows: readonly { keys: readonly string[]; label: string }[] = [
    { keys: ['Space'], label: t('재생·일시정지') },
    { keys: ['←', '→'], label: t('연주자 바꾸기') },
    { keys: ['⇧', '←', '→'], label: t('5초 앞뒤로') },
    { keys: ['T'], label: t('mode::크게 보기') },
    { keys: ['F'], label: t('전체 화면') },
    { keys: ['M'], label: t('음소거') },
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('키보드 단축키')}
            className={cn(
              'size-8 shrink-0 items-center justify-center rounded-full border border-border-strong web:hover:bg-surface-2',
              open && 'bg-surface-2',
              className
            )}
          />
        }>
        <Icon as={KeyboardIcon} size={15} className="text-foreground" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-60 gap-0 p-3">
        <Text variant="micro" className="mb-2 uppercase tracking-widest">
          {t('키보드 단축키')}
        </Text>
        {rows.map((row) => (
          <View key={row.label} className="h-8 flex-row items-center justify-between gap-3">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-body-sm text-foreground">
              {row.label}
            </Text>
            <View className="flex-row items-center gap-1">
              {row.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </View>
          </View>
        ))}
      </PopoverContent>
    </Popover>
  );
}
