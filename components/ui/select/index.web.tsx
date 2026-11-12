import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react-native';
import * as React from 'react';

import type {
  SelectContentProps,
  SelectItemProps,
  SelectProps,
  SelectSectionProps,
  SelectTriggerProps,
  SelectValueProps,
} from './types';

/**
 * 웹 구현(Base UI). 화살표·Home·End·글자 입력으로 고르고 Enter 로 정한다. Esc 로 닫히면 포커스가 트리거로 돌아간다.
 * 앱 구현은 index.tsx (@rn-primitives)
 */

function Select({ value, defaultValue, onValueChange, items, disabled, children }: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange?.(next);
      }}
      items={items as SelectProps['items'] as { value: string; label: string }[]}
      disabled={disabled}>
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectTrigger({
  'aria-label': ariaLabel,
  size = 'default',
  className,
  children,
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 w-fit cursor-default select-none items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground outline-none transition-[color,box-shadow]',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=sm]:h-8',
        className
      )}>
      {children}
      <SelectPrimitive.Icon className="pointer-events-none flex">
        <Icon as={ChevronDownIcon} aria-hidden className="size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({ placeholder, className }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn('flex-1 text-left data-[placeholder]:text-muted-foreground', className)}
    />
  );
}

function SelectContent({
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  className,
  children,
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="z-overlay">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'max-h-[var(--available-height)] min-w-[max(8rem,var(--anchor-width))] origin-[var(--transform-origin)] overflow-y-auto rounded-md border border-border bg-popover p-1 font-sans text-popover-foreground shadow-md shadow-black/5 outline-none',
            'transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none',
            className
          )}>
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectGroup({ className, children }: SelectSectionProps) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={className}>
      {children}
    </SelectPrimitive.Group>
  );
}

function SelectLabel({ className, children }: SelectSectionProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}>
      {children}
    </SelectPrimitive.GroupLabel>
  );
}

function SelectItem({ value, label, disabled, className }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      value={value}
      label={label}
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50',
        className
      )}>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <Icon as={CheckIcon} className="size-4 text-muted-foreground" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
