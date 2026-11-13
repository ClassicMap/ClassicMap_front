import { msg, t } from '@/lib/i18n';
import type { ScreenCueUsage, ScreenTitleKind } from '@/types/models';

/** 표시만 해 둔 문구다. 그릴 때 t() 로 옮긴다 */
export const SCREEN_KIND_LABELS: Record<ScreenTitleKind, string> = {
  MOVIE: msg('kind::영화'),
  SERIES: msg('kind::드라마·시리즈'),
  ANIME: msg('kind::애니'),
};

/** 좁은 칸(포스터 아래, 띠)에 쓰는 짧은 이름 */
export const SCREEN_KIND_SHORT_LABELS: Record<ScreenTitleKind, string> = {
  MOVIE: msg('kind::영화'),
  SERIES: msg('kind::드라마'),
  ANIME: msg('kind::애니'),
};

export const SCREEN_USAGE_LABELS: Record<ScreenCueUsage, string> = {
  SCORE: msg('배경음악'),
  SOURCE: msg('화면 속 음악'),
  PERFORMED: msg('인물이 연주'),
  TITLES: msg('오프닝·엔딩'),
};

/** "S1E3" → "3화", "S2E10" → "시즌 2 · 10화", "E24" → "24화". 모양이 다르면 그대로 */
export function episodeText(label: string | null): string | null {
  if (!label) return null;
  const seasonal = label.match(/^S(\d+)E(\d+)$/);
  if (seasonal) {
    const [, season, episode] = seasonal;
    return Number(season) === 1
      ? t('{n}화', { n: Number(episode) })
      : t('시즌 {season} · {n}화', { season: Number(season), n: Number(episode) });
  }
  const single = label.match(/^E(\d+)$/);
  if (single) return t('{n}화', { n: Number(single[1]) });
  return label;
}

/** 4320 → "1시간 12분쯤" */
export function approxTimeText(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0
      ? t('{hours}시간 {minutes}분쯤', { hours, minutes })
      : t('{hours}시간쯤', { hours });
  }
  return t('{minutes}분쯤', { minutes: Math.max(1, minutes) });
}

export function titleMeta(kind: ScreenTitleKind, year: number | null): string {
  return [t(SCREEN_KIND_LABELS[kind]), year ? String(year) : null].filter(Boolean).join(' · ');
}

/** 포스터 아래 한 줄: "드라마 · 2021" */
export function shortTitleMeta(kind: ScreenTitleKind, year: number | null): string {
  return [t(SCREEN_KIND_SHORT_LABELS[kind]), year ? String(year) : null]
    .filter(Boolean)
    .join(' · ');
}

export function youtubeClipUrl(videoId: string, startSec: number): string {
  const start = startSec > 0 ? `&t=${Math.floor(startSec)}s` : '';
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${start}`;
}
