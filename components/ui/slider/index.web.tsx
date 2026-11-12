import { cn } from '@/lib/utils';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as React from 'react';

import type { SliderProps } from './types';

/**
 * 웹 구현(Base UI). 누른 자리로 바로 가고 끌면 따라간다. 손잡이 안의 `<input type="range">` 가 포커스를 받아
 * ←→(step), Shift+←→·PageUp/PageDown(largeStep), Home/End 를 처리하고 스크린리더에 값을 알린다.
 * 앱 구현은 index.tsx
 */
function Slider({
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  largeStep,
  disabled = false,
  'aria-label': ariaLabel,
  getAriaValueText,
  className,
  classNames,
  indicatorColor,
  thumbChildren,
  onThumbKeyDown,
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      disabled={disabled}
      onValueChange={(next) => onValueChange?.(next as number)}
      onValueCommitted={(next) => onValueCommitted?.(next as number)}
      className={cn('relative min-w-0 flex-1 data-[disabled]:opacity-50', className)}>
      <SliderPrimitive.Control
        className={cn(
          'group/slider flex h-4 w-full cursor-pointer touch-none select-none items-center data-[disabled]:cursor-default',
          classNames?.control
        )}>
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn('relative h-1 w-full rounded-full bg-surface-3', classNames?.track)}>
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn('rounded-full bg-foreground', classNames?.indicator)}
            style={indicatorColor ? { backgroundColor: indicatorColor } : undefined}
          />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            aria-label={ariaLabel}
            getAriaValueText={
              getAriaValueText ? (_formatted, current) => getAriaValueText(current) : undefined
            }
            onKeyDown={onThumbKeyDown}
            className={cn(
              'size-3 rounded-full bg-foreground shadow-[0_1px_3px_rgba(0,0,0,0.35)] outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              classNames?.thumb
            )}>
            {thumbChildren}
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
