import { OptimizedImage } from '@/components/optimized-image';
import { titleMeta } from '@/components/screen/labels';
import { ScreenCueCard } from '@/components/screen/screen-cue-card';
import { POSTER_ASPECT, ScreenPoster } from '@/components/screen/screen-poster';
import { TmdbAttribution } from '@/components/screen/tmdb-attribution';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCachedScreenTitleSummary, useScreenTitle } from '@/lib/query/hooks/useScreen';
import type { ScreenCue } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { tmdbImageUrl } from '@/lib/utils/tmdb';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, ClapperboardIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FilmTitleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const titleId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const validId = Number.isInteger(titleId) && titleId > 0 ? titleId : undefined;
  const { data: title, isLoading, isError, refetch, isRefetching } = useScreenTitle(validId);
  // 목록에서 온 경우 머리 부분은 이미 아는 값으로 바로 그리고, 곡 카드만 받는 동안 비워 둔다
  const cached = useCachedScreenTitleSummary(validId);
  const goBack = () => (router.canGoBack() ? router.back() : router.push('/films' as Href));
  const backButton = (
    <Pressable
      onPress={goBack}
      accessibilityLabel="뒤로"
      style={{ top: insets.top + 4 }}
      className="absolute left-2 z-10 size-11 items-center justify-center rounded-full bg-background/70">
      <Icon as={ArrowLeftIcon} size={22} className="text-foreground" />
    </Pressable>
  );

  const head = title ?? (isLoading ? cached : undefined);

  if (isLoading && !head) {
    return (
      <View className="flex-1 bg-background">
        {backButton}
        <FilmTitleSkeleton wide={wide} />
      </View>
    );
  }

  if (!head) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 56 }}>
        {backButton}
        {isError ? (
          <EmptyState
            icon={AlertCircleIcon}
            tone="error"
            title="작품을 불러오지 못했어요"
            description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
            action={{ label: '다시 시도', onPress: () => void refetch() }}
          />
        ) : (
          <EmptyState
            icon={ClapperboardIcon}
            title="찾는 작품이 없어요"
            description="목록에서 다른 작품을 골라 주세요."
            action={{ label: '영화 속 클래식 보기', onPress: () => router.push('/films' as Href) }}
          />
        )}
      </View>
    );
  }

  // TMDB 스틸이 없으면 권리자 공식 클립의 장면을 깐다. 누르면 그 클립이 열리고 출처를 적는다
  const cues: ScreenCue[] = title?.cues ?? [];
  const tmdbBackdrop = tmdbImageUrl(head.backdropPath, wide ? 'w1280' : 'w780');
  const posterWidth = wide ? 152 : 112;
  const usesKmdb = cues.some((cue) => cue.evidence.some((item) => item.url.includes('kmdb.or.kr')));
  const hasComparison = cues.some((cue) => cue.listen.kind === 'sector' || cue.listen.kind === 'piece');

  return (
    <View className="flex-1 bg-background">
      {backButton}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={() => void refetch()} />}
        contentContainerClassName="pb-24">
        {/* TMDB 스틸이 있을 때만 위에 넓게 깐다. YouTube 썸네일은 글자가 박혀 있어 넓게 자르면 지저분해서 아래에 온전히 둔다 */}
        {tmdbBackdrop ? (
          <View className="w-full bg-surface-3" style={{ aspectRatio: wide ? 21 / 8 : 16 / 9 }}>
            <OptimizedImage
              uri={tmdbBackdrop}
              resizeMode="cover"
              accessibilityLabel={`${head.titleKo} 스틸`}
              style={{ width: '100%', height: '100%' }}
            />
            <Scrim from="bottom" color="#000" opacity={0.55} extent={60} />
          </View>
        ) : (
          <View style={{ height: insets.top + 60 }} />
        )}

        <View className={cn('px-4', wide && 'mx-auto w-full max-w-[880px] px-6')}>
          <View className={cn('flex-row items-end gap-4', tmdbBackdrop && '-mt-16')}>
            <View className={cn('rounded-md', tmdbBackdrop && 'bg-background p-1')}>
              <ScreenPoster
                title={head.titleKo}
                posterPath={head.posterPath}
                posterUrl={head.posterUrl}
                coverVideoId={head.coverVideoId}
                coverThumbs={head.coverThumbs}
                width={posterWidth}
              />
            </View>
            <View className="min-w-0 flex-1 pb-1">
              <Text variant="caption">{titleMeta(head.kind, head.releaseYear)}</Text>
              <Text className="mt-1 text-title-2 font-bold text-foreground">{head.titleKo}</Text>
              {head.titleOriginal && head.titleOriginal !== head.titleKo ? (
                <Text variant="caption" numberOfLines={1} className="mt-0.5">
                  {head.titleOriginal}
                </Text>
              ) : null}
            </View>
          </View>
          {head.creditLine ? (
            <Text variant="bodySm" className="mt-3 text-foreground-muted">
              {head.creditLine}
            </Text>
          ) : null}

          <Text variant="headline" className="mb-3 mt-8">
            나온 클래식 {title ? title.cues.length : head.cueCount}곡
          </Text>
          {title ? (
            <View className={cn('gap-3', wide && 'flex-row flex-wrap')}>
              {title.cues.map((cue) => (
                <View key={cue.id} className={cn(wide && 'w-[calc(50%-6px)]')}>
                  <ScreenCueCard cue={cue} titleId={title.id} canPickStill={isAdmin} />
                </View>
              ))}
            </View>
          ) : (
            <CueCardsSkeleton wide={wide} count={Math.min(head.cueCount, 4)} />
          )}


          <View className="mt-10 gap-2">
            {hasComparison ? (
              <Text variant="micro">비교 연주는 영화에 쓰인 녹음과 다를 수 있어요.</Text>
            ) : null}
            {head.posterUrl ? (
              <Text variant="micro">포스터는 한국영상자료원 KMDb에서 가져와요.</Text>
            ) : null}
            {usesKmdb ? <Text variant="micro">곡 정보 일부는 한국영상자료원 KMDb를 참고했어요.</Text> : null}
            {head.coverVideoId || cues.some((cue) => cue.officialClip) ? (
              <Text variant="micro">장면 그림은 권리자가 YouTube에 올린 공식 영상의 장면이에요. 'YouTube · 채널'을 누르면 그 영상이 열려요.</Text>
            ) : null}
          </View>
          {head.posterPath || head.backdropPath || cues.some((cue) => cue.stillPath) ? (
            <TmdbAttribution className="mt-6" />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** 작품 페이지 모양 그대로의 자리. 포스터와 제목 → 곡 카드 */
function FilmTitleSkeleton({ wide }: { wide: boolean }) {
  const insets = useSafeAreaInsets();
  const posterWidth = wide ? 152 : 112;
  return (
    <View className="flex-1">
      <View style={{ height: insets.top + 60 }} />
      <View className={cn('px-4', wide && 'mx-auto w-full max-w-[880px] px-6')}>
        <View className="flex-row items-end gap-4">
          <Skeleton style={{ width: posterWidth, height: Math.round(posterWidth * POSTER_ASPECT) }} />
          <View className="flex-1 gap-2.5 pb-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </View>
        </View>
        <Skeleton className="mb-3 mt-8 h-5 w-32" />
        <CueCardsSkeleton wide={wide} count={wide ? 4 : 2} />
      </View>
    </View>
  );
}

/** 곡 카드 자리. 쓰임 줄·곡 이름(오른쪽 장면 그림) → 설명 → 듣기 버튼 → 근거 */
function CueCardsSkeleton({ wide, count }: { wide: boolean; count: number }) {
  return (
    <View className={cn('gap-3', wide && 'flex-row flex-wrap')}>
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        <View
          key={index}
          className={cn('overflow-hidden rounded-xl border border-border bg-surface-1', wide && 'w-[calc(50%-6px)]')}>
          <View className="gap-3 p-4">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </View>
              <Skeleton style={{ width: 116, aspectRatio: 16 / 9 }} />
            </View>
            <SkeletonText lines={2} />
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-3 w-16" />
          </View>
        </View>
      ))}
    </View>
  );
}
