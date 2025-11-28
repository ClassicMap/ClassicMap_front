import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Alert } from '@/lib/utils/alert';
import {
  PlayCircleIcon,
  PlusIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';
import { ComposerAPI, PieceAPI, PerformanceAPI, ArtistAPI, PerformanceSectorAPI } from '@/lib/api/client';
import { AdminPerformanceAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Composer, Piece, Performance, Artist, PerformanceSectorWithCount } from '@/lib/types/models';
import { PerformanceFormModal } from '@/components/admin/PerformanceFormModal';
import { SectorFormModal } from '@/components/admin/SectorFormModal';
import { SectorChip, AddSectorChip } from '@/components/sector-chip';
import { getImageUrl } from '@/lib/utils/image';
import { getAllPeriods } from '@/lib/data/mockDTO';
import { useComposers } from '@/lib/query/hooks/useComposers';

interface ComposerWithPieces extends Composer {
  majorPieces?: Piece[];
}

export default function CompareScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { canEdit } = useAuth();

  // Period filter state - MUST be declared before useComposers hook
  const [periodFilter, setPeriodFilter] = React.useState<string>('all');

  // React Query로 작곡가 데이터 로드 (자동 캐싱)
  const {
    data: composersQueryData,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
    isRefetching: refreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useComposers(periodFilter !== 'all' ? periodFilter : undefined);

  // 무한 스크롤 데이터를 평탄화
  const composersData = React.useMemo(() => {
    if (!composersQueryData?.pages) return [];
    return composersQueryData.pages.flat();
  }, [composersQueryData]);

  const error = queryError ? '작곡가 정보를 불러오는데 실패했습니다.' : null;

  // 작곡가에 곡 목록 추가
  const [composers, setComposers] = React.useState<ComposerWithPieces[]>([]);

  const [selectedComposer, setSelectedComposer] = React.useState<ComposerWithPieces | null>(null);
  const [selectedPiece, setSelectedPiece] = React.useState<Piece | null>(null);
  const [showComposerList, setShowComposerList] = React.useState(false);
  const [showPieceList, setShowPieceList] = React.useState(false);
  const [noPieceFound, setNoPieceFound] = React.useState(false);

  // 섹터 관련 state
  const [sectors, setSectors] = React.useState<PerformanceSectorWithCount[]>([]);
  const [selectedSector, setSelectedSector] = React.useState<PerformanceSectorWithCount | null>(null);
  const [loadingSectors, setLoadingSectors] = React.useState(false);
  const [sectorFormVisible, setSectorFormVisible] = React.useState(false);
  const [selectedSectorForEdit, setSelectedSectorForEdit] = React.useState<PerformanceSectorWithCount | undefined>();

  // 검색 및 필터 state
  const [composerSearchQuery, setComposerSearchQuery] = React.useState('');
  const [pieceSearchQuery, setPieceSearchQuery] = React.useState('');

  // Search states (following Artist/Concert pattern)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<ComposerWithPieces[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchOffset, setSearchOffset] = React.useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = React.useState(true);

  // Prevent duplicate pagination requests
  const isPaginatingRef = React.useRef(false);

  // Track initial mount to show full page loading only on first load
  const isInitialMount = React.useRef(true);

  // 연주 관련 state
  const [performances, setPerformances] = React.useState<Performance[]>([]);
  const [artists, setArtists] = React.useState<{ [key: number]: Artist }>({});
  const [performanceFormVisible, setPerformanceFormVisible] = React.useState(false);
  const [selectedPerformance, setSelectedPerformance] = React.useState<Performance | undefined>();
  const [currentPerformanceIndex, setCurrentPerformanceIndex] = React.useState(0);
  const [piecePerformanceCounts, setPiecePerformanceCounts] = React.useState<{
    [key: number]: number;
  }>({});

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

  // Memoize renderItem to prevent unnecessary re-renders
  const renderPerformanceItem = React.useCallback(({ item: performance }: { item: Performance }) => {
    const artist = artists[performance.artistId];

    return (
      <Card className="mr-4 overflow-hidden" style={{ width: 350 }}>
        {/* Compact Artist Info */}
        <TouchableOpacity
          className="flex-row items-center gap-2 border-b border-border/30 bg-card px-3 py-2.5"
          onPress={() => artist && router.push(`/artist/${artist.id}`)}
          activeOpacity={0.7}>
          {/* Small Avatar: 32px */}
          {artist?.imageUrl ? (
            <Image
              source={{ uri: getImageUrl(artist.imageUrl) }}
              className="h-8 w-8 rounded-full border border-primary/20"
              resizeMode="cover"
            />
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <Text className="text-xs font-bold text-primary">
                {artist?.name?.[0] || '?'}
              </Text>
            </View>
          )}

          {/* Artist Name & Metadata */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold">{artist?.name || '알 수 없음'}</Text>
              {artist?.tier && (
                <View className="rounded-full bg-primary/10 px-2 py-0.5">
                  <Text className="text-xs font-medium text-primary">T{artist.tier}</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-muted-foreground">
              {formatTime(performance.startTime)} - {formatTime(performance.endTime)}
            </Text>
          </View>

          {/* Admin Controls */}
          {canEdit && (
            <View className="flex-row gap-1">
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedPerformance(performance);
                  setPerformanceFormVisible(true);
                }}
                className="rounded-md bg-primary/10 p-1.5"
                activeOpacity={0.7}>
                <Icon as={EditIcon} size={14} className="text-primary" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeletePerformance(performance.id);
                }}
                className="rounded-md bg-destructive/10 p-1.5"
                activeOpacity={0.7}>
                <Icon as={TrashIcon} size={14} className="text-destructive" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* YouTube Player - 더 큰 크기 */}
        <View style={{ width: '100%', height: 196 }}>
          <YoutubePlayer
            key={`youtube-${performance.id}`}
            videoId={performance.videoId}
            height={196}
            play={false}
            initialPlayerParams={{
              start: performance.startTime,
              end: performance.endTime,
              controls: true,
              modestbranding: true,
              rel: false,
            }}
            webViewProps={{
              androidLayerType: 'hardware',
              allowsInlineMediaPlayback: true,
            }}
          />
        </View>

        {/* Quote-style Characteristic */}
        {performance.characteristic && (
          <View className="border-l-4 border-primary/40 bg-muted/30 px-4 py-3">
            <Text className="text-sm italic leading-relaxed text-muted-foreground">
              "{performance.characteristic}"
            </Text>
          </View>
        )}
      </Card>
    );
  }, [artists, canEdit, router]);

  // URL 파라미터로부터 곡이 선택되었는지 추적
  const isFromUrlParams = React.useRef(false);

  // Debounce search query (300ms delay)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(composerSearchQuery);
      setSearchOffset(0);
      setSearchResults([]);
      setHasMoreSearchResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [composerSearchQuery]);

  // Backend search effect
  React.useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      setIsSearching(true);
      ComposerAPI.search({
        q: debouncedSearchQuery,
        period: periodFilter !== 'all' ? periodFilter : undefined,
        offset: 0,
        limit: 20,
      })
        .then((results) => {
          setSearchResults(results);
          setSearchOffset(20);
          setHasMoreSearchResults(results.length === 20);
          setIsSearching(false);
        })
        .catch((error) => {
          console.error('Search failed:', error);
          setSearchResults([]);
          setIsSearching(false);
        });
    } else {
      setSearchResults([]);
      setSearchOffset(0);
      setHasMoreSearchResults(true);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery, periodFilter]);

  // Display search results if searching, otherwise show paginated list
  const displayedComposers = React.useMemo(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      return searchResults;
    }
    return composersData;
  }, [debouncedSearchQuery, searchResults, composersData]);

  // Update composers list with piece counts
  React.useEffect(() => {
    setComposers(displayedComposers.map(c => ({
      ...c,
      // Don't override majorPieces if it exists, otherwise leave undefined to show pieceCount
      majorPieces: c.majorPieces || undefined,
    })));

    // Mark initial mount as complete once we have composers
    if (displayedComposers.length > 0) {
      isInitialMount.current = false;
    }
  }, [displayedComposers]);

  // 곡 필터링
  const filteredPieces = React.useMemo(() => {
    if (!selectedComposer?.majorPieces) return [];

    let filtered = selectedComposer.majorPieces;

    // 검색 필터
    if (pieceSearchQuery.trim()) {
      const searchLower = pieceSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (piece) =>
          piece.title.toLowerCase().includes(searchLower) ||
          (piece.description && piece.description.toLowerCase().includes(searchLower)) ||
          (piece.opusNumber && piece.opusNumber.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [selectedComposer, pieceSearchQuery]);

  // composersData가 변경되면 composers 상태 업데이트
  React.useEffect(() => {
    if (composersData.length > 0) {
      const composersWithPieces = composersData.map((composer) => ({
        ...composer,
        majorPieces: undefined,
      }));
      setComposers(composersWithPieces);

      if (!selectedComposer && composersWithPieces.length > 0) {
        setSelectedComposer(composersWithPieces[0]);
      }
    }
  }, [composersData]);

  // 초기화: 작곡가 선택 시 곡 목록 로드 및 첫 번째 곡 자동 선택
  React.useEffect(() => {
    // URL 파라미터로부터 선택된 경우 자동 선택 건너뛰기
    if (isFromUrlParams.current) {
      return;
    }

    if (selectedComposer) {
      // 이미 곡 목록이 로드되어 있으면 다시 로드하지 않음
      if (selectedComposer.majorPieces && selectedComposer.majorPieces.length > 0) {
        setSelectedPiece(selectedComposer.majorPieces[0]);
        setNoPieceFound(false);
      } else {
        loadPiecesForComposer(selectedComposer);
      }
    } else {
      setSelectedPiece(null);
      setNoPieceFound(true);
    }
  }, [selectedComposer]);

  // 선택된 작곡가의 곡 목록 로드 (연주 개수는 필요시에만)
  const loadPiecesForComposer = async (composer: ComposerWithPieces) => {
    try {
      // 곡 목록 로드
      const pieces = await PieceAPI.getByComposer(composer.id);

      // composers 상태 업데이트
      const updatedComposer = { ...composer, majorPieces: pieces };
      setComposers((prev) =>
        prev.map((c) => (c.id === composer.id ? updatedComposer : c))
      );

      // selectedComposer도 업데이트
      setSelectedComposer(updatedComposer);

      if (pieces.length > 0) {
        setSelectedPiece(pieces[0]);
        setNoPieceFound(false);
        // 연주 개수는 곡 목록이 열릴 때만 로드하도록 변경
      } else {
        setSelectedPiece(null);
        setNoPieceFound(true);
      }
    } catch (error) {
      console.error('Failed to load pieces:', error);
      setSelectedPiece(null);
      setNoPieceFound(true);
    }
  };

  // 곡 목록의 연주 개수를 로드하는 함수
  const loadPerformanceCountsForPieces = async (pieces: Piece[]) => {
    const counts: { [key: number]: number } = {};
    await Promise.all(
      pieces.map(async (piece) => {
        // 이미 로드된 카운트는 건너뛰기
        if (piecePerformanceCounts[piece.id] !== undefined) {
          return;
        }
        try {
          const performances = await PerformanceAPI.getByPiece(piece.id);
          counts[piece.id] = performances.length;
        } catch {
          counts[piece.id] = 0;
        }
      })
    );
    setPiecePerformanceCounts((prev) => ({ ...prev, ...counts }));
  };

  // 곡 선택 시 섹터 목록 로드
  React.useEffect(() => {
    const loadSectors = async () => {
      if (!selectedPiece) {
        setSectors([]);
        setSelectedSector(null);
        return;
      }

      setLoadingSectors(true);
      try {
        const sectorData = await PerformanceSectorAPI.getByPiece(selectedPiece.id);
        setSectors(sectorData);

        // Always select first sector if available
        if (sectorData.length > 0) {
          setSelectedSector(sectorData[0]);
        } else {
          setSelectedSector(null);
        }
      } catch (error) {
        console.error('Failed to load sectors:', error);
        setSectors([]);
        setSelectedSector(null);
      } finally {
        setLoadingSectors(false);
      }
    };

    loadSectors();
  }, [selectedPiece]);

  // 섹터 재로드 함수 (생성/수정/삭제 후 사용)
  const reloadSectors = async () => {
    if (!selectedPiece) return;

    setLoadingSectors(true);
    try {
      const sectorData = await PerformanceSectorAPI.getByPiece(selectedPiece.id);
      setSectors(sectorData);

      // Auto-select the last sector (newest created)
      if (sectorData.length > 0) {
        setSelectedSector(sectorData[sectorData.length - 1]);
      } else {
        setSelectedSector(null);
      }
    } catch (error) {
      console.error('Failed to reload sectors:', error);
    } finally {
      setLoadingSectors(false);
    }
  };

  // 섹터 선택 시 연주 목록 로드
  React.useEffect(() => {
    if (selectedSector) {
      loadPerformancesBySector(selectedSector.id);
      setCurrentPerformanceIndex(0);
    } else {
      setPerformances([]);
      setCurrentPerformanceIndex(0);
    }
  }, [selectedSector]);

  const loadPerformances = async (pieceId: number) => {
    try {
      const performanceData = await PerformanceAPI.getByPiece(pieceId);
      setPerformances(performanceData);

      // 연주 개수 업데이트
      setPiecePerformanceCounts((prev) => ({
        ...prev,
        [pieceId]: performanceData.length,
      }));

      // 연주자 정보 로드
      const artistIds = [...new Set(performanceData.map((p) => p.artistId))];
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
      setPiecePerformanceCounts((prev) => ({
        ...prev,
        [pieceId]: 0,
      }));
    }
  };

  const loadPerformancesBySector = async (sectorId: number) => {
    // Validate sectorId
    if (!sectorId || sectorId <= 0) {
      console.error('Invalid sectorId:', sectorId);
      setPerformances([]);
      setArtists({});
      return;
    }

    try {
      const performanceData = await PerformanceAPI.getBySector(sectorId);

      // Handle empty performance array (sector with no performances)
      if (!performanceData || performanceData.length === 0) {
        setPerformances([]);
        setArtists({});
        return;
      }

      setPerformances(performanceData);

      // 연주자 정보 로드
      const artistIds = [...new Set(performanceData.map((p) => p.artistId).filter(id => id))];
      const artistData: { [key: number]: Artist } = {};

      if (artistIds.length > 0) {
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
      }

      setArtists(artistData);
    } catch (error) {
      console.error('Failed to load performances by sector:', error);
      setPerformances([]);
      setArtists({});
    }
  };

  // URL 파라미터로 작곡가/곡 선택
  React.useEffect(() => {
    // 로딩 중이거나 작곡가 목록이 없으면 대기
    if (loading || !composers.length) return;

    if (!params.pieceId && !params.composerId) {
      // URL 파라미터가 없으면 플래그 리셋
      isFromUrlParams.current = false;
      return;
    }

    const loadFromParams = async () => {
      // pieceId와 composerId가 둘 다 있는 경우
      if (params.pieceId && params.composerId) {
        const pieceId = Number(params.pieceId);
        const composerId = Number(params.composerId);
        const composer = composers.find((c) => c.id === composerId);

        if (composer) {
          isFromUrlParams.current = true;

          // 곡 목록이 있으면 바로 찾기
          if (composer.majorPieces) {
            const piece = composer.majorPieces.find((p) => p.id === pieceId);
            if (piece) {
              setSelectedComposer(composer);
              setSelectedPiece(piece);
              setNoPieceFound(false);
              // 플래그는 나중에 리셋 (다음 렌더링 후)
              setTimeout(() => {
                isFromUrlParams.current = false;
              }, 100);
              return;
            }
          }

          // 곡 목록이 없으면 로드
          try {
            const pieces = await PieceAPI.getByComposer(composerId);
            const piece = pieces.find((p) => p.id === pieceId);

            if (piece) {
              const updatedComposer = { ...composer, majorPieces: pieces };
              setComposers((prev) =>
                prev.map((c) => (c.id === composerId ? updatedComposer : c))
              );
              setSelectedComposer(updatedComposer);
              setSelectedPiece(piece);
              setNoPieceFound(false);
              // 플래그는 나중에 리셋 (다음 렌더링 후)
              setTimeout(() => {
                isFromUrlParams.current = false;
              }, 100);
              return;
            }
          } catch (error) {
            console.error('Failed to load pieces:', error);
          }
        }
        setNoPieceFound(true);
        isFromUrlParams.current = false;
      }
      // pieceId만 있는 경우 (composerId 없음)
      else if (params.pieceId) {
        const pieceId = Number(params.pieceId);

        // 먼저 이미 로드된 데이터에서 찾기
        for (const composer of composers) {
          const piece = composer.majorPieces?.find((p) => p.id === pieceId);
          if (piece) {
            isFromUrlParams.current = true;
            setSelectedComposer(composer);
            setSelectedPiece(piece);
            setNoPieceFound(false);
            setTimeout(() => {
              isFromUrlParams.current = false;
            }, 100);
            return;
          }
        }

        // 로드된 데이터에 없으면 각 작곡가의 곡 목록을 로드
        for (const composer of composers) {
          if (!composer.majorPieces) {
            try {
              const pieces = await PieceAPI.getByComposer(composer.id);
              const piece = pieces.find((p) => p.id === pieceId);
              if (piece) {
                isFromUrlParams.current = true;
                const updatedComposer = { ...composer, majorPieces: pieces };
                setComposers((prev) =>
                  prev.map((c) => (c.id === composer.id ? updatedComposer : c))
                );
                setSelectedComposer(updatedComposer);
                setSelectedPiece(piece);
                setNoPieceFound(false);
                setTimeout(() => {
                  isFromUrlParams.current = false;
                }, 100);
                return;
              }
            } catch (error) {
              console.error('Failed to load pieces for composer:', error);
            }
          }
        }
        setNoPieceFound(true);
        isFromUrlParams.current = false;
      }
      // composerId만 있는 경우
      else if (params.composerId) {
        const composerId = Number(params.composerId);
        const composer = composers.find((c) => c.id === composerId);
        if (composer) {
          isFromUrlParams.current = true;

          // 곡 목록이 없으면 로드
          if (!composer.majorPieces) {
            try {
              const pieces = await PieceAPI.getByComposer(composer.id);
              const updatedComposer = { ...composer, majorPieces: pieces };
              setComposers((prev) =>
                prev.map((c) => (c.id === composer.id ? updatedComposer : c))
              );
              setSelectedComposer(updatedComposer);

              if (pieces.length > 0) {
                setSelectedPiece(pieces[0]);
                setNoPieceFound(false);
              } else {
                setNoPieceFound(true);
              }
              setTimeout(() => {
                isFromUrlParams.current = false;
              }, 100);
            } catch (error) {
              console.error('Failed to load pieces:', error);
              setNoPieceFound(true);
              isFromUrlParams.current = false;
            }
          } else {
            setSelectedComposer(composer);
            if (composer.majorPieces.length > 0) {
              setSelectedPiece(composer.majorPieces[0]);
              setNoPieceFound(false);
            } else {
              setNoPieceFound(true);
            }
            setTimeout(() => {
              isFromUrlParams.current = false;
            }, 100);
          }
        }
      }
    };

    loadFromParams();
  }, [params.composerId, params.pieceId, composers, loading]);

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

  // 곡 리스트 애니메이션 및 연주 개수 로드
  React.useEffect(() => {
    if (showPieceList) {
      Animated.spring(pieceAnimation, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();

      // 곡 목록이 열릴 때만 연주 개수 로드
      if (selectedComposer?.majorPieces && selectedComposer.majorPieces.length > 0) {
        loadPerformanceCountsForPieces(selectedComposer.majorPieces);
      }
    } else {
      pieceAnimation.setValue(0);
    }
  }, [showPieceList, selectedComposer]);

  const handleComposerSelect = (composer: ComposerWithPieces) => {
    setSelectedComposer(composer);
    setShowComposerList(false);
    // 곡 목록 로딩은 useEffect에서 처리됨
  };

  const handlePieceSelect = (piece: Piece) => {
    setSelectedPiece(piece);
    setShowPieceList(false);
  };

  const handleSectorSelect = (sector: PerformanceSectorWithCount) => {
    // Validate sector has required properties
    if (!sector || !sector.id || !sector.sectorName) {
      console.error('Invalid sector data:', sector);
      return;
    }
    setSelectedSector(sector);
  };

  // 섹터 추가 버튼 클릭
  const handleAddSector = () => {
    setSelectedSectorForEdit(undefined);
    setSectorFormVisible(true);
  };

  // 섹터 수정 버튼 클릭
  const handleEditSector = (sector: PerformanceSectorWithCount) => {
    setSelectedSectorForEdit(sector);
    setSectorFormVisible(true);
  };

  // 섹터 폼 성공 콜백
  const handleSectorFormSuccess = async () => {
    setSectorFormVisible(false);
    await reloadSectors();
  };

  // 섹터에 연주 추가 버튼 클릭
  const handleAddPerformanceToSector = (sector: PerformanceSectorWithCount) => {
    setSelectedSector(sector);
    setSelectedPerformance(undefined);
    setPerformanceFormVisible(true);
  };

  // Infinite scroll handler for composer list
  const handleComposerScroll = (event: any) => {
    // Prevent duplicate requests
    if (isPaginatingRef.current) {
      return;
    }

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;

    // Check if near bottom
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isNearBottom) {
      // If searching, load more search results
      if (debouncedSearchQuery.trim().length > 0 && hasMoreSearchResults && !isSearching) {
        isPaginatingRef.current = true;
        setIsSearching(true);
        ComposerAPI.search({
          q: debouncedSearchQuery,
          period: periodFilter !== 'all' ? periodFilter : undefined,
          offset: searchOffset,
          limit: 20,
        })
          .then((results) => {
            setSearchResults(prev => [...prev, ...results]);
            setSearchOffset(prev => prev + 20);
            setHasMoreSearchResults(results.length === 20);
            setIsSearching(false);
            // Add delay before allowing next request
            setTimeout(() => {
              isPaginatingRef.current = false;
            }, 800);
          })
          .catch((error) => {
            console.error('Load more search failed:', error);
            setIsSearching(false);
            isPaginatingRef.current = false;
          });
      }
      // If browsing all, fetch next page
      else if (!debouncedSearchQuery.trim() && hasNextPage && !isFetchingNextPage) {
        isPaginatingRef.current = true;
        fetchNextPage().finally(() => {
          // Add delay before allowing next request
          setTimeout(() => {
            isPaginatingRef.current = false;
          }, 800);
        });
      }
    }
  };

  // Handle pull-to-refresh - reset to first 20 composers
  const handleRefresh = async () => {
    // Reset search states
    setComposerSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchResults([]);
    setSearchOffset(0);
    setHasMoreSearchResults(true);
    setIsSearching(false);
    isPaginatingRef.current = false;

    // Refetch first page from React Query
    await refetch();
  };

  // 초를 "분:초" 형식으로 변환
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleDeletePerformance = (performanceId: number) => {
    Alert.alert('연주 삭제', '정말 이 연주를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminPerformanceAPI.delete(performanceId);
            Alert.alert('성공', '연주가 삭제되었습니다.');
            if (selectedSector) {
              loadPerformancesBySector(selectedSector.id);
            }
          } catch (error) {
            Alert.alert('오류', '연주 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // Show full page loading only on initial mount
  if (loading && isInitialMount.current) {
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

  if (!selectedComposer) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-muted-foreground">작곡가를 선택해주세요.</Text>
      </View>
    );
  }

  const getPeriodColor = (period: string): string => {
    const ERAS = getAllPeriods();
    const periodMap: { [key: string]: string } = {
      바로크: 'baroque',
      고전주의: 'classical',
      낭만주의: 'romantic',
      근현대: 'modern',
    };
    const eraId = periodMap[period];
    const era = ERAS.find((e) => e.id === eraId);
    return era?.color || '#888888';
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="gap-6 p-4 pb-20">
          {/* 작곡가 선택 */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold">작곡가 선택</Text>
              <TouchableOpacity
                onPress={() => setShowComposerList(!showComposerList)}
                className="size-10 items-center justify-center rounded-full border border-border bg-background active:bg-accent">
                <Icon
                  as={showComposerList ? CheckIcon : PlusIcon}
                  size={20}
                  className={showComposerList ? 'text-primary' : ''}
                />
              </TouchableOpacity>
            </View>

            {/* 작곡가 검색 및 필터 */}
            {showComposerList && (
              <>
                <View className="relative">
                  <Input
                    placeholder="작곡가 검색..."
                    value={composerSearchQuery}
                    onChangeText={setComposerSearchQuery}
                    className="pl-10"
                  />
                  <View className="absolute left-3 top-3.5">
                    <Icon as={SearchIcon} size={18} className="text-muted-foreground" />
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <Button
                    size="sm"
                    variant={periodFilter === 'all' ? 'default' : 'outline'}
                    className="rounded-full"
                    onPress={() => setPeriodFilter('all')}>
                    <Text className="text-xs">전체</Text>
                  </Button>
                  <Button
                    size="sm"
                    variant={periodFilter === '바로크' ? 'default' : 'outline'}
                    className="rounded-full"
                    onPress={() => setPeriodFilter('바로크')}>
                    <Text className="text-xs">바로크</Text>
                  </Button>
                  <Button
                    size="sm"
                    variant={periodFilter === '고전주의' ? 'default' : 'outline'}
                    className="rounded-full"
                    onPress={() => setPeriodFilter('고전주의')}>
                    <Text className="text-xs">고전주의</Text>
                  </Button>
                  <Button
                    size="sm"
                    variant={periodFilter === '낭만주의' ? 'default' : 'outline'}
                    className="rounded-full"
                    onPress={() => setPeriodFilter('낭만주의')}>
                    <Text className="text-xs">낭만주의</Text>
                  </Button>
                  <Button
                    size="sm"
                    variant={periodFilter === '근현대' ? 'default' : 'outline'}
                    className="rounded-full"
                    onPress={() => setPeriodFilter('근현대')}>
                    <Text className="text-xs">근현대</Text>
                  </Button>
                </View>
              </>
            )}

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
              pointerEvents={showComposerList ? 'none' : 'auto'}>
              {!showComposerList && (
                <Card className="p-4">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        borderWidth: 3,
                        borderColor: getPeriodColor(selectedComposer.period),
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                      }}>
                      {selectedComposer.avatarUrl ? (
                        <Image
                          source={{ uri: getImageUrl(selectedComposer.avatarUrl) }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="size-full items-center justify-center"
                          style={{
                            backgroundColor: getPeriodColor(selectedComposer.period) + '30',
                          }}>
                          <Text
                            className="text-2xl font-bold"
                            style={{ color: getPeriodColor(selectedComposer.period) }}>
                            {selectedComposer.name[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">{selectedComposer.name}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {selectedComposer.period}
                      </Text>
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
              }}>
              {showComposerList && (
                <ScrollView
                  style={{ maxHeight: 500 }}
                  onScroll={handleComposerScroll}
                  scrollEventThrottle={800}>
                  <Card className="overflow-hidden p-3">
                    <View className="gap-3">
                      {/* Loading indicator for filter changes when composers exist */}
                      {isFetching && !isFetchingNextPage && composers.length > 0 && !isSearching && (
                        <View className="items-center py-3">
                          <ActivityIndicator size="small" />
                          <Text className="mt-2 text-xs text-muted-foreground">
                            필터 적용 중...
                          </Text>
                        </View>
                      )}

                      {composers.length === 0 ? (
                        <View className="items-center p-4">
                          {isFetching || isSearching ? (
                            <>
                              <ActivityIndicator size="small" />
                              <Text className="mt-2 text-sm text-muted-foreground">
                                로딩 중...
                              </Text>
                            </>
                          ) : (
                            <Text className="text-sm text-muted-foreground">
                              검색 결과가 없습니다
                            </Text>
                          )}
                        </View>
                      ) : (
                        composers.map((composer) => (
                          <TouchableOpacity
                            key={composer.id}
                            onPress={() => handleComposerSelect(composer)}
                            className={`rounded-lg border p-3 ${selectedComposer.id === composer.id ? 'border-primary bg-primary/5' : 'border-border'} active:bg-accent`}>
                            <View className="flex-row items-center gap-3">
                              <View
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 24,
                                  borderWidth: 3,
                                  borderColor: getPeriodColor(composer.period),
                                  overflow: 'hidden',
                                  backgroundColor: '#fff',
                                }}>
                                {composer.avatarUrl ? (
                                  <Image
                                    source={{ uri: getImageUrl(composer.avatarUrl) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View
                                    className="size-full items-center justify-center"
                                    style={{
                                      backgroundColor: getPeriodColor(composer.period) + '30',
                                    }}>
                                    <Text
                                      className="text-xl font-bold"
                                      style={{ color: getPeriodColor(composer.period) }}>
                                      {composer.name[0]}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View className="flex-1">
                                <Text className="text-base font-semibold">{composer.name}</Text>
                                <Text className="text-xs text-muted-foreground">
                                  {composer.period}
                                </Text>
                                {(composer.majorPieces?.length !== undefined || composer.pieceCount !== undefined) && (
                                  <Text className="text-xs text-muted-foreground">
                                    {`${composer.majorPieces?.length ?? composer.pieceCount ?? 0}곡`}
                                  </Text>
                                )}
                              </View>
                              {selectedComposer.id === composer.id && (
                                <Icon as={CheckIcon} size={20} className="text-primary" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))
                      )}

                      {/* Loading indicator for pagination/search */}
                      {(isFetchingNextPage || isSearching) && composers.length > 0 && (
                        <View className="items-center py-4">
                          <ActivityIndicator size="small" />
                          <Text className="mt-2 text-xs text-muted-foreground">
                            로딩 중...
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </ScrollView>
              )}
            </Animated.View>
          </View>

          {/* 곡 선택 */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold">곡 선택</Text>
              <TouchableOpacity
                onPress={() => setShowPieceList(!showPieceList)}
                className="size-10 items-center justify-center rounded-full border border-border bg-background active:bg-accent">
                <Icon
                  as={showPieceList ? CheckIcon : PlusIcon}
                  size={20}
                  className={showPieceList ? 'text-primary' : ''}
                />
              </TouchableOpacity>
            </View>

            {/* 곡 검색 */}
            {showPieceList && (
              <View className="relative">
                <Input
                  placeholder="곡 검색..."
                  value={pieceSearchQuery}
                  onChangeText={setPieceSearchQuery}
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Icon as={SearchIcon} size={18} className="text-muted-foreground" />
                </View>
              </View>
            )}

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
              pointerEvents={showPieceList ? 'none' : 'auto'}>
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
              }}>
              {showPieceList && (
                <ScrollView style={{ maxHeight: 400 }}>
                  <Card className="gap-3 overflow-hidden p-3">
                    {filteredPieces.length === 0 ? (
                      <View className="items-center p-4">
                        <Text className="text-sm text-muted-foreground">검색 결과가 없습니다</Text>
                      </View>
                    ) : (
                      filteredPieces.map((piece) => (
                        <TouchableOpacity
                          key={piece.id}
                          onPress={() => handlePieceSelect(piece)}
                          className={`rounded-lg border p-3 ${selectedPiece?.id === piece.id ? 'border-primary bg-primary/5' : 'border-border'} active:bg-accent`}>
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className="text-base font-semibold">{piece.title}</Text>
                              {piece.opusNumber && (
                                <Text className="text-xs text-muted-foreground">
                                  {piece.opusNumber}
                                </Text>
                              )}
                              <Text className="text-sm text-muted-foreground">
                                {piecePerformanceCounts[piece.id] || 0}개의 연주 비교 가능
                              </Text>
                            </View>
                            {selectedPiece?.id === piece.id && (
                              <Icon as={CheckIcon} size={20} className="text-primary" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </Card>
                </ScrollView>
              )}
            </Animated.View>
          </View>

          {/* 선택된 곡 정보 */}
          {noPieceFound || !selectedPiece ? (
            <Card className="bg-muted/50 p-8">
              <View className="items-center gap-4">
                <Icon as={PlayCircleIcon} size={64} className="text-muted-foreground/30" />
                <View className="items-center gap-2">
                  <Text className="text-center text-xl font-bold">비교 영상이 없습니다</Text>
                  <Text className="text-center text-sm text-muted-foreground">
                    해당 곡의 연주 비교 영상이 아직 준비되지 않았습니다.{'\n'}
                    다른 곡을 선택해주세요.
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <>
              <Card className="bg-primary/5 p-4">
                <View className="gap-2">
                  <Text className="text-2xl font-bold">
                    {selectedPiece.title}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {selectedComposer.fullName} • {selectedComposer.period}
                  </Text>
                  <Text className="mt-2 text-sm leading-6">{selectedPiece.description}</Text>
                </View>
              </Card>

              {/* 연주 비교 섹션 */}
              {selectedPiece && (
                <View className="gap-4">
                  <Text className="text-xl font-bold">연주 비교</Text>

                  {/* Sector Chips */}
                  {sectors.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {sectors.map((sector) => (
                        <SectorChip
                          key={sector.id}
                          sector={sector}
                          isSelected={selectedSector?.id === sector.id}
                          onPress={() => handleSectorSelect(sector)}
                          onEdit={canEdit ? () => handleEditSector(sector) : undefined}
                        />
                      ))}
                      {canEdit && <AddSectorChip onPress={handleAddSector} />}
                    </View>
                  ) : (
                    <Card className="bg-muted/20 p-8">
                      <View className="items-center gap-3">
                        <Icon as={PlayCircleIcon} size={48} className="text-primary/60" />
                        <Text className="text-center text-base font-medium">섹터가 없습니다</Text>
                        <Text className="text-center text-sm text-muted-foreground">
                          {canEdit ? '섹터를 추가하여 연주를 분류하세요' : '아직 섹터가 생성되지 않았습니다'}
                        </Text>
                        {canEdit && (
                          <Button size="sm" onPress={handleAddSector} className="mt-2">
                            <Icon as={PlusIcon} size={16} className="text-primary-foreground" />
                            <Text className="ml-1">섹터 추가</Text>
                          </Button>
                        )}
                      </View>
                    </Card>
                  )}

                  {/* Performance Area - only if sector selected */}
                  {selectedSector ? (
                    <View className="gap-3">
                      {performances.length > 0 && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-muted-foreground">
                            {currentPerformanceIndex + 1} / {performances.length}개 연주
                          </Text>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => handleAddPerformanceToSector(selectedSector)}>
                              <Icon as={PlusIcon} size={14} />
                              <Text className="ml-1">연주 추가</Text>
                            </Button>
                          )}
                        </View>
                      )}

                      {performances.length === 0 ? (
                        <Card className="bg-muted/50 p-8">
                          <View className="items-center gap-4">
                            <Icon as={PlayCircleIcon} size={64} className="text-muted-foreground/30" />
                            <View className="items-center gap-2">
                              <Text className="text-center text-xl font-bold">연주 영상 준비 중</Text>
                              <Text className="text-center text-sm text-muted-foreground">
                                이 섹터의 연주 비교 영상이 아직 준비되지 않았습니다.
                              </Text>
                            </View>
                            {canEdit && (
                              <Button
                                size="sm"
                                onPress={() => handleAddPerformanceToSector(selectedSector)}
                                className="mt-2">
                                <Icon as={PlusIcon} size={16} />
                                <Text className="ml-1">연주 추가</Text>
                              </Button>
                            )}
                          </View>
                        </Card>
                      ) : (
                    <FlatList
                      data={performances}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      pagingEnabled
                      snapToInterval={360}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingRight: 16 }}
                      onViewableItemsChanged={onViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      renderItem={renderPerformanceItem}
                      keyExtractor={(item) => item.id.toString()}
                      />
                      )}

                      {/* 페이지 인디케이터 */}
                      {performances.length > 1 && (
                        <View className="mt-3 flex-row justify-center gap-2">
                          {performances.map((_, index) => (
                            <View
                              key={index}
                              className={`h-2 rounded-full ${
                                index === currentPerformanceIndex ? 'w-6 bg-primary' : 'w-2 bg-muted'
                              }`}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    sectors.length > 0 && (
                      <Card className="bg-muted/20 p-8">
                        <View className="items-center gap-2">
                          <Text className="text-center text-sm text-muted-foreground">
                            섹터를 선택하여 연주를 감상하세요
                          </Text>
                        </View>
                      </Card>
                    )
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
        sectorId={selectedSector?.id}
        onClose={() => setPerformanceFormVisible(false)}
        onSuccess={() => {
          setPerformanceFormVisible(false);
          if (selectedSector) {
            loadPerformancesBySector(selectedSector.id);
          }
        }}
      />

      {/* Sector Form Modal */}
      <SectorFormModal
        visible={sectorFormVisible}
        sector={selectedSectorForEdit}
        pieceId={selectedPiece?.id}
        onClose={() => setSectorFormVisible(false)}
        onSuccess={handleSectorFormSuccess}
      />
    </>
  );
}

