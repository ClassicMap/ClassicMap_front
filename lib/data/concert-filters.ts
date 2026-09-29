import type { Concert } from '@/lib/types/models';

/**
 * 공연 탭 필터. 주소 파라미터가 곧 상태이고, 백엔드 `/concerts/search` 파라미터로 옮긴다.
 * 백엔드가 모르는 조건(배포 전 from·to·visit·festival)을 무시해도 결과가 맞도록
 * 받은 목록을 {@link matchesConcertFilter}로 한 번 더 거른다.
 */

export const CONCERT_GENRES = [
  { key: 'classic', label: '클래식', value: '서양음악(클래식)' },
  { key: 'gugak', label: '국악', value: '한국음악(국악)' },
  { key: 'musical', label: '뮤지컬', value: '뮤지컬' },
  { key: 'all', label: '모든 장르', value: undefined },
] as const;

export type ConcertGenreKey = (typeof CONCERT_GENRES)[number]['key'];

export const CONCERT_PERIODS = [
  { key: 'all', label: '모든 날짜' },
  { key: 'today', label: '오늘' },
  { key: 'weekend', label: '이번 주말' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'next-month', label: '다음 달' },
] as const;

export type ConcertPeriodKey = (typeof CONCERT_PERIODS)[number]['key'];

export interface ConcertFilter {
  genre: ConcertGenreKey;
  period: ConcertPeriodKey;
  visit: boolean;
  festival: boolean;
  /** `/concerts/areas`의 정식 명칭. 없으면 전국 */
  area?: string;
  q: string;
}

export const DEFAULT_CONCERT_FILTER: ConcertFilter = {
  genre: 'classic',
  period: 'all',
  visit: false,
  festival: false,
  area: undefined,
  q: '',
};

export interface ConcertFilterParams {
  genre?: string;
  period?: string;
  visit?: string;
  festival?: string;
  area?: string;
  q?: string;
}

function isGenreKey(value: string | undefined): value is ConcertGenreKey {
  return CONCERT_GENRES.some((genre) => genre.key === value);
}

function isPeriodKey(value: string | undefined): value is ConcertPeriodKey {
  return CONCERT_PERIODS.some((period) => period.key === value);
}

export function parseConcertFilter(params: ConcertFilterParams): ConcertFilter {
  return {
    genre: isGenreKey(params.genre) ? params.genre : DEFAULT_CONCERT_FILTER.genre,
    period: isPeriodKey(params.period) ? params.period : DEFAULT_CONCERT_FILTER.period,
    visit: params.visit === '1',
    festival: params.festival === '1',
    area: params.area || undefined,
    q: params.q ?? '',
  };
}

/** 기본값은 주소에서 뺀다 (`undefined`면 setParams가 지운다) */
export function toConcertFilterParams(filter: ConcertFilter): Record<keyof ConcertFilterParams, string | undefined> {
  return {
    genre: filter.genre === DEFAULT_CONCERT_FILTER.genre ? undefined : filter.genre,
    period: filter.period === DEFAULT_CONCERT_FILTER.period ? undefined : filter.period,
    visit: filter.visit ? '1' : undefined,
    festival: filter.festival ? '1' : undefined,
    area: filter.area,
    q: filter.q.trim() ? filter.q : undefined,
  };
}

/** 지역·검색어를 뺀, 필터 바에서 기본값과 다른 조건 수 */
export function countActiveFilters(filter: ConcertFilter): number {
  return (
    Number(filter.genre !== DEFAULT_CONCERT_FILTER.genre) +
    Number(filter.period !== DEFAULT_CONCERT_FILTER.period) +
    Number(filter.visit) +
    Number(filter.festival)
  );
}

export function genreValue(key: ConcertGenreKey): string | undefined {
  return CONCERT_GENRES.find((genre) => genre.key === key)?.value;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** 로컬 날짜를 `YYYY-MM-DD`로 (toISOString은 UTC라 한국 새벽에 하루 밀린다) */
export function toDayString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface DayRange {
  from: string;
  to?: string;
}

/** 기간 필터를 날짜 범위로. 항상 오늘 이후만 본다. 한 주는 월요일에 시작해 일요일에 끝난다. */
export function periodRange(period: ConcertPeriodKey, now: Date = new Date()): DayRange {
  const today = startOfDay(now);
  const weekday = today.getDay(); // 0 일요일
  const daysToSunday = (7 - weekday) % 7;
  switch (period) {
    case 'all':
      return { from: toDayString(today) };
    case 'today':
      return { from: toDayString(today), to: toDayString(today) };
    case 'weekend': {
      const sunday = addDays(today, daysToSunday);
      const saturday = addDays(sunday, -1);
      return { from: toDayString(saturday < today ? today : saturday), to: toDayString(sunday) };
    }
    case 'week':
      return { from: toDayString(today), to: toDayString(addDays(today, daysToSunday)) };
    case 'month':
      return {
        from: toDayString(today),
        to: toDayString(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case 'next-month':
      return {
        from: toDayString(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
        to: toDayString(new Date(today.getFullYear(), today.getMonth() + 2, 0)),
      };
  }
}

/** 공연이 범위 안에 하루라도 열리는지. 날짜 문자열은 `YYYY-MM-DD`라 사전순 비교가 곧 날짜 비교다 */
export function overlapsRange(concert: Pick<Concert, 'startDate' | 'endDate'>, range: DayRange): boolean {
  const start = concert.startDate.slice(0, 10);
  const end = (concert.endDate || concert.startDate).slice(0, 10);
  if (end < range.from) return false;
  if (range.to && start > range.to) return false;
  return true;
}

export function matchesConcertFilter(concert: Concert, filter: ConcertFilter, range: DayRange): boolean {
  if (!overlapsRange(concert, range)) return false;
  const genre = genreValue(filter.genre);
  if (genre && concert.genre && concert.genre !== genre) return false;
  if (filter.area && concert.area && concert.area !== filter.area) return false;
  if (filter.visit && concert.isVisit !== true) return false;
  if (filter.festival && concert.isFestival !== true) return false;
  return true;
}

/** 찜한 아티스트 이름으로 출연진을 찾을 때, 너무 짧은 이름은 엉뚱한 공연이 걸려 뺀다 */
export function isSearchableArtistName(name: string): boolean {
  return name.replace(/\s+/g, '').length >= 3;
}
