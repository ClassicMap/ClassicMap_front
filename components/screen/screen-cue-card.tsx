import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { ExpandableText } from '@/components/ui/expandable-text';
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
import { useActiveClip } from '@/components/screen/active-clip';
import { ScreenClipPlayer } from '@/components/screen/screen-clip-player';
import { YoutubeThumb } from '@/components/screen/youtube-thumb';
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

/** 곡 이름 옆 장면 그림 너비. 카드를 길게 만들지 않게 작게 둔다 */
const SCENE_THUMB_WIDTH = 116;

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
  // 스포일러 장면은 설명을 펼치기 전까지 스틸도 숨긴다
  const hidden = cue.spoiler && !showSpoiler;
  const still = hidden ? null : tmdbImageUrl(cue.stillPath, 'w780');
  // 장면 그림은 사람이 확인한 공식 클립에만 둔다(sceneFrame). 누르면 그 자리에서 클립을 튼다
  const clip = cue.officialClip;
  const sceneFrame = clip?.sceneFrame ?? null;
  const clipScene = Boolean(clip && sceneFrame) && !still && !hidden;
  const openClip = () => clip && openExternal(youtubeClipUrl(clip.videoId, clip.startSec));
  const inline = useActiveClip(`cue-${cue.id}`);
  const [playFailed, setPlayFailed] = React.useState(false);
  const playScene = () => (playFailed ? openClip() : inline.open());
  const openCompare = (sectorId?: number) => {
    if (cue.composerId === null || cue.pieceId === null) return;
    const params = new URLSearchParams({ composerId: String(cue.composerId), pieceId: String(cue.pieceId) });
    if (sectorId) params.append('sectorId', String(sectorId));
    router.push(`/compare?${params.toString()}` as Href);
  };

  const meta = [SCREEN_USAGE_LABELS[cue.usage], cue.arranged ? '편곡' : null, when || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <View className="gap-3 p-4">
        {/* 무슨 곡인지가 먼저다. 장면 그림은 오른쪽에 작게 둔다 */}
        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
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
          {still ? (
            <View style={{ width: SCENE_THUMB_WIDTH, aspectRatio: 16 / 9 }} className="overflow-hidden rounded-md bg-surface-3">
              <OptimizedImage
                uri={still}
                resizeMode="cover"
                accessibilityLabel={`${cue.workTitle} 장면 스틸`}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          ) : clipScene && clip && !inline.active ? (
            <Pressable
              onPress={playScene}
              accessibilityRole="button"
              accessibilityLabel={`${cue.workTitle}이 나오는 장면 공식 클립 재생`}
              style={{ width: SCENE_THUMB_WIDTH, aspectRatio: 16 / 9 }}
              className="overflow-hidden rounded-md bg-surface-3">
              <YoutubeThumb
                videoId={clip.videoId}
                thumbs={clip.thumbs}
                frame={sceneFrame === 'default' || sceneFrame === null ? undefined : sceneFrame}
              />
              <View className="absolute inset-0 items-center justify-center">
                <View className="size-8 items-center justify-center rounded-full bg-black/55">
                  <Icon as={PlayIcon} size={13} className="ml-0.5 fill-white text-white" />
                </View>
              </View>
              <View className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-px">
                <Text className="text-[10px] font-semibold text-white">이 장면</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {clipScene && clip && inline.active ? (
          <View className="gap-1.5">
            <ScreenClipPlayer
              videoId={clip.videoId}
              startSec={clip.startSec}
              title={`${cue.workTitle}이 나오는 장면`}
              onError={() => {
                setPlayFailed(true);
                inline.close();
              }}
            />
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="micro" numberOfLines={1} className="min-w-0 shrink">
                이 장면에서 나와요 · YouTube · {clip.channel}
              </Text>
              <Pressable onPress={inline.close} accessibilityRole="button" hitSlop={8} className="py-1">
                <Text variant="micro" className="font-semibold text-foreground">
                  닫기
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {clipScene && playFailed ? (
          <Text variant="micro">앱 안에서 재생할 수 없는 영상이라 그림을 누르면 YouTube로 열려요.</Text>
        ) : null}

        {cue.spoiler && !showSpoiler ? (
          <Pressable
            onPress={() => setShowSpoiler(true)}
            accessibilityRole="button"
            className="rounded-md border border-dashed border-border-strong px-3 py-2">
            <Text variant="caption">장면 설명에 결말이 드러나요. 눌러서 펼쳐요.</Text>
          </Pressable>
        ) : (
          <ExpandableText text={cue.sceneNote} lines={2} variant="bodySm" className="text-foreground-muted" />
        )}

        <ListenAction cue={cue} onOpenCompare={openCompare} />

        <View className="flex-row items-center justify-between gap-3">
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
          <View className="min-w-0 flex-row items-center gap-3">
            {canPickStill ? (
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" className="flex-row items-center gap-1 py-1">
                <Icon as={ImageIcon} size={12} className="text-foreground-subtle" />
                <Text variant="micro">스틸 고르기</Text>
              </Pressable>
            ) : null}
            {/* 공식 클립 출처. 장면이 스포일러로 가려져 있어도 링크는 남긴다 */}
            {clip ? (
              <Pressable
                onPress={openClip}
                accessibilityRole="link"
                accessibilityLabel={`YouTube ${clip.channel}에서 장면 보기`}
                className="min-w-0 flex-row items-center gap-1 py-1">
                <Icon as={PlayIcon} size={11} className="text-foreground-subtle" />
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
          그 대목 비교해 듣기 · 연주 {listen.readyPerformanceCount}개
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
