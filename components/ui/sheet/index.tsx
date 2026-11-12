import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDialog } from '@/components/ui/dialog/context';
import type { SheetContentProps } from '@/components/ui/dialog/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

/**
 * 가장자리에서 올라오는 패널. 앱 구현(RN Modal). 웹 구현은 index.web.tsx (Base UI Dialog).
 * 여닫기·제목 파트는 dialog 와 같다.
 */

function SheetContent({
  side = 'bottom',
  'aria-label': ariaLabel,
  closeLabel,
  className,
  style,
  children,
}: SheetContentProps) {
  const { open, setOpen } = useDialog();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View className={cn('flex-1 bg-black/40', side === 'bottom' ? 'justify-end' : 'flex-row')}>
        <Pressable
          className="flex-1"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={ariaLabel}
          className={cn(
            'overflow-hidden bg-surface-1',
            side === 'bottom' ? 'rounded-t-2xl' : 'h-full w-3/4 max-w-sm',
            className
          )}
          style={style}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export {
  Dialog as Sheet,
  DialogClose as SheetClose,
  SheetContent,
  DialogDescription as SheetDescription,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
  DialogTrigger as SheetTrigger,
};
