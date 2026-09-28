import { clipClock } from '@/lib/data/comparison';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Text } from '@/components/ui/text';
import { getImageUrl } from '@/lib/utils/image';
import { useArtist } from '@/lib/query/hooks/useArtists';
import {
  useArtistComparisonPerformances,
  useComparisonPiece,
} from '@/lib/query/hooks/useComparisonPerformances';
import type { ComparisonPerformance, Concert, ConcertArtist, ConcertImage } from '@/lib/types/models';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function parseDay(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDay(value?: string, withYear = false): string {
  const date = parseDay(value);
  if (!date) return '날짜 미정';
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
  return withYear ? `${date.getFullYear()}년 ${base}` : base;
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
  if (!date) return '날짜 미정';
  return `${date.getMonth() + 1}.${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}

/** "롯데콘서트홀 (롯데콘서트홀)"처럼 괄호 안이 같으면 한 번만 */
export function shortVenue(name?: string): string {
  if (!name) return '';
  const match = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!match) return name;
  const [, outer, inner] = match;
  return outer.trim() === inner.trim() ? outer.trim() : `${outer.trim()} ${inner.trim()}`;
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

/** `R석 150,000원, S석 135,000원` → 좌석별 줄. 모양이 다르면 원문 한 줄로 둔다. */
export function parsePrices(priceInfo?: string): SeatPrice[] {
  if (!priceInfo) return [];
  return priceInfo
    .split(/,\s+(?=\D)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s+([\d,]+원)$/);
      return match ? { seat: match[1], price: match[2] } : { seat: part, price: '' };
    });
}

export function concertStatusLabel(concert: Concert): { label: string; tone: 'accent' | 'neutral' | 'danger' | 'success' } {
  if (concert.status === 'cancelled') return { label: '취소', tone: 'danger' };
  const days = daysLeft(concert.startDate);
  const endDays = daysLeft(concert.endDate ?? concert.startDate);
  if (days === 0 || (days === null && endDays !== null)) return { label: '공연 중', tone: 'success' };
  if (days === null) return { label: '종료', tone: 'neutral' };
  return { label: `D-${days}`, tone: 'accent' };
}

/** 출연자 칩: 이름이 아니라 공연-아티스트 연결로 아티스트 상세에 간다 */
export function CastChip({ cast }: { cast: ConcertArtist }) {
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
export function CastComparisons({ cast, horizontal }: { cast: ConcertArtist[]; horizontal: boolean }) {
  const router = useRouter();
  const first = cast[0];
  const query = useArtistComparisonPerformances(first?.artistId ?? 0);
  const items = React.useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    // 곡마다 하나씩만
    const seen = new Set<number>();
    return all.filter((item) => (seen.has(item.pieceId) ? false : (seen.add(item.pieceId), true))).slice(0, 3);
  }, [query.data]);
  if (!first || items.length === 0) return null;

  const cards = items.map((item) => <ComparisonMiniCard key={item.id} item={item} compact={horizontal} />);
  return (
    <View>
      <Text variant="headline" className="mb-3">
        출연자의 연주 비교
      </Text>
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
          {cards}
        </ScrollView>
      ) : (
        <View className="gap-2">{cards}</View>
      )}
      <Pressable onPress={() => router.push(`/artist/${first.artistId}` as Href)} className="mt-3 self-start">
        <Text variant="label" className="text-foreground-muted">{`${first.artistName}의 연주 비교 전체 보기`}</Text>
      </Pressable>
    </View>
  );
}


function ComparisonMiniCard({ item, compact }: { item: ComparisonPerformance; compact: boolean }) {
  const router = useRouter();
  const piece = useComparisonPiece(item.pieceId, item.composerId).data;
  const href = `/compare?composerId=${item.composerId}&pieceId=${item.pieceId}&sectorId=${item.sectorId}` as Href;
  return (
    <Pressable
      onPress={() => router.push(href)}
      className={
        compact
          ? 'w-[150px] rounded-lg bg-surface-2 p-3 active:bg-surface-3'
          : 'flex-row items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5 active:bg-surface-3 web:hover:bg-surface-3'
      }>
      <EntityThumb name={item.composerName} image={piece?.composerAvatarUrl} shape="circle" size={compact ? 36 : 44} />
      <View className={compact ? 'mt-2.5' : 'min-w-0 flex-1'}>
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {item.sectorName === '전곡' ? item.pieceTitle : item.sectorName}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {`${item.composerName}${piece ? ` · ${piece.performerCount}명` : ''}`}
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
  const [expanded, setExpanded] = React.useState(false);
  const sorted = React.useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder),
    [images]
  );
  if (sorted.length === 0) return null;
  return (
    <View>
      <Text variant="headline" className="mb-3">
        공연 소개
      </Text>
      <View className="relative w-full max-w-[420px] overflow-hidden rounded-md" style={expanded ? undefined : { maxHeight: 330 }}>
        {sorted.map((image) => (
          <ScaledImage key={image.id} uri={getImageUrl(image.imageUrl)} />
        ))}
        {!expanded ? (
          <View className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background web:to-surface-1" />
        ) : null}
      </View>
      <Pressable onPress={() => setExpanded((value) => !value)} className="mt-3 self-start rounded-full border border-border-strong px-4 py-1.5">
        <Text variant="label" className="text-foreground">
          {expanded ? '소개 접기' : '소개 전체 보기'}
        </Text>
      </Pressable>
    </View>
  );
}

function ScaledImage({ uri }: { uri: string }) {
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
  return <Image source={{ uri }} style={{ width: '100%', aspectRatio: ratio }} resizeMode="contain" />;
}
