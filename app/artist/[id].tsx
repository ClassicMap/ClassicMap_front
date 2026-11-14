import { ArtistFormModal } from '@/features/admin/components/artist-form-modal';
import { RecordingFormModal } from '@/features/admin/components/recording-form-modal';
import { AlbumCard } from '@/features/album/components/album-card';
import { AlbumDetailModal } from '@/features/album/components/album-detail-modal';
import { ArtistBio } from '@/features/artist/components/artist-bio';
import { ArtistComparisons } from '@/features/artist/components/artist-comparisons';
import { FavoriteButton } from '@/features/library/components/favorite-button';
import { TicketVendorsModal } from '@/features/concert/components/ticket-vendors-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { HeroBanner } from '@/components/shared/hero-banner';
import { PhotoCredit } from '@/components/shared/photo-credit';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRepertoireIds } from '@/features/library/hooks/use-repertoire-ids';
import { AdminArtistAPI, AdminRecordingAPI } from '@/lib/api/admin';
import { ConcertAPI, RecordingAPI, type RecordingListItem } from '@/lib/api/client';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useAuth } from '@/hooks/use-auth';
import { msg, t, useLocale } from '@/lib/i18n';
import { useArtist } from '@/lib/query/hooks/use-artists';
import type { Artist, Concert, ImageCredit, Recording, TicketVendor } from '@/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useQuery } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircleIcon, EditIcon, PlusIcon, TrashIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

const WEEKDAYS = [
  msg('weekday::일'),
  msg('weekday::월'),
  msg('weekday::화'),
  msg('weekday::수'),
  msg('weekday::목'),
  msg('weekday::금'),
  msg('weekday::토'),
];
// 한국어는 숫자 월(11월), 영어는 줄임 월 이름(Nov)
const MONTHS = [
  msg('month::1'),
  msg('month::2'),
  msg('month::3'),
  msg('month::4'),
  msg('month::5'),
  msg('month::6'),
  msg('month::7'),
  msg('month::8'),
  msg('month::9'),
  msg('month::10'),
  msg('month::11'),
  msg('month::12'),
];

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatConcertDay(value: string): string {
  const date = parseDate(value);
  if (!date) return t('날짜 미정');
  return t('{month}월 {day}일 ({weekday})', {
    month: t(MONTHS[date.getMonth()]),
    day: date.getDate(),
    weekday: t(WEEKDAYS[date.getDay()]),
  });
}

/** 오늘 기준 남은 날. 지난 공연이면 null */
function daysUntil(value: string): number | null {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

function upcomingConcerts(concerts: Concert[]): Concert[] {
  return concerts
    .filter((concert) => daysUntil(concert.startDate) !== null || concert.status === 'ongoing')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function recordingYear(recording: Recording): string {
  return (recording.releaseDate ?? recording.year ?? '').slice(0, 4);
}

/** 음반을 앨범 카드·상세가 쓰는 목록 모양으로 맞춘다 */
function toAlbumItem(recording: Recording, artist: Artist): RecordingListItem {
  return {
    id: recording.id,
    title: recording.title,
    year: recording.year,
    releaseDate: recording.releaseDate ?? null,
    label: recording.label ?? null,
    coverUrl: recording.coverUrl ?? null,
    trackCount: recording.trackCount ?? null,
    isSingle: recording.isSingle ?? null,
    isCompilation: recording.isCompilation ?? null,
    isPreRelease: null,
    appleMusicUrl: recording.appleMusicUrl ?? null,
    spotifyUrl: recording.spotifyUrl ?? null,
    youtubeMusicUrl: recording.youtubeMusicUrl ?? null,
    artistId: artist.id,
    artistName: artist.name,
    artistEnglishName: artist.englishName ?? null,
    artistImageUrl: artist.imageUrl ?? null,
    artistCategory: artist.category ?? null,
  };
}

export default function ArtistDetailScreen() {
  const { locale } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistId = Number(id);
  const router = useRouter();
  const { canEdit } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';

  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [recordingFormVisible, setRecordingFormVisible] = React.useState(false);
  const [selectedRecording, setSelectedRecording] = React.useState<Recording | undefined>();
  const [vendors, setVendors] = React.useState<TicketVendor[]>([]);
  const [showVendorsModal, setShowVendorsModal] = React.useState(false);
  const [openedAlbum, setOpenedAlbum] = React.useState<RecordingListItem | null>(null);
  const repertoire = useRepertoireIds();

  const artistQuery = useArtist(Number.isFinite(artistId) ? artistId : undefined);
  const artist = artistQuery.data;
  const recordingsQuery = useQuery({
    queryKey: ['artists', artistId, 'recordings'],
    queryFn: () => RecordingAPI.getByArtist(artistId),
    enabled: Boolean(artist),
  });
  const concertsQuery = useQuery({
    queryKey: ['artists', artistId, 'concerts'],
    queryFn: () => ConcertAPI.getByArtist(artistId),
    enabled: Boolean(artist),
  });

  const recordings = React.useMemo(
    () =>
      [...(recordingsQuery.data ?? [])].sort((a, b) =>
        recordingYear(b).localeCompare(recordingYear(a))
      ),
    [recordingsQuery.data, locale]
  );
  const concerts = React.useMemo(
    () => upcomingConcerts(concertsQuery.data ?? []),
    [concertsQuery.data, locale]
  );
  const awards = React.useMemo(
    () => [...(artist?.awards ?? [])].sort((a, b) => b.year.localeCompare(a.year)),
    [artist?.awards, locale]
  );

  const refresh = () => {
    void artistQuery.refetch();
    void recordingsQuery.refetch();
    void concertsQuery.refetch();
  };

  const handleDeleteArtist = () => {
    if (!artist) return;
    Alert.alert(t('아티스트 삭제'), t('{name}을(를) 삭제할까요?', { name: artist.name }), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('삭제'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminArtistAPI.delete(artist.id);
            router.back();
          } catch {
            Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
          }
        },
      },
    ]);
  };

  const handleDeleteRecording = (recordingId: number) => {
    Alert.alert(t('앨범 삭제'), t('이 앨범을 삭제할까요?'), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('삭제'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminRecordingAPI.delete(recordingId);
            void recordingsQuery.refetch();
          } catch {
            Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
          }
        },
      },
    ]);
  };

  const openTickets = async (concert: Concert) => {
    try {
      setVendors(await ConcertAPI.getTicketVendors(concert.id));
      setShowVendorsModal(true);
    } catch {
      Alert.alert(t('예매처를 불러오지 못했어요'), t('공연 상세에서 다시 시도해 주세요.'));
    }
  };

  if (artistQuery.isLoading) {
    return (
      <View className="flex-1 bg-background p-6">
        <View className="flex-row items-end gap-6">
          <Skeleton className="size-40 rounded-full" />
          <View className="flex-1 gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </View>
        </View>
      </View>
    );
  }

  if (artistQuery.isError || !artist) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title={t('아티스트 정보를 불러오지 못했어요')}
          description={t('연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.')}
          action={{ label: t('다시 시도'), onPress: () => artistQuery.refetch() }}
        />
      </View>
    );
  }

  const meta = [
    getArtistCategoryLabel(artist.category),
    artist.nationality ? t(artist.nationality) : null,
    artist.birthYear ? t('{year}년생', { year: artist.birthYear }) : null,
  ].filter(Boolean);
  const nextConcert = concerts[0];

  const aside = (
    <View className="gap-8">
      <View>
        <Text variant="headline" className="mb-3">
          {t('다가오는 공연')}
        </Text>
        {concertsQuery.isLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : nextConcert ? (
          <View className="gap-2">
            {concerts.slice(0, 3).map((concert) => {
              const days = daysUntil(concert.startDate);
              return (
                <Pressable
                  key={concert.id}
                  onPress={() => router.push(`/concert/${concert.id}` as Href)}
                  className="-mx-3 flex-row gap-3.5 rounded-lg p-3 active:bg-surface-2 web:hover:bg-surface-2">
                  <EntityThumb
                    name={concert.title}
                    image={concert.posterUrl}
                    shape="square"
                    size={72}
                    aspect={4 / 3}
                  />
                  <View className="min-w-0 flex-1">
                    {days !== null ? (
                      <Badge tone="accent" label={days === 0 ? t('오늘') : `D-${days}`} />
                    ) : null}
                    <Text
                      numberOfLines={2}
                      className="mt-1.5 text-body-sm font-bold text-foreground">
                      {concert.title}
                    </Text>
                    <Text variant="caption" numberOfLines={1} className="mt-1">
                      {formatConcertDay(concert.startDate)}
                    </Text>
                    {concert.facilityName ? (
                      <Text variant="caption" numberOfLines={1}>
                        {concert.facilityName}
                      </Text>
                    ) : null}
                    {concert.status === 'upcoming' || concert.status === 'ongoing' ? (
                      <Pressable onPress={() => openTickets(concert)} className="mt-1.5 self-start">
                        <Text variant="label" className="text-primary">
                          {t('예매처 보기')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text variant="bodySm" className="text-foreground-muted">
            {t('예정된 공연이 없어요.')}
          </Text>
        )}
      </View>

      {awards.length > 0 ? (
        <View>
          <Text variant="headline" className="mb-3">
            {t('수상')}
          </Text>
          <View className="gap-3.5">
            {awards.map((award, index) => (
              <View key={award.id} className="flex-row gap-3">
                <Text
                  variant="mono"
                  className={cn(
                    'w-11 pt-0.5',
                    index === 0 ? 'text-primary' : 'text-foreground-muted'
                  )}>
                  {award.year}
                </Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-sm font-semibold text-foreground">
                    {award.awardName}
                  </Text>
                  {[award.ranking, award.category].filter(Boolean).length > 0 ? (
                    <Text variant="caption" className="mt-0.5">
                      {[award.ranking, award.category].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={artistQuery.isRefetching} onRefresh={refresh} />
        }
        contentContainerClassName={cn('pb-24', wide ? 'px-7' : 'px-4')}>
        {/* 배너 전용 가로 사진이 있으면 폭으로 깔고, 없으면 프로필 사진을 오른쪽에 세운다 */}
        <HeroBanner
          image={artist.banner?.url ?? artist.imageUrl}
          focalPoint={artist.banner?.focalPoint}
          title={artist.name}
          meta={[...meta, artist.englishName !== artist.name ? artist.englishName : null]}
          wide={wide}
          imageLayout={artist.banner ? 'cover' : 'side'}
          onBack={
            wide ? undefined : () => (router.canGoBack() ? router.back() : router.push('/search'))
          }
        />

        {/* 행동: 담기 → 관리 */}
        <View className="mt-6 flex-row flex-wrap items-center gap-3">
          <FavoriteButton kind="artists" id={artist.id} name={artist.name} variant="labeled" />
          {canEdit ? (
            <>
              <Button variant="outline" size="sm" onPress={() => setEditModalVisible(true)}>
                <Icon as={EditIcon} size={14} className="text-foreground" />
                <Text>{t('수정')}</Text>
              </Button>
              <Button variant="outline" size="sm" onPress={handleDeleteArtist}>
                <Icon as={TrashIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">{t('삭제')}</Text>
              </Button>
            </>
          ) : null}
        </View>

        <ArtistBio bio={artist.bio} style={artist.style} />

        <PhotoCredit
          imageUrl={artist.banner?.url ?? artist.imageUrl}
          credit={artist.banner?.credit ?? artist.imageCredit}
          centered={false}
        />

        {/* 본문: 넓으면 두 열 (비교 | 공연·수상) */}
        <View className={cn('mt-10', wide ? 'flex-row gap-10' : 'gap-10')}>
          <View className="min-w-0 flex-1">
            <ArtistComparisons artistId={artist.id} wide={wide} />
          </View>
          <View className={cn(wide && 'w-[340px]')}>{aside}</View>
        </View>

        {/* 음반: 콘텐츠라 사각. 들으러 가는 곳을 숨기지 않는다 */}
        <View className="mt-12">
          <View className="mb-4 flex-row items-baseline justify-between">
            <Text variant="title3">{t('음반')}</Text>
            <View className="flex-row items-center gap-3">
              {recordings.length > 0 ? (
                <Text variant="caption">
                  {t('{count}장 · 최신순', { count: recordings.length })}
                </Text>
              ) : null}
              {canEdit ? (
                <Pressable
                  accessibilityLabel={t('앨범 추가')}
                  onPress={() => {
                    setSelectedRecording(undefined);
                    setRecordingFormVisible(true);
                  }}>
                  <Icon as={PlusIcon} size={18} className="text-foreground-muted" />
                </Pressable>
              ) : null}
            </View>
          </View>
          {recordingsQuery.isLoading ? (
            <View className="flex-row gap-5">
              {Array.from({ length: wide ? 6 : 2 }, (_, index) => (
                <Skeleton key={index} className="aspect-square flex-1 rounded-lg" />
              ))}
            </View>
          ) : recordings.length === 0 ? (
            <Text variant="bodySm" className="text-foreground-muted">
              {t('등록된 음반이 없어요.')}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-5">
              {recordings.map((recording) => {
                return (
                  <View key={recording.id} className="w-[176px]">
                    <AlbumCard
                      album={toAlbumItem(recording, artist)}
                      width={176}
                      inRepertoire={repertoire.recordings.has(recording.id)}
                      onPress={() => setOpenedAlbum(toAlbumItem(recording, artist))}
                    />
                    {canEdit ? (
                      <View className="mt-2 flex-row gap-3">
                        <Pressable
                          onPress={() => {
                            setSelectedRecording(recording);
                            setRecordingFormVisible(true);
                          }}>
                          <Text variant="caption">{t('수정')}</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDeleteRecording(recording.id)}>
                          <Text variant="caption" className="text-destructive">
                            {t('삭제')}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <ArtistFormModal
        visible={editModalVisible}
        artist={artist}
        onClose={() => setEditModalVisible(false)}
        onSuccess={refresh}
      />
      <AlbumDetailModal album={openedAlbum} onClose={() => setOpenedAlbum(null)} />

      <RecordingFormModal
        visible={recordingFormVisible}
        artistId={artist.id}
        recording={selectedRecording}
        onClose={() => setRecordingFormVisible(false)}
        onSuccess={() => {
          setRecordingFormVisible(false);
          void recordingsQuery.refetch();
        }}
      />
      <TicketVendorsModal
        visible={showVendorsModal}
        vendors={vendors}
        onClose={() => setShowVendorsModal(false)}
      />
    </View>
  );
}
