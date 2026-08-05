import * as React from 'react';
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native';
import { ChevronRightIcon, Music2Icon, PlayCircleIcon, RotateCcwIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { PerformanceVideoPlayer } from '@/components/performance-video-player';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useArtistComparisonPerformances } from '@/lib/query/hooks/useComparisonPerformances';
import type {
  ComparisonPerformance,
  PerformanceCredit,
  PerformanceCreditRole,
} from '@/lib/types/models';

const ROLE_LABELS: Record<PerformanceCreditRole, string> = {
  soloist: '독주',
  conductor: '지휘',
  orchestra: '오케스트라',
  ensemble: '앙상블',
  accompanist: '반주',
  vocalist: '성악',
  other: '기타',
};

interface ArtistComparisonSectionProps {
  artistId: number;
}

interface ComparisonGroup {
  key: string;
  composerName: string;
  pieceTitle: string;
  performances: ComparisonPerformance[];
}

function formatOriginalTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const secondText = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${minuteText}:${secondText}` : `${minuteText}:${secondText}`;
}

function groupByPiece(performances: ComparisonPerformance[]): ComparisonGroup[] {
  const groups = new Map<number, ComparisonGroup>();
  performances.forEach((performance) => {
    const existing = groups.get(performance.pieceId);
    if (existing) {
      existing.performances.push(performance);
      return;
    }
    groups.set(performance.pieceId, {
      composerName: performance.composerName,
      key: String(performance.pieceId),
      performances: [performance],
      pieceTitle: performance.pieceTitle,
    });
  });
  return [...groups.values()];
}

function Credits({ credits }: { credits: PerformanceCredit[] }) {
  if (credits.length === 0) {
    return null;
  }

  return (
    <View className="gap-1">
      {credits.map((credit) => (
        <Text
          className={credit.isPrimary ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}
          key={`${credit.artistId}-${credit.role}`}>
          {credit.artistName} · {ROLE_LABELS[credit.role]}
        </Text>
      ))}
    </View>
  );
}

function ComparisonCard({
  artistId,
  isSelected,
  onSelect,
  performance,
}: {
  artistId: number;
  isSelected: boolean;
  onSelect: () => void;
  performance: ComparisonPerformance;
}) {
  const router = useRouter();
  const artistCredit = performance.credits.find((credit) => credit.artistId === artistId);
  const canPlay = typeof performance.clipUrl === 'string';

  const openComparison = React.useCallback(() => {
    router.push(
      `/(tabs)/compare?composerId=${performance.composerId}&pieceId=${performance.pieceId}&sectorId=${performance.sectorId}`
    );
  }, [performance.composerId, performance.pieceId, performance.sectorId, router]);

  return (
    <Card className="overflow-hidden">
      <View className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-semibold">{performance.sectorName}</Text>
            <Text className="text-xs text-muted-foreground">
              원본 영상 {formatOriginalTime(performance.startMs)}–
              {formatOriginalTime(performance.endMs)}
            </Text>
          </View>
          {artistCredit && (
            <View className="rounded-full bg-primary/10 px-2.5 py-1">
              <Text className="text-xs font-medium text-primary">
                {ROLE_LABELS[artistCredit.role]}
              </Text>
            </View>
          )}
        </View>

        <Credits credits={performance.credits} />

        {isSelected && canPlay && (
          <View className="overflow-hidden rounded-lg bg-black" style={{ height: 220 }}>
            <PerformanceVideoPlayer clipUrl={performance.clipUrl} />
          </View>
        )}
        {isSelected && !canPlay && (
          <View className="items-center rounded-lg bg-muted p-4">
            <Text className="text-center text-sm text-muted-foreground">
              재생 주소가 준비되지 않았어요. 잠시 후 다시 확인해 주세요.
            </Text>
          </View>
        )}

        <View className="gap-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={!canPlay || Platform.OS !== 'web'}
            onPress={onSelect}>
            <Icon as={PlayCircleIcon} size={16} className="mr-2 text-primary-foreground" />
            <Text>
              {isSelected ? '영상 닫기' : Platform.OS === 'web' ? '영상 보기' : '웹에서 영상 보기'}
            </Text>
          </Button>
          <Button className="flex-1" variant="outline" onPress={openComparison}>
            <Text>다른 연주자와 비교하기</Text>
            <Icon as={ChevronRightIcon} size={16} className="ml-1" />
          </Button>
        </View>
      </View>
    </Card>
  );
}

export function ArtistComparisonSection({ artistId }: ArtistComparisonSectionProps) {
  const [selectedPerformanceId, setSelectedPerformanceId] = React.useState<number | null>(null);
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useArtistComparisonPerformances(artistId);

  const readyPerformances = React.useMemo(
    () =>
      data?.pages.flatMap((page) => page.items).filter((item) => item.clipStatus === 'ready') ?? [],
    [data]
  );
  const groups = React.useMemo(() => groupByPiece(readyPerformances), [readyPerformances]);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 px-1">
        <Icon as={Music2Icon} size={20} className="text-primary" />
        <Text className="text-lg font-bold">이 아티스트의 연주 비교</Text>
      </View>

      {isLoading ? (
        <Card className="items-center gap-3 p-6">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground">연주 비교 영상을 불러오는 중이에요.</Text>
        </Card>
      ) : error ? (
        <Card className="items-center gap-3 p-6">
          <Text className="text-center text-sm text-muted-foreground">
            연주 비교 영상을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.
          </Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Icon as={RotateCcwIcon} size={16} className="mr-2" />
            <Text>다시 시도</Text>
          </Button>
        </Card>
      ) : groups.length === 0 ? (
        <Card className="p-6">
          <Text className="text-center text-muted-foreground">
            비교할 수 있는 연주 영상이 아직 없어요.
          </Text>
        </Card>
      ) : (
        <View className="gap-5">
          {groups.map((group) => (
            <View className="gap-2" key={group.key}>
              <View className="px-1">
                <Text className="font-semibold">{group.pieceTitle}</Text>
                <Text className="text-sm text-muted-foreground">{group.composerName}</Text>
              </View>
              {group.performances.map((performance) => (
                <ComparisonCard
                  artistId={artistId}
                  isSelected={selectedPerformanceId === performance.id}
                  key={performance.id}
                  onSelect={() =>
                    setSelectedPerformanceId((current) =>
                      current === performance.id ? null : performance.id
                    )
                  }
                  performance={performance}
                />
              ))}
            </View>
          ))}
          {hasNextPage && (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              className="items-center rounded-lg border border-border p-3"
              disabled={isFetchingNextPage}
              onPress={() => fetchNextPage()}>
              {isFetchingNextPage ? (
                <ActivityIndicator />
              ) : (
                <Text className="font-medium">연주 더 보기</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
