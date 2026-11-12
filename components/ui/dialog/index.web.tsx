import { renderPressable } from '@/components/ui/lib/render-pressable';
import { cn } from '@/lib/utils';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { OVERLAY_CLASS } from './overlay';
import type {
  DialogContentProps,
  DialogProps,
  DialogSectionProps,
  DialogTriggerProps,
} from './types';

/**
 * 웹 구현(Base UI Dialog). 열리면 포커스를 안으로 옮겨 가두고, Esc·바깥 누르기로 닫히며, 닫히면 포커스가 연 단추로 돌아간다.
 * 앱 구현은 index.tsx (RN Modal)
 */

function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}>
      {children}
    </DialogPrimitive.Root>
  );
}

function DialogTrigger({ render, children }: DialogTriggerProps) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={renderPressable(render as React.ReactElement<Record<string, unknown>>)}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

function DialogClose({ render, children }: DialogTriggerProps) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={renderPressable(render as React.ReactElement<Record<string, unknown>>)}>
      {children}
    </DialogPrimitive.Close>
  );
}

function DialogContent({
  'aria-label': ariaLabel,
  className,
  style,
  children,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={OVERLAY_CLASS} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        aria-label={ariaLabel}
        className={cn(
          'fixed left-1/2 top-1/2 z-overlay flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border border-border bg-background p-6 outline-none sm:max-w-lg',
          'transition-[transform,opacity] duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none',
          className
        )}
        style={StyleSheet.flatten(style) as React.CSSProperties | undefined}>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, children }: DialogSectionProps) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)}>
      {children}
    </div>
  );
}

function DialogFooter({ className, children }: DialogSectionProps) {
  return (
    <div data-slot="dialog-footer" className={cn('flex flex-row justify-end gap-2', className)}>
      {children}
    </div>
  );
}

function DialogTitle({ className, children }: DialogSectionProps) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-sans text-lg font-semibold leading-none text-foreground', className)}>
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({ className, children }: DialogSectionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('font-sans text-sm text-muted-foreground', className)}>
      {children}
    </DialogPrimitive.Description>
  );
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
