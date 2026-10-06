import { SCREEN_KIND_SHORT_LABELS } from '@/components/screen/labels';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { usePrefetchScreenTitle, useScreenWorks } from '@/lib/query/hooks/useScreen';
import type { ScreenWork } from '@/lib/types/models';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon, ChevronRightIcon, MusicIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** 서버가 작곡가 순으로 주므로 이어진 곡끼리 작곡가 하나로 묶는다 */
function groupByComposer(works: ScreenWork[]) {
  const groups: { key: string; composerName: string; works: ScreenWork[] }[] = [];
  for (const work of works) {
    const key = work.composerId !== null ? `#${work.composerId}` : work.composerName;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.works.push(work);
    else groups.push({ key, composerName: work.composerName, works: [work] });
  }
  return groups;
}

/** 모아 보는 화면 '곡으로 찾기'. 작곡가마다 영화에 나온 곡과 그 곡이 나온 작품을 보여 준다 */
export function ScreenWorksList() {
  const works = useScreenWorks(true);
  const items = React.useMemo(
    () => works.data?.pages.flatMap((page) => page.items) ?? [],
    [works.data]
  );
  const groups = React.useMemo(() => groupByComposer(items), [items]);

  if (works.isLoading) {
    return (
      <View className="gap-6">
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} className="gap-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 2 }, (_, row) => (
              <View key={row} className="gap-2 border-b border-border pb-3">
                <Skeleton className="h-4 w-3/5" />
                <View className="flex-row gap-1.5">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }
  if (works.isError) {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        tone="error"
        compact
        title="곡 목록을 불러오지 못했어요"
        description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
        action={{ label: '다시 시도', onPress: () => void works.refetch() }}
      />
    );
  }
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={MusicIcon}
        compact
        title="아직 정리한 곡이 없어요"
        description="근거를 확인한 작품부터 하나씩 채우고 있어요."
      />
    );
  }

  return (
    <View className="gap-7">
      {groups.map((group) => (
        <View key={group.key}>
          <Text variant="headline" className="mb-1">
            {group.composerName}
          </Text>
          {group.works.map((work) => (
            <WorkRow key={`${work.pieceId ?? work.workTitle}`} work={work} />
          ))}
        </View>
      ))}
      {works.hasNextPage ? (
        <Button
          variant="outline"
          className="h-11 self-center rounded-full px-6"
          disabled={works.isFetchingNextPage}
          onPress={() => void works.fetchNextPage()}>
          <Text className="font-semibold text-foreground">
            {works.isFetchingNextPage ? '불러오는 중…' : '곡 더 보기'}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

function WorkRow({ work }: { work: ScreenWork }) {
  const router = useRouter();
  const prefetch = usePrefetchScreenTitle();
  const canCompare = work.pieceId !== null && work.composerId !== null;
  const openCompare = () => {
    if (work.pieceId === null || work.composerId === null) return;
    const params = new URLSearchParams({
      composerId: String(work.composerId),
      pieceId: String(work.pieceId),
    });
    router.push(`/compare?${params.toString()}` as Href);
  };
  return (
    <View className="gap-2 border-b border-border py-3">
      <View className="flex-row items-center gap-3">
        <Text className="min-w-0 flex-1 text-body font-semibold text-foreground">
          {work.workTitle}
        </Text>
        {canCompare ? (
          <Pressable
            onPress={openCompare}
            accessibilityRole="link"
            accessibilityLabel={`${work.composerName} ${work.workTitle} 비교해 듣기`}
            hitSlop={6}
            className="flex-row items-center gap-0.5 rounded-full px-2 py-1 active:bg-surface-2 web:hover:bg-surface-2">
            <Text className="text-label font-semibold text-primary">비교 듣기</Text>
            <Icon as={ChevronRightIcon} size={14} className="text-primary" />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {work.titles.map((title) => (
          <Pressable
            key={title.titleId}
            onHoverIn={() => prefetch(title.titleId)}
            onPressIn={() => prefetch(title.titleId)}
            onPress={() => router.push(`/film/${title.titleId}` as Href)}
            accessibilityRole="link"
            className="flex-row items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 active:bg-surface-3 web:hover:bg-surface-3">
            <Text className="text-label font-semibold text-foreground">{title.titleKo}</Text>
            <Text variant="micro">
              {[SCREEN_KIND_SHORT_LABELS[title.kind], title.releaseYear]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
