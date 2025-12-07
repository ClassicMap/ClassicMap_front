import { Text } from '@/components/ui/text';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { useState, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { XIcon, RefreshCw, Plus } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { getAllPeriods, type PeriodInfo } from '@/lib/data/mockDTO';
import type { Composer } from '@/lib/types/models';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { prefetchImages } from '@/components/optimized-image';
import { getImageUrl } from '@/lib/utils/image';
import { useColorScheme, Platform } from 'react-native';
import { useComposers } from '@/lib/query/hooks/useComposers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TIMELINE_HEIGHT = SCREEN_HEIGHT * 0.4;
const COMPOSER_AVATAR_SIZE = 45;
const TIMELINE_PADDING = 20;
const VERTICAL_LANES = 5; // 레인 수 증가

export default function TimelineScreen() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastFetchRef = useRef<number>(0);

  // 웹과 네이티브 모두에서 다크모드 감지
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(darkModeMediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      darkModeMediaQuery.addEventListener('change', handler);
      return () => darkModeMediaQuery.removeEventListener('change', handler);
    } else {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme]);
  const [currentEraIndex, setCurrentEraIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<PeriodInfo | null>(null);
  const [showEraModal, setShowEraModal] = useState(false);
  const [showComposerForm, setShowComposerForm] = useState(false);
  const [selectedComposerArea, setSelectedComposerArea] = useState<{
    composers: any[];
    era: PeriodInfo;
    centerYear: number;
  } | null>(null);
  const [showComposerAreaModal, setShowComposerAreaModal] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);

  const ERAS = React.useMemo(() => getAllPeriods(), []);

  // React Query 무한 스크롤로 작곡가 데이터 로드
  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching: refreshing,
  } = useComposers();

  // 타임라인에서는 모든 작곡가를 미리 로드
  React.useEffect(() => {
    if (!loading && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [loading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 페이지 데이터를 평탄화 및 중복 제거
  const composers = React.useMemo(() => {
    if (!data?.pages) return [];

    const allComposers = data.pages.flat();

    // ID 기준으로 중복 제거
    const uniqueComposers = Array.from(
      new Map(allComposers.map((composer) => [composer.id, composer])).values()
    );

    return uniqueComposers;
  }, [data]);

  // 에러 처리
  const error = queryError ? '작곡가 정보를 불러오는데 실패했습니다.' : null;

  // 이미지 프리페치 (첫 15개만 - 성능 최적화)
  React.useEffect(() => {
    if (composers.length > 0) {
      const firstBatch = composers
        .slice(0, 15)
        .map((c) => c.avatarUrl)
        .filter(Boolean);
      if (firstBatch.length > 0) {
        prefetchImages(firstBatch);
      }
    }
  }, [composers.length]);

  // 탭을 벗어날 때 쿼리 캐시 정리 (메모리 최적화)
  React.useEffect(() => {
    return () => {
      // 언마운트 시 작곡가 쿼리 제거하여 메모리 확보
    };
  }, []);

  // 새로고침 핸들러
  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  // 무한 스크롤 핸들러
  const handleScroll = React.useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200;

    if (contentSize.height === 0) return; // Not rendered yet
    if (contentOffset.y < 0) return; // Pulling refresh

    const hasScrolled = contentOffset.y > 200;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (!hasScrolled || !isNearBottom) return;

    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return; // Throttle: 1 second

    if (hasNextPage && !isFetchingNextPage) {
      lastFetchRef.current = now;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 2초마다 로테이션 인덱스 변경
  React.useEffect(() => {
    const interval = setInterval(() => {
      setRotationIndex((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <Text className="mb-4 text-center text-destructive">{error}</Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Text>다시 시도</Text>
          </Button>
        </Card>
      </View>
    );
  }

  const COMPOSERS = React.useMemo(() => {
    return composers.map((c) => {
      const imageUrl = c.avatarUrl || c.imageUrl || c.coverImageUrl;
      return {
        id: c.id,
        name: c.name,
        fullName: c.fullName || c.name,
        birthYear: c.birthYear || 0,
        deathYear: c.deathYear ?? null,
        period: c.period,
        nationality: c.nationality || '',
        image: imageUrl,
      };
    });
  }, [composers]);

  // 타임라인 그래프 계산 최적화 - 무거운 계산들을 useMemo로 캐싱
  const timelineCalculations = React.useMemo(() => {
    // 각 시대별 작곡가들을 그룹화하고 정렬
    const composersByEra: { [key: string]: typeof COMPOSERS } = {};
    ERAS.forEach((era) => {
      composersByEra[era.id] = COMPOSERS.filter((c) => {
        const periodMap: { [key: string]: string } = {
          바로크: 'baroque',
          고전주의: 'classical',
          낭만주의: 'romantic',
          근현대: 'modern',
        };
        return periodMap[c.period] === era.id;
      }).sort((a, b) => a.birthYear - b.birthYear);
    });

    // 전체 연도 범위 계산
    const globalMinYear = Math.min(...ERAS.map((e) => e.startYear));
    const globalMaxYear = Math.max(...ERAS.map((e) => e.endYear));

    // 각 시대의 작곡가 밀도를 고려한 픽셀 계산
    const basePixelPerYear = 4;
    const emptyPixelPerYear = 1;
    const composerDensityFactor = 100;

    // 각 연도별로 작곡가가 있는지 확인
    const hasComposerInYear: { [year: number]: boolean } = {};
    COMPOSERS.forEach((composer) => {
      for (let year = composer.birthYear; year <= composer.deathYear; year++) {
        hasComposerInYear[year] = true;
      }
    });

    // 각 연도별로 최대 픽셀 밀도 계산
    const pixelPerYearMap: { [year: number]: number } = {};
    for (let year = globalMinYear; year <= globalMaxYear; year++) {
      if (!hasComposerInYear[year]) {
        pixelPerYearMap[year] = emptyPixelPerYear;
        continue;
      }

      let maxPixelPerYear = basePixelPerYear;

      ERAS.forEach((era) => {
        if (year >= era.startYear && year <= era.endYear) {
          const yearSpan = era.endYear - era.startYear;
          const composerCount = composersByEra[era.id].length;
          const density = composerCount / yearSpan;
          const pixelForThisEra = basePixelPerYear + density * composerDensityFactor;
          maxPixelPerYear = Math.max(maxPixelPerYear, pixelForThisEra);
        }
      });

      pixelPerYearMap[year] = maxPixelPerYear;
    }

    // 각 시대의 실제 위치와 넓이 계산
    const eraPositions: { [key: string]: { start: number; width: number } } = {};

    ERAS.forEach((era) => {
      let width = 0;
      for (let year = era.startYear; year < era.endYear; year++) {
        width += pixelPerYearMap[year] || basePixelPerYear;
      }

      let start = 0;
      for (let year = globalMinYear; year < era.startYear; year++) {
        start += pixelPerYearMap[year] || basePixelPerYear;
      }

      eraPositions[era.id] = { start, width };
    });

    // 전체 너비 계산
    let totalWidth = 0;
    for (let year = globalMinYear; year < globalMaxYear; year++) {
      totalWidth += pixelPerYearMap[year] || basePixelPerYear;
    }

    // 각 작곡가의 위치 및 레인 계산
    const composerPositions: { [key: number]: { x: number; lane: number; crowded: boolean } } = {};

    ERAS.forEach((era) => {
      const composers = composersByEra[era.id];
      const eraStart = eraPositions[era.id].start;
      const eraWidth = eraPositions[era.id].width;

      const composersWithX: Array<{ composer: (typeof COMPOSERS)[0]; x: number }> = [];
      composers.forEach((composer) => {
        const yearRatio = (composer.birthYear - era.startYear) / (era.endYear - era.startYear);
        const x = eraStart + eraWidth * yearRatio;
        composersWithX.push({ composer, x });
      });

      composersWithX.sort((a, b) => a.x - b.x);

      const collisionRange = 60;

      composersWithX.forEach(({ composer, x }) => {
        const nearbyComposers = Object.entries(composerPositions).filter(([id, pos]) => {
          return Math.abs(pos.x - x) < collisionRange;
        });

        const usedLanes = new Set(nearbyComposers.map(([id, pos]) => pos.lane));

        let lane = 0;
        while (usedLanes.has(lane) && lane < VERTICAL_LANES) {
          lane++;
        }
        if (lane >= VERTICAL_LANES) {
          lane = Math.floor(Math.random() * VERTICAL_LANES);
        }

        const isCrowded = nearbyComposers.length > 0;
        composerPositions[composer.id] = { x, lane, crowded: isCrowded };
      });
    });

    return {
      composersByEra,
      eraPositions,
      totalWidth,
      composerPositions,
    };
  }, [COMPOSERS, ERAS]);

  const handleComposerPress = React.useCallback(
    (composer: any) => {
      router.push(`/composer/${composer.id}`);
    },
    [router]
  );

  const handleComposerAreaPress = React.useCallback(
    (composer: any, nearbyComposers: any[], era: PeriodInfo) => {
      setSelectedComposerArea({
        composers: [composer, ...nearbyComposers],
        era,
        centerYear: composer.birthYear,
      });
      setShowComposerAreaModal(true);
    },
    []
  );

  const renderTimelineGraph = () => {
    // useMemo로 캐싱된 계산 결과 사용
    const { composersByEra, eraPositions, totalWidth, composerPositions } = timelineCalculations;

    return (
      <View style={{ height: TIMELINE_HEIGHT }}>
        <TouchableOpacity
          onPress={() => {
            setSelectedEra(ERAS[currentEraIndex]);
            setShowEraModal(true);
          }}
          activeOpacity={0.8}>
          <View className="items-center justify-center border-b border-border bg-card/50 py-4">
            <Text className="text-2xl font-bold" style={{ color: ERAS[currentEraIndex].color }}>
              {ERAS[currentEraIndex].name}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: ERAS[currentEraIndex].color, opacity: 0.7 }}>
              {ERAS[currentEraIndex].period}
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">탭하여 자세히 보기</Text>
          </View>
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollX.value = e.nativeEvent.contentOffset.x;
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            const offsetX = contentOffset.x;

            // Update current era based on scroll position
            ERAS.forEach((era, index) => {
              const { start, width } = eraPositions[era.id];
              const eraEnd = start + width;
              const viewCenter = offsetX + SCREEN_WIDTH / 2;

              if (viewCenter >= start && viewCenter <= eraEnd) {
                setCurrentEraIndex(index);
              }
            });

          }}>
          <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={true} style={{ flex: 1 }}>
            <View style={{ width: totalWidth, paddingHorizontal: TIMELINE_PADDING }}>
              {/* Era backgrounds */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: TIMELINE_HEIGHT - 60,
                  flexDirection: 'row',
                }}>
                {ERAS.map((era) => {
                  const { start, width } = eraPositions[era.id];

                  return (
                    <View
                      key={era.id}
                      style={{
                        position: 'absolute',
                        left: start,
                        width: width,
                        height: TIMELINE_HEIGHT - 60,
                        backgroundColor: era.color + '15',
                        borderLeftWidth: 2,
                        borderRightWidth: 2,
                        borderColor: era.color + '40',
                      }}
                    />
                  );
                })}
              </View>

              {/* Timeline axis */}
              <View
                style={{
                  position: 'absolute',
                  top: (TIMELINE_HEIGHT - 60) / 2,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: '#888',
                  opacity: 0.3,
                }}
              />

              {/* Year markers */}
              <View
                style={{
                  position: 'absolute',
                  top: (TIMELINE_HEIGHT - 60) / 2 + 10,
                  left: 0,
                  right: 0,
                }}>
                {(() => {
                  const interval = 20;
                  const allMarkers: React.ReactNode[] = [];
                  const renderedYears = new Set<number>();

                  ERAS.forEach((era) => {
                    const { start, width } = eraPositions[era.id];
                    const startYear = Math.floor(era.startYear / interval) * interval;
                    const endYear = Math.ceil(era.endYear / interval) * interval;

                    for (let year = startYear; year <= endYear; year += interval) {
                      if (year < era.startYear || year > era.endYear) continue;
                      if (renderedYears.has(year)) continue;

                      renderedYears.add(year);
                      const yearRatio = (year - era.startYear) / (era.endYear - era.startYear);
                      const x = start + width * yearRatio;

                      allMarkers.push(
                        <View
                          key={`${year}`}
                          style={{
                            position: 'absolute',
                            left: x,
                            alignItems: 'center',
                          }}>
                          <View
                            style={{
                              width: 2,
                              height: 10,
                              backgroundColor: era.color,
                              opacity: 0.7,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              color: era.color,
                              opacity: 0.9,
                              fontWeight: '700',
                              marginTop: 3,
                            }}>
                            {year}
                          </Text>
                        </View>
                      );
                    }
                  });

                  return allMarkers;
                })()}
              </View>

              {/* Composers on timeline */}
              {(() => {
                // 타임라인 높이 범위 계산
                const timelineMinY = 0;
                const timelineMaxY = TIMELINE_HEIGHT - 60;

                // 각 x 위치별로 작곡가들을 그룹화
                const composersByXPosition: { [key: number]: typeof COMPOSERS } = {};

                COMPOSERS.forEach((composer) => {
                  const position = composerPositions[composer.id];
                  if (!position) return;

                  const { x } = position;
                  const xKey = Math.round(x / 10) * 10; // 10px 단위로 그룹화

                  if (!composersByXPosition[xKey]) {
                    composersByXPosition[xKey] = [];
                  }
                  composersByXPosition[xKey].push(composer);
                });

                // 각 위치별로 표시할 작곡가와 숨길 작곡가 결정
                const composerGroups: {
                  [key: string]: { visible: typeof COMPOSERS; hidden: typeof COMPOSERS };
                } = {};
                const processedComposers = new Set<number>();

                Object.entries(composersByXPosition).forEach(([xKey, composersAtX]) => {
                  if (composersAtX.length === 0) return;

                  // Y 위치별로 정렬
                  const composersWithY = composersAtX
                    .map((c) => {
                      const position = composerPositions[c.id];
                      if (!position) return null;

                      const { lane } = position;
                      const laneHeight = timelineMaxY / VERTICAL_LANES;
                      const y = lane * laneHeight + laneHeight / 2 - timelineMaxY / 2;

                      return { composer: c, y, position };
                    })
                    .filter(Boolean) as Array<{ composer: any; y: number; position: any }>;

                  composersWithY.sort((a, b) => a.y - b.y);

                  // 타임라인 범위 내에 있는 작곡가들
                  const visibleComposers: typeof COMPOSERS = [];
                  const hiddenComposers: typeof COMPOSERS = [];

                  composersWithY.forEach(({ composer, y }) => {
                    const topY = y - COMPOSER_AVATAR_SIZE / 2;
                    const bottomY = y + COMPOSER_AVATAR_SIZE / 2;

                    // 완전히 범위 안에 있거나, 일부라도 보이면 visible로
                    if (
                      topY >= timelineMinY - COMPOSER_AVATAR_SIZE &&
                      bottomY <= timelineMaxY + COMPOSER_AVATAR_SIZE
                    ) {
                      // 이미 visible에 있는 작곡가와 겹치는지 확인
                      const overlaps = visibleComposers.some((vc) => {
                        const vcPos = composerPositions[vc.id];
                        if (!vcPos) return false;
                        const vcLaneHeight = timelineMaxY / VERTICAL_LANES;
                        const vcY = vcPos.lane * vcLaneHeight + vcLaneHeight / 2 - timelineMaxY / 2;
                        return Math.abs(y - vcY) < COMPOSER_AVATAR_SIZE * 0.8;
                      });

                      if (overlaps) {
                        hiddenComposers.push(composer);
                      } else {
                        visibleComposers.push(composer);
                      }
                    } else {
                      // 범위 밖이면 hidden
                      hiddenComposers.push(composer);
                    }
                  });

                  // 최소 1명은 보여야 함
                  if (visibleComposers.length === 0 && composersWithY.length > 0) {
                    visibleComposers.push(composersWithY[0].composer);
                    hiddenComposers.splice(0, 1);
                  }

                  visibleComposers.forEach((c) => processedComposers.add(c.id));
                  hiddenComposers.forEach((c) => processedComposers.add(c.id));

                  if (visibleComposers.length > 0) {
                    composerGroups[xKey] = { visible: visibleComposers, hidden: hiddenComposers };
                  }
                });

                return Object.entries(composerGroups).map(([groupKey, { visible, hidden }]) => {
                  if (visible.length === 0) return null;

                  const hasHidden = hidden.length > 0;
                  const allComposers = [...visible, ...hidden];

                  // 로테이션: visible 작곡가들 중에서 순환
                  const currentComposerIndex =
                    hasHidden || visible.length > 1 ? rotationIndex % allComposers.length : 0;
                  const displayComposer = allComposers[currentComposerIndex];

                  const periodMap: { [key: string]: string } = {
                    바로크: 'baroque',
                    고전주의: 'classical',
                    낭만주의: 'romantic',
                    근현대: 'modern',
                  };
                  const eraId = periodMap[displayComposer.period];
                  const era = ERAS.find((e) => e.id === eraId);
                  if (!era) return null;

                  const position = composerPositions[visible[0].id]; // 위치는 첫번째 작곡가 기준
                  if (!position) return null;

                  const { x, lane } = position;
                  const laneHeight = (TIMELINE_HEIGHT - 60) / VERTICAL_LANES;
                  const verticalOffset =
                    lane * laneHeight + laneHeight / 2 - (TIMELINE_HEIGHT - 60) / 2;

                  return (
                    <TouchableOpacity
                      key={groupKey}
                      onPress={() => {
                        if (hasHidden || visible.length > 1) {
                          handleComposerAreaPress(
                            displayComposer,
                            allComposers.filter((c) => c.id !== displayComposer.id),
                            era
                          );
                        } else {
                          handleComposerPress(displayComposer);
                        }
                      }}
                      activeOpacity={0.8}
                      style={{
                        position: 'absolute',
                        left: x - COMPOSER_AVATAR_SIZE / 2,
                        top: (TIMELINE_HEIGHT - 60) / 2 - COMPOSER_AVATAR_SIZE / 2 + verticalOffset,
                        zIndex: 10,
                      }}>
                      <View
                        style={{
                          alignItems: 'center',
                          gap: 4,
                          zIndex: 10,
                        }}>
                        {/* 메인 아바타 (로테이션) */}
                        <View
                          style={{
                            position: 'relative',
                            width: COMPOSER_AVATAR_SIZE,
                            height: COMPOSER_AVATAR_SIZE,
                          }}>
                          <Animated.View
                            key={`${groupKey}-${currentComposerIndex}`}
                            entering={FadeIn.duration(400)}
                            exiting={FadeOut.duration(300)}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: COMPOSER_AVATAR_SIZE,
                              height: COMPOSER_AVATAR_SIZE,
                            }}>
                            {hasHidden || visible.length > 1 ? (
                              <>
                                {/* 뒤에 희미한 아바타 (다음 작곡가 힌트) */}
                                {allComposers.length > 1 && (
                                  <View
                                    style={{
                                      position: 'absolute',
                                      left: 4,
                                      top: 4,
                                      width: COMPOSER_AVATAR_SIZE,
                                      height: COMPOSER_AVATAR_SIZE,
                                      borderRadius: COMPOSER_AVATAR_SIZE / 2,
                                      borderWidth: 2,
                                      borderColor: era.color,
                                      overflow: 'hidden',
                                      backgroundColor: '#fff',
                                      opacity: 0.3,
                                    }}>
                                    {allComposers[(currentComposerIndex + 1) % allComposers.length]
                                      .image ? (
                                      <Image
                                        source={{
                                          uri: getImageUrl(
                                            allComposers[
                                              (currentComposerIndex + 1) % allComposers.length
                                            ].image
                                          ),
                                        }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <View
                                        className="size-full items-center justify-center"
                                        style={{ backgroundColor: era.color + '30' }}>
                                        <Text
                                          className="text-sm font-bold"
                                          style={{ color: era.color }}>
                                          {
                                            allComposers[
                                              (currentComposerIndex + 1) % allComposers.length
                                            ].name[0]
                                          }
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                                {/* 현재 표시 중인 아바타 */}
                                <View
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: COMPOSER_AVATAR_SIZE,
                                    height: COMPOSER_AVATAR_SIZE,
                                    borderRadius: COMPOSER_AVATAR_SIZE / 2,
                                    borderWidth: 2,
                                    borderColor: era.color,
                                    overflow: 'hidden',
                                    backgroundColor: '#fff',
                                  }}>
                                  {displayComposer.image ? (
                                    <Image
                                      source={{ uri: getImageUrl(displayComposer.image) }}
                                      style={{ width: '100%', height: '100%' }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View
                                      className="size-full items-center justify-center"
                                      style={{ backgroundColor: era.color + '30' }}>
                                      <Text
                                        className="text-sm font-bold"
                                        style={{ color: era.color }}>
                                        {displayComposer.name[0]}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </>
                            ) : (
                              <View
                                style={{
                                  width: COMPOSER_AVATAR_SIZE,
                                  height: COMPOSER_AVATAR_SIZE,
                                  borderRadius: COMPOSER_AVATAR_SIZE / 2,
                                  borderWidth: 2,
                                  borderColor: era.color,
                                  overflow: 'hidden',
                                  backgroundColor: '#fff',
                                }}>
                                {displayComposer.image ? (
                                  <Image
                                    source={{ uri: getImageUrl(displayComposer.image) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View
                                    className="size-full items-center justify-center"
                                    style={{ backgroundColor: era.color + '30' }}>
                                    <Text
                                      className="text-sm font-bold"
                                      style={{ color: era.color }}>
                                      {displayComposer.name[0]}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </Animated.View>
                        </View>

                        {/* 이름 라벨 - 애니메이션 적용 */}
                        <Animated.View
                          key={`label-${groupKey}-${currentComposerIndex}`}
                          entering={FadeIn.duration(400)}
                          exiting={FadeOut.duration(300)}>
                          {!(hasHidden || visible.length > 1) && (
                            <View
                              className="rounded-full border px-2 py-0.5"
                              style={{
                                borderColor: era.color,
                                borderWidth: 1.5,
                                backgroundColor: era.color + (isDark ? '30' : '20'),
                                ...(Platform.OS === 'web'
                                  ? {
                                      boxShadow: `0 1px 3px ${era.color}40`,
                                    }
                                  : {
                                      shadowColor: era.color,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.3,
                                      shadowRadius: 2,
                                      elevation: 3,
                                    }),
                              }}>
                              <Text
                                className="text-[9px] font-bold"
                                style={{ color: isDark ? '#ffffff' : '#000000' }}>
                                {displayComposer.name}
                              </Text>
                            </View>
                          )}
                          {hasHidden && (
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{
                                borderColor: era.color,
                                borderWidth: 1.5,
                                backgroundColor: era.color + (isDark ? '40' : '30'),
                                ...(Platform.OS === 'web'
                                  ? {
                                      boxShadow: `0 1px 3px ${era.color}50`,
                                    }
                                  : {
                                      shadowColor: era.color,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.4,
                                      shadowRadius: 2,
                                      elevation: 4,
                                    }),
                              }}>
                              <Text
                                className="text-[9px] font-bold"
                                style={{ color: isDark ? '#ffffff' : '#000000' }}>
                                {displayComposer.name}+{allComposers.length - 1}
                              </Text>
                            </View>
                          )}
                          {!hasHidden && visible.length > 1 && (
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{
                                borderColor: era.color,
                                borderWidth: 1.5,
                                backgroundColor: era.color + (isDark ? '35' : '25'),
                                ...(Platform.OS === 'web'
                                  ? {
                                      boxShadow: `0 1px 3px ${era.color}45`,
                                    }
                                  : {
                                      shadowColor: era.color,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.35,
                                      shadowRadius: 2,
                                      elevation: 3,
                                    }),
                              }}>
                              <Text
                                className="text-[9px] font-bold"
                                style={{ color: isDark ? '#ffffff' : '#000000' }}>
                                {visible.length}명
                              </Text>
                            </View>
                          )}
                        </Animated.View>
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </ScrollView>
        </ScrollView>

        <View className="absolute bottom-2 left-0 right-0 items-center">
          <View className="rounded-full bg-muted/80 px-4 py-2">
            <Text className="text-xs text-muted-foreground">← 좌우/위아래로 스크롤하세요 →</Text>
          </View>
        </View>
      </View>
    );
  };

  const getComposersForEra = React.useCallback(
    (eraId: string) => {
      const periodMap: { [key: string]: string[] } = {
        baroque: ['바로크'],
        classical: ['고전주의'],
        romantic: ['낭만주의'],
        modern: ['근현대'],
      };
      const periodNames = periodMap[eraId] || [];
      return COMPOSERS.filter((c) => periodNames.includes(c.period)).sort(
        (a, b) => a.birthYear - b.birthYear
      );
    },
    [COMPOSERS]
  );

  const filterComposers = React.useCallback(
    (composers: typeof COMPOSERS) => {
      if (!searchQuery.trim()) return composers;

      const query = searchQuery.toLowerCase();
      return composers.filter(
        (composer) =>
          composer.name.toLowerCase().includes(query) ||
          composer.fullName.toLowerCase().includes(query) ||
          composer.nationality.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        {renderTimelineGraph()}

        {/* Era Info Modal */}
        <Modal
          visible={showEraModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowEraModal(false)}>
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setShowEraModal(false)}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                entering={SlideInDown.duration(300).springify()}
                exiting={SlideOutDown.duration(200)}
                className="overflow-hidden rounded-t-3xl"
                style={{
                  maxHeight: SCREEN_HEIGHT * 0.8,
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                }}>
                {selectedEra && (
                  <>
                    {/* 헤더 */}
                    <View
                      className="px-6 pb-4 pt-6"
                      style={{
                        backgroundColor: selectedEra.color + '20',
                        borderBottomWidth: 3,
                        borderBottomColor: selectedEra.color,
                      }}>
                      <View className="mb-3 flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-4xl font-bold" style={{ color: selectedEra.color }}>
                            {selectedEra.name}
                          </Text>
                          <Text
                            className="mt-1 text-base font-semibold"
                            style={{ color: selectedEra.color, opacity: 0.8 }}>
                            {selectedEra.period}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setShowEraModal(false)}
                          className="rounded-full p-2.5"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          }}>
                          <Icon as={XIcon} size={24} style={{ color: selectedEra.color }} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 스크롤 가능한 내용 */}
                    <ScrollView className="px-6 py-5" showsVerticalScrollIndicator={false}>
                      <View className="gap-5 pb-8">
                        {/* 설명 */}
                        <View
                          className="rounded-2xl p-5"
                          style={{
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.05)'
                              : selectedEra.color + '10',
                            borderWidth: 1,
                            borderColor: selectedEra.color + '30',
                          }}>
                          <Text
                            className="text-base leading-7"
                            style={{ color: isDark ? '#e5e5e5' : '#171717' }}>
                            {selectedEra.description}
                          </Text>
                        </View>

                        {/* 주요 특징 */}
                        {selectedEra.characteristics && (
                          <View className="gap-3">
                            <Text
                              className="text-xl font-bold"
                              style={{ color: isDark ? '#e5e5e5' : '#171717' }}>
                              주요 특징
                            </Text>
                            <View className="gap-3">
                              {selectedEra.characteristics.map((char, index) => (
                                <Animated.View
                                  key={index}
                                  entering={FadeIn.delay(index * 80).duration(300)}
                                  className="flex-row items-start gap-3 rounded-xl p-4"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                    borderLeftWidth: 4,
                                    borderLeftColor: selectedEra.color,
                                    ...(Platform.OS === 'web'
                                      ? {
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        }
                                      : {
                                          shadowColor: '#000',
                                          shadowOffset: { width: 0, height: 1 },
                                          shadowOpacity: 0.1,
                                          shadowRadius: 2,
                                          elevation: 2,
                                        }),
                                  }}>
                                  <View
                                    className="mt-1.5 size-2.5 rounded-full"
                                    style={{ backgroundColor: selectedEra.color }}
                                  />
                                  <Text
                                    className="flex-1 text-base leading-6"
                                    style={{ color: isDark ? '#e5e5e5' : '#171717' }}>
                                    {char}
                                  </Text>
                                </Animated.View>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* 대표 작곡가 */}
                        {selectedEra.keyComposers && (
                          <View className="gap-3">
                            <Text
                              className="text-xl font-bold"
                              style={{ color: isDark ? '#e5e5e5' : '#171717' }}>
                              대표 작곡가
                            </Text>
                            <View className="flex-row flex-wrap gap-2.5">
                              {selectedEra.keyComposers.map((composer, index) => (
                                <Animated.View
                                  key={index}
                                  entering={FadeIn.delay(index * 60 + 200).duration(300)}
                                  className="rounded-full px-5 py-2.5"
                                  style={{
                                    backgroundColor: selectedEra.color + '25',
                                    borderWidth: 1.5,
                                    borderColor: selectedEra.color,
                                  }}>
                                  <Text
                                    className="text-sm font-bold"
                                    style={{ color: selectedEra.color }}>
                                    {composer}
                                  </Text>
                                </Animated.View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </>
                )}
              </Animated.View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Composer Area Modal - 작곡가 밀집 영역 확대 */}
        <Modal
          visible={showComposerAreaModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowComposerAreaModal(false)}>
          <Pressable
            className="flex-1 justify-center bg-black/70"
            onPress={() => setShowComposerAreaModal(false)}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="mx-4 rounded-3xl bg-background"
                style={{
                  maxHeight: SCREEN_HEIGHT * 0.8,
                }}>
                {selectedComposerArea && (
                  <ScrollView className="p-6">
                    <View className="mb-6 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          className="text-2xl font-bold"
                          style={{ color: selectedComposerArea.era.color }}>
                          {selectedComposerArea.era.name}
                        </Text>
                        <Text className="mt-1 text-sm text-muted-foreground">
                          {selectedComposerArea.centerYear}년 전후 작곡가들
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowComposerAreaModal(false)}
                        className="rounded-full bg-muted p-2">
                        <Icon as={XIcon} size={24} className="text-foreground" />
                      </TouchableOpacity>
                    </View>

                    <View className="gap-3">
                      {selectedComposerArea.composers
                        .sort((a, b) => a.birthYear - b.birthYear)
                        .map((composer, index) => (
                          <Animated.View
                            key={composer.id}
                            entering={FadeIn.delay(index * 80).duration(300)}>
                            <TouchableOpacity
                              onPress={() => {
                                setShowComposerAreaModal(false);
                                handleComposerPress(composer);
                              }}
                              className="flex-row items-center gap-4 rounded-2xl bg-card p-4"
                              style={{
                                borderLeftWidth: 4,
                                borderLeftColor: selectedComposerArea.era.color,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                              }}>
                              <View
                                style={{
                                  width: 70,
                                  height: 70,
                                  borderRadius: 35,
                                  overflow: 'hidden',
                                  backgroundColor: selectedComposerArea.era.color + '20',
                                  borderWidth: 3,
                                  borderColor: selectedComposerArea.era.color,
                                }}>
                                {composer.image ? (
                                  <Image
                                    source={{ uri: getImageUrl(composer.image) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="size-full items-center justify-center">
                                    <Text
                                      className="text-2xl font-bold"
                                      style={{ color: selectedComposerArea.era.color }}>
                                      {composer.name[0]}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <View className="flex-1">
                                <Text className="text-lg font-bold">{composer.name}</Text>
                                <Text className="text-sm text-muted-foreground">
                                  {composer.fullName}
                                </Text>
                                <View className="mt-2 flex-row items-center gap-2">
                                  <View
                                    className="rounded-full px-3 py-1"
                                    style={{
                                      backgroundColor: selectedComposerArea.era.color + '20',
                                    }}>
                                    <Text
                                      className="text-xs font-semibold"
                                      style={{ color: selectedComposerArea.era.color }}>
                                      {composer.birthYear}~{composer.deathYear || '현재'}
                                    </Text>
                                  </View>
                                  <Text className="text-xs text-muted-foreground">
                                    {composer.nationality}
                                  </Text>
                                </View>
                              </View>

                              <View className="items-center justify-center">
                                <Text
                                  className="text-2xl"
                                  style={{ color: selectedComposerArea.era.color }}>
                                  →
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </Animated.View>
                        ))}
                    </View>

                    <View className="mt-6 rounded-xl bg-muted p-4">
                      <Text className="text-center text-sm text-muted-foreground">
                        작곡가를 선택하면 상세 정보를 볼 수 있습니다
                      </Text>
                    </View>
                  </ScrollView>
                )}
              </Animated.View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Composer List */}
        <ScrollView
          className="flex-1"
          onScroll={handleScroll}
          scrollEventThrottle={400}>
          <View className="gap-6 p-6">
            <View className="flex-row items-center">
              <View className="flex-1" />
              <View className="items-center gap-2">
                <Text variant="h1" className="text-center text-2xl font-bold">
                  작곡가 목록
                </Text>
                <Text className="text-center text-sm text-muted-foreground">
                  시대별로 정리된 작곡가들을 탐험하세요
                </Text>
              </View>
              <View className="flex-1 flex-row items-end justify-end gap-2">
                {canEdit && (
                  <TouchableOpacity
                    onPress={() => setShowComposerForm(true)}
                    className="rounded-full bg-primary p-2"
                    activeOpacity={0.7}>
                    <Icon as={Plus} size={18} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onRefresh}
                  disabled={refreshing}
                  className="rounded-full border border-border bg-card p-2"
                  activeOpacity={0.7}>
                  <Icon
                    as={RefreshCw}
                    size={18}
                    className={`text-foreground ${refreshing ? 'opacity-50' : ''}`}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="gap-2">
              <TextInput
                className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                placeholder="작곡가 검색 (이름, 국적)"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  className="absolute right-3 top-3">
                  <View className="rounded-full bg-muted p-1">
                    <Text className="text-xs text-muted-foreground">✕</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {ERAS.map((era) => {
              const composers = getComposersForEra(era.id);
              const filteredComposers = filterComposers(composers);

              if (filteredComposers.length === 0) return null;

              return (
                <View key={era.id} className="gap-3">
                  <View className="rounded-xl p-4" style={{ backgroundColor: era.color + '20' }}>
                    <Text className="text-xl font-bold" style={{ color: era.color }}>
                      {era.name} ({era.period})
                    </Text>
                    {searchQuery.length > 0 && (
                      <Text className="mt-1 text-xs" style={{ color: era.color, opacity: 0.7 }}>
                        {filteredComposers.length}명
                      </Text>
                    )}
                  </View>

                  <View className="gap-2">
                    {filteredComposers.map((composer) => (
                      <TouchableOpacity
                        key={composer.id}
                        onPress={() => handleComposerPress(composer)}
                        className="flex-row items-center gap-3 rounded-xl bg-card p-3"
                        style={{
                          borderLeftWidth: 4,
                          borderLeftColor: era.color,
                        }}>
                        <View
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            overflow: 'hidden',
                            backgroundColor: era.color + '20',
                          }}>
                          {composer.image ? (
                            <Image
                              source={{ uri: getImageUrl(composer.image) }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="size-full items-center justify-center">
                              <Text className="text-lg font-bold" style={{ color: era.color }}>
                                {composer.name[0]}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <Text className="font-bold">{composer.name}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {composer.birthYear}~{composer.deathYear ? composer.deathYear : '현재'}{' '}
                            · {composer.nationality}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Composer Form Modal */}
        {canEdit && (
          <ComposerFormModal
            visible={showComposerForm}
            onClose={() => setShowComposerForm(false)}
            onSuccess={() => {
              refetch();
            }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}
