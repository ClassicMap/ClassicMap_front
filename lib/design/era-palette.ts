import type { ColorScheme } from './tokens';

/**
 * 시대 색. 데이터 카테고리 전용이라 버튼·보더·포커스 링 같은 UI 크롬에는 쓰지 않는다.
 * 사용처: 타임라인 밴드, 작곡가 아바타 링, 시대 필터 칩의 좌측 도트 (설계 문서 4.1.3).
 */
export interface EraColor {
  base: string;
  /** 다크 배경 위 텍스트·아이콘 */
  onDark: string;
  /** 라이트 배경 위 텍스트·아이콘 */
  onLight: string;
  /** 채움 배경 알파 (다크 / 라이트) */
  fillAlpha: { dark: number; light: number };
}

export const ERA_PALETTE: Record<string, EraColor> = {
  중세: { base: '#b45309', onDark: '#E0954A', onLight: '#8A3F07', fillAlpha: { dark: 0.14, light: 0.1 } },
  르네상스: { base: '#0f766e', onDark: '#3FB5AA', onLight: '#0B5A54', fillAlpha: { dark: 0.16, light: 0.1 } },
  바로크: { base: '#9333ea', onDark: '#B77BF0', onLight: '#7726BE', fillAlpha: { dark: 0.16, light: 0.1 } },
  고전주의: { base: '#3b82f6', onDark: '#7BAAF9', onLight: '#2A64C7', fillAlpha: { dark: 0.16, light: 0.1 } },
  낭만주의: { base: '#ec4899', onDark: '#F281BC', onLight: '#C22B75', fillAlpha: { dark: 0.16, light: 0.1 } },
  근현대: { base: '#22c55e', onDark: '#5FD98D', onLight: '#177F3C', fillAlpha: { dark: 0.16, light: 0.1 } },
};

/** 과도기 표기는 뒤 시대 색을 따른다 (기존 ERA_COLORS 동작 유지). */
const ERA_ALIASES: Record<string, string> = {
  '고전주의/낭만주의': '낭만주의',
};

export function getEraColor(period: string): EraColor | undefined {
  return ERA_PALETTE[ERA_ALIASES[period] ?? period];
}

/** 텍스트·아이콘용 색. 모르는 시대면 undefined. */
export function getEraForeground(period: string, scheme: ColorScheme): string | undefined {
  const color = getEraColor(period);
  if (!color) return undefined;
  return scheme === 'dark' ? color.onDark : color.onLight;
}

/** 채움 배경용 rgba. 모르는 시대면 undefined. */
export function getEraFill(period: string, scheme: ColorScheme): string | undefined {
  const color = getEraColor(period);
  if (!color) return undefined;
  const hex = color.base.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${color.fillAlpha[scheme]})`;
}

/** 기존 `ERA_COLORS`와 같은 모양 (시대명 → base 색). */
export const ERA_BASE_COLORS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ERA_PALETTE).map(([name, color]) => [name, color.base])),
  ...Object.fromEntries(
    Object.entries(ERA_ALIASES).map(([alias, target]) => [alias, ERA_PALETTE[target].base])
  ),
};
