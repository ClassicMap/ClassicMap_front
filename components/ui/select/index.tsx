import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@rn-primitives/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import type {
  SelectContentProps,
  SelectItemProps,
  SelectProps,
  SelectSectionProps,
  SelectTriggerProps,
  SelectValueProps,
} from './types';

/** 앱 구현(@rn-primitives). 웹 구현은 index.web.tsx (Base UI). 두 파일은 같은 파트와 props 를 낸다 */

function Select({ value, defaultValue, onValueChange, items, disabled, children }: SelectProps) {
  const option = (key: string | undefined) => items.find((item) => item.value === key);
  return (
    <SelectPrimitive.Root
      value={value === undefined ? undefined : option(value)}
      defaultValue={option(defaultValue)}
      onValueChange={(next) => {
        if (next) onValueChange?.(next.value);
      }}
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
      accessibilityLabel={ariaLabel}
      className={cn(
        'h-10 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2',
        size === 'sm' && 'h-8',
        className
      )}>
      <>{children}</>
      <Icon as={ChevronDownIcon} aria-hidden className="size-4 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      placeholder={placeholder}
      className={cn('text-sm text-foreground', !value && 'text-muted-foreground', className)}
    />
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function SelectContent({
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  className,
  portalHost,
  children,
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay style={StyleSheet.absoluteFill}>
          <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
            <TextClassContext.Provider value="text-popover-foreground">
              <SelectPrimitive.Content
                side={side}
                align={align}
                sideOffset={sideOffset}
                position="popper"
                className={cn(
                  'z-overlay min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md shadow-black/5',
                  className
                )}>
                <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

function SelectGroup({ className, children }: SelectSectionProps) {
  return <SelectPrimitive.Group className={className}>{children}</SelectPrimitive.Group>;
}

function SelectLabel({ className, children }: SelectSectionProps) {
  return (
    <SelectPrimitive.Label className={cn('px-2 py-2 text-xs text-muted-foreground', className)}>
      {children}
    </SelectPrimitive.Label>
  );
}

function SelectItem({ value, label, disabled, className }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      label={label}
      disabled={disabled}
      className={cn(
        'relative w-full flex-row items-center gap-2 rounded-sm py-2 pl-2 pr-8 active:bg-accent',
        disabled && 'opacity-50',
        className
      )}>
      <View className="absolute right-2 size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon as={CheckIcon} className="size-4 text-muted-foreground" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="text-sm text-foreground" />
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} />;
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
