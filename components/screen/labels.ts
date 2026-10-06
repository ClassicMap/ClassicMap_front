import type { ScreenCueUsage, ScreenTitleKind } from '@/lib/types/models';

export const SCREEN_KIND_LABELS: Record<ScreenTitleKind, string> = {
  MOVIE: '영화',
  SERIES: '드라마·시리즈',
  ANIME: '애니',
};

/** 좁은 칸(포스터 아래, 띠)에 쓰는 짧은 이름 */
export const SCREEN_KIND_SHORT_LABELS: Record<ScreenTitleKind, string> = {
  MOVIE: '영화',
  SERIES: '드라마',
  ANIME: '애니',
};

export const SCREEN_USAGE_LABELS: Record<ScreenCueUsage, string> = {
  SCORE: '배경음악',
  SOURCE: '화면 속 음악',
  PERFORMED: '인물이 연주',
  TITLES: '오프닝·엔딩',
};

/** "S1E3" → "3화", "S2E10" → "시즌 2 · 10화", "E24" → "24화". 모양이 다르면 그대로 */
export function episodeText(label: string | null): string | null {
  if (!label) return null;
  const seasonal = label.match(/^S(\d+)E(\d+)$/);
  if (seasonal) {
    const [, season, episode] = seasonal;
    return Number(season) === 1 ? `${Number(episode)}화` : `시즌 ${Number(season)} · ${Number(episode)}화`;
  }
  const single = label.match(/^E(\d+)$/);
  if (single) return `${Number(single[1])}화`;
  return label;
}

/** 4320 → "1시간 12분쯤" */
export function approxTimeText(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분쯤` : `${hours}시간쯤`;
  return `${Math.max(1, minutes)}분쯤`;
}

export function titleMeta(kind: ScreenTitleKind, year: number | null): string {
  return [SCREEN_KIND_LABELS[kind], year ? String(year) : null].filter(Boolean).join(' · ');
}

/** 포스터 아래 한 줄: "드라마 · 2021" */
export function shortTitleMeta(kind: ScreenTitleKind, year: number | null): string {
  return [SCREEN_KIND_SHORT_LABELS[kind], year ? String(year) : null].filter(Boolean).join(' · ');
}

export function youtubeClipUrl(videoId: string, startSec: number): string {
  const start = startSec > 0 ? `&t=${Math.floor(startSec)}s` : '';
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${start}`;
}
