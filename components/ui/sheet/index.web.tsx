import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OVERLAY_CLASS } from '@/components/ui/dialog/overlay';
import type { SheetContentProps } from '@/components/ui/dialog/types';
import { cn } from '@/lib/utils';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as React from 'react';
import { StyleSheet } from 'react-native';

/**
 * 가장자리에서 올라오는 패널. 웹 구현(Base UI Dialog 를 가장자리에 붙인 것. shadcn Base UI 판 sheet 와 같은 방식).
 * 앱 구현은 index.tsx. 여닫기·제목 파트는 dialog 와 같다.
 */

function SheetContent({
  side = 'bottom',
  'aria-label': ariaLabel,
  className,
  style,
  children,
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-overlay"
        className={cn(OVERLAY_CLASS, 'bg-black/40')}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        aria-label={ariaLabel}
        className={cn(
          'fixed z-overlay flex flex-col overflow-hidden bg-surface-1 outline-none transition-transform duration-200 motion-reduce:transition-none',
          side === 'bottom' &&
            'inset-x-0 bottom-0 rounded-t-2xl data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-3/4 max-w-sm data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full',
          className
        )}
        style={StyleSheet.flatten(style) as React.CSSProperties | undefined}>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
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
