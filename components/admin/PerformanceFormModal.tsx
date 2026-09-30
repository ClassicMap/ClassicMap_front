import {
  FormField,
  FormRow,
  FormSection,
  TextAreaField,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type FieldErrors,
} from '@/components/admin/form-field';
import { FORM_INVALID_MESSAGE, FormModal } from '@/components/admin/form-modal';
import {
  PickerMessage,
  PickerOption,
  PickerPanel,
  PickerTrigger,
} from '@/components/admin/form-picker';
import { Text } from '@/components/ui/text';
import { AdminPerformanceAPI } from '@/lib/api/admin';
import { PerformanceSectorAPI } from '@/lib/api/client';
import { useArtistSearch } from '@/lib/hooks/useArtistSearch';
import type { Performance, PerformanceSectorWithCount } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import * as React from 'react';

interface PerformanceFormModalProps {
  visible: boolean;
  performance?: Performance;
  composerId?: number;
  pieceId?: number;
  sectorId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

// 초를 "분:초" 형식으로 변환
function formatSeconds(seconds: number): string {
  if (isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// "분:초" 형식을 초로 변환
function parseTimeToSeconds(time: string): number {
  const parts = time.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseInt(time) || 0;
}

// YouTube URL에서 video ID 추출
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

type PerformanceField = 'sectorId' | 'artistId' | 'youtubeUrl' | 'startTime' | 'endTime';

export function PerformanceFormModal({
  visible,
  performance,
  composerId,
  pieceId: initialPieceId,
  sectorId: initialSectorId,
  onClose,
  onSuccess,
}: PerformanceFormModalProps) {
  const [pieceId, setPieceId] = React.useState<number | null>(null);
  const [sectorId, setSectorId] = React.useState<number | null>(null);
  const [sectors, setSectors] = React.useState<PerformanceSectorWithCount[]>([]);
  const [loadingSectors, setLoadingSectors] = React.useState(false);
  const [showSectorPicker, setShowSectorPicker] = React.useState(false);
  const [artistId, setArtistId] = React.useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [characteristic, setCharacteristic] = React.useState('');
  const [viewCount, setViewCount] = React.useState('');
  const [rating, setRating] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showArtistPicker, setShowArtistPicker] = React.useState(false);
  const [artistSearch, setArtistSearch] = React.useState('');
  // 검색어를 비우면 결과 목록도 비므로, 고른 연주자 이름은 따로 들고 있다가 보여 준다
  const [pickedArtistName, setPickedArtistName] = React.useState<string | null>(null);
  const { attempted, setAttempted } = useSubmitAttempt(visible);

  const { data: artistSearchResults = [], isLoading } = useArtistSearch(artistSearch, visible);

  // 초기 데이터 로드
  React.useEffect(() => {
    if (visible) {
      setShowArtistPicker(false);
      setShowSectorPicker(false);
      setArtistSearch('');
      setPickedArtistName(null);

      if (performance) {
        // 수정 모드
        setPieceId(performance.pieceId);
        setSectorId(performance.sectorId);
        setArtistId(performance.artistId);
        setYoutubeUrl(`https://www.youtube.com/watch?v=${performance.videoId}`);
        setStartTime(formatSeconds(performance.startTime));
        setEndTime(formatSeconds(performance.endTime));
        setCharacteristic(performance.characteristic || '');
        setViewCount(performance.viewCount?.toString() || '0');
        setRating(performance.rating?.toString() || '0.0');
      } else {
        // 추가 모드
        setPieceId(initialPieceId ?? null);
        setSectorId(initialSectorId ?? null);
        setArtistId(null);
        setYoutubeUrl('');
        setStartTime('');
        setEndTime('');
        setCharacteristic('');
        setViewCount('0');
        setRating('0.0');
      }
    }
  }, [visible, performance, initialPieceId, initialSectorId]);

  // 섹터 로드
  React.useEffect(() => {
    const loadSectors = async () => {
      if (!pieceId) {
        setSectors([]);
        return;
      }

      setLoadingSectors(true);
      try {
        const data = await PerformanceSectorAPI.getByPiece(pieceId);
        setSectors(data);

        // 섹터가 하나만 있으면 자동 선택
        if (data.length === 1 && !sectorId) {
          setSectorId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load sectors:', error);
        Alert.alert('구간 목록을 불러오지 못했어요', '잠시 뒤 다시 시도해 주세요.');
        setSectors([]);
      } finally {
        setLoadingSectors(false);
      }
    };

    if (visible && pieceId) {
      loadSectors();
    }
  }, [visible, pieceId]);

  const videoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;
  const startSeconds = parseTimeToSeconds(startTime);
  const endSeconds = parseTimeToSeconds(endTime);

  const errors: FieldErrors<PerformanceField> = {
    sectorId: sectorId ? undefined : '구간을 골라 주세요.',
    artistId: artistId ? undefined : '연주자를 골라 주세요.',
    youtubeUrl: !youtubeUrl
      ? 'YouTube 주소를 입력해 주세요.'
      : !videoId
        ? 'YouTube 영상 주소가 아니에요. 아래 예시처럼 watch?v= 주소를 넣어 주세요.'
        : undefined,
    startTime: startTime ? undefined : '시작 시간을 입력해 주세요.',
    endTime: !endTime
      ? '종료 시간을 입력해 주세요.'
      : startTime && endSeconds <= startSeconds
        ? '종료 시간은 시작 시간보다 뒤여야 해요.'
        : undefined,
  };
  const shown: FieldErrors<PerformanceField> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (!sectorId || !artistId || !videoId || hasErrors(errors)) {
      setAttempted(true);
      return;
    }

    const performanceData = {
      sectorId,
      pieceId: pieceId!, // 하위 호환성
      artistId,
      videoPlatform: 'youtube' as const,
      videoId,
      startTime: startSeconds,
      endTime: endSeconds,
      characteristic: characteristic || undefined,
      viewCount: parseInt(viewCount) || 0,
      rating: parseFloat(rating) || 0.0,
    };

    setSubmitting(true);
    try {
      if (performance) {
        await AdminPerformanceAPI.update(performance.id, performanceData);
        Alert.alert('연주를 수정했어요');
      } else {
        await AdminPerformanceAPI.create(performanceData);
        Alert.alert('연주를 추가했어요');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save performance:', error);
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const sectorLabel =
    !loadingSectors && sectorId
      ? sectors.find((s) => s.id === sectorId)?.sectorName || `선택됨 · ID ${sectorId}`
      : undefined;

  const artistLabel = artistId
    ? artistSearchResults.find((a) => a.id === artistId)?.name ||
      pickedArtistName ||
      `선택됨 · ID ${artistId}`
    : undefined;

  let artistMessage = '연주자 이름을 입력하면 찾아 드려요.';
  if (isLoading) artistMessage = '찾는 중…';
  else if (artistSearch) artistMessage = '검색 결과가 없어요. 다른 이름이나 영문 표기로 찾아보세요.';

  return (
    <FormModal
      visible={visible}
      title={performance ? '연주 수정' : '연주 추가'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title="연결">
        <FormField label="구간" required error={shown.sectorId}>
          <PickerTrigger
            label="구간"
            value={sectorLabel}
            placeholder={loadingSectors ? '구간을 불러오는 중…' : '구간을 골라 주세요'}
            open={showSectorPicker}
            invalid={Boolean(shown.sectorId)}
            onPress={() => setShowSectorPicker(!showSectorPicker)}
          />
          {showSectorPicker && (
            <PickerPanel>
              {sectors.length === 0 ? (
                <PickerMessage>
                  {loadingSectors
                    ? '구간을 불러오는 중…'
                    : '이 곡에 등록된 구간이 없어요. 구간을 먼저 추가해 주세요.'}
                </PickerMessage>
              ) : (
                sectors.map((sector) => (
                  <PickerOption
                    key={sector.id}
                    title={sector.sectorName}
                    description={sector.description || undefined}
                    meta={`연주 ${sector.performanceCount}개`}
                    selected={sectorId === sector.id}
                    onPress={() => {
                      setSectorId(sector.id);
                      setShowSectorPicker(false);
                    }}
                  />
                ))
              )}
            </PickerPanel>
          )}
        </FormField>

        <FormField label="연주자" required error={shown.artistId}>
          <PickerTrigger
            label="연주자"
            value={artistLabel}
            placeholder="연주자를 골라 주세요"
            open={showArtistPicker}
            invalid={Boolean(shown.artistId)}
            onPress={() => setShowArtistPicker(!showArtistPicker)}
          />
          {showArtistPicker && (
            <PickerPanel
              search={{
                value: artistSearch,
                onChangeText: setArtistSearch,
                placeholder: '연주자 이름으로 찾기',
              }}>
              {artistSearchResults.length === 0 ? (
                <PickerMessage>{artistMessage}</PickerMessage>
              ) : (
                artistSearchResults.map((artist) => (
                  <PickerOption
                    key={artist.id}
                    title={artist.name}
                    description={artist.englishName}
                    selected={artistId === artist.id}
                    onPress={() => {
                      setArtistId(artist.id);
                      setPickedArtistName(artist.name);
                      setShowArtistPicker(false);
                      setArtistSearch('');
                    }}
                  />
                ))
              )}
            </PickerPanel>
          )}
        </FormField>
      </FormSection>

      <FormSection title="영상">
        <TextField
          label="YouTube 주소"
          required
          value={youtubeUrl}
          onChangeText={setYoutubeUrl}
          placeholder="https://www.youtube.com/watch?v=…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={shown.youtubeUrl}
          help="예: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        />
        <FormRow>
          <TextField
            label="시작 시간 (분:초)"
            required
            value={startTime}
            onChangeText={setStartTime}
            placeholder="0:30"
            keyboardType="numeric"
            error={shown.startTime}
          />
          <TextField
            label="종료 시간 (분:초)"
            required
            value={endTime}
            onChangeText={setEndTime}
            placeholder="1:30"
            keyboardType="numeric"
            error={shown.endTime}
          />
        </FormRow>
        <Text variant="caption">예: 0:30은 30초, 1:15는 1분 15초예요.</Text>
      </FormSection>

      <FormSection title="부가 정보">
        <FormRow>
          <TextField
            label="조회수"
            value={viewCount}
            onChangeText={setViewCount}
            placeholder="0"
            keyboardType="number-pad"
          />
          <TextField
            label="평점"
            value={rating}
            onChangeText={setRating}
            placeholder="0.0"
            keyboardType="decimal-pad"
          />
        </FormRow>
        <TextAreaField
          label="연주 특징"
          value={characteristic}
          onChangeText={setCharacteristic}
          placeholder="이 연주의 특징을 적어 주세요"
        />
      </FormSection>
    </FormModal>
  );
}
