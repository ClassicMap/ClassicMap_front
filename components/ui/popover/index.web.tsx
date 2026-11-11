import { renderPressable } from '@/components/ui/lib/render-pressable';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import type {
  PopoverContentProps,
  PopoverProps,
  PopoverSectionProps,
  PopoverTriggerProps,
} from './types';

/**
 * 웹 구현(Base UI). 앱 구현은 index.tsx (@rn-primitives). 두 파일은 같은 파트와 props 를 낸다.
 * 포털·포커스 이동과 복귀·Esc·바깥 누르기는 Base UI 가 맡는다.
 */

function Popover({ open, defaultOpen, onOpenChange, children }: PopoverProps) {
  return (
    <PopoverPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}>
      {children}
    </PopoverPrimitive.Root>
  );
}

function PopoverTrigger({ render, children, nativeButton = true }: PopoverTriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      nativeButton={nativeButton}
      render={renderPressable(render as React.ReactElement<Record<string, unknown>>)}>
      {children}
    </PopoverPrimitive.Trigger>
  );
}

function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  style,
  children,
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-overlay">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'flex w-72 origin-[var(--transform-origin)] cursor-auto flex-col rounded-md border border-border bg-popover p-4 shadow-md shadow-black/5 outline-none',
            'transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none',
            className
          )}
          style={StyleSheet.flatten(style) as React.CSSProperties | undefined}>
          <TextClassContext.Provider value="text-popover-foreground">
            {children}
          </TextClassContext.Provider>
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({ className, children }: PopoverSectionProps) {
  return (
    <div data-slot="popover-header" className={cn('flex flex-col gap-0.5', className)}>
      {children}
    </div>
  );
}

function PopoverTitle({ className, children }: PopoverSectionProps) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn('text-sm font-medium text-popover-foreground', className)}>
      {children}
    </PopoverPrimitive.Title>
  );
}

function PopoverDescription({ className, children }: PopoverSectionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </PopoverPrimitive.Description>
  );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
