import { renderPressable } from '@/components/ui/lib/render-pressable';
import { cn } from '@/lib/utils';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as React from 'react';

import type {
  TooltipContentProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipTriggerProps,
} from './types';

/** 웹 구현(Base UI). 마우스를 올리거나 키보드로 포커스하면 뜨고, Esc·누르기·벗어나기로 닫힌다 */

function TooltipProvider({ delay = 0, children }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delay={delay}>{children}</TooltipPrimitive.Provider>;
}

function Tooltip({ open, onOpenChange, disabled, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      open={open}
      disabled={disabled}
      onOpenChange={(next) => onOpenChange?.(next)}>
      {children}
    </TooltipPrimitive.Root>
  );
}

/** 바깥에서 끼워 넣는 props(`<Link asChild>` 의 href·onPress 등)는 요소로 넘긴다 */
function TooltipTrigger({
  render,
  children,
  ...rest
}: TooltipTriggerProps & Record<string, unknown>) {
  const element = React.cloneElement(render as React.ReactElement<Record<string, unknown>>, rest);
  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" render={renderPressable(element)}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

function TooltipContent({
  className,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  children,
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-overlay">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'pointer-events-none whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-sans text-xs font-semibold text-background',
            'transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none',
            className
          )}>
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
