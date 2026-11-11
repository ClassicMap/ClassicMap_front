import { ScrubBar } from '@/features/player/components/scrub-bar';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clipClock, clipDurationMs, primaryCredit } from '@/lib/data/comparison';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import type { ComparisonPerformance } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { MinimizeIcon, PauseIcon, PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 전체 화면에서 이만큼 아무것도 안 하면(재생 중일 때) 조작부와 커서를 숨긴다 */
const FULLSCREEN_IDLE_MS = 2500;
const FULLSCREEN_FADE = 'opacity 320ms ease';
const WAKE_EVENTS = ['mousemove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
/** 한 번 누름(재생·일시정지)을 두 번 누름(나가기)과 가르려고 이만큼 기다린다 */
const DOUBLE_CLICK_MS = 250;

/** 전체 화면 자리(셸이 그린 [data-cm-fsroot]). 화면을 덮는 방식이면 document.fullscreenElement 가 비어 있다 */
function fullscreenRoot(): Element | null {
  return document.fullscreenElement ?? document.querySelector('[data-cm-fsroot]');
}

/**
 * 전체 화면 조작부가 보일지. 움직이거나 누르면 보이고, 재생 중에 가만히 두면 서서히 숨는다.
 * 멈춰 있거나 조작부 위에 마우스가 있으면 계속 보인다. 숨으면 커서도 숨긴다.
 * 손가락(touch)이면 화면을 누를 때마다 보였다 숨었다 하고, 조작부를 만지면 숨는 시간을 다시 센다
 */
function useFullscreenChrome(playing: boolean, touch: boolean) {
  const [awake, setAwake] = React.useState(true);
  const [hovering, setHovering] = React.useState(false);
  // 처음 그릴 때 서서히 나타나게 한 프레임 뒤에 켠다
  const [entered, setEntered] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wake = React.useCallback(() => {
    setAwake(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAwake(false), FULLSCREEN_IDLE_MS);
  }, []);
  const sleep = React.useCallback(() => {
    clearTimeout(timer.current);
    setAwake(false);
  }, []);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    wake();
    const events = touch ? [] : WAKE_EVENTS;
    for (const name of events) document.addEventListener(name, wake, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer.current);
      for (const name of events) document.removeEventListener(name, wake);
    };
  }, [touch, wake]);
  const visible = entered && (awake || !playing || hovering);
  React.useEffect(() => {
    const root = fullscreenRoot();
    if (!root) return;
    if (visible) root.removeAttribute('data-idle');
    else root.setAttribute('data-idle', '');
    return () => root.removeAttribute('data-idle');
  }, [visible]);
  return { visible, setHovering, wake, sleep };
}

interface FullscreenOverlayProps {
  performances: ComparisonPerformance[];
  active: ComparisonPerformance | null;
  sectorName: string | null;
  activeId: number | null;
  imageOf: (performance: ComparisonPerformance) => string | null;
  onPick: (performance: ComparisonPerformance) => void;
  onTogglePlay: () => void;
  playing: boolean;
  onExit: () => void;
  /**
   * 손가락으로 쓰는 좁은 화면: 영상을 누르면 조작부를 보였다 숨겼다 하고(재생은 버튼으로),
   * 연주자 칩은 한 줄로 옆으로 밀고, 키보드 안내는 뺀다. 노치·홈 막대 자리를 비운다
   */
  touch?: boolean;
}

/** 전체 화면에서 영상 위에 겹치는 조작부: 지금 연주 이름·연주자 바꾸기·재생·위치·나가기 */
export function FullscreenOverlay({
  performances,
  active,
  sectorName,
  activeId,
  imageOf,
  onPick,
  onTogglePlay,
  playing,
  onExit,
  touch = false,
}: FullscreenOverlayProps) {
  useLocale();
  const progress = useComparePlayer((state) => state.progress);
  const { visible, setHovering, wake, sleep } = useFullscreenChrome(playing, touch);
  const artist = active ? primaryCredit(active)?.artistName : null;
  const fade: React.CSSProperties = { opacity: visible ? 1 : 0, transition: FULLSCREEN_FADE };
  // 두 번 누를 때 앞의 한 번이 재생을 바꾸지 않게, 한 번 누름은 잠깐 기다렸다가 처리한다
  const clickTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(clickTimer.current), []);
  const side = touch ? 16 : 32;
  const safe = (edge: 'top' | 'bottom' | 'left' | 'right', base: number) =>
    touch ? `calc(${base}px + env(safe-area-inset-${edge}, 0px))` : `${base}px`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* 넓은 화면: 영상을 한 번 누르면 재생·일시정지, 두 번 누르면 나가기.
          손가락: 누르면 조작부를 보였다 숨겼다 한다 */}
      <div
        aria-hidden
        onClick={() => {
          if (touch) {
            if (visible) sleep();
            else wake();
            return;
          }
          clearTimeout(clickTimer.current);
          clickTimer.current = setTimeout(onTogglePlay, DOUBLE_CLICK_MS);
        }}
        onDoubleClick={() => {
          if (touch) return;
          clearTimeout(clickTimer.current);
          onExit();
        }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      />
      <div
        style={{
          ...fade,
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: safe('top', touch ? 16 : 24),
          paddingLeft: safe('left', side),
          paddingRight: safe('right', side),
          paddingBottom: touch ? 40 : 56,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
        {artist ? (
          <Text numberOfLines={1} className={cn('font-semibold text-white', touch ? 'text-body' : 'text-title-3')}>
            {artist}
          </Text>
        ) : null}
        {active ? (
          <Text numberOfLines={1} className="text-body-sm text-white/70">
            {[active.pieceTitle, sectorName].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </div>
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={touch ? wake : undefined}
        style={{
          ...fade,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: visible ? 'auto' : 'none',
          paddingTop: touch ? 32 : 48,
          paddingLeft: safe('left', side),
          paddingRight: safe('right', side),
          paddingBottom: safe('bottom', touch ? 16 : 24),
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
          display: 'flex',
          flexDirection: 'column',
          gap: touch ? 10 : 14,
        }}>
        <View className={cn('flex-row items-center', touch ? 'gap-2' : 'gap-3')}>
          <Pressable
            onPress={onTogglePlay}
            accessibilityLabel={playing ? t('일시정지') : t('재생')}
            className="size-11 items-center justify-center rounded-full bg-white">
            <Icon as={playing ? PauseIcon : PlayIcon} size={18} className="fill-black text-black" />
          </Pressable>
          <Text variant="mono" className="text-white/80">
            {clipClock(progress.current * 1000)}
          </Text>
          <ScrubBar
            value={progress.duration > 0 ? progress.current / progress.duration : 0}
            onCommit={(value) => comparePlayer.seek(value * progress.duration)}
            label={t('재생 위치')}
            valueText={(value) => clipClock(value * progress.duration * 1000)}
            disabled={progress.duration <= 0}
            tooltip={!touch}
            fill="#FFFFFF"
          />
          <Text variant="mono" className="text-white/80">
            {clipClock(progress.duration * 1000)}
          </Text>
          <Pressable
            onPress={onExit}
            accessibilityLabel={touch ? t('전체 화면 나가기') : t('전체 화면 나가기 (F)')}
            className="size-11 items-center justify-center rounded-full bg-white/15">
            <Icon as={MinimizeIcon} size={18} className="text-white" />
          </Pressable>
        </View>
        <div
          style={
            touch
              ? { display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }
              : { display: 'flex', flexWrap: 'wrap', gap: 8 }
          }>
          {performances.map((performance, index) => {
            const credit = primaryCredit(performance);
            const selected = performance.id === activeId;
            return (
              <Pressable
                key={performance.id}
                onPress={() => onPick(performance)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={cn(
                  'h-10 shrink-0 flex-row items-center gap-2 rounded-full pl-1 pr-3.5',
                  selected ? 'bg-primary' : 'bg-white/15'
                )}>
                <EntityThumb name={credit?.artistName ?? '?'} image={imageOf(performance)} shape="circle" size={32} />
                <Text className={cn('text-label font-semibold', selected ? 'text-primary-foreground' : 'text-white')}>
                  {credit?.artistName ?? t('연주 {n}', { n: index + 1 })}
                </Text>
                <Text className={cn('font-mono text-micro', selected ? 'text-primary-foreground/80' : 'text-white/60')}>
                  {clipClock(clipDurationMs(performance))}
                </Text>
              </Pressable>
            );
          })}
          {touch ? null : (
            <Text variant="caption" className="self-center pl-2 text-white/55">
              {t('←→ 연주자 · ⇧←→ 5초 · 스페이스 재생')}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
