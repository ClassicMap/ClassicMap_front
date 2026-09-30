/** 레이아웃 브레이크포인트 (설계 문서 6.2). 훅은 `hooks/use-breakpoint.ts`에 있다. */
export const BP = { sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export type LayoutKind = 'mobile' | 'tablet' | 'desktop' | 'wide';
export type Density = 'comfortable' | 'compact';

/** 셸이 쓰는 SideNav 모양. 데스크톱 미만은 하단 탭바. */
export type NavMode = 'tabs' | 'rail' | 'full';

export interface LayoutInfo {
  width: number;
  layout: LayoutKind;
  density: Density;
  nav: NavMode;
  /** ≥1536에서만 우측 인스펙터를 둔다. */
  hasInspector: boolean;
}

/**
 * 네이티브는 폭과 무관하게 모바일·태블릿 레이아웃만 쓴다.
 * 웹 static export 첫 렌더에서 폭이 0이면 데스크톱으로 가정하고 하이드레이션 뒤 보정한다.
 */
export function resolveLayout(rawWidth: number, isWeb: boolean): LayoutInfo {
  const width = isWeb && rawWidth === 0 ? BP.xl : rawWidth;

  let layout: LayoutKind;
  if (!isWeb || width < BP.lg) {
    layout = width < BP.md ? 'mobile' : 'tablet';
  } else {
    layout = width < BP['2xl'] ? 'desktop' : 'wide';
  }

  const isDesktop = layout === 'desktop' || layout === 'wide';
  let nav: NavMode = 'tabs';
  if (isDesktop) nav = width < BP.xl ? 'rail' : 'full';

  return {
    width,
    layout,
    density: isDesktop ? 'compact' : 'comfortable',
    nav,
    hasInspector: layout === 'wide',
  };
}
