import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, FlatList, TouchableOpacity, Animated, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { PlayCircleIcon, PlusIcon, CheckIcon, EditIcon, TrashIcon } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';
import { ComposerAPI, PieceAPI, PerformanceAPI, ArtistAPI } from '@/lib/api/client';
import { AdminPerformanceAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Composer, Piece, Performance, Artist } from '@/lib/types/models';
import { PerformanceFormModal } from '@/components/admin/PerformanceFormModal';
import { getImageUrl } from '@/lib/utils/image';

interface ComposerWithPieces extends Composer {
  majorPieces?: Piece[];
}

export default function CompareScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { canEdit } = useAuth();
  const [composers, setComposers] = React.useState<ComposerWithPieces[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const [selectedComposer, setSelectedComposer] = React.useState<ComposerWithPieces | null>(null);
  const [selectedPiece, setSelectedPiece] = React.useState<Piece | null>(null);
  const [showComposerList, setShowComposerList] = React.useState(false);
  const [showPieceList, setShowPieceList] = React.useState(false);
  const [noPieceFound, setNoPieceFound] = React.useState(false);
  
  // 연주 관련 state
  const [performances, setPerformances] = React.useState<Performance[]>([]);
  const [artists, setArtists] = React.useState<{ [key: number]: Artist }>({});
  const [performanceFormVisible, setPerformanceFormVisible] = React.useState(false);
  const [selectedPerformance, setSelectedPerformance] = React.useState<Performance | undefined>();
  const [currentPerformanceIndex, setCurrentPerformanceIndex] = React.useState(0);
  const [piecePerformanceCounts, setPiecePerformanceCounts] = React.useState<{ [key: number]: number }>({});
  
  // 애니메이션 값
  const composerAnimation = React.useRef(new Animated.Value(0)).current;
  const pieceAnimation = React.useRef(new Animated.Value(0)).current;

  // FlatList viewable items 변경 핸들러
  const onViewableItemsChanged = React.useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentPerformanceIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // 작곡가 데이터 로드
  React.useEffect(() => {
    loadComposers();
  }, []);

  const loadComposers = async () => {
    setLoading(true);
    setError(null);
    try {
      const composersData = await ComposerAPI.getAll();
      // 각 작곡가의 곡 정보 로드
      const composersWithPieces = await Promise.all(
        composersData.map(async (composer) => {
          try {
            const pieces = await PieceAPI.getByComposer(composer.id);
            return { ...composer, majorPieces: pieces };
          } catch {
            return { ...composer, majorPieces: [] };
          }
        })
      );
      setComposers(composersWithPieces);

      // 각 곡의 연주 개수 로드
      const counts: { [key: number]: number } = {};
      await Promise.all(
        composersWithPieces.flatMap((composer) =>
          (composer.majorPieces || []).map(async (piece) => {
            try {
              const performances = await PerformanceAPI.getByPiece(piece.id);
              counts[piece.id] = performances.length;
            } catch {
              counts[piece.id] = 0;
            }
          })
        )
      );
      setPiecePerformanceCounts(counts);

      if (composersWithPieces.length > 0) {
        setSelectedComposer(composersWithPieces[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load composers:', err);
      setError('작곡가 정보를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const composersData = await ComposerAPI.getAll();
      const composersWithPieces = await Promise.all(
        composersData.map(async (composer) => {
          try {
            const pieces = await PieceAPI.getByComposer(composer.id);
            return { ...composer, majorPieces: pieces };
          } catch {
            return { ...composer, majorPieces: [] };
          }
        })
      );
      setComposers(composersWithPieces);

      // 각 곡의 연주 개수 로드
      const counts: { [key: number]: number } = {};
      await Promise.all(
        composersWithPieces.flatMap((composer) =>
          (composer.majorPieces || []).map(async (piece) => {
            try {
              const performances = await PerformanceAPI.getByPiece(piece.id);
              counts[piece.id] = performances.length;
            } catch {
              counts[piece.id] = 0;
            }
          })
        )
      );
      setPiecePerformanceCounts(counts);

      setError(null);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to refresh composers:', err);
      setError('작곡가 정보를 불러오는데 실패했습니다.');
      setRefreshing(false);
    }
  }, []);

  // 초기화: 작곡가 선택 시 첫 번째 곡 자동 선택
  React.useEffect(() => {
    if (selectedComposer && selectedComposer.majorPieces && selectedComposer.majorPieces.length > 0) {
      setSelectedPiece(selectedComposer.majorPieces[0]);
      setNoPieceFound(false);
    } else {
      setSelectedPiece(null);
      setNoPieceFound(true);
    }
  }, [selectedComposer]);

  // 곡 선택 시 연주 목록 로드
  React.useEffect(() => {
    if (selectedPiece) {
      loadPerformances(selectedPiece.id);
      setCurrentPerformanceIndex(0);
    } else {
      setPerformances([]);
      setCurrentPerformanceIndex(0);
    }
  }, [selectedPiece]);

  const loadPerformances = async (pieceId: number) => {
    try {
      const performanceData = await PerformanceAPI.getByPiece(pieceId);
      setPerformances(performanceData);

      // 연주 개수 업데이트
      setPiecePerformanceCounts(prev => ({
        ...prev,
        [pieceId]: performanceData.length
      }));

      // 연주자 정보 로드
      const artistIds = [...new Set(performanceData.map(p => p.artistId))];
      const artistData: { [key: number]: Artist } = {};
      await Promise.all(
        artistIds.map(async (artistId) => {
          try {
            const artist = await ArtistAPI.getById(artistId);
            if (artist) {
              artistData[artistId] = artist;
            }
          } catch (error) {
            console.error(`Failed to load artist ${artistId}:`, error);
          }
        })
      );
      setArtists(artistData);
    } catch (error) {
      console.error('Failed to load performances:', error);
      setPerformances([]);
      setPiecePerformanceCounts(prev => ({
        ...prev,
        [pieceId]: 0
      }));
    }
  };

  // URL 파라미터로 작곡가/곡 선택
  React.useEffect(() => {
    if (!composers.length) return;
    
    if (params.pieceId) {
      const pieceId = Number(params.pieceId);
      for (const composer of composers) {
        const piece = composer.majorPieces?.find(p => p.id === pieceId);
        if (piece) {
          setSelectedComposer(composer);
          setSelectedPiece(piece);
          setNoPieceFound(false);
          return;
        }
      }
      setNoPieceFound(true);
    } else if (params.composerId) {
      const composerId = Number(params.composerId);
      const composer = composers.find(c => c.id === composerId);
      if (composer) {
        setSelectedComposer(composer);
        if (composer.majorPieces && composer.majorPieces.length > 0) {
          setSelectedPiece(composer.majorPieces[0]);
          setNoPieceFound(false);
        }
      }
    }
  }, [params.composerId, params.pieceId, composers]);

  // 작곡가 리스트 애니메이션
  React.useEffect(() => {
    if (showComposerList) {
      Animated.spring(composerAnimation, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      composerAnimation.setValue(0);
    }
  }, [showComposerList]);

  // 곡 리스트 애니메이션
  React.useEffect(() => {
    if (showPieceList) {
      Animated.spring(pieceAnimation, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      pieceAnimation.setValue(0);
    }
  }, [showPieceList]);

  const handleComposerSelect = (composer: ComposerWithPieces) => {
    setSelectedComposer(composer);
    if (composer.majorPieces && composer.majorPieces.length > 0) {
      setSelectedPiece(composer.majorPieces[0]);
      setNoPieceFound(false);
    } else {
      setSelectedPiece(null);
      setNoPieceFound(true);
    }
    setShowComposerList(false);
  };

  const handlePieceSelect = (piece: Piece) => {
    setSelectedPiece(piece);
    setShowPieceList(false);
  };

  const handleDeletePerformance = (performanceId: number) => {
    Alert.alert(
      '연주 삭제',
      '정말 이 연주를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminPerformanceAPI.delete(performanceId);
              Alert.alert('성공', '연주가 삭제되었습니다.');
              if (selectedPiece) {
                loadPerformances(selectedPiece.id);
              }
            } catch (error) {
              Alert.alert('오류', '연주 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

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
          <Button variant="outline" onPress={loadComposers}>
            <Text>다시 시도</Text>
          </Button>
        </Card>
      </View>
    );
  }

  if (!selectedComposer) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-muted-foreground">작곡가를 선택해주세요.</Text>
      </View>
    );
  }

  const getPeriodEmoji = (period: string): string => {
    const emojiMap: { [key: string]: string } = {
      '바로크': '🎻',
      '고전주의': '🎹',
      '낭만주의': '🎼',
      '근현대': '🎵',
    };
    return emojiMap[period] || '🎵';
  };

  return (<>
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="gap-6 p-4 pb-20">
        {/* 작곡가 선택 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">작곡가 선택</Text>
            <TouchableOpacity
              onPress={() => setShowComposerList(!showComposerList)}
              className="size-10 items-center justify-center rounded-full border border-border bg-background active:bg-accent"
            >
              <Icon as={showComposerList ? CheckIcon : PlusIcon} size={20} className={showComposerList ? 'text-primary' : ''} />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: composerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              maxHeight: composerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }}
            pointerEvents={showComposerList ? 'none' : 'auto'}
          >
            {!showComposerList && (
              <Card className="p-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-3xl">{getPeriodEmoji(selectedComposer.period)}</Text>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold">{selectedComposer.name}</Text>
                    <Text className="text-sm text-muted-foreground">{selectedComposer.period}</Text>
                  </View>
                </View>
              </Card>
            )}
          </Animated.View>

          <Animated.View
            style={{
              opacity: composerAnimation,
              maxHeight: composerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
            }}
          >
            {showComposerList && (
              <Card className="p-3 overflow-hidden">
                <View className="flex-row flex-wrap gap-3">
                  {composers.map((composer) => (
                    <Animated.View
                      key={composer.id}
                      style={{
                        width: '48%',
                        opacity: composerAnimation,
                        transform: [
                          {
                            translateY: composerAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleComposerSelect(composer)}
                        className={`p-3 rounded-lg border ${selectedComposer.id === composer.id ? 'border-primary bg-primary/5' : 'border-border'} active:bg-accent`}
                      >
                        <View className="gap-2">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-2xl">{getPeriodEmoji(composer.period)}</Text>
                            {selectedComposer.id === composer.id && (
                              <Icon as={CheckIcon} size={18} className="text-primary" />
                            )}
                          </View>
                          <View>
                            <Text className="text-sm font-semibold" numberOfLines={1}>
                              {composer.name}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {composer.period}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {composer.majorPieces?.length || 0}곡
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </Card>
            )}
          </Animated.View>
        </View>

        {/* 곡 선택 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold">곡 선택</Text>
            <TouchableOpacity
              onPress={() => setShowPieceList(!showPieceList)}
              className="size-10 items-center justify-center rounded-full border border-border bg-background active:bg-accent"
            >
              <Icon as={showPieceList ? CheckIcon : PlusIcon} size={20} className={showPieceList ? 'text-primary' : ''} />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pieceAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              maxHeight: pieceAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            }}
            pointerEvents={showPieceList ? 'none' : 'auto'}
          >
            {!showPieceList && selectedPiece && (
              <Card className="p-4">
                <View className="gap-1">
                  <Text className="text-lg font-semibold">{selectedPiece.title}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {piecePerformanceCounts[selectedPiece.id] || 0}개의 연주 비교 가능
                  </Text>
                </View>
              </Card>
            )}
          </Animated.View>

          <Animated.View
            style={{
              opacity: pieceAnimation,
              maxHeight: pieceAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 400],
              }),
            }}
          >
            {showPieceList && selectedComposer.majorPieces && (
              <Card className="p-3 gap-3 overflow-hidden">
                {selectedComposer.majorPieces.map((piece) => (
                  <Animated.View
                    key={piece.id}
                    style={{
                      opacity: pieceAnimation,
                      transform: [
                        {
                          translateY: pieceAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handlePieceSelect(piece)}
                      className={`p-3 rounded-lg border ${selectedPiece?.id === piece.id ? 'border-primary bg-primary/5' : 'border-border'} active:bg-accent`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-semibold">{piece.title}</Text>
                          <Text className="text-sm text-muted-foreground">
                            {piecePerformanceCounts[piece.id] || 0}개의 연주 비교 가능
                          </Text>
                        </View>
                        {selectedPiece?.id === piece.id && (
                          <Icon as={CheckIcon} size={20} className="text-primary" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </Card>
            )}
          </Animated.View>
        </View>

        {/* 선택된 곡 정보 */}
        {noPieceFound || !selectedPiece ? (
          <Card className="p-8 bg-muted/50">
            <View className="gap-4 items-center">
              <Icon as={PlayCircleIcon} size={64} className="text-muted-foreground/30" />
              <View className="gap-2 items-center">
                <Text className="text-xl font-bold text-center">비교 영상이 없습니다</Text>
                <Text className="text-sm text-muted-foreground text-center">
                  해당 곡의 연주 비교 영상이 아직 준비되지 않았습니다.{'\n'}
                  다른 곡을 선택해주세요.
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <>
            <Card className="p-4 bg-primary/5">
              <View className="gap-2">
                <Text className="text-2xl font-bold">
                  {getPeriodEmoji(selectedComposer.period)} {selectedPiece.title}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {selectedComposer.fullName} • {selectedComposer.period}
                </Text>
                <Text className="text-sm leading-6 mt-2">
                  {selectedPiece.description}
                </Text>
              </View>
            </Card>

            {/* 연주 비교 */}
            {selectedPiece && (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xl font-bold">연주 비교</Text>
                    {performances.length > 0 && (
                      <Text className="text-sm text-muted-foreground mt-1">
                        {currentPerformanceIndex + 1} / {performances.length}개 연주
                      </Text>
                    )}
                  </View>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => {
                        setSelectedPerformance(undefined);
                        setPerformanceFormVisible(true);
                      }}
                    >
                      <Icon as={PlusIcon} size={16} />
                      <Text className="ml-1">추가</Text>
                    </Button>
                  )}
                </View>

                {performances.length === 0 ? (
                  <Card className="p-8 bg-muted/50">
                    <View className="gap-4 items-center">
                      <Icon as={PlayCircleIcon} size={64} className="text-muted-foreground/30" />
                      <View className="gap-2 items-center">
                        <Text className="text-xl font-bold text-center">연주 영상 준비 중</Text>
                        <Text className="text-sm text-muted-foreground text-center">
                          이 곡의 연주 비교 영상이 아직 준비되지 않았습니다.
                        </Text>
                      </View>
                    </View>
                  </Card>
                ) : (
                  <FlatList
                    data={performances}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    snapToInterval={350}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingRight: 16 }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    renderItem={({ item: performance }) => {
                      const artist = artists[performance.artistId];

                      return (
                        <Card className="overflow-hidden mr-4" style={{ width: 340 }}>
                          {/* 연주자 정보 */}
                          <View className="p-4 flex-row items-center justify-between bg-muted/30">
                            <TouchableOpacity
                              className="flex-row items-center gap-3 flex-1"
                              onPress={() => artist && router.push(`/artist/${artist.id}`)}
                            >
                              {artist?.imageUrl ? (
                                <Image
                                  source={{ uri: getImageUrl(artist.imageUrl) }}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <View className="w-12 h-12 rounded-full bg-muted items-center justify-center">
                                  <Text className="text-lg font-bold">
                                    {artist?.name?.[0] || '?'}
                                  </Text>
                                </View>
                              )}
                              <View className="flex-1">
                                <Text className="font-bold">{artist?.name || '알 수 없음'}</Text>
                                <Text className="text-xs text-muted-foreground">
                                  {Math.floor(performance.startTime / 60)}:{(performance.startTime % 60).toString().padStart(2, '0')} - {Math.floor(performance.endTime / 60)}:{(performance.endTime % 60).toString().padStart(2, '0')}
                                </Text>
                              </View>
                            </TouchableOpacity>

                            {canEdit && (
                              <View className="flex-row gap-2">
                                <TouchableOpacity
                                  onPress={() => {
                                    setSelectedPerformance(performance);
                                    setPerformanceFormVisible(true);
                                  }}
                                  className="p-2"
                                >
                                  <Icon as={EditIcon} size={18} className="text-primary" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeletePerformance(performance.id)}
                                  className="p-2"
                                >
                                  <Icon as={TrashIcon} size={18} className="text-destructive" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>

                          {/* YouTube Player */}
                          <View style={{ width: '100%', height: 250 }}>
                            <YoutubePlayer
                              videoId={performance.videoId}
                              height={250}
                              play={false}
                              initialPlayerParams={{
                                start: performance.startTime,
                                end: performance.endTime,
                                controls: true,
                                modestbranding: true,
                                rel: false,
                              }}
                            />
                          </View>

                          {/* 연주 특징 */}
                          {performance.characteristic && (
                            <View className="p-4 bg-background">
                              <Text className="text-sm leading-5 text-muted-foreground">
                                {performance.characteristic}
                              </Text>
                            </View>
                          )}
                        </Card>
                      );
                    }}
                    keyExtractor={(item) => item.id.toString()}
                  />
                )}

                {/* 페이지 인디케이터 */}
                {performances.length > 1 && (
                  <View className="flex-row justify-center gap-2 mt-3">
                    {performances.map((_, index) => (
                      <View
                        key={index}
                        className={`h-2 rounded-full ${
                          index === currentPerformanceIndex
                            ? 'bg-primary w-6'
                            : 'bg-muted w-2'
                        }`}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>

    {/* Performance Form Modal */}
    <PerformanceFormModal
      visible={performanceFormVisible}
      performance={selectedPerformance}
      composerId={selectedComposer?.id}
      pieceId={selectedPiece?.id}
      onClose={() => setPerformanceFormVisible(false)}
      onSuccess={() => {
        setPerformanceFormVisible(false);
        if (selectedPiece) {
          loadPerformances(selectedPiece.id);
        }
      }}
    />
  </>
  );
}
