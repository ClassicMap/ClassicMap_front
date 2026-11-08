/**
 * 화면 언어(한국어·영어).
 *
 * - 문구는 한국어 원문을 그대로 쓰고 `t('작품')` 으로 감싼다. 영어 사전(`./en`)에 없으면 한국어가 그대로 나온다.
 * - 이름·제목처럼 데이터에 두 언어가 다 있는 값은 `pick(한국어, 영어)` 로 고른다.
 * - `t`·`pick` 은 렌더 중(또는 이벤트 처리 중)에 부른다. 모듈 맨 위 상수에서 부르면 언어를 바꿔도 그대로다.
 * - 정적 웹 HTML 은 한국어로 미리 그려 둔다. 화면이 뜬 뒤 저장한 설정 → 기기 언어 순으로 언어를 정한다.
 * - 언어가 바뀌어도 화면을 새로 만들지 않는다(스크롤·펼침·입력이 그대로). 컴포넌트마다 `useLocale()` 로
 *   언어를 구독해서 다시 그릴 때 t() 가 새 언어를 읽는다. useMemo 는 의존 목록에 locale 을 둔다.
 * - API 응답 → 화면 모델 변환(lib/api/*.ts)에서 이름을 `pick` 으로 고른다. 언어가 바뀌면 받아 둔 응답을
 *   그대로 보이면서 뒤에서 다시 받아(invalidate) 이름도 곧 바뀐다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Platform } from 'react-native';
import { EN } from './en';

export type Locale = 'ko' | 'en';

export const LOCALES: readonly Locale[] = ['ko', 'en'];

const STORAGE_KEY = 'classicmap.locale';

let current: Locale = 'ko';

export function getLocale(): Locale {
  return current;
}

type Params = Record<string, string | number>;

function fill(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole
  );
}

/**
 * 한국어 문구를 지금 언어로 옮긴다. `{name}` 자리는 params 로 채운다.
 * 원문 앞에 `문맥::` 을 붙이면 영어 사전은 그 키로 찾고, 한국어 화면에는 문맥을 떼고 보인다.
 * 영어 값이 「단수|복수」(예: `{count} work|{count} works`)이면 params.count 가 1일 때 앞의 것을 쓴다.
 */
export function t(text: string, params?: Params): string {
  // 「문맥::원문」: 한국어 원문이 같아도 영어가 다를 때(작품 수 「12곡」= works, 세트 안 「12곡」= pieces)
  const split = text.indexOf('::');
  const korean = split >= 0 ? text.slice(split + 2) : text;
  let template = current === 'en' ? (EN[text] ?? EN[korean] ?? korean) : korean;
  if (current === 'en' && template.includes('|') && typeof params?.count === 'number') {
    const [one, other] = template.split('|');
    template = params.count === 1 ? one : (other ?? one);
  }
  return fill(template, params);
}

/** 한 칸의 두 언어 값. 영어가 없으면 null */
export type Bilingual = { ko: string; en: string | null };

/** 칸 이름 → 두 언어 값. 응답을 고를 때 같이 남겨 두면, 기기에 저장한 사본도 나중에 언어를 바꿔 보일 수 있다 */
export type NameSidecar = Partial<Record<string, Bilingual>>;

export function bilingual(ko: string, en: string | null | undefined): Bilingual {
  return { ko, en: en && en.trim() ? en : null };
}

/** names 에 남겨 둔 칸을 지금 언어로 다시 고른다(저장해 둔 오늘의 비교·최근 본 작품·재생 중인 곡) */
export function relocalize<T extends { names?: NameSidecar }>(value: T): T {
  if (!value.names) return value;
  const next: Record<string, unknown> = { ...value };
  for (const [key, pair] of Object.entries(value.names)) {
    if (pair && typeof pair.ko === 'string') next[key] = pick(pair.ko, pair.en);
  }
  return next as T;
}

/** 숫자를 지금 언어 표기로(1,234). */
export function formatNumber(value: number): string {
  return value.toLocaleString(current === 'en' ? 'en-US' : 'ko-KR');
}

/**
 * 모듈 상수에 둘 문구 표시. 값은 그대로 돌려준다. 옮기기는 렌더 때 `t(item.label)` 로 한다.
 * `npm run i18n:check` 가 이 표시와 `t('…')` 의 원문이 영어 사전에 다 있는지 본다.
 */
export function msg(text: string): string {
  return text;
}

/** 두 언어로 있는 데이터 값 중 지금 언어 것. 영어 값이 비면 한국어. */
export function pick(ko: string, en?: string | null): string;
export function pick(ko: string | null | undefined, en?: string | null): string | null | undefined;
export function pick(ko: string | null | undefined, en?: string | null) {
  return current === 'en' && en && en.trim() ? en : ko;
}

/** 기기·브라우저 언어 목록에 한국어가 있으면 한국어, 아니면 영어. */
function detectLocale(): Locale {
  let languages: readonly string[] = [];
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  } else {
    try {
      languages = [Intl.DateTimeFormat().resolvedOptions().locale];
    } catch {
      languages = [];
    }
  }
  if (languages.length === 0) return 'ko';
  return languages.some((language) => language.toLowerCase().startsWith('ko')) ? 'ko' : 'en';
}

function isLocale(value: unknown): value is Locale {
  return value === 'ko' || value === 'en';
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: 'ko',
  setLocale: () => undefined,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(current);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    let alive = true;
    const apply = (next: Locale) => {
      if (!alive || next === current) return;
      current = next;
      setLocaleState(next);
      // 이름은 응답을 화면 모델로 바꿀 때 고르므로 다시 받는다. 받는 동안은 앞의 것을 그대로 보인다
      void queryClient.invalidateQueries();
    };
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => apply(isLocale(saved) ? saved : detectLocale()))
      .catch(() => apply(detectLocale()));
    return () => {
      alive = false;
    };
  }, [queryClient]);

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      if (next === current) return;
      current = next;
      setLocaleState(next);
      void queryClient.invalidateQueries();
    },
    [queryClient]
  );

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return React.useContext(LocaleContext);
}
