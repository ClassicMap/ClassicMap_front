import { OptimizedImage } from '@/components/optimized-image';
import { titleMeta, youtubeClipUrl } from '@/components/screen/labels';
import { ScreenCueCard } from '@/components/screen/screen-cue-card';
import { ScreenPoster } from '@/components/screen/screen-poster';
import { TmdbAttribution } from '@/components/screen/tmdb-attribution';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useAuth } from '@/lib/hooks/useAuth';
import { useScreenTitle } from '@/lib/query/hooks/useScreen';
import { cn } from '@/lib/utils';
import { tmdbImageUrl, youtubeClipThumbnail } from '@/lib/utils/tmdb';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, ArrowLeftIcon, ClapperboardIcon, PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FilmTitleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const titleId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const { data: title, isLoading, isError, refetch, isRefetching } = useScreenTitle(
    Number.isInteger(titleId) && titleId > 0 ? titleId : undefined
  );
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 64 }}>
        <View className="flex-row gap-4">
          <Skeleton className="h-[150px] w-[100px] rounded-md" />
          <View className="flex-1 gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
          </View>
        </View>
      </View>
    );
  }

  if (isError || !title) {
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
  const tmdbBackdrop = tmdbImageUrl(title.backdropPath, wide ? 'w1280' : 'w780');
  const coverClip = tmdbBackdrop
    ? null
    : title.cues.map((cue) => cue.officialClip).find((clip) => clip && clip.videoId === title.coverVideoId) ?? null;
  const coverScene = coverClip ? youtubeClipThumbnail(coverClip.videoId) : null;
  const backdrop = tmdbBackdrop ?? coverScene?.uri ?? null;
  const usesKmdb = title.cues.some((cue) => cue.evidence.some((item) => item.url.includes('kmdb.or.kr')));
  const hasComparison = title.cues.some((cue) => cue.listen.kind === 'sector' || cue.listen.kind === 'piece');

  return (
    <View className="flex-1 bg-background">
      {backButton}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        contentContainerClassName="pb-24">
        {/* 스틸이 없으면 띠를 두지 않고 포스터부터 보인다 */}
        {backdrop ? (
          <View className="w-full bg-surface-3" style={{ aspectRatio: wide ? 21 / 8 : 16 / 9 }}>
            <OptimizedImage
              uri={backdrop}
              fallbackUri={coverScene?.fallback}
              resizeMode="cover"
              accessibilityLabel={coverClip ? `${title.titleKo} 공식 클립 장면` : `${title.titleKo} 스틸`}
              style={{ width: '100%', height: '100%' }}
            />
            <Scrim from="bottom" color="#000" opacity={0.55} extent={60} />
            {coverClip ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(youtubeClipUrl(coverClip.videoId, coverClip.startSec)).catch(() => undefined)
                }
                accessibilityRole="link"
                accessibilityLabel={`YouTube ${coverClip.channel}에서 장면 보기`}
                className="absolute bottom-2 right-3 flex-row items-center gap-1 rounded-full bg-black/55 px-2.5 py-1">
                <Icon as={PlayIcon} size={10} className="fill-white text-white" />
                <Text className="text-[11px] font-semibold text-white">YouTube · {coverClip.channel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={{ height: insets.top + 60 }} />
        )}

        <View className={cn('px-4', wide && 'mx-auto w-full max-w-[880px] px-6')}>
          <View className={cn('flex-row items-end gap-4', backdrop && '-mt-16')}>
            <View className="rounded-md bg-background p-1">
              <ScreenPoster title={title.titleKo} posterPath={title.posterPath} coverVideoId={title.coverVideoId} width={wide ? 132 : 104} />
            </View>
            <View className="min-w-0 flex-1 pb-1">
              <Text variant="caption">{titleMeta(title.kind, title.releaseYear)}</Text>
              <Text className="mt-1 text-title-2 font-bold text-foreground">{title.titleKo}</Text>
              {title.titleOriginal && title.titleOriginal !== title.titleKo ? (
                <Text variant="caption" numberOfLines={1} className="mt-0.5">
                  {title.titleOriginal}
                </Text>
              ) : null}
            </View>
          </View>
          {title.creditLine ? (
            <Text variant="bodySm" className="mt-3 text-foreground-muted">
              {title.creditLine}
            </Text>
          ) : null}

          <Text variant="headline" className="mb-3 mt-8">
            나온 클래식 {title.cues.length}곡
          </Text>
          <View className={cn('gap-3', wide && 'flex-row flex-wrap')}>
            {title.cues.map((cue) => (
              <View key={cue.id} className={cn(wide && 'w-[calc(50%-6px)]')}>
                <ScreenCueCard cue={cue} titleId={title.id} canPickStill={isAdmin} />
              </View>
            ))}
          </View>

          <View className="mt-10 gap-2">
            {hasComparison ? (
              <Text variant="micro">비교 연주는 영화에 쓰인 녹음과 다를 수 있어요.</Text>
            ) : null}
            {usesKmdb ? <Text variant="micro">곡 정보 일부는 한국영상자료원 KMDb를 참고했어요.</Text> : null}
          </View>
          <TmdbAttribution className="mt-6" />
        </View>
      </ScrollView>
    </View>
  );
}
