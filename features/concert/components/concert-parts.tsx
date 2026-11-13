import { clipClock } from '@/lib/data/comparison';
import { ImageLightbox } from '@/features/concert/components/image-lightbox';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { msg, t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils/image';
import { useArtist } from '@/lib/query/hooks/use-artists';
import {
  useArtistComparisonPerformances,
  useComparisonPiece,
} from '@/lib/query/hooks/use-comparison-performances';
import type { ComparisonPerformance, Concert, ConcertArtist, ConcertImage } from '@/types/models';
import { type Href, useRouter } from 'expo-router';
import { LanguagesIcon, Maximize2Icon } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

const WEEKDAYS = [
  msg('weekday::일'),
  msg('weekday::월'),
  msg('weekday::화'),
  msg('weekday::수'),
  msg('weekday::목'),
  msg('weekday::금'),
  msg('weekday::토'),
];

const MONTHS = [
  msg('month::1'),
  msg('month::2'),
  msg('month::3'),
  msg('month::4'),
  msg('month::5'),
  msg('month::6'),
  msg('month::7'),
  msg('month::8'),
  msg('month::9'),
  msg('month::10'),
  msg('month::11'),
  msg('month::12'),
];

/** 한국어는 숫자 월(`9`→`9월`), 영어는 줄임 월 이름(`Sep`). `{month}월` 자리에 넣는다 */
/**
 * 영어 화면에서만 보이는 안내: 공연 제목·공연장·출연 등은 KOPIS 에서 받은 원문(한국어) 그대로다.
 * 번역하지 않은 이유를 알려 영어 화면에 한국어가 섞여 보이는 것을 오류로 읽지 않게 한다
 */
export function OriginalLanguageNote({ className }: { className?: string }) {
  const { locale } = useLocale();
  if (locale !== 'en') return null;
  return (
    <View className={cn('flex-row items-start gap-1.5', className)}>
      <Icon as={LanguagesIcon} size={12} className="mt-[3px] text-foreground-subtle" />
      <Text variant="caption" className="shrink text-foreground-subtle">
        {t('공연 정보는 KOPIS 원문 그대로 한국어로 보여요.')}
      </Text>
    </View>
  );
}

export function monthLabel(date: Date): string {
  return t(MONTHS[date.getMonth()]);
}

export function parseDay(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDay(value?: string, withYear = false): string {
  const date = parseDay(value);
  if (!date) return t('날짜 미정');
  const base = t('{month}월 {day}일 ({weekday})', {
    month: monthLabel(date),
    day: date.getDate(),
    weekday: t(WEEKDAYS[date.getDay()]),
  });
  return withYear ? t('{year}년 {base}', { year: date.getFullYear(), base }) : base;
}

/** 오늘까지 남은 날. 지났으면 null */
export function daysLeft(value?: string): number | null {
  const date = parseDay(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

/** 목록용 짧은 날짜: `9.29 (화)` */
export function formatShortDay(value?: string): string {
  const date = parseDay(value);
  if (!date) return t('날짜 미정');
  return t('{month}.{day} ({weekday})', {
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: t(WEEKDAYS[date.getDay()]),
  });
}

/**
 * KOPIS 공연장 `시설 (홀)`을 `시설 홀`로 줄인다. 홀이 시설 이름과 같거나 그 안에 있으면 시설만.
 * 괄호가 여럿·겹친 이름(`스테이지엠 (STAGE M) (구.프란츠홀) (스테이지 엠 (STAGE M) )`)은
 * 첫 괄호 앞을 시설, 맨 뒤 괄호 안(안쪽 괄호는 뺀다)을 홀로 본다.
 */
export function shortVenue(name?: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed.endsWith(')')) return trimmed;
  // 끝에서부터 짝이 맞는 여는 괄호를 찾는다
  let depth = 0;
  let open = -1;
  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    const char = trimmed[index];
    if (char === ')') depth += 1;
    if (char !== '(') continue;
    depth -= 1;
    if (depth === 0) {
      open = index;
      break;
    }
  }
  const outer = trimmed.slice(0, trimmed.indexOf('(')).trim();
  if (open <= 0 || !outer) return trimmed;
  const inner = trimmed
    .slice(open + 1, -1)
    .replace(/\([^()]*\)/g, '')
    .trim();
  const squash = (value: string) => value.replace(/\s+/g, '');
  if (!inner || squash(outer).includes(squash(inner))) return outer;
  return `${outer} ${inner}`;
}

/** `화요일(19:30)` → `19:30`. 요일 외 형식이면 원문 */
export function concertClock(time?: string): string | undefined {
  if (!time) return undefined;
  const match = time.match(/\(([^)]+)\)/);
  return match ? match[1] : time;
}

export interface SeatPrice {
  seat: string;
  price: string;
}

/** `R석` 같은 등급은 `R seats` 로, 흔한 좌석 이름은 사전에서. 모르는 이름은 원문 그대로 */
function seatLabel(seat: string): string {
  const grade = seat.match(/^([A-Za-z0-9+]+)석$/);
  return grade ? t('{grade}석', { grade: grade[1] }) : t(seat);
}

/** `R석 150,000원, S석 135,000원` → 좌석별 줄. 모양이 다르면 원문 한 줄로 둔다. */
export function parsePrices(priceInfo?: string): SeatPrice[] {
  if (!priceInfo) return [];
  return priceInfo
    .split(/,\s+(?=\D)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s+([\d,]+원)$/);
      return match
        ? { seat: seatLabel(match[1]), price: t('{amount}원', { amount: match[2].slice(0, -1) }) }
        : { seat: seatLabel(part), price: '' };
    });
}

export function concertStatusLabel(concert: Concert): {
  label: string;
  tone: 'accent' | 'neutral' | 'danger' | 'success';
} {
  if (concert.status === 'cancelled') return { label: t('status::취소'), tone: 'danger' };
  const days = daysLeft(concert.startDate);
  const endDays = daysLeft(concert.endDate ?? concert.startDate);
  if (days === 0 || (days === null && endDays !== null))
    return { label: t('공연 중'), tone: 'success' };
  if (days === null) return { label: t('종료'), tone: 'neutral' };
  return { label: t('D-{days}', { days, count: days }), tone: 'accent' };
}

/** 출연자 칩: 이름이 아니라 공연-아티스트 연결로 아티스트 상세에 간다 */
export function CastChip({ cast }: { cast: ConcertArtist }) {
  useLocale();
  const router = useRouter();
  const artist = useArtist(cast.artistId);
  return (
    <Pressable
      onPress={() => router.push(`/artist/${cast.artistId}` as Href)}
      className="flex-row items-center gap-2.5 rounded-full bg-surface-2 py-1 pl-1 pr-3.5 active:bg-surface-3 web:hover:bg-surface-3">
      <EntityThumb name={cast.artistName} image={artist.data?.imageUrl} shape="circle" size={30} />
      <Text className="text-body-sm font-semibold text-foreground">{cast.artistName}</Text>
      {cast.role ? <Text variant="caption">{cast.role}</Text> : null}
    </Pressable>
  );
}

/**
 * 공연 → 비교 다리. 출연자의 비교 구간을 보여 줄 뿐, 공연 프로그램과 같은 곡이라고 주장하지 않는다.
 */
export function CastComparisons({
  cast,
  horizontal,
}: {
  cast: ConcertArtist[];
  horizontal: boolean;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const first = cast[0];
  const query = useArtistComparisonPerformances(first?.artistId ?? 0);
  const items = React.useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    // 곡마다 하나씩만
    const seen = new Set<number>();
    return all
      .filter((item) => (seen.has(item.pieceId) ? false : (seen.add(item.pieceId), true)))
      .slice(0, 3);
  }, [query.data, locale]);
  if (!first || items.length === 0) return null;

  const cards = items.map((item) => (
    <ComparisonMiniCard key={item.id} item={item} compact={horizontal} />
  ));
  return (
    <View>
      <Text variant="headline" className="mb-3">
        {t('출연자의 연주 비교')}
      </Text>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2.5">
          {cards}
        </ScrollView>
      ) : (
        <View className="gap-2">{cards}</View>
      )}
      <Pressable
        onPress={() => router.push(`/artist/${first.artistId}` as Href)}
        className="mt-3 self-start">
        <Text variant="label" className="text-foreground-muted">
          {t('{name}의 연주 비교 전체 보기', { name: first.artistName })}
        </Text>
      </Pressable>
    </View>
  );
}

function ComparisonMiniCard({ item, compact }: { item: ComparisonPerformance; compact: boolean }) {
  useLocale();
  const router = useRouter();
  const piece = useComparisonPiece(item.pieceId, item.composerId).data;
  const href =
    `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}&sectorId=${item.sectorId}` as Href;
  return (
    <Pressable
      onPress={() => router.push(href)}
      className={
        compact
          ? 'w-[150px] rounded-lg bg-surface-2 p-3 active:bg-surface-3'
          : 'flex-row items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5 active:bg-surface-3 web:hover:bg-surface-3'
      }>
      <EntityThumb
        name={item.composerName}
        image={piece?.composerAvatarUrl}
        shape="circle"
        size={compact ? 36 : 44}
      />
      <View className={compact ? 'mt-2.5' : 'min-w-0 flex-1'}>
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {item.sectorName === '전곡' ? item.pieceTitle : item.sectorName}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {`${item.composerName}${piece ? ` · ${t('performer::{count}명', { count: piece.performerCount })}` : ''}`}
        </Text>
      </View>
      {!compact ? (
        <Text variant="mono" className="text-foreground-muted">
          {clipClock(item.endMs - item.startMs)}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * KOPIS 소개 이미지는 세로로 매우 길다 (설계 문서 7.7).
 * contain + 폭 상한 420 + 높이만 접고, 펼치기 버튼은 이미지 밖 아래에 둔다.
 */
export function IntroImages({ images }: { images: ConcertImage[] }) {
  const { locale } = useLocale();
  const [expanded, setExpanded] = React.useState(false);
  const [viewing, setViewing] = React.useState<number | null>(null);
  const sorted = React.useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder),
    [images, locale]
  );
  const uris = React.useMemo(
    () => sorted.map((image) => getImageUrl(image.imageUrl)),
    [sorted, locale]
  );
  if (sorted.length === 0) return null;
  return (
    <View>
      <View className="mb-3 flex-row items-baseline gap-2">
        <Text variant="headline">{t('공연 소개')}</Text>
        {sorted.length > 1 ? (
          <Text variant="caption">{t('이미지 {count}장', { count: sorted.length })}</Text>
        ) : null}
      </View>
      <View
        className="relative w-full max-w-[420px] overflow-hidden rounded-md"
        style={expanded ? undefined : { maxHeight: 330 }}>
        {uris.map((uri, index) => (
          <Pressable
            key={sorted[index].id}
            onPress={() => setViewing(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('공연 소개 이미지 {n} 크게 보기', { n: index + 1 })}
            className="web:cursor-zoom-in">
            <ScaledImage uri={uri} />
          </Pressable>
        ))}
        {!expanded ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background web:to-surface-1"
          />
        ) : null}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => setViewing(0)}
          accessibilityRole="button"
          className="flex-row items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 active:opacity-80 web:hover:opacity-90">
          <Icon as={Maximize2Icon} size={13} className="text-background" />
          <Text variant="label" className="text-background">
            {t('크게 보기')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          className="rounded-full border border-border-strong px-4 py-1.5 web:hover:bg-surface-2">
          <Text variant="label" className="text-foreground">
            {expanded ? t('소개 접기') : t('여기서 펼치기')}
          </Text>
        </Pressable>
      </View>
      <ImageLightbox
        images={uris}
        index={viewing}
        onIndexChange={setViewing}
        onClose={() => setViewing(null)}
      />
    </View>
  );
}

function ScaledImage({ uri }: { uri: string }) {
  useLocale();
  const [ratio, setRatio] = React.useState(221 / 620);
  React.useEffect(() => {
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) setRatio(width / height);
      },
      () => undefined
    );
  }, [uri]);
  return (
    <Image source={{ uri }} style={{ width: '100%', aspectRatio: ratio }} resizeMode="contain" />
  );
}
