import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { ExpandableText } from '@/components/ui/expandable-text';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ServiceLogo, ServiceLogoFor } from '@/components/ui/service-logo';
import {
  approxTimeText,
  episodeText,
  SCREEN_USAGE_LABELS,
  youtubeClipUrl,
} from '@/components/screen/labels';
import { useScreenStillCandidates, useSetCueStill } from '@/lib/query/hooks/useScreen';
import type { ScreenCue, ScreenStreamingLinks } from '@/lib/types/models';
import { getLocale, t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useLeadPerformance } from '@/components/screen/use-lead-performance';
import { YoutubeThumb } from '@/components/screen/youtube-thumb';
import { tmdbImageUrl } from '@/lib/utils/tmdb';
import { type Href, useRouter } from 'expo-router';
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, ExternalLinkIcon, ImageIcon, PauseIcon, PlayIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';

function openExternal(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert(t('링크를 열지 못했어요'), t('잠시 뒤 다시 시도해 주세요.'));
  });
}

const PLATFORM_LINKS: { key: keyof ScreenStreamingLinks; label: string }[] = [
  { key: 'appleMusicUrl', label: 'Apple Music' },
  { key: 'spotifyUrl', label: 'Spotify' },
  { key: 'youtubeMusicUrl', label: 'YouTube Music' },
];

interface ScreenCueCardProps {
  cue: ScreenCue;
  titleId: number;
  /** 관리자에게만 스틸 고르기를 보인다 */
  canPickStill: boolean;
}

/** 작품 페이지의 장면 카드. 들을 길은 같은 대목 비교 → 같은 곡 비교 → 스트리밍 링크 순 */
export function ScreenCueCard({ cue, titleId, canPickStill }: ScreenCueCardProps) {
  useLocale();
  const router = useRouter();
  const [showEvidence, setShowEvidence] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const when = [episodeText(cue.episodeLabel), approxTimeText(cue.approxAtSec)].filter(Boolean).join(' · ');
  const still = tmdbImageUrl(cue.stillPath, 'w780');
  // 장면 그림은 사람이 확인한 공식 클립에만 사진으로 둔다(sceneFrame). 영상은 아래 'YouTube · 채널'로 연다
  const clip = cue.officialClip;
  const sceneFrame = clip?.sceneFrame ?? null;
  const clipScene = Boolean(clip && sceneFrame) && !still;
  const openClip = () => clip && openExternal(youtubeClipUrl(clip.videoId, clip.startSec));
  const openCompare = (sectorId?: number) => {
    if (cue.composerId === null || cue.pieceId === null) return;
    const params = new URLSearchParams({ composerId: String(cue.composerId), pieceId: String(cue.pieceId) });
    if (sectorId) params.append('sectorId', String(sectorId));
    router.push(`/compare?${params.toString()}` as Href);
  };

  const meta = [t(SCREEN_USAGE_LABELS[cue.usage]), cue.arranged ? t('cue::편곡') : null, when || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface-1">
      {/* 장면 사진을 카드 위에 크게 두고, 그 아래에 곡과 장면 설명을 둔다 */}
      {still ? (
        <OptimizedImage
          uri={still}
          resizeMode="cover"
          accessibilityLabel={t('{work} 장면 스틸', { work: cue.workTitle })}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
        />
      ) : clipScene && clip ? (
        <View
          accessibilityLabel={t('{work}이 나오는 장면', { work: cue.workTitle })}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          className="bg-surface-3">
          <YoutubeThumb
            videoId={clip.videoId}
            thumbs={clip.thumbs}
            frame={sceneFrame === 'default' || sceneFrame === null ? undefined : sceneFrame}
          />
          {/* 채널 로고가 대개 왼쪽 아래나 오른쪽 위에 있어 왼쪽 위에 둔다 */}
          <View className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-white">{t('이 장면에서 나와요')}</Text>
          </View>
        </View>
      ) : null}
      <View className="gap-3 p-4">
        <View>
          <Text variant="micro" numberOfLines={1} className="font-semibold text-primary">
            {meta}
          </Text>
          <Text className="mt-1 text-body font-bold text-foreground">
            {cue.composerName} · {cue.workTitle}
          </Text>
          {cue.partLabel ? (
            <Text variant="caption" className="mt-0.5">
              {cue.partLabel}
            </Text>
          ) : null}
        </View>

        <ExpandableText text={cue.sceneNote} lines={2} variant="bodySm" className="text-foreground-muted" />

        <ListenAction cue={cue} onOpenCompare={openCompare} />

        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            onPress={() => setShowEvidence((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showEvidence }}
            className="flex-row items-center gap-1 py-1">
            <Text variant="micro">{t('근거 {count}개', { count: cue.evidence.length })}</Text>
            <Icon as={showEvidence ? ChevronUpIcon : ChevronDownIcon} size={12} className="text-foreground-subtle" />
          </Pressable>
          <View className="min-w-0 flex-row items-center gap-3">
            {canPickStill ? (
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" className="flex-row items-center gap-1 py-1">
                <Icon as={ImageIcon} size={12} className="text-foreground-subtle" />
                <Text variant="micro">{t('스틸 고르기')}</Text>
              </Pressable>
            ) : null}
            {/* 공식 클립 출처 */}
            {clip ? (
              <Pressable
                onPress={openClip}
                accessibilityRole="link"
                accessibilityLabel={t('YouTube {channel}에서 장면 보기', { channel: clip.channel })}
                className="min-w-0 flex-row items-center gap-1 py-1">
                <ServiceLogo service="youtube" size={12} />
                <Text variant="micro" numberOfLines={1} className="shrink">
                  YouTube · {clip.channel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {showEvidence ? (
          <View className="gap-2">
            {cue.evidence.map((item) => (
              <Pressable key={item.url} onPress={() => openExternal(item.url)} accessibilityRole="link" className="flex-row gap-2">
                <Text variant="micro" className={cn('font-semibold', getLocale() === 'en' ? 'w-16' : 'w-8')}>
                  {item.grade === '1' ? t('cue::1차') : t('cue::2차')}
                </Text>
                <View className="min-w-0 flex-1">
                  <Text variant="micro" className="text-foreground-muted">
                    {item.note}
                  </Text>
                  <Text variant="micro" numberOfLines={1} className="text-primary">
                    {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {canPickStill ? (
        <StillPicker visible={picking} titleId={titleId} cue={cue} onClose={() => setPicking(false)} />
      ) : null}
    </View>
  );
}

function ListenAction({ cue, onOpenCompare }: { cue: ScreenCue; onOpenCompare: (sectorId?: number) => void }) {
  useLocale();
  const listen = cue.listen;
  if (listen.kind === 'sector' || listen.kind === 'piece') {
    return <QuickListen cue={cue} sectorId={listen.kind === 'sector' ? listen.sectorId : undefined} onOpenCompare={onOpenCompare} />;
  }
  if (listen.kind === 'external') {
    const links = PLATFORM_LINKS.flatMap((platform) => {
      const url = listen.links[platform.key];
      return url ? [{ label: platform.label, url }] : [];
    });
    return (
      <View className="flex-row flex-wrap gap-2">
        {links.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => openExternal(link.url)}
            accessibilityRole="link"
            className="flex-row items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 active:bg-surface-2 web:hover:bg-surface-2">
            <ServiceLogoFor label={link.label} size={14} />
            <Text className="text-label font-semibold text-foreground">{t('{label}에서 듣기', { label: link.label })}</Text>
            <Icon as={ExternalLinkIcon} size={12} className="text-foreground-subtle" />
          </Pressable>
        ))}
      </View>
    );
  }
  return <Text variant="micro">{t('아직 ClassicMap에 없는 곡이에요.')}</Text>;
}

/**
 * 대표 연주를 아래 재생바에서 바로 튼다. 듣다가 '다른 연주와 비교'로 넘어가면 같은 연주가 그대로 이어진다.
 * 영화에 나온 대목과 같은 구간이 없으면 같은 곡의 다른 구간 대표 연주를 들려준다
 */
function QuickListen({
  cue,
  sectorId,
  onOpenCompare,
}: {
  cue: ScreenCue;
  sectorId?: number;
  onOpenCompare: (sectorId?: number) => void;
}) {
  useLocale();
  const sameSector = sectorId !== undefined;
  const lead = useLeadPerformance(cue.pieceId, sectorId);
  const action = lead.playing ? t('cue::일시정지') : t('cue::바로 듣기');
  const playLabel = lead.loading
    ? t('연주 불러오는 중…')
    : !lead.lead
      ? t('지금 바로 들을 연주가 없어요')
      : `${action} · ${lead.artistName ?? t('cue::대표 연주')}`;
  const playA11yLabel = !lead.lead
    ? undefined
    : lead.artistName
      ? t('{work} {artist} 연주 {action}', { work: cue.workTitle, artist: lead.artistName, action })
      : t('{work} 대표 연주 {action}', { work: cue.workTitle, action });
  return (
    <View className="gap-2">
      <Button
        className="h-11 flex-row gap-2 rounded-full"
        disabled={!lead.lead}
        onPress={lead.toggle}
        accessibilityLabel={playA11yLabel}>
        {lead.lead ? (
          <Icon as={lead.playing ? PauseIcon : PlayIcon} size={16} className="fill-primary-foreground text-primary-foreground" />
        ) : null}
        <Text className="font-bold text-primary-foreground" numberOfLines={1}>
          {playLabel}
        </Text>
      </Button>
      <Button variant="outline" className="h-10 flex-row gap-1 rounded-full" onPress={() => onOpenCompare(lead.sectorId ?? sectorId)}>
        <Text className="font-semibold text-foreground">
          {sameSector && lead.performanceCount > 1
            ? t('다른 연주와 비교 · {count}개', { count: lead.performanceCount })
            : t('다른 연주와 비교')}
        </Text>
        <Icon as={ChevronRightIcon} size={16} className="text-foreground" />
      </Button>
      {sameSector ? null : (
        <Text variant="micro" className="text-center">
          {t('영화에 나온 대목은 아직 비교 구간이 없어 같은 곡의 다른 구간을 들려줘요.')}
        </Text>
      )}
    </View>
  );
}

/** 관리자 장면 스틸 고르기. 후보는 TMDB 에서 받은 작품·회차 스틸뿐이다 */
function StillPicker({
  visible,
  titleId,
  cue,
  onClose,
}: {
  visible: boolean;
  titleId: number;
  cue: ScreenCue;
  onClose: () => void;
}) {
  useLocale();
  const candidates = useScreenStillCandidates(titleId, visible);
  const setStill = useSetCueStill(titleId);
  const paths = candidates.data?.stillPaths ?? [];
  const choose = (path: string | null) => {
    setStill.mutate(
      { cueId: cue.id, stillPath: path },
      {
        onSuccess: onClose,
        onError: () => Alert.alert(t('스틸을 저장하지 못했어요'), t('잠시 뒤 다시 시도해 주세요.')),
      }
    );
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="max-h-[85%] w-full max-w-[720px] overflow-hidden rounded-xl bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text variant="headline" numberOfLines={1} className="flex-1">
              {t('{work} 장면 스틸', { work: cue.workTitle })}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel={t('cue::닫기')} className="size-9 items-center justify-center">
              <Icon as={XIcon} size={18} className="text-foreground" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="flex-row flex-wrap gap-2 p-4">
            {candidates.isLoading ? <Text variant="caption">{t('불러오는 중이에요.')}</Text> : null}
            {candidates.isError ? (
              <Text variant="caption">{t('스틸 후보를 불러오지 못했어요. 창을 닫고 다시 열어 주세요.')}</Text>
            ) : null}
            {!candidates.isLoading && !candidates.isError && paths.length === 0 ? (
              <Text variant="caption">{t('TMDB 스틸 후보가 아직 없어요. 이미지 갱신 작업을 먼저 돌려 주세요.')}</Text>
            ) : null}
            {paths.map((path) => {
              const uri = tmdbImageUrl(path, 'w300');
              return (
                <Pressable
                  key={path}
                  onPress={() => choose(path)}
                  disabled={setStill.isPending}
                  accessibilityRole="button"
                  accessibilityState={{ selected: cue.stillPath === path }}
                  className={cn(
                    'w-[48%] overflow-hidden rounded-md border-2',
                    cue.stillPath === path ? 'border-primary' : 'border-transparent'
                  )}>
                  {uri ? <OptimizedImage uri={uri} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 9 }} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {cue.stillPath ? (
            <Pressable onPress={() => choose(null)} className="border-t border-border px-4 py-3">
              <Text className="text-label text-destructive">{t('스틸 빼기')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
