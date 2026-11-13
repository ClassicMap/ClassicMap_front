import { ScrollShelf } from '@/components/shared/shelf';
import { SCREEN_KIND_LABELS, shortTitleMeta } from '@/features/film/lib/labels';
import { ScreenPoster } from '@/features/film/components/screen-poster';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { t, useLocale } from '@/lib/i18n';
import { usePieceScreenCues, usePrefetchScreenTitle } from '@/lib/query/hooks/use-screen';
import type { PieceScreenCue } from '@/types/models';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { type Href, useRouter } from 'expo-router';
import { ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 포스터 칸 너비. 비교 화면 아래에서도 작품이 눈에 들어오게 넉넉히 둔다 */
const CARD_WIDTH = { wide: 168, narrow: 128 } as const;

/** 같은 작품이 여러 큐로 나와도 띠에는 작품 하나로 모은다. 지금 구간과 같은 대목이면 앞에 둔다 */
function groupByTitle(cues: PieceScreenCue[], activeSectorId: number | undefined) {
  const titles = new Map<number, { cue: PieceScreenCue; sameSector: boolean }>();
  for (const cue of cues) {
    const sameSector = activeSectorId !== undefined && cue.sectorId === activeSectorId;
    const existing = titles.get(cue.titleId);
    if (!existing || (sameSector && !existing.sameSector))
      titles.set(cue.titleId, { cue, sameSector });
  }
  return [...titles.values()].sort((a, b) => Number(b.sameSector) - Number(a.sameSector));
}

/** 비교 화면 아래 '영화 속 클래식' 띠. 이 곡이 나온 작품이 없으면 그리지 않는다 */
export function PieceScreenStrip({
  pieceId,
  activeSectorId,
  className,
}: {
  pieceId: number;
  activeSectorId?: number;
  className?: string;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const prefetch = usePrefetchScreenTitle();
  const { layout } = useBreakpoint();
  const cardWidth = layout === 'desktop' || layout === 'wide' ? CARD_WIDTH.wide : CARD_WIDTH.narrow;
  const { data } = usePieceScreenCues(pieceId);
  const items = React.useMemo(
    () => groupByTitle(data ?? [], activeSectorId),
    [data, activeSectorId, locale]
  );
  if (items.length === 0) return null;

  return (
    <View className={cn('gap-3', className)}>
      <View className="flex-row items-center justify-between">
        <Text variant="headline">{t('영화 속 클래식')}</Text>
        <Pressable
          onPress={() => router.push('/films' as Href)}
          accessibilityRole="link"
          accessibilityLabel={t('영화 속 클래식 모두 보기')}
          hitSlop={8}
          className="flex-row items-center gap-0.5 rounded-full px-2 py-1 active:bg-surface-2 web:hover:bg-surface-2">
          <Text className="text-label font-semibold text-foreground-muted">
            {t('strip::모두 보기')}
          </Text>
          <Icon as={ChevronRightIcon} size={14} className="text-foreground-muted" />
        </Pressable>
      </View>
      <ScrollShelf gap={16}>
        {items.map(({ cue, sameSector }) => (
          <Pressable
            key={cue.titleId}
            onHoverIn={() => prefetch(cue.titleId)}
            onPressIn={() => prefetch(cue.titleId)}
            onPress={() => router.push(`/film/${cue.titleId}` as Href)}
            accessibilityRole="link"
            accessibilityLabel={[
              cue.titleKo,
              t(SCREEN_KIND_LABELS[cue.kind]),
              sameSector ? t('지금 구간이 나와요') : null,
            ]
              .filter(Boolean)
              .join(', ')}
            style={{ width: cardWidth }}
            className="gap-1.5">
            <View>
              <ScreenPoster
                title={cue.titleKo}
                posterPath={cue.posterPath}
                posterUrl={cue.posterUrl}
                coverVideoId={cue.coverVideoId}
                coverThumbs={cue.coverThumbs}
                width={cardWidth}
              />
              {sameSector ? (
                <View className="absolute bottom-2 left-2 rounded-full bg-primary px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-primary-foreground">
                    {t('이 구간')}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} className="text-body font-semibold text-foreground">
              {cue.titleKo}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {shortTitleMeta(cue.kind, cue.releaseYear)}
            </Text>
          </Pressable>
        ))}
      </ScrollShelf>
      {items.some(({ cue }) => cue.posterUrl) ? (
        <Text variant="micro">{t('포스터: 한국영상자료원 KMDb')}</Text>
      ) : null}
    </View>
  );
}
