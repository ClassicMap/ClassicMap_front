import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import type {
  PopoverContentProps,
  PopoverProps,
  PopoverSectionProps,
  PopoverTriggerProps,
} from './types';

/** 앱 구현(@rn-primitives). 웹 구현은 index.web.tsx (Base UI). 두 파일은 같은 파트와 props 를 낸다 */

const TriggerRefContext =
  React.createContext<React.RefObject<PopoverPrimitive.TriggerRef | null> | null>(null);

function Popover({ open, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const triggerRef = React.useRef<PopoverPrimitive.TriggerRef | null>(null);
  const opened = React.useRef(false);
  // @rn-primitives 는 열림을 안에서 갖는다. 바깥 값(open)이 바뀌면 트리거로 맞춘다
  React.useEffect(() => {
    const wanted = open ?? (opened.current || defaultOpen);
    if (wanted && !opened.current) triggerRef.current?.open();
    else if (!wanted && opened.current) triggerRef.current?.close();
  }, [open, defaultOpen]);
  return (
    <TriggerRefContext.Provider value={triggerRef}>
      <PopoverPrimitive.Root
        onOpenChange={(next) => {
          opened.current = next;
          onOpenChange?.(next);
        }}>
        {children}
      </PopoverPrimitive.Root>
    </TriggerRefContext.Provider>
  );
}

function PopoverTrigger({ render, children }: PopoverTriggerProps) {
  const triggerRef = React.useContext(TriggerRefContext);
  return (
    <PopoverPrimitive.Trigger ref={triggerRef} asChild>
      {children === undefined ? render : React.cloneElement(render, undefined, children)}
    </PopoverPrimitive.Trigger>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  portalHost,
  style,
  children,
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay style={StyleSheet.absoluteFill}>
          <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut}>
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                className={cn(
                  'z-overlay w-72 rounded-md border border-border bg-popover p-4 shadow-md shadow-black/5',
                  className
                )}
                style={StyleSheet.flatten(style)}>
                {children}
              </PopoverPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({ className, children }: PopoverSectionProps) {
  return <View className={cn('gap-0.5', className)}>{children}</View>;
}

function PopoverTitle({ className, children }: PopoverSectionProps) {
  return (
    <Text role="heading" className={cn('text-sm font-medium', className)}>
      {children}
    </Text>
  );
}

function PopoverDescription({ className, children }: PopoverSectionProps) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>;
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
