import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  approxTimeText,
  episodeText,
  SCREEN_USAGE_LABELS,
  youtubeClipUrl,
} from '@/components/screen/labels';
import { useScreenStillCandidates, useSetCueStill } from '@/lib/query/hooks/useScreen';
import type { ScreenCue, ScreenStreamingLinks } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { tmdbImageUrl } from '@/lib/utils/tmdb';
import { type Href, useRouter } from 'expo-router';
import { ChevronDownIcon, ExternalLinkIcon, ImageIcon, PlayIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';

function openExternal(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('링크를 열지 못했어요', '잠시 뒤 다시 시도해 주세요.');
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
  const router = useRouter();
  const [showSpoiler, setShowSpoiler] = React.useState(false);
  const [showEvidence, setShowEvidence] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const when = [episodeText(cue.episodeLabel), approxTimeText(cue.approxAtSec)].filter(Boolean).join(' · ');
  const still = tmdbImageUrl(cue.stillPath, 'w780');
  const openCompare = (sectorId?: number) => {
    if (cue.composerId === null || cue.pieceId === null) return;
    const params = new URLSearchParams({ composerId: String(cue.composerId), pieceId: String(cue.pieceId) });
    if (sectorId) params.append('sectorId', String(sectorId));
    router.push(`/compare?${params.toString()}` as Href);
  };

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface-1">
      {still ? (
        <OptimizedImage
          uri={still}
          resizeMode="cover"
          accessibilityLabel={`${cue.workTitle} 장면 스틸`}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
        />
      ) : null}
      <View className="gap-3 p-4">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <View className="rounded-full bg-primary-muted px-2 py-0.5">
            <Text className="text-micro font-semibold text-primary">{SCREEN_USAGE_LABELS[cue.usage]}</Text>
          </View>
          {cue.arranged ? (
            <View className="rounded-full bg-surface-3 px-2 py-0.5">
              <Text className="text-micro font-semibold text-foreground-muted">편곡</Text>
            </View>
          ) : null}
          {when ? (
            <Text variant="caption" className="ml-auto">
              {when}
            </Text>
          ) : null}
        </View>

        <View>
          <Text className="text-body font-bold text-foreground">
            {cue.composerName} · {cue.workTitle}
          </Text>
          {cue.partLabel ? (
            <Text variant="caption" className="mt-0.5">
              {cue.partLabel}
            </Text>
          ) : null}
        </View>

        {cue.spoiler && !showSpoiler ? (
          <Pressable
            onPress={() => setShowSpoiler(true)}
            accessibilityRole="button"
            className="rounded-md border border-dashed border-border-strong px-3 py-2">
            <Text variant="caption">장면 설명에 결말이 드러나요. 눌러서 펼쳐요.</Text>
          </Pressable>
        ) : (
          <Text variant="bodySm" className="text-foreground-muted">
            {cue.sceneNote}
          </Text>
        )}

        <ListenAction cue={cue} onOpenCompare={openCompare} />

        {cue.officialClip ? (
          <Pressable
            onPress={() =>
              cue.officialClip && openExternal(youtubeClipUrl(cue.officialClip.videoId, cue.officialClip.startSec))
            }
            accessibilityRole="link"
            className="flex-row items-center gap-2 rounded-full border border-border-strong px-3.5 py-2 active:bg-surface-2 web:hover:bg-surface-2">
            <Icon as={PlayIcon} size={14} className="text-foreground" />
            <Text className="flex-1 text-label font-semibold text-foreground" numberOfLines={1}>
              공식 클립으로 장면 보기
            </Text>
            <Text variant="micro" numberOfLines={1}>
              YouTube · {cue.officialClip.channel}
            </Text>
          </Pressable>
        ) : null}

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setShowEvidence((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showEvidence }}
            className="flex-row items-center gap-1 py-1">
            <Text variant="micro">근거 {cue.evidence.length}개</Text>
            <Icon
              as={ChevronDownIcon}
              size={12}
              className={cn('text-foreground-subtle', showEvidence && 'rotate-180')}
            />
          </Pressable>
          {canPickStill ? (
            <Pressable onPress={() => setPicking(true)} accessibilityRole="button" className="flex-row items-center gap-1 py-1">
              <Icon as={ImageIcon} size={12} className="text-foreground-subtle" />
              <Text variant="micro">스틸 고르기</Text>
            </Pressable>
          ) : null}
        </View>
        {showEvidence ? (
          <View className="gap-2">
            {cue.evidence.map((item) => (
              <Pressable key={item.url} onPress={() => openExternal(item.url)} accessibilityRole="link" className="flex-row gap-2">
                <Text variant="micro" className="w-8 font-semibold">
                  {item.grade === '1' ? '1차' : '2차'}
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
  const listen = cue.listen;
  if (listen.kind === 'sector') {
    return (
      <Button className="h-11 rounded-full" onPress={() => onOpenCompare(listen.sectorId)}>
        <Text className="font-bold text-primary-foreground">
          그 대목 비교해 듣기 · {listen.readyPerformanceCount}명
        </Text>
      </Button>
    );
  }
  if (listen.kind === 'piece') {
    return (
      <View className="gap-1.5">
        <Button variant="outline" className="h-11 rounded-full" onPress={() => onOpenCompare()}>
          <Text className="font-semibold text-foreground">이 곡 비교해 듣기</Text>
        </Button>
        <Text variant="micro" className="text-center">
          영화에 나온 대목은 아직 비교 구간이 없어요.
        </Text>
      </View>
    );
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
            <Text className="text-label font-semibold text-foreground">{link.label}에서 듣기</Text>
            <Icon as={ExternalLinkIcon} size={12} className="text-foreground-subtle" />
          </Pressable>
        ))}
      </View>
    );
  }
  return <Text variant="micro">아직 ClassicMap에 없는 곡이에요.</Text>;
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
  const candidates = useScreenStillCandidates(titleId, visible);
  const setStill = useSetCueStill(titleId);
  const paths = candidates.data?.stillPaths ?? [];
  const choose = (path: string | null) => {
    setStill.mutate(
      { cueId: cue.id, stillPath: path },
      {
        onSuccess: onClose,
        onError: () => Alert.alert('스틸을 저장하지 못했어요', '잠시 뒤 다시 시도해 주세요.'),
      }
    );
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="max-h-[85%] w-full max-w-[720px] overflow-hidden rounded-xl bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text variant="headline" numberOfLines={1} className="flex-1">
              {cue.workTitle} 장면 스틸
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="닫기" className="size-9 items-center justify-center">
              <Icon as={XIcon} size={18} className="text-foreground" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="flex-row flex-wrap gap-2 p-4">
            {candidates.isLoading ? <Text variant="caption">불러오는 중이에요.</Text> : null}
            {candidates.isError ? (
              <Text variant="caption">스틸 후보를 불러오지 못했어요. 창을 닫고 다시 열어 주세요.</Text>
            ) : null}
            {!candidates.isLoading && !candidates.isError && paths.length === 0 ? (
              <Text variant="caption">TMDB 스틸 후보가 아직 없어요. 이미지 갱신 작업을 먼저 돌려 주세요.</Text>
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
              <Text className="text-label text-destructive">스틸 빼기</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
