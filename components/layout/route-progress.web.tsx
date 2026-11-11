import { LAYER } from '@/lib/design/layers';
import { useLocale } from '@/lib/i18n';
import { useRouteSignature } from '@/lib/navigation/route-signature';
import { type Query, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

/** 이동 뒤 이만큼 지나도 첫 데이터를 받는 중이면 막대를 띄운다. 빨리 끝나는 이동에는 보이지 않는다 */
const SHOW_AFTER_MS = 120;
const STEP_MS = 300;
const START_AT = 0.12;
const CREEP_LIMIT = 0.9;
const COMPLETE_MS = 200;
const FADE_MS = 150;
/** 이보다 오래 걸리면 끝난 것으로 보고 거둔다 */
const GIVE_UP_MS = 10_000;
const EASE_SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** 아직 데이터가 하나도 없는 쿼리를 받는 중 = 화면이 스켈레톤으로 기다리는 중 */
function isFirstLoad(query: Query): boolean {
  return query.state.status === 'pending' && query.state.fetchStatus === 'fetching';
}

/**
 * 화면을 옮긴 뒤 새 화면의 첫 데이터를 받는 동안 위쪽에 2px 브랜드색 막대를 띄운다 (공모전헌터 RouteProgress).
 * 10% 남짓에서 시작해 들쭉날쭉 조금씩 자라고 스스로는 다 차지 않는다. 받기가 끝나면 끝까지 채우며 사라진다.
 * 구간·필터처럼 화면 안에서만 바뀌는 값에는 뜨지 않는다 (route-signature).
 * 움직임 줄이기면 자라지 않고 꽉 찬 막대만 보였다 사라진다.
 */
export function RouteProgress({ placement }: { placement: 'panel' | 'viewport' }) {
  useLocale();
  const signature = useRouteSignature();
  const queryClient = useQueryClient();
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const firstSignature = React.useRef(signature);
  // 연달아 옮기면 보이던 막대를 처음부터 다시 그리지 않고 이어서 자란다
  const progress = React.useRef(0);
  const visible = React.useRef(false);
  const fadeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    if (signature === firstSignature.current) return;
    firstSignature.current = '';
    const bar = barRef.current;
    if (!bar) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cache = queryClient.getQueryCache();
    const loading = () => cache.findAll({ predicate: isFirstLoad }).length > 0;

    let creep: ReturnType<typeof setInterval> | undefined;
    let done = false;

    const paint = (value: number, ms: number) => {
      progress.current = value;
      bar.style.transition = `transform ${ms}ms ${EASE_SETTLE}, opacity ${FADE_MS}ms linear`;
      bar.style.transform = `scaleX(${value})`;
    };
    const show = () => {
      // 앞 이동의 막대가 사라지는 중이면 거두지 않고 처음부터 다시 그린다
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
        fadeTimer.current = undefined;
        visible.current = false;
      }
      if (!visible.current) {
        visible.current = true;
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(0)';
        bar.style.opacity = '1';
        // 처음 값에서 다시 시작하도록 스타일을 한 번 적용한다
        void bar.offsetWidth;
        progress.current = 0;
      }
      if (reduced) {
        paint(1, 0);
        return;
      }
      paint(Math.max(progress.current, START_AT), STEP_MS);
      creep = setInterval(() => {
        const left = CREEP_LIMIT - progress.current;
        paint(progress.current + left * (0.05 + Math.random() * 0.12), STEP_MS);
      }, STEP_MS);
    };
    const complete = () => {
      if (done) return;
      done = true;
      if (creep) clearInterval(creep);
      if (!visible.current) return;
      paint(1, reduced ? 0 : COMPLETE_MS);
      fadeTimer.current = setTimeout(
        () => {
          fadeTimer.current = undefined;
          bar.style.opacity = '0';
          visible.current = false;
          progress.current = 0;
        },
        reduced ? 0 : COMPLETE_MS - FADE_MS / 2
      );
    };

    const showTimer = setTimeout(() => {
      if (loading()) show();
      else complete();
    }, SHOW_AFTER_MS);
    const giveUp = setTimeout(complete, GIVE_UP_MS);
    const unsubscribe = cache.subscribe(() => {
      if (visible.current && !done && !loading()) complete();
    });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(giveUp);
      unsubscribe();
      // 자라는 중이던 막대는 다음 이동이 이어받는다. 사라지는 중이면 마저 사라지게 둔다
      if (creep) clearInterval(creep);
    };
  }, [signature, queryClient]);

  return (
    <div
      ref={barRef}
      aria-hidden
      style={{
        position: placement === 'panel' ? 'absolute' : 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'hsl(var(--primary))',
        transformOrigin: '0 50%',
        transform: 'scaleX(0)',
        opacity: 0,
        zIndex: LAYER.floating,
        pointerEvents: 'none',
        // 화면 전환 스냅숏에 섞이지 않고 위에 그대로 남는다
        viewTransitionName: 'cm-route-progress',
      }}
    />
  );
}
