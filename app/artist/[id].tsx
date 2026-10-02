import { ArtistFormModal } from '@/components/admin/ArtistFormModal';
import { RecordingFormModal } from '@/components/admin/RecordingFormModal';
import { AlbumCard } from '@/components/album/album-card';
import { AlbumDetailModal } from '@/components/album/album-detail-modal';
import { ArtistComparisons } from '@/components/artist/artist-comparisons';
import { FavoriteButton } from '@/components/favorite-button';
import { TicketVendorsModal } from '@/components/ticket-vendors-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRepertoireIds } from '@/hooks/use-repertoire-ids';
import { AdminArtistAPI, AdminRecordingAPI } from '@/lib/api/admin';
import { ConcertAPI, RecordingAPI, type RecordingListItem } from '@/lib/api/client';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { useAuth } from '@/lib/hooks/useAuth';
import { useArtist } from '@/lib/query/hooks/useArtists';
import type { Artist, Concert, ImageCredit, Recording, TicketVendor } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useQuery } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatConcertDay(value: string): string {
  const date = parseDate(value);
  if (!date) return '날짜 미정';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
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
  const [bioExpanded, setBioExpanded] = React.useState(false);
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
    () => [...(recordingsQuery.data ?? [])].sort((a, b) => recordingYear(b).localeCompare(recordingYear(a))),
    [recordingsQuery.data]
  );
  const concerts = React.useMemo(() => upcomingConcerts(concertsQuery.data ?? []), [concertsQuery.data]);
  const awards = React.useMemo(
    () => [...(artist?.awards ?? [])].sort((a, b) => b.year.localeCompare(a.year)),
    [artist?.awards]
  );

  const refresh = () => {
    void artistQuery.refetch();
    void recordingsQuery.refetch();
    void concertsQuery.refetch();
  };

  const handleDeleteArtist = () => {
    if (!artist) return;
    Alert.alert('아티스트 삭제', `${artist.name}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminArtistAPI.delete(artist.id);
            router.back();
          } catch {
            Alert.alert('삭제하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
          }
        },
      },
    ]);
  };

  const handleDeleteRecording = (recordingId: number) => {
    Alert.alert('앨범 삭제', '이 앨범을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminRecordingAPI.delete(recordingId);
            void recordingsQuery.refetch();
          } catch {
            Alert.alert('삭제하지 못했어요', '잠시 뒤 다시 시도해 주세요.');
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
      Alert.alert('예매처를 불러오지 못했어요', '공연 상세에서 다시 시도해 주세요.');
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
          title="아티스트 정보를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => artistQuery.refetch() }}
        />
      </View>
    );
  }

  const meta = [
    getArtistCategoryLabel(artist.category),
    artist.nationality,
    artist.birthYear ? `${artist.birthYear}년생` : null,
  ].filter(Boolean);
  const nextConcert = concerts[0];

  const aside = (
    <View className="gap-8">
      <View>
        <Text variant="headline" className="mb-3">
          다가오는 공연
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
                  <EntityThumb name={concert.title} image={concert.posterUrl} shape="square" size={72} aspect={4 / 3} />
                  <View className="min-w-0 flex-1">
                    {days !== null ? (
                      <Badge tone="accent" label={days === 0 ? '오늘' : `D-${days}`} />
                    ) : null}
                    <Text numberOfLines={2} className="mt-1.5 text-body-sm font-bold text-foreground">
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
                    {concert.status === 'upcoming' ? (
                      <Pressable onPress={() => openTickets(concert)} className="mt-1.5 self-start">
                        <Text variant="label" className="text-primary">
                          예매처 보기
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
            예정된 공연이 없어요.
          </Text>
        )}
      </View>

      {awards.length > 0 ? (
        <View>
          <Text variant="headline" className="mb-3">
            수상
          </Text>
          <View className="gap-3.5">
            {awards.map((award, index) => (
              <View key={award.id} className="flex-row gap-3">
                <Text variant="mono" className={cn('w-11 pt-0.5', index === 0 ? 'text-primary' : 'text-foreground-muted')}>
                  {award.year}
                </Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-sm font-semibold text-foreground">{award.awardName}</Text>
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
        refreshControl={<RefreshControl refreshing={artistQuery.isRefetching} onRefresh={refresh} />}
        contentContainerClassName={cn('pb-24', wide ? 'px-7' : 'px-4')}>
        {!wide ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push('/search'))}
            accessibilityLabel="뒤로"
            className="mt-12 size-11 items-center justify-center rounded-full bg-surface-2">
            <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
          </Pressable>
        ) : null}

        {/* 머리: 사람은 원형. 넓으면 이름·소개·버튼을 사진 옆 위쪽부터 쌓는다 (애플 클래식처럼) */}
        <View className={cn('gap-6', wide ? 'mt-6 flex-row items-start gap-8' : 'mt-2 items-center')}>
          <EntityThumb name={artist.name} image={artist.imageUrl} shape="circle" size={wide ? 208 : 148} />
          <View className={cn('min-w-0', wide ? 'flex-1 pt-3' : 'w-full items-center')}>
            {wide ? (
              <Text variant="micro" className="uppercase tracking-widest">
                아티스트
              </Text>
            ) : null}
            <Text
              className={cn(
                'font-extrabold tracking-tight text-foreground',
                wide ? 'mt-2 text-[64px] leading-[66px]' : 'text-[34px] leading-10'
              )}>
              {artist.name}
            </Text>
            <Text variant="bodySm" className={cn('mt-3 text-foreground-muted', !wide && 'text-center')}>
              <Text className="font-semibold text-foreground">{meta[0]}</Text>
              {meta.slice(1).map((part) => `  ·  ${part}`).join('')}
              {artist.englishName ? `  ·  ${artist.englishName}` : ''}
            </Text>

            {artist.bio || artist.style ? (
              <View className={cn('mt-4 max-w-[640px]', !wide && 'w-full')}>
                {artist.bio ? (
                  <Text variant="bodySm" numberOfLines={bioExpanded ? undefined : 3} className="text-foreground-muted">
                    {/* 접힌 미리보기는 문단 사이 빈 줄이 세 줄을 잡아먹지 않게 한 문단으로 */}
                    {bioExpanded ? artist.bio : artist.bio.replace(/\s*\n+\s*/g, ' ')}
                  </Text>
                ) : null}
                {artist.style && (bioExpanded || !artist.bio) ? (
                  <Text variant="bodySm" className={cn('text-foreground-muted', artist.bio && 'mt-3')}>
                    {artist.style}
                  </Text>
                ) : null}
                {(artist.bio && artist.bio.length > 120) || (artist.bio && artist.style) ? (
                  <Pressable
                    onPress={() => setBioExpanded((value) => !value)}
                    accessibilityRole="button"
                    className="mt-1.5 self-start">
                    <Text variant="label" className="text-foreground">
                      {bioExpanded ? '접기' : '더 보기'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View className={cn('mt-5 flex-row flex-wrap items-center gap-2.5', !wide && 'justify-center')}>
              <FavoriteButton kind="artists" id={artist.id} name={artist.name} variant="labeled" />
              {canEdit ? (
                <>
                  <Button variant="outline" size="sm" onPress={() => setEditModalVisible(true)}>
                    <Icon as={EditIcon} size={14} className="text-foreground" />
                    <Text>수정</Text>
                  </Button>
                  <Button variant="outline" size="sm" onPress={handleDeleteArtist}>
                    <Icon as={TrashIcon} size={14} className="text-destructive" />
                    <Text className="text-destructive">삭제</Text>
                  </Button>
                </>
              ) : null}
            </View>
            <PhotoCredit imageUrl={artist.imageUrl} credit={artist.imageCredit} centered={!wide} />
          </View>
        </View>

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
            <Text variant="title3">음반</Text>
            <View className="flex-row items-center gap-3">
              {recordings.length > 0 ? <Text variant="caption">{`${recordings.length}장 · 최신순`}</Text> : null}
              {canEdit ? (
                <Pressable
                  accessibilityLabel="앨범 추가"
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
              등록된 음반이 없어요.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-5">
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
                          <Text variant="caption">수정</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDeleteRecording(recording.id)}>
                          <Text variant="caption" className="text-destructive">
                            삭제
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
      <TicketVendorsModal visible={showVendorsModal} vendors={vendors} onClose={() => setShowVendorsModal(false)} />
    </View>
  );
}

/**
 * 사진 출처 한 줄. 위키미디어 사진은 저작자 표시가 라이선스 조건이라 작가·라이선스를 밝히고,
 * 보도용 사진은 출처 이름을, 애플뮤직 사진은 그 이름을 쓴다. 누르면 출처 페이지가 열린다
 */
function PhotoCredit({
  imageUrl,
  credit,
  centered,
}: {
  imageUrl?: string;
  credit?: ImageCredit | null;
  centered: boolean;
}) {
  const label = credit
    ? credit.author && credit.license
      ? `${credit.author} · ${credit.license}`
      : credit.creditLine ?? credit.author ?? null
    : imageUrl && /(^|\.)mzstatic\.com\//.test(imageUrl.replace(/^https?:\/\//, ''))
      ? 'Apple Music'
      : null;
  if (!label) return null;
  const text = (
    <Text variant="micro" numberOfLines={1} className="text-foreground-subtle">
      {`사진: ${label}`}
    </Text>
  );
  return credit ? (
    <Pressable
      onPress={() => void Linking.openURL(credit.sourceUrl).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel={`사진 출처: ${label}`}
      className={cn('mt-4 max-w-full web:hover:opacity-80', centered ? 'self-center' : 'self-start')}>
      {text}
    </Pressable>
  ) : (
    <View className={cn('mt-4 max-w-full', centered ? 'self-center' : 'self-start')}>{text}</View>
  );
}
