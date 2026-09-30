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

/**
 * 편성. 백엔드 `instrument` 파라미터 코드와 같다.
 * 응답에 `instrumentation`이 없던 배포 전 백엔드에서는 제목 키워드로 화면에서 나눈다.
 */
export const CONCERT_INSTRUMENTS = [
  { key: 'piano', label: '피아노', hint: '독주·듀오', keywords: ['피아노', '피아니스트'] },
  {
    key: 'strings',
    label: '현악',
    hint: '바이올린·첼로·기타',
    keywords: ['바이올린', '비올라', '첼로', '현악', '기타', '하프', '바이올리니스트', '첼리스트', '콘트라베이스'],
  },
  {
    key: 'winds',
    label: '관악',
    hint: '플루트·클라리넷·호른',
    keywords: ['플루트', '오보에', '클라리넷', '바순', '호른', '트럼펫', '트롬본', '색소폰', '목관', '금관', '관악'],
  },
  {
    key: 'vocal',
    label: '성악',
    hint: '독창·가곡',
    keywords: ['소프라노', '메조', '테너', '바리톤', '베이스 ', '카운터테너', '가곡', '성악'],
  },
  { key: 'choir', label: '합창', hint: '합창단·콰이어', keywords: ['합창', '콰이어', '코랄'] },
  {
    key: 'orchestra',
    label: '오케스트라',
    hint: '교향악단·필하모닉',
    keywords: ['교향악단', '필하모닉', '심포니', '오케스트라', '관현악', '시향', '교향곡'],
  },
  {
    key: 'chamber',
    label: '실내악',
    hint: '트리오·콰르텟·앙상블',
    keywords: ['콰르텟', '사중주', '트리오', '삼중주', '오중주', '앙상블', '듀오', '실내악', '챔버'],
  },
  { key: 'opera', label: '오페라', hint: '전막·갈라', keywords: ['오페라'] },
  {
    key: 'crossover',
    label: '크로스오버',
    hint: '재즈·영화·게임 음악',
    keywords: ['크로스오버', '재즈', '영화음악', '게임', 'OST'],
  },
] as const;

export type ConcertInstrumentKey = (typeof CONCERT_INSTRUMENTS)[number]['key'];

export function isInstrumentKey(value: string | undefined): value is ConcertInstrumentKey {
  return CONCERT_INSTRUMENTS.some((instrument) => instrument.key === value);
}

export function instrumentLabel(key: ConcertInstrumentKey): string {
  return CONCERT_INSTRUMENTS.find((instrument) => instrument.key === key)?.label ?? key;
}

/** 제목에 든 낱말로 편성을 나눈다. 한 공연이 여러 편성에 들 수 있다 */
export function classifyInstrumentation(title: string): ConcertInstrumentKey[] {
  const text = `${title} `;
  return CONCERT_INSTRUMENTS.filter((instrument) =>
    instrument.keywords.some((keyword) => text.includes(keyword))
  ).map((instrument) => instrument.key);
}

/**
 * 공연의 편성. 새 백엔드는 `instrumentation`(쉼표 구분 코드, 분류 못 하면 null)을 주고,
 * 배포 전 백엔드는 필드 자체가 없어(undefined) 제목으로 나눈다.
 */
export function concertInstruments(concert: Pick<Concert, 'title' | 'instrumentation'>): ConcertInstrumentKey[] {
  if (concert.instrumentation === undefined) return classifyInstrumentation(concert.title);
  return (concert.instrumentation ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(isInstrumentKey);
}

/** 권역. 지역 선택 팝오버·시트에서 묶어 보여 주기만 하고, 필터 값은 여전히 시·도 하나다 */
export const AREA_REGIONS: { label: string; areas: string[] }[] = [
  { label: '수도권', areas: ['서울특별시', '경기도', '인천광역시'] },
  { label: '충청', areas: ['대전광역시', '세종특별자치시', '충청북도', '충청남도'] },
  { label: '경상', areas: ['부산광역시', '대구광역시', '울산광역시', '경상북도', '경상남도'] },
  { label: '전라', areas: ['광주광역시', '전북특별자치도', '전라남도', '전남광주통합특별시'] },
  { label: '강원·제주', areas: ['강원특별자치도', '제주특별자치도'] },
];

export interface ConcertFilter {
  genre: ConcertGenreKey;
  period: ConcertPeriodKey;
  visit: boolean;
  festival: boolean;
  /** `/concerts/areas`의 정식 명칭. 없으면 전국 */
  area?: string;
  instrument?: ConcertInstrumentKey;
  /** 아티스트 id */
  artist?: number;
  q: string;
}

export const DEFAULT_CONCERT_FILTER: ConcertFilter = {
  genre: 'classic',
  period: 'all',
  visit: false,
  festival: false,
  area: undefined,
  instrument: undefined,
  artist: undefined,
  q: '',
};

export interface ConcertFilterParams {
  genre?: string;
  period?: string;
  visit?: string;
  festival?: string;
  area?: string;
  instrument?: string;
  artist?: string;
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
    instrument: isInstrumentKey(params.instrument) ? params.instrument : undefined,
    artist: parseId(params.artist),
    q: params.q ?? '',
  };
}

function parseId(value: string | undefined): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** 기본값은 주소에서 뺀다 (`undefined`면 setParams가 지운다) */
export function toConcertFilterParams(filter: ConcertFilter): Record<keyof ConcertFilterParams, string | undefined> {
  return {
    genre: filter.genre === DEFAULT_CONCERT_FILTER.genre ? undefined : filter.genre,
    period: filter.period === DEFAULT_CONCERT_FILTER.period ? undefined : filter.period,
    visit: filter.visit ? '1' : undefined,
    festival: filter.festival ? '1' : undefined,
    area: filter.area,
    instrument: filter.instrument,
    artist: filter.artist ? String(filter.artist) : undefined,
    q: filter.q.trim() ? filter.q : undefined,
  };
}

/** 검색어를 뺀, 기본값과 다른 조건 수 (필터 버튼 배지·초기화 버튼) */
export function countActiveFilters(filter: ConcertFilter): number {
  return (
    Number(filter.genre !== DEFAULT_CONCERT_FILTER.genre) +
    Number(filter.period !== DEFAULT_CONCERT_FILTER.period) +
    Number(filter.visit) +
    Number(filter.festival) +
    Number(Boolean(filter.area)) +
    Number(Boolean(filter.instrument)) +
    Number(Boolean(filter.artist))
  );
}

export function genreLabel(key: ConcertGenreKey): string {
  return CONCERT_GENRES.find((genre) => genre.key === key)?.label ?? key;
}

export function periodLabel(key: ConcertPeriodKey): string {
  return CONCERT_PERIODS.find((period) => period.key === key)?.label ?? key;
}

/** 기간 프리셋 옆에 붙이는 실제 날짜 (`10.3–10.4`) */
export function formatRange(range: DayRange): string {
  const short = (day: string) => `${Number(day.slice(5, 7))}.${Number(day.slice(8, 10))}`;
  if (!range.to) return `${short(range.from)}부터`;
  return range.from === range.to ? short(range.from) : `${short(range.from)}–${short(range.to)}`;
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
  if (filter.instrument && !concertInstruments(concert).includes(filter.instrument)) return false;
  return true;
}

/** 찜한 아티스트 이름으로 출연진을 찾을 때, 너무 짧은 이름은 엉뚱한 공연이 걸려 뺀다 */
export function isSearchableArtistName(name: string): boolean {
  return name.replace(/\s+/g, '').length >= 3;
}

/**
 * 불러온 페이지를 화면에 보일 목록으로. 같은 공연은 한 번만 남기고 필터를 한 번 더 건다.
 * `localQuery`는 서버에 못 보낸 검색어라 제목·공연장에서만 찾는다.
 */
export function selectVisibleConcerts(
  loaded: readonly Concert[],
  filter: ConcertFilter,
  range: DayRange,
  localQuery?: string
): Concert[] {
  const unique = Array.from(new Map(loaded.map((concert) => [concert.id, concert])).values());
  const needle = localQuery?.trim().toLowerCase();
  return unique.filter(
    (concert) =>
      matchesConcertFilter(concert, filter, range) &&
      (!needle ||
        concert.title.toLowerCase().includes(needle) ||
        (concert.facilityName ?? '').toLowerCase().includes(needle))
  );
}
