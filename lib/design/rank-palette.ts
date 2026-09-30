import type { ColorScheme } from './tokens';

/** 박스오피스 순위 색 (설계 문서 4.1.4). 1~3위 외에는 undefined를 돌려 토큰 색을 쓴다. */
const RANK_PALETTE = {
  1: { base: '#D4AF37', onDark: '#E8C766', onLight: '#8A6E12' },
  2: { base: '#B8B8BD', onDark: '#D2D2D6', onLight: '#6B6B70' },
  3: { base: '#C08442', onDark: '#D6A067', onLight: '#7A5426' },
} as const;

type PodiumRank = keyof typeof RANK_PALETTE;

function isPodiumRank(rank: number): rank is PodiumRank {
  return rank === 1 || rank === 2 || rank === 3;
}

export function getRankBase(rank: number): string | undefined {
  return isPodiumRank(rank) ? RANK_PALETTE[rank].base : undefined;
}

export function getRankForeground(rank: number, scheme: ColorScheme): string | undefined {
  if (!isPodiumRank(rank)) return undefined;
  return scheme === 'dark' ? RANK_PALETTE[rank].onDark : RANK_PALETTE[rank].onLight;
}
