import { ConcertFormModal } from '@/features/admin/components/concert-form-modal';
import {
  OriginalLanguageNote,
  CastChip,
  CastComparisons,
  IntroImages,
  concertClock,
  concertStatusLabel,
  formatDay,
  parsePrices,
} from '@/features/concert/components/concert-parts';
import { StarRating } from '@/features/concert/components/star-rating';
import { FavoriteButton } from '@/features/library/components/favorite-button';
import {
  TicketVendorsModal,
  openVendorUrl,
  vendorDomain,
} from '@/features/concert/components/ticket-vendors-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useStackBackButtonVisible } from '@/hooks/use-back-button';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdminConcertAPI } from '@/lib/api/admin';
import { ConcertAPI } from '@/lib/api/client';
import { areaName } from '@/features/concert/lib/areas';
import { useAuth } from '@/hooks/use-auth';
import { formatNumber, t, useLocale } from '@/lib/i18n';
import { useConcert } from '@/lib/query/hooks/use-concerts';
import type { TicketVendor } from '@/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  EditIcon,
  ExternalLinkIcon,
  TrashIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConcertDetailScreen() {
  useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const concertId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showBack = useStackBackButtonVisible();
  const { canEdit, isSignedIn } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const {
    data: concert,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useConcert(Number.isFinite(concertId) ? concertId : undefined);

  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [userRating, setUserRating] = React.useState(0);
  const [hasWatched, setHasWatched] = React.useState(false);
  const [vendors, setVendors] = React.useState<TicketVendor[]>([]);
  const [showVendorsModal, setShowVendorsModal] = React.useState(false);
  const [loadingVendors, setLoadingVendors] = React.useState(false);

  React.useEffect(() => {
    if (!isSignedIn || !Number.isFinite(concertId)) return;
    ConcertAPI.getUserRating(concertId)
      .then((rating) => {
        if (rating != null) {
          setUserRating(Number(rating));
          setHasWatched(true);
        }
      })
      .catch(() => undefined);
  }, [concertId, isSignedIn]);

  const askWatched = () => {
    if (!isSignedIn) {
      Alert.alert(t('로그인이 필요해요'), t('별점은 로그인한 뒤 남길 수 있어요.'));
      return;
    }
    if (!hasWatched) {
      Alert.alert(t('공연을 보셨나요?'), t('별점은 공연을 본 뒤에 남기는 점수예요.'), [
        { text: t('취소'), style: 'cancel' },
        { text: t('네, 봤어요'), onPress: () => setHasWatched(true) },
      ]);
    }
  };

  const submitRating = async (rating: number) => {
    if (!hasWatched) {
      askWatched();
      return;
    }
    setUserRating(rating);
    try {
      await ConcertAPI.submitRating(concertId, rating);
      void refetch();
    } catch {
      Alert.alert(t('별점을 남기지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
    }
  };

  const openTickets = async () => {
    if (!concert) return;
    // 상세에 예매처가 이미 있으면 다시 부르지 않는다. 한 곳뿐이면 고를 게 없어 바로 연다
    const known = concert.ticketVendors ?? [];
    if (known.length === 1) {
      openVendorUrl(known[0].vendorUrl);
      return;
    }
    if (known.length > 1) {
      setVendors(known);
      setShowVendorsModal(true);
      return;
    }
    setLoadingVendors(true);
    try {
      setVendors(await ConcertAPI.getTicketVendors(concert.id));
      setShowVendorsModal(true);
    } catch {
      Alert.alert(t('예매처를 불러오지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
    } finally {
      setLoadingVendors(false);
    }
  };

  const deleteConcert = () => {
    if (!concert) return;
    Alert.alert(t('공연 삭제'), t('{title}을(를) 삭제할까요?', { title: concert.title }), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('삭제'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AdminConcertAPI.delete(concert.id);
            router.back();
          } catch {
            Alert.alert(t('삭제하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 flex-row gap-8 bg-background p-6">
        <Skeleton className="aspect-[3/4] w-[240px] rounded-lg" />
        <View className="flex-1 gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      </View>
    );
  }

  if (isError || !concert) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title={t('공연 정보를 불러오지 못했어요')}
          description={t('연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.')}
          action={{ label: t('다시 시도'), onPress: () => refetch() }}
        />
      </View>
    );
  }

  const status = concertStatusLabel(concert);
  const prices = parsePrices(concert.priceInfo);
  const cast = concert.artists ?? [];
  const bookable = concert.status === 'upcoming' || concert.status === 'ongoing';
  const knownVendors = concert.ticketVendors ?? [];
  const firstVendor =
    knownVendors[0]?.vendorName?.trim() ||
    (knownVendors[0] ? vendorDomain(knownVendors[0].vendorUrl) : undefined);
  const ranking = concert.boxofficeRanking;
  const time = concertClock(concert.concertTime);
  const multiDay = concert.endDate && concert.endDate !== concert.startDate;
  const sourceName =
    concert.dataSource === 'KOPIS' || concert.kopisId
      ? t('KOPIS 공연예술통합전산망')
      : 'ClassicMap';

  const facts: { label: string; value: string; sub?: string }[] = [
    {
      label: t('일시'),
      value: `${formatDay(concert.startDate)}${time ? ` ${time}` : ''}`,
      sub: multiDay ? `~ ${formatDay(concert.endDate)}` : undefined,
    },
    {
      label: t('장소'),
      value: concert.facilityName ?? t('공연장 정보 없음'),
      sub: concert.area ? areaName(concert.area) : undefined,
    },
    ...(concert.runtime ? [{ label: t('관람 시간'), value: concert.runtime }] : []),
    ...(concert.ageRestriction ? [{ label: t('관람 연령'), value: concert.ageRestriction }] : []),
  ];

  const bookButton = bookable ? (
    <View className="gap-1.5">
      <Button
        size="lg"
        className="h-12 rounded-full"
        onPress={openTickets}
        disabled={loadingVendors}>
        <Text className="text-base font-bold text-primary-foreground">
          {loadingVendors ? t('불러오는 중…') : t('예매하기')}
        </Text>
        <Icon as={ExternalLinkIcon} size={16} className="text-primary-foreground" />
      </Button>
      <Text variant="caption" className="text-center">
        {knownVendors.length > 1
          ? t('{vendor} 등 예매처 {count}곳 중에서 골라요', {
              vendor: firstVendor ?? '',
              count: knownVendors.length,
            })
          : firstVendor
            ? t('{vendor} 예매 페이지가 새 창으로 열려요', { vendor: firstVendor })
            : t('예매처로 이동해요')}
      </Text>
    </View>
  ) : null;

  const headerBadges = (
    <View className="flex-row flex-wrap gap-1.5">
      <Badge tone={status.tone} label={status.label} />
      {ranking && ranking.ranking <= 10 ? (
        <Badge
          label={
            ranking.areaName
              ? t('{area} 예매 {rank}위', {
                  area: areaName(ranking.areaName),
                  rank: ranking.ranking,
                })
              : t('예매 {rank}위', { rank: ranking.ranking })
          }
        />
      ) : null}
    </View>
  );

  const body = (
    <View className="gap-10">
      <View className={cn(wide && 'flex-row gap-11')}>
        {prices.length > 0 ? (
          <View className={cn(wide ? 'flex-1' : 'mb-10')}>
            <Text variant="headline" className="mb-1">
              {t('좌석별 가격')}
            </Text>
            {prices.map((price, index) => (
              <View
                key={`${price.seat}-${index}`}
                className={cn(
                  'flex-row items-baseline justify-between py-2.5',
                  index < prices.length - 1 && 'border-b border-border'
                )}>
                <Text className="text-body-sm font-semibold text-foreground">{price.seat}</Text>
                <Text variant="mono" className="text-body-sm text-foreground">
                  {price.price}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View className={cn(wide && 'flex-1')}>
          <CastComparisons cast={cast} horizontal={!wide} />
        </View>
      </View>

      {/* composerInfo는 출연자 이름이 들어오는 경우가 많아 프로그램으로 쓰지 않는다 */}
      {concert.program ? (
        <View className="max-w-[680px]">
          <Text variant="headline" className="mb-2">
            {t('프로그램')}
          </Text>
          <Text variant="body">{concert.program}</Text>
        </View>
      ) : null}

      {concert.synopsis ? (
        <View className="max-w-[680px]">
          <Text variant="headline" className="mb-2">
            {t('소개')}
          </Text>
          <Text variant="body">{concert.synopsis}</Text>
        </View>
      ) : null}

      {concert.images && concert.images.length > 0 ? <IntroImages images={concert.images} /> : null}

      <View>
        <Text variant="headline" className="mb-3">
          {t('별점')}
        </Text>
        <View className="gap-3 rounded-lg border border-dashed border-border-strong p-4">
          <Text variant="bodySm" className="text-foreground-muted">
            {concert.rating != null && Number(concert.rating) > 0
              ? t('평균 {avg} · {count}명', {
                  avg: Number(concert.rating).toFixed(1),
                  count: concert.ratingCount ?? 0,
                })
              : t('아직 남긴 사람이 없어요.')}
          </Text>
          <Pressable
            onPress={askWatched}
            disabled={hasWatched}
            className="flex-row items-center gap-3">
            <StarRating
              rating={userRating}
              onRatingChange={hasWatched ? submitRating : undefined}
              size={24}
            />
            <Text variant="caption">
              {!isSignedIn
                ? t('로그인하면 별점을 남길 수 있어요')
                : hasWatched
                  ? t('내 별점')
                  : t('공연을 봤다면 눌러서 남겨요')}
            </Text>
          </Pressable>
        </View>
      </View>

      {canEdit ? (
        <View className="flex-row gap-2">
          <Button variant="outline" size="sm" onPress={() => setEditModalVisible(true)}>
            <Icon as={EditIcon} size={14} className="text-foreground" />
            <Text>{t('공연 수정')}</Text>
          </Button>
          <Button variant="outline" size="sm" onPress={deleteConcert}>
            <Icon as={TrashIcon} size={14} className="text-destructive" />
            <Text className="text-destructive">{t('공연 삭제')}</Text>
          </Button>
        </View>
      ) : null}

      <Text variant="caption" className="text-foreground-subtle">
        {concert.kopisId
          ? t('공연 정보 출처: {source} · 공연 ID {id}', {
              source: sourceName,
              id: concert.kopisId,
            })
          : t('공연 정보 출처: {source}', { source: sourceName })}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        contentContainerClassName={cn(wide ? 'px-7 pb-20 pt-4' : 'px-4 pb-10')}>
        {wide ? (
          <View className="flex-row gap-11">
            <View className="w-[320px] gap-4">
              <EntityThumb
                name={concert.title}
                image={concert.posterUrl}
                shape="square"
                size={320}
                aspect={4 / 3}
              />
              {bookButton}
              <FavoriteButton
                kind="concerts"
                id={concert.id}
                name={concert.title}
                variant="labeled"
                className="justify-center"
              />
            </View>
            <View className="min-w-0 flex-1">
              {headerBadges}
              <Text className="mt-3 text-[44px] font-extrabold leading-[48px] tracking-tight text-foreground">
                {concert.title}
              </Text>
              <OriginalLanguageNote className="mt-2" />
              {cast.length > 0 ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {cast.map((item) => (
                    <CastChip key={item.id} cast={item} />
                  ))}
                </View>
              ) : null}
              <View className="mt-7 flex-row flex-wrap border-y border-border py-5">
                {facts.map((fact) => (
                  <View key={fact.label} className="w-1/2 py-2 pr-6">
                    <Text variant="caption" className="font-semibold text-foreground-subtle">
                      {fact.label}
                    </Text>
                    <Text className="mt-1 text-body font-semibold text-foreground">
                      {fact.value}
                    </Text>
                    {fact.sub ? (
                      <Text variant="caption" className="mt-0.5">
                        {fact.sub}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
              <View className="mt-8">{body}</View>
            </View>
          </View>
        ) : (
          <>
            {showBack ? (
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.push('/concerts'))}
                accessibilityLabel={t('뒤로')}
                style={{ marginTop: insets.top + 4 }}
                className="mb-2 size-11 items-center justify-center">
                <Icon as={ArrowLeftIcon} size={22} className="text-foreground" />
              </Pressable>
            ) : (
              <View style={{ height: insets.top + 12 }} />
            )}
            {/* 첫 화면에서 무엇·언제·어디·얼마가 다 보이게 */}
            <View className="flex-row gap-3.5">
              <EntityThumb
                name={concert.title}
                image={concert.posterUrl}
                shape="square"
                size={120}
                aspect={4 / 3}
              />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  {headerBadges}
                  <FavoriteButton
                    kind="concerts"
                    id={concert.id}
                    name={concert.title}
                    className="-mr-2 -mt-2"
                  />
                </View>
                <Text className="mt-2 text-[21px] font-extrabold leading-7 text-foreground">
                  {concert.title}
                </Text>
                <OriginalLanguageNote className="mt-1.5" />
              </View>
            </View>
            {cast.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {cast.map((item) => (
                  <CastChip key={item.id} cast={item} />
                ))}
              </View>
            ) : null}
            <View className="mt-4">
              {facts.map((fact) => (
                <View key={fact.label} className="flex-row gap-3 border-b border-border py-3">
                  <Text variant="bodySm" className="w-[72px] text-foreground-muted">
                    {fact.label}
                  </Text>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-sm font-semibold text-foreground">{fact.value}</Text>
                    {fact.sub ? <Text variant="caption">{fact.sub}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
            <View className="mt-8">{body}</View>
          </>
        )}
      </ScrollView>

      {/* 모바일: 예매 버튼은 항상 엄지가 닿는 곳에 */}
      {!wide && bookButton ? (
        <View
          className="border-t border-border bg-background px-4 pt-2.5"
          style={{ paddingBottom: insets.bottom + 10 }}>
          {bookButton}
        </View>
      ) : null}

      <ConcertFormModal
        visible={editModalVisible}
        concert={concert}
        onClose={() => setEditModalVisible(false)}
        onSuccess={() => refetch()}
      />
      <TicketVendorsModal
        visible={showVendorsModal}
        vendors={vendors}
        onClose={() => setShowVendorsModal(false)}
        summary={{
          title: concert.title,
          posterUrl: concert.posterUrl,
          when: facts[0]?.value,
          where: concert.facilityName ?? undefined,
          price: priceSummary(prices),
        }}
      />
    </View>
  );
}

/** 모달 머리에 한 줄로: 한 좌석이면 '전석 5,000원', 여러 좌석이면 최저–최고 */
function priceSummary(prices: { seat: string; price: string }[]): string | undefined {
  if (prices.length === 0) return undefined;
  if (prices.length === 1) return [prices[0].seat, prices[0].price].filter(Boolean).join(' ');
  const amounts = prices
    .map((price) => Number(price.price.replace(/[^\d]/g, '')))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (amounts.length === 0) return undefined;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max
    ? t('{amount}원', { amount: formatNumber(min) })
    : t('{min}–{max}원', { min: formatNumber(min), max: formatNumber(max) });
}
