import { Text } from '@/components/ui/text';
import { View, ScrollView, TouchableOpacity, Dimensions, Image, TextInput, Modal, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
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
import { ComposerAPI } from '@/lib/api/client';
import { getAllPeriods, type PeriodInfo } from '@/lib/data/mockDTO';
import type { Composer } from '@/lib/types/models';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import { prefetchImages } from '@/components/optimized-image';
import { getImageUrl } from '@/lib/utils/image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TIMELINE_HEIGHT = SCREEN_HEIGHT * 0.4;
const COMPOSER_AVATAR_SIZE = 50;
const TIMELINE_PADDING = 20;
const VERTICAL_LANES = 4;

export default function TimelineScreen() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentEraIndex, setCurrentEraIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<PeriodInfo | null>(null);
  const [showEraModal, setShowEraModal] = useState(false);
  const [composers, setComposers] = useState<Composer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComposerForm, setShowComposerForm] = useState(false);

  const ERAS = React.useMemo(() => getAllPeriods(), []);

  const loadComposers = React.useCallback(() => {
    ComposerAPI.getAll()
      .then((data) => {
        setComposers(data);
        prefetchImages(data.map(c => c.avatarUrl));
        setLoading(false);
      })
      .catch((err) => {
        setError('작곡가 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      });
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    ComposerAPI.getAll()
      .then((data) => {
        setComposers(data);
        prefetchImages(data.map(c => c.avatarUrl));
        setError(null);
        setRefreshing(false);
      })
      .catch((err) => {
        setError('작곡가 정보를 불러오는데 실패했습니다.');
        setRefreshing(false);
      });
  }, []);

  React.useEffect(() => {
    loadComposers();
  }, [loadComposers]);

  useFocusEffect(
    React.useCallback(() => {
      loadComposers();
    }, [loadComposers])
  );

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
        <Card className="p-8 w-full max-w-md">
          <Text className="text-center text-destructive mb-4">{error}</Text>
          <Button 
            variant="outline" 
            onPress={loadComposers}
          >
            <Text>다시 시도</Text>
          </Button>
        </Card>
      </View>
    );
  }

  const COMPOSERS = composers.map(c => {
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

  const handleComposerPress = (composer: any) => {
    router.push(`/composer/${composer.id}`);
  };

  const renderTimelineGraph = () => {
    // 각 시대별 작곡가들을 그룹화하고 정렬
    const composersByEra: { [key: string]: typeof COMPOSERS } = {};
    ERAS.forEach(era => {
      composersByEra[era.id] = COMPOSERS.filter(c => {
        const periodMap: { [key: string]: string } = {
          '바로크': 'baroque',
          '고전주의': 'classical',
          '낭만주의': 'romantic',
          '근현대': 'modern',
        };
        return periodMap[c.period] === era.id;
      }).sort((a, b) => a.birthYear - b.birthYear);
    });
    
    // 전체 연도 범위 계산
    const globalMinYear = Math.min(...ERAS.map(e => e.startYear));
    const globalMaxYear = Math.max(...ERAS.map(e => e.endYear));
    
    // 각 시대의 작곡가 밀도를 고려한 픽셀 계산
    const basePixelPerYear = 4;
    const emptyPixelPerYear = 1;
    const composerDensityFactor = 100;
    
    // 각 연도별로 작곡가가 있는지 확인
    const hasComposerInYear: { [year: number]: boolean } = {};
    COMPOSERS.forEach(composer => {
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
      
      ERAS.forEach(era => {
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
    
    ERAS.forEach(era => {
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
    
    ERAS.forEach(era => {
      const composers = composersByEra[era.id];
      const eraStart = eraPositions[era.id].start;
      const eraWidth = eraPositions[era.id].width;
      
      const composersWithX: Array<{ composer: typeof COMPOSERS[0]; x: number }> = [];
      composers.forEach(composer => {
        const yearRatio = (composer.birthYear - era.startYear) / (era.endYear - era.startYear);
        const x = eraStart + eraWidth * yearRatio;
        composersWithX.push({ composer, x });
      });
      
      composersWithX.sort((a, b) => a.x - b.x);
      
      const collisionRange = 100;
      
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
          lane = 0;
        }
        
        const isCrowded = nearbyComposers.length > 0;
        composerPositions[composer.id] = { x, lane, crowded: isCrowded };
      });
    });

    return (
      <View style={{ height: TIMELINE_HEIGHT }}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedEra(ERAS[currentEraIndex]);
            setShowEraModal(true);
          }}
          activeOpacity={0.8}
        >
          <View className="items-center justify-center py-4 bg-card/50 border-b border-border">
            <Text className="text-2xl font-bold" style={{ color: ERAS[currentEraIndex].color }}>
              {ERAS[currentEraIndex].name}
            </Text>
            <Text className="text-sm font-semibold" style={{ color: ERAS[currentEraIndex].color, opacity: 0.7 }}>
              {ERAS[currentEraIndex].period}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              탭하여 자세히 보기
            </Text>
          </View>
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollX.value = e.nativeEvent.contentOffset.x;
            const offsetX = e.nativeEvent.contentOffset.x;
            
            ERAS.forEach((era, index) => {
              const { start, width } = eraPositions[era.id];
              const eraEnd = start + width;
              const viewCenter = offsetX + SCREEN_WIDTH / 2;
              
              if (viewCenter >= start && viewCenter <= eraEnd) {
                setCurrentEraIndex(index);
              }
            });
          }}
        >
          <View style={{ width: totalWidth, paddingHorizontal: TIMELINE_PADDING }}>
            {/* Era backgrounds */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TIMELINE_HEIGHT - 60, flexDirection: 'row' }}>
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
            <View style={{ position: 'absolute', top: (TIMELINE_HEIGHT - 60) / 2 + 10, left: 0, right: 0 }}>
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
                        }}
                      >
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
                          }}
                        >
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
            {COMPOSERS.map((composer) => {
              const periodMap: { [key: string]: string } = {
                '바로크': 'baroque',
                '고전주의': 'classical',
                '낭만주의': 'romantic',
                '근현대': 'modern',
              };
              const eraId = periodMap[composer.period];
              const era = ERAS.find(e => e.id === eraId);
              if (!era) return null;

              const position = composerPositions[composer.id];
              if (!position) return null;

              const { x, lane, crowded } = position;
              const laneHeight = (TIMELINE_HEIGHT - 60) / VERTICAL_LANES;
              const verticalOffset = lane * laneHeight + (laneHeight / 2) - ((TIMELINE_HEIGHT - 60) / 2);

              return (
                <TouchableOpacity
                  key={composer.id}
                  onPress={() => handleComposerPress(composer)}
                  activeOpacity={0.8}
                  style={{
                    position: 'absolute',
                    left: x - COMPOSER_AVATAR_SIZE / 2,
                    top: (TIMELINE_HEIGHT - 60) / 2 - COMPOSER_AVATAR_SIZE / 2 + verticalOffset,
                    zIndex: 10,
                  }}
                >
                  <View style={{ flexDirection: crowded ? 'row' : 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                    <View
                      style={{
                        width: COMPOSER_AVATAR_SIZE,
                        height: COMPOSER_AVATAR_SIZE,
                        borderRadius: COMPOSER_AVATAR_SIZE / 2,
                        borderWidth: 3,
                        borderColor: era.color,
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                      }}
                    >
                      {composer.image ? (
                        <Image
                          source={{ uri: getImageUrl(composer.image) }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="size-full items-center justify-center"
                          style={{ backgroundColor: era.color + '30' }}
                        >
                          <Text className="text-lg font-bold" style={{ color: era.color }}>
                            {composer.name[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View 
                      className="rounded-lg bg-card/95 px-2 py-1 shadow-xl border border-border/20"
                      style={{
                        alignItems: crowded ? 'flex-start' : 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 10,
                      }}
                    >
                      <Text className="text-[10px] font-bold">{composer.name}</Text>
                      <Text className="text-[9px] text-muted-foreground">{composer.birthYear}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View className="absolute bottom-2 left-0 right-0 items-center">
          <View className="rounded-full bg-muted/80 px-4 py-2">
            <Text className="text-xs text-muted-foreground">← 좌우로 스크롤하세요 →</Text>
          </View>
        </View>
      </View>
    );
  };

  const getComposersForEra = (eraId: string) => {
    const periodMap: { [key: string]: string[] } = {
      'baroque': ['바로크'],
      'classical': ['고전주의'],
      'romantic': ['낭만주의'],
      'modern': ['근현대'],
    };
    const periodNames = periodMap[eraId] || [];
    return COMPOSERS.filter(c => periodNames.includes(c.period))
      .sort((a, b) => a.birthYear - b.birthYear);
  };

  const filterComposers = (composers: typeof COMPOSERS) => {
    if (!searchQuery.trim()) return composers;
    
    const query = searchQuery.toLowerCase();
    return composers.filter(composer =>
      composer.name.toLowerCase().includes(query) ||
      composer.fullName.toLowerCase().includes(query) ||
      composer.nationality.toLowerCase().includes(query)
    );
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        {renderTimelineGraph()}

        {/* Era Info Modal */}
        <Modal
          visible={showEraModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowEraModal(false)}
        >
          <Pressable 
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowEraModal(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                entering={SlideInDown.duration(300).springify()}
                exiting={SlideOutDown.duration(200)}
                className="bg-background rounded-t-3xl"
                style={{
                  maxHeight: SCREEN_HEIGHT * 0.7,
                }}
              >
                {selectedEra && (
                  <View className="gap-4 p-6 pb-10">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text 
                          className="text-3xl font-bold"
                          style={{ color: selectedEra.color }}
                        >
                          {selectedEra.name}
                        </Text>
                        <Text 
                          className="text-sm font-semibold mt-1"
                          style={{ color: selectedEra.color, opacity: 0.7 }}
                        >
                          {selectedEra.period}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowEraModal(false)}
                        className="rounded-full p-2 bg-muted"
                      >
                        <Icon as={XIcon} size={24} className="text-foreground" />
                      </TouchableOpacity>
                    </View>

                    <View 
                      className="rounded-xl p-4"
                      style={{ backgroundColor: selectedEra.color + '15' }}
                    >
                      <Text className="text-base leading-6">
                        {selectedEra.description}
                      </Text>
                    </View>

                    {selectedEra.characteristics && (
                      <View className="gap-2">
                        <Text className="text-lg font-bold">주요 특징</Text>
                        <View className="gap-2">
                          {selectedEra.characteristics.map((char, index) => (
                            <Animated.View
                              key={index}
                              entering={FadeIn.delay(index * 100).duration(300)}
                              className="flex-row items-center gap-2 rounded-lg bg-card p-3"
                              style={{
                                borderLeftWidth: 3,
                                borderLeftColor: selectedEra.color,
                              }}
                            >
                              <View 
                                className="size-2 rounded-full"
                                style={{ backgroundColor: selectedEra.color }}
                              />
                              <Text className="flex-1">{char}</Text>
                            </Animated.View>
                          ))}
                        </View>
                      </View>
                    )}

                    {selectedEra.keyComposers && (
                      <View className="gap-2">
                        <Text className="text-lg font-bold">대표 작곡가</Text>
                        <View className="flex-row flex-wrap gap-2">
                          {selectedEra.keyComposers.map((composer, index) => (
                            <Animated.View
                              key={index}
                              entering={FadeIn.delay(index * 100 + 300).duration(300)}
                              className="rounded-full px-4 py-2"
                              style={{
                                backgroundColor: selectedEra.color + '20',
                                borderWidth: 1,
                                borderColor: selectedEra.color,
                              }}
                            >
                              <Text 
                                className="font-semibold"
                                style={{ color: selectedEra.color }}
                              >
                                {composer}
                              </Text>
                            </Animated.View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Composer List */}
        <ScrollView className="flex-1">
          <View className="gap-6 p-6">
            <View className="flex-row items-center">
              <View className="flex-1" />
              <View className="items-center gap-2">
                <Text variant="h1" className="text-2xl font-bold text-center">
                  작곡가 목록
                </Text>
                <Text className="text-sm text-muted-foreground text-center">
                  시대별로 정리된 작곡가들을 탐험하세요
                </Text>
              </View>
              <View className="flex-1 items-end flex-row gap-2 justify-end">
                {canEdit && (
                  <TouchableOpacity
                    onPress={() => setShowComposerForm(true)}
                    className="rounded-full bg-primary p-2"
                    activeOpacity={0.7}
                  >
                    <Icon as={Plus} size={18} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onRefresh}
                  disabled={refreshing}
                  className="rounded-full bg-card border border-border p-2"
                  activeOpacity={0.7}
                >
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
                className="rounded-xl bg-card border border-border px-4 py-3 text-base"
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
                  className="absolute right-3 top-3"
                >
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
                  <View
                    className="rounded-xl p-4"
                    style={{ backgroundColor: era.color + '20' }}
                  >
                    <Text className="text-xl font-bold" style={{ color: era.color }}>
                      {era.name} ({era.period})
                    </Text>
                    {searchQuery.length > 0 && (
                      <Text className="text-xs mt-1" style={{ color: era.color, opacity: 0.7 }}>
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
                        }}
                      >
                        <View
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            overflow: 'hidden',
                            backgroundColor: era.color + '20',
                          }}
                        >
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
                            {composer.birthYear}~{composer.deathYear ? composer.deathYear : '현재'} · {composer.nationality}
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
              loadComposers();
            }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}
