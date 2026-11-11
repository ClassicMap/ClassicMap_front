import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

import { SHELL } from '@/lib/layout/shell-layout';

/**
 * 데스크톱 웹 셸의 영역 (docs/frontend-structure.md 6절).
 *
 *   Shell                 화면 높이에 고정. 세로로 [ShellBody | ShellFooter]
 *   ├ ShellBody           가로로 [사이드바 | ShellMain | ShellAside]
 *   │  ├ (Sidebar)
 *   │  ├ ShellMain        상단바 + 본문. 본문만 스크롤한다
 *   │  └ ShellAside       오른쪽 패널(대기열). 열면 본문을 밀어낸다
 *   └ ShellFooter         하단 재생바. 화면 폭 전체
 *
 * 영역은 모두 같은 흐름에 놓여 서로 겹치지 않는다(z-index 를 쓰지 않는다).
 * 크기는 lib/layout/shell-layout.ts 한곳에서 정한다.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="h-full flex-1 bg-background"
      style={{ height: '100vh', gap: SHELL.gap, padding: SHELL.gap } as object}>
      {children}
    </View>
  );
}

function ShellBody({ children }: { children: React.ReactNode }) {
  return (
    <View className="min-h-0 flex-1 flex-row" style={{ gap: SHELL.gap }}>
      {children}
    </View>
  );
}

function ShellMain({ children }: { children: React.ReactNode }) {
  return (
    <View
      role="main"
      className="min-w-0 flex-1 overflow-hidden bg-surface-1"
      style={{ borderRadius: SHELL.radius }}>
      {children}
    </View>
  );
}

/** 닫힌 뒤에도 잠깐(나가는 애니메이션 동안) 그려 둔다 */
function useLingering(value: boolean, ms: number): boolean {
  const [lingering, setLingering] = React.useState(value);
  React.useEffect(() => {
    if (value) {
      setLingering(true);
      return;
    }
    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return value || lingering;
}

/** 나가는 애니메이션 길이 (global.css 의 cm-dock) */
const ASIDE_LEAVE_MS = 320;

/**
 * 오른쪽 패널 자리. 열면 폭이 늘며 본문을 밀어내고, 닫으면 줄며 사라진다.
 * 행의 간격을 음수 여백으로 지워 닫혀 있을 때 본문 폭이 그대로다
 */
function ShellAside({
  open,
  label,
  children,
}: {
  open: boolean;
  /** 스크린리더가 읽는 영역 이름 */
  label: string;
  children: React.ReactNode;
}) {
  const mounted = useLingering(open, ASIDE_LEAVE_MS);
  return (
    <View
      role="complementary"
      aria-label={label}
      aria-hidden={!open}
      className="cm-dock shrink-0 overflow-hidden"
      style={{ width: open ? SHELL.queueWidth + SHELL.gap : 0, marginLeft: -SHELL.gap }}>
      {mounted ? (
        <View
          className={cn(
            'cm-dock-inner h-full overflow-hidden bg-surface-1',
            !open && 'cm-dock-closing'
          )}
          style={{
            width: SHELL.queueWidth,
            marginLeft: SHELL.gap,
            borderRadius: SHELL.radius,
            pointerEvents: open ? 'auto' : 'none',
          }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

/** 하단 재생바 자리. 보일 때만 자리를 차지한다(안 보일 때 간격이 남지 않게) */
function ShellFooter({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  useLocale();
  if (!visible) return null;
  return (
    <View role="region" aria-label={t('재생 바')} style={{ height: SHELL.playerBarHeight }}>
      {children}
    </View>
  );
}

export { Shell, ShellAside, ShellBody, ShellFooter, ShellMain };
