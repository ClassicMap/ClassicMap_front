import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, FlatList, TouchableOpacity, Animated } from 'react-native';
import { PlayCircleIcon, PlusIcon, CheckIcon } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import WebView from 'react-native-webview';
import { 
  getAllComposerDTOs,
  getComparisonData,
  type ComparisonData 
} from '@/lib/data/mockDTO';
import type { ComposerDTO, PieceDTO, PerformanceDTO } from '@/lib/types/models';

export default function CompareScreen() {
  const params = useLocalSearchParams();
  const composers = getAllComposerDTOs();
  
  const [selectedComposer, setSelectedComposer] = React.useState<ComposerDTO>(composers[3]); // 쇼팽 (id: 4)
  const [selectedPiece, setSelectedPiece] = React.useState<PieceDTO | null>(null);
  const [showComposerList, setShowComposerList] = React.useState(false);
  const [showPieceList, setShowPieceList] = React.useState(false);
  const [noPieceFound, setNoPieceFound] = React.useState(false);
  
  // 애니메이션 값
  const composerAnimation = React.useRef(new Animated.Value(0)).current;
  const pieceAnimation = React.useRef(new Animated.Value(0)).current;

  // 초기화: 작곡가 선택 시 첫 번째 곡 자동 선택
  React.useEffect(() => {
    if (selectedComposer.majorPieces && selectedComposer.majorPieces.length > 0) {
      setSelectedPiece(selectedComposer.majorPieces[0]);
      setNoPieceFound(false);
    } else {
      setSelectedPiece(null);
      setNoPieceFound(true);
    }
  }, [selectedComposer]);

  // URL 파라미터로 작곡가/곡 선택
  React.useEffect(() => {
    if (params.pieceId) {
      const pieceId = Number(params.pieceId);
      // 모든 작곡가의 곡에서 pieceId로 검색
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
  }, [params.composerId, params.pieceId]);

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

  const handleComposerSelect = (composer: ComposerDTO) => {
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

  const handlePieceSelect = (piece: PieceDTO) => {
    setSelectedPiece(piece);
    setShowPieceList(false);
  };

  const getPeriodEmoji = (period: string): string => {
    const emojiMap: { [key: string]: string } = {
      '바로크': '🎻',
      '고전주의': '🎹',
      '낭만주의': '🎼',
      '근현대': '🎵',
    };
    return emojiMap[period] || '🎵';
  };

  return (
    <ScrollView className="flex-1 bg-background">
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
                    {selectedPiece.performances?.length || 0}개의 연주 비교 가능
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
                            {piece.performances?.length || 0}개의 연주 비교 가능
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
            {selectedPiece.performances && selectedPiece.performances.length > 0 ? (
              <View className="gap-3">
                <Text className="text-xl font-bold">연주자별 비교</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={selectedPiece.performances}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <PerformanceCard performance={item} />
                  )}
                  ItemSeparatorComponent={() => <View className="w-4" />}
                  contentContainerClassName="pr-4"
                />
              </View>
            ) : (
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
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function PerformanceCard({ performance }: { performance: PerformanceDTO }) {
  const embedUrl = `https://www.youtube.com/embed/${performance.videoId}?start=${performance.startTime}&end=${performance.endTime}&autoplay=0&controls=1`;

  return (
    <Card className="w-[340px] overflow-hidden p-0">
      <View className="aspect-video bg-black">
        <WebView
          source={{ uri: embedUrl }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      <View className="gap-2 p-4">
        <Text className="text-lg font-semibold">{performance.artist.name}</Text>
        <Text className="text-sm text-muted-foreground leading-5">
          {performance.characteristic}
        </Text>
        <View className="flex-row items-center gap-2">
          <Icon as={PlayCircleIcon} size={16} className="text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">
            {Math.floor(performance.startTime / 60)}:{String(performance.startTime % 60).padStart(2, '0')} - {Math.floor(performance.endTime / 60)}:{String(performance.endTime % 60).padStart(2, '0')}
          </Text>
        </View>
      </View>
    </Card>
  );
}
