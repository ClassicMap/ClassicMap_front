import { Slider } from '@/components/ui/slider';
import { useLocale } from '@/lib/i18n';
import * as React from 'react';
import { Platform } from 'react-native';

interface ScrubBarProps {
  /** 0~1 */
  value: number;
  /** 끄는 동안 계속 부른다 */
  onScrub?: (value: number) => void;
  /** 놓거나 누른 자리 */
  onCommit: (value: number) => void;
  label: string;
  /** 스크린리더·툴팁에 읽을 값 */
  valueText: (value: number) => string;
  /** 키보드 한 칸 */
  step?: number;
  disabled?: boolean;
  /** 끄는 동안 손잡이 위에 값 말풍선을 띄운다 */
  tooltip?: boolean;
  /** 채움 색 (CSS) */
  fill?: string;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** 누른 자리 그대로 가도록 값의 눈금은 촘촘하게 두고, 키보드 한 칸(step)은 따로 처리한다 */
const POINTER_STEP = 0.001;

/**
 * 재생 위치·볼륨 슬라이더. 누른 자리로 바로 가고 끌면 따라간다. 평소에는 얇은 줄이고 마우스를 올리거나
 * 끌거나 키보드로 포커스하면 줄이 굵어지고 손잡이가 보인다.
 * 포커스가 있을 때 ←→는 이 슬라이더만 움직인다 (화면의 연주자 전환 단축키와 겹치지 않게 전파를 끊는다).
 */
export function ScrubBar({
  value,
  onScrub,
  onCommit,
  label,
  valueText,
  step = 0.05,
  disabled = false,
  tooltip = false,
  fill,
}: ScrubBarProps) {
  useLocale();
  const [dragValue, setDragValue] = React.useState<number | null>(null);
  const shown = dragValue ?? clamp(value);

  const onThumbKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step;
    else if (event.key === 'Home' || event.key === 'End') event.stopPropagation();
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    // 눈금(POINTER_STEP)이 아니라 step 만큼 옮기려고 Base UI 의 화살표 처리를 건너뛴다
    (event as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
    onCommit(clamp(next));
  };

  return (
    <Slider
      value={shown}
      min={0}
      max={1}
      step={POINTER_STEP}
      disabled={disabled}
      aria-label={label}
      getAriaValueText={valueText}
      indicatorColor={fill}
      onValueChange={(next) => {
        setDragValue(next);
        onScrub?.(next);
      }}
      onValueCommitted={(next) => {
        setDragValue(null);
        onCommit(next);
      }}
      onThumbKeyDown={onThumbKeyDown}
      classNames={{
        track:
          'transition-[height] duration-100 group-hover/slider:h-1.5 group-data-[dragging]/slider:h-1.5 group-data-[disabled]/slider:h-1',
        thumb:
          'size-0 transition-[width,height] duration-100 group-hover/slider:size-3 group-data-[dragging]/slider:size-3 has-[:focus-visible]:size-3 group-data-[disabled]/slider:size-0',
      }}
      thumbChildren={
        tooltip && dragValue !== null && Platform.OS === 'web' ? (
          <div
            style={{
              position: 'absolute',
              bottom: 17,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '2px 6px',
              borderRadius: 6,
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--background))',
              font: '600 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
            {valueText(shown)}
          </div>
        ) : null
      }
    />
  );
}
