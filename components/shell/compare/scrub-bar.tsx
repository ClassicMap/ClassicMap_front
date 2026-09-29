import * as React from 'react';

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
  height?: number;
}

const TRACK = 'hsl(var(--surface-3))';
const FOREGROUND = 'hsl(var(--foreground))';

/**
 * 웹 전용 슬라이더(재생 위치·볼륨). 누른 자리로 바로 가고 끌면 따라간다.
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
  fill = FOREGROUND,
  height = 4,
}: ScrubBarProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [dragValue, setDragValue] = React.useState<number | null>(null);
  const [hover, setHover] = React.useState(false);
  const shown = dragValue ?? Math.max(0, Math.min(1, value));

  const valueAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    const next = valueAt(event.clientX);
    setDragValue(next);
    onScrub?.(next);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragValue === null) return;
    const next = valueAt(event.clientX);
    setDragValue(next);
    onScrub?.(next);
  };

  const finish = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragValue === null) return;
    const next = valueAt(event.clientX);
    setDragValue(null);
    onCommit(next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onCommit(Math.max(0, Math.min(1, next)));
  };

  const active = dragValue !== null || hover;
  const thumb = active && !disabled ? 12 : 0;

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-valuetext={valueText(shown)}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => setDragValue(null)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: 16,
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'none',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
      }}>
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          width: '100%',
          height: active ? height + 2 : height,
          borderRadius: 999,
          background: TRACK,
          transition: 'height 120ms ease',
        }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${shown * 100}%`,
            borderRadius: 999,
            background: fill,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${shown * 100}%`,
            width: thumb,
            height: thumb,
            marginLeft: -thumb / 2,
            marginTop: -thumb / 2,
            borderRadius: 999,
            background: FOREGROUND,
            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
            transition: 'width 120ms ease, height 120ms ease, margin 120ms ease',
          }}
        />
        {tooltip && dragValue !== null ? (
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: `${shown * 100}%`,
              transform: 'translateX(-50%)',
              padding: '2px 6px',
              borderRadius: 6,
              background: FOREGROUND,
              color: 'hsl(var(--background))',
              font: '600 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
            {valueText(shown)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
