import { useRouteSignature } from '@/lib/navigation/route-signature';
import { isRouteTransitionRunning } from '@/lib/navigation/view-transition';
import * as React from 'react';
import { View } from 'react-native';

const ENTER_MS = 220;
const EASE_SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * 데스크톱 셸의 본문 자리. 화면 전환(view-transition.web)에서 이 자리만 'cm-page' 로 따로 찍혀
 * 사이드바·상단바·플레이바는 가만히 있고 본문만 바뀐다.
 * 전환으로 감싸지 못한 이동(브라우저 뒤로·앞으로, 전환을 지원하지 않는 브라우저)은
 * 새 화면이 8px 아래에서 살짝 올라오며 나타나게 한다.
 */
export function PageContainer({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<View>(null);
  const signature = useRouteSignature();
  const previous = React.useRef(signature);

  React.useEffect(() => {
    // 웹에서 View 의 ref 는 DOM 요소다. 이름표는 global.css 의 [data-cm-page] 가 쓴다
    const element = ref.current as unknown as HTMLElement | null;
    if (element) element.dataset.cmPage = '';
  }, []);

  React.useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    // 전환 안에서 바뀐 화면이면 전환이 이미 움직임을 맡았다
    if (isRouteTransitionRunning()) return;
    const element = ref.current as unknown as HTMLElement | null;
    if (!element || typeof element.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: ENTER_MS, easing: EASE_SETTLE }
    );
  }, [signature]);

  return (
    <View ref={ref} className="min-h-0 flex-1">
      {children}
    </View>
  );
}
