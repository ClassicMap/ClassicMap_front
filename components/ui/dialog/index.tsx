import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { DialogContext, pressTo, useDialog } from './context';
import type {
  DialogContentProps,
  DialogProps,
  DialogSectionProps,
  DialogTriggerProps,
} from './types';

/**
 * 앱 구현. 운영 화면이 모두 RN Modal 로 떠 있어(뒤로 가기·시스템 모달 처리 포함) 같은 것을 감싼다.
 * 웹 구현은 index.web.tsx (Base UI Dialog: 포커스 가두기·복귀, Esc, 스크롤 잠금)
 */

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = React.useCallback(
    (next: boolean) => {
      setInner(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );
  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

function DialogTrigger({ render, children }: DialogTriggerProps) {
  const { setOpen } = useDialog();
  return pressTo(render, children, () => setOpen(true));
}

function DialogClose({ render, children }: DialogTriggerProps) {
  const { setOpen } = useDialog();
  return pressTo(render, children, () => setOpen(false));
}

function DialogContent({
  'aria-label': ariaLabel,
  closeLabel,
  fullscreen,
  className,
  style,
  children,
}: DialogContentProps) {
  const { open, setOpen } = useDialog();
  if (fullscreen) {
    return (
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <View
          accessibilityViewIsModal
          accessibilityLabel={ariaLabel}
          className={cn('flex-1', className)}
          style={style}>
          {children}
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <Pressable
          className="absolute inset-0"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={ariaLabel}
          className={cn(
            'w-full max-w-lg gap-4 rounded-lg border border-border bg-background p-6',
            className
          )}
          style={style}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function DialogHeader({ className, children }: DialogSectionProps) {
  return <View className={cn('gap-2', className)}>{children}</View>;
}

function DialogFooter({ className, children }: DialogSectionProps) {
  return <View className={cn('flex-row justify-end gap-2', className)}>{children}</View>;
}

function DialogTitle({ className, children }: DialogSectionProps) {
  return (
    <Text
      role="heading"
      className={cn('text-lg font-semibold leading-none text-foreground', className)}>
      {children}
    </Text>
  );
}

function DialogDescription({ className, children }: DialogSectionProps) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
