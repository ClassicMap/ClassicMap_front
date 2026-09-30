import {
  ChoiceField,
  FormField,
  FormRow,
  FormSection,
  TextField,
  hasErrors,
  useSubmitAttempt,
  type FieldErrors,
} from '@/components/admin/form-field';
import { ImageUploadField } from '@/components/admin/form-image';
import { FORM_INVALID_MESSAGE, FormModal } from '@/components/admin/form-modal';
import {
  PickerMessage,
  PickerOption,
  PickerPanel,
  PickerTrigger,
} from '@/components/admin/form-picker';
import { Text } from '@/components/ui/text';
import { AdminConcertAPI } from '@/lib/api/admin';
import { useVenueSearch } from '@/lib/hooks/useVenueSearch';
import type { Concert } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CalendarIcon, ClockIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform } from 'react-native';

interface ConcertFormModalProps {
  visible: boolean;
  concert?: Concert;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'upcoming', label: '예정' },
  { value: 'ongoing', label: '진행 중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소됨' },
];

// 날짜 형식 검증 (YYYY-MM-DD)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ConcertField = 'title' | 'startDate' | 'venueId';

export function ConcertFormModal({ visible, concert, onClose, onSuccess }: ConcertFormModalProps) {
  const [title, setTitle] = React.useState('');
  const [composerInfo, setComposerInfo] = React.useState('');
  const [venueId, setVenueId] = React.useState<number | null>(null);
  const [startDate, setStartDate] = React.useState('');
  const [concertTime, setConcertTime] = React.useState('');
  const [priceInfo, setPriceInfo] = React.useState('');
  const [status, setStatus] = React.useState('upcoming');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedPoster, setSelectedPoster] = React.useState<string | null>(null);
  const [posterUrl, setPosterUrl] = React.useState<string | null>(null);
  const [showVenuePicker, setShowVenuePicker] = React.useState(false);
  const [venueSearch, setVenueSearch] = React.useState('');
  // 검색어를 비우면 결과 목록도 비므로, 고른 공연장 이름은 따로 들고 있다가 보여 준다
  const [pickedVenueName, setPickedVenueName] = React.useState<string | null>(null);
  const { attempted, setAttempted } = useSubmitAttempt(visible);

  // DateTimePicker states
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [selectedTime, setSelectedTime] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const { data: venueSearchResults = [], isLoading: venuesLoading } = useVenueSearch(
    venueSearch,
    visible
  );

  // 초기 데이터 로드
  React.useEffect(() => {
    if (visible) {
      setShowVenuePicker(false);
      setVenueSearch('');
      setPickedVenueName(null);

      if (concert) {
        setTitle(concert.title);
        setComposerInfo(concert.composerInfo || '');
        setVenueId(concert.venueId);
        setStartDate(concert.startDate);
        setConcertTime(concert.concertTime || '');
        setPriceInfo(concert.priceInfo || '');
        setStatus(concert.status);
        setPosterUrl(concert.posterUrl || null);
        // 미리보기는 지금 저장된 포스터부터 보여 준다
        setSelectedPoster(concert.posterUrl || null);

        // Date picker 초기화
        if (concert.startDate) {
          setSelectedDate(new Date(concert.startDate));
        }
        if (concert.concertTime) {
          const [hours, minutes] = concert.concertTime.split(':');
          const timeDate = new Date();
          timeDate.setHours(parseInt(hours), parseInt(minutes));
          setSelectedTime(timeDate);
        }
      } else {
        setTitle('');
        setComposerInfo('');
        setVenueId(null);
        setStartDate('');
        setConcertTime('');
        setPriceInfo('');
        setStatus('upcoming');
        setSelectedPoster(null);
        setPosterUrl(null);
        setSelectedDate(new Date());
        setSelectedTime(new Date());
      }
    }
  }, [visible, concert]);

  // Date/Time handlers
  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setStartDate(formattedDate);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      setConcertTime(`${hours}:${minutes}:00`);
    }
  };

  const pickPoster = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 접근을 허용한 뒤 다시 시도해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedPoster(uri);

      // 서버에 업로드
      await uploadPosterToServer(uri);
    }
  };

  const uploadPosterToServer = async (uri: string) => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';
      const formData = new FormData();

      // Web과 Native 플랫폼 구분
      if (Platform.OS === 'web') {
        // Web: blob URL을 File 객체로 변환
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `poster_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append('file', file);
      } else {
        // Native: 기존 방식
        let filename = uri.split('/').pop() || 'poster.jpg';

        if (!filename.includes('.')) {
          filename = `${filename}.jpg`;
        }

        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        // React Native의 FormData는 파일을 { uri, name, type } 객체로 받는다. DOM 타입에는 없는 모양이다.
        formData.append('file', {
          uri,
          name: filename,
          type: fileType,
        } as unknown as Blob);
      }

      const uploadResponse = await fetch(`${API_BASE_URL}/upload/concert/poster`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data: { url: string } = await uploadResponse.json();
        const serverUrl = data.url; // 서버에서 받은 상대 경로: /uploads/...
        setPosterUrl(serverUrl);
        setSelectedPoster(serverUrl); // 미리보기도 서버 경로로 업데이트
        Alert.alert('포스터를 올렸어요');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('포스터를 올리지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    }
  };

  const errors: FieldErrors<ConcertField> = {
    title: title ? undefined : '제목을 입력해 주세요.',
    startDate: !startDate
      ? '공연일을 골라 주세요.'
      : !DATE_PATTERN.test(startDate)
        ? '날짜는 YYYY-MM-DD 형식이어야 해요. 날짜를 다시 골라 주세요.'
        : undefined,
    venueId: venueId ? undefined : '공연장을 골라 주세요.',
  };
  const shown: FieldErrors<ConcertField> = attempted ? errors : {};

  const handleSubmit = async () => {
    if (!venueId || hasErrors(errors)) {
      setAttempted(true);
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        title,
        composerInfo: composerInfo || undefined,
        venueId: venueId,
        startDate: startDate,
        concertTime: concertTime || undefined,
        priceInfo: priceInfo || undefined,
        posterUrl: posterUrl || undefined,
        status,
      };

      if (concert) {
        // Update existing concert
        await AdminConcertAPI.update(concert.id, data);
        Alert.alert('공연을 수정했어요');
      } else {
        // Create new concert
        await AdminConcertAPI.create(data);
        Alert.alert('공연을 추가했어요');
      }
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const venueLabel = venueId
    ? venueSearchResults.find((v) => v.id === venueId)?.name ||
      pickedVenueName ||
      `선택됨 · ID ${venueId}`
    : undefined;

  let venueMessage = '공연장 이름을 입력하면 찾아 드려요.';
  if (venuesLoading) venueMessage = '찾는 중…';
  else if (venueSearch) venueMessage = '검색 결과가 없어요. 다른 이름으로 찾아보세요.';

  return (
    <FormModal
      visible={visible}
      title={concert ? '공연 수정' : '공연 추가'}
      subtitle={concert?.title}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={attempted && hasErrors(errors) ? FORM_INVALID_MESSAGE : undefined}>
      <FormSection title="포스터">
        <ImageUploadField
          label="공연 포스터"
          uri={selectedPoster}
          heightRatio={1.5}
          onPick={pickPoster}
          help="고르면 바로 올라가요. 저장을 눌러야 공연에 반영돼요."
        />
      </FormSection>

      <FormSection title="기본 정보">
        <TextField
          label="제목"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="베토벤 교향곡 전곡 연주회"
          error={shown.title}
        />
        <TextField
          label="작곡가·프로그램 정보"
          value={composerInfo}
          onChangeText={setComposerInfo}
          placeholder="베토벤, 모차르트"
        />
      </FormSection>

      <FormSection title="일정과 장소">
        <FormRow>
          <FormField label="공연일" required error={shown.startDate}>
            <PickerTrigger
              label="공연일"
              value={startDate || undefined}
              placeholder="날짜를 골라 주세요"
              icon={CalendarIcon}
              invalid={Boolean(shown.startDate)}
              onPress={() => setShowDatePicker(true)}
            />
          </FormField>
          <FormField label="공연 시간">
            <PickerTrigger
              label="공연 시간"
              value={concertTime ? concertTime.substring(0, 5) : undefined}
              placeholder="시간을 골라 주세요"
              icon={ClockIcon}
              onPress={() => setShowTimePicker(true)}
            />
          </FormField>
        </FormRow>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
        {Platform.OS === 'web' ? (
          <Text variant="caption">웹에서는 날짜와 시간을 아직 고를 수 없어요. 앱에서 입력해 주세요.</Text>
        ) : null}

        <FormField label="공연장" required error={shown.venueId}>
          <PickerTrigger
            label="공연장"
            value={venueLabel}
            placeholder="공연장을 골라 주세요"
            open={showVenuePicker}
            invalid={Boolean(shown.venueId)}
            onPress={() => setShowVenuePicker(!showVenuePicker)}
          />
          {showVenuePicker && (
            <PickerPanel
              search={{
                value: venueSearch,
                onChangeText: setVenueSearch,
                placeholder: '공연장 이름으로 찾기',
              }}>
              {venueSearchResults.length === 0 ? (
                <PickerMessage>{venueMessage}</PickerMessage>
              ) : (
                venueSearchResults.map((venue) => (
                  <PickerOption
                    key={venue.id}
                    title={venue.name}
                    description={
                      venue.city && venue.country ? `${venue.city}, ${venue.country}` : undefined
                    }
                    selected={venueId === venue.id}
                    onPress={() => {
                      setVenueId(venue.id);
                      setPickedVenueName(venue.name);
                      setShowVenuePicker(false);
                      setVenueSearch('');
                    }}
                  />
                ))
              )}
            </PickerPanel>
          )}
        </FormField>
      </FormSection>

      <FormSection title="가격과 상태">
        <TextField
          label="가격 정보"
          value={priceInfo}
          onChangeText={setPriceInfo}
          placeholder="R석 100,000원"
        />
        <ChoiceField label="상태" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </FormSection>
    </FormModal>
  );
}
