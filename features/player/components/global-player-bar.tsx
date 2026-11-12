import { PieceArt } from '@/features/piece/components/piece-art';
import { compareHrefFor, useDesktopPlayerBarVisible } from '@/features/player/components/player-bar-helpers';
import { QueueButton, RepeatButton, ShuffleButton } from '@/features/player/components/queue-panel';
import { PerformerStepper, useSongNav } from '@/features/player/components/song-nav';
import { VolumeControl } from '@/features/player/components/volume-control';
import { ScrubBar } from '@/features/player/components/scrub-bar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Equalizer } from '@/features/player/components/equalizer';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clipClock } from '@/lib/data/comparison';
import { relocalize, t, useLocale } from '@/lib/i18n';
import {
  comparePlayer,
  type ComparePlayerTrack,
  useComparePlayer,
} from '@/lib/player/compare-player-store';
import { SHELL } from '@/lib/layout/shell-layout';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import {
  ExternalLinkIcon,
  MaximizeIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';

/**
 * 바 배치. 가운데 재생 조작이 늘 바 한가운데 오도록 왼쪽(지금 곡)과 오른쪽(연주자·같은 지점·소리·대기열)을 같은 폭으로 나눈다.
 * 오른쪽 칸에 들어가는 만큼만 보이고, 좁아질수록 연주자 사진 수 → 「같은 지점」 글자 → 소리 막대 → 셔플·반복 → 표지 순서로 접는다.
 * 왼쪽 그림은 어느 화면에서나 음반 표지다(`video.height` 가 그 한 변). 영상은 비교 화면 본문에서만 보인다
 */
interface BarLayout {
  center: number;
  video: { width: number; height: number } | null;
  faces: number;
  spotLabel: boolean;
  modes: boolean;
  volume: number;
  /** 오른쪽 칸에 이만큼은 있어야 한다 (px) */
  needs: number;
}

const LAYOUTS: readonly BarLayout[] = [
  {
    center: 400,
    video: { width: 96, height: 54 },
    faces: 5,
    spotLabel: true,
    modes: true,
    volume: 76,
    needs: 560,
  },
  {
    center: 400,
    video: { width: 96, height: 54 },
    faces: 3,
    spotLabel: true,
    modes: true,
    volume: 76,
    needs: 470,
  },
  {
    center: 380,
    video: { width: 96, height: 54 },
    faces: 3,
    spotLabel: false,
    modes: true,
    volume: 76,
    needs: 400,
  },
  {
    center: 360,
    video: { width: 80, height: 45 },
    faces: 3,
    spotLabel: false,
    modes: true,
    volume: 0,
    needs: 320,
  },
  {
    center: 300,
    video: { width: 64, height: 36 },
    faces: 0,
    spotLabel: false,
    modes: false,
    volume: 0,
    needs: 220,
  },
  { center: 240, video: null, faces: 0, spotLabel: false, modes: false, volume: 0, needs: 0 },
];

/** 바 안쪽 여백(좌우 16)과 칸 사이 간격(16 두 번) */
const BAR_CHROME = 64;

function layoutFor(width: number): BarLayout {
  if (width === 0) return LAYOUTS[1];
  return (
    LAYOUTS.find((layout) => (width - BAR_CHROME - layout.center) / 2 >= layout.needs) ??
    LAYOUTS[LAYOUTS.length - 1]
  );
}

/**
 * 데스크톱 셸 하단 플레이바. 듣는 곡이 있으면 어느 화면에서나 같은 자리·같은 모양으로 뜬다(비교 화면도 이 바를 쓴다).
 * 제목을 누르면 그 비교 화면으로 가 같은 자리에서 이어진다.
 * ⏮ ⏭는 재생 목록을 따라 곡을 넘기고, 연주자는 오른쪽 ‹ 연주자 n/m ›로 바꾼다.
 */
export function GlobalPlayerBar() {
  const { locale } = useLocale();
  const router = useRouter();
  const stored = useComparePlayer((state) => state.current);
  // 저장해 둔 곡 이름을 지금 언어로(언어를 바꿔도 재생 중인 곡이 그대로 보이게)
  const current = React.useMemo(() => (stored ? relocalize(stored) : stored), [stored, locale]);
  const playing = useComparePlayer((state) => state.playing);
  const restored = useComparePlayer((state) => state.restored);
  const nav = useSongNav();
  const progress = useComparePlayer((state) => state.progress);
  const [scrub, setScrub] = React.useState<number | null>(null);
  // 바가 좁으면 차례로 접는다
  const [barWidth, setBarWidth] = React.useState(0);
  const layout = layoutFor(barWidth);
  const video = layout.video;
  const visible = useDesktopPlayerBarVisible();

  if (!current || !visible) return null;
  const duration = progress.duration || current.durationSec;
  const shownSeconds = scrub !== null ? scrub * duration : progress.current;
  const goToCompare = () => router.navigate(compareHrefFor(current));

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      className="cm-rise h-full flex-row items-center gap-4 bg-surface-1 px-4"
      style={{ borderRadius: SHELL.radius }}>
      <View className="min-w-0 flex-1 basis-0 flex-row items-center gap-3">
        {video ? (
          <Pressable
            onPress={goToCompare}
            accessibilityRole="link"
            accessibilityLabel={t('{title} 비교 화면으로', { title: current.pieceTitle })}>
            <PieceArt
              coverVideoId={current.videoId}
              fallbackImage={current.artistImageUrl}
              fallbackName={current.artistName}
              size={video.height}
              radius={6}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={goToCompare}
          accessibilityRole="link"
          className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Equalizer playing={playing} size={11} />
            <Text
              numberOfLines={1}
              className="shrink text-body-sm font-semibold text-foreground web:hover:underline">
              {current.pieceTitle}
            </Text>
          </View>
          <Text variant="caption" numberOfLines={1}>
            {restored
              ? t('이어 듣기 · {artist} · {sector}', {
                  artist: current.artistName,
                  sector: current.sectorName,
                })
              : `${current.artistName} · ${current.sectorName}`}
          </Text>
        </Pressable>
      </View>
      <View className="shrink-0 items-center gap-1.5" style={{ width: layout.center }}>
        <View className="flex-row items-center gap-4">
          {/* 좁으면 셔플·반복은 대기열 패널 위에만 둔다 */}
          {layout.modes ? <ShuffleButton /> : null}
          {/* 3초 넘게 들었으면 처음으로, 그 안이면 들은 순서의 이전 곡으로 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nav.prevLabel}
            onPress={() => comparePlayer.previous()}
            className="size-8 items-center justify-center rounded-full">
            <Icon
              as={SkipBackIcon}
              size={16}
              className="fill-foreground-muted text-foreground-muted"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t('일시정지') : restored ? t('이어 듣기') : t('재생')}
            onPress={() => comparePlayer.togglePlay()}
            className="size-9 items-center justify-center rounded-full bg-foreground web:transition-transform web:duration-fast web:hover:scale-105 web:active:scale-95">
            <Icon
              as={playing ? PauseIcon : PlayIcon}
              size={16}
              className="fill-background text-background"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nav.nextLabel}
            disabled={!nav.hasNext}
            onPress={() => comparePlayer.next()}
            className={cn(
              'size-8 items-center justify-center rounded-full',
              !nav.hasNext && 'opacity-40'
            )}>
            <Icon
              as={SkipForwardIcon}
              size={16}
              className="fill-foreground-muted text-foreground-muted"
            />
          </Pressable>
          {layout.modes ? <RepeatButton /> : null}
        </View>
        <View className="w-full flex-row items-center gap-2.5">
          <Text variant="mono" className="w-10 text-right text-foreground-muted">
            {clipClock(shownSeconds * 1000)}
          </Text>
          <ScrubBar
            value={duration > 0 ? progress.current / duration : 0}
            onScrub={setScrub}
            onCommit={(value) => {
              setScrub(null);
              comparePlayer.seek(value * duration);
            }}
            label={t('재생 위치')}
            valueText={(value) =>
              `${clipClock(value * duration * 1000)} / ${clipClock(duration * 1000)}`
            }
            step={duration > 0 ? 5 / duration : 0.05}
            disabled={duration <= 0}
            tooltip
          />
          <Text variant="mono" className="w-10 text-foreground-muted">
            {clipClock(duration * 1000)}
          </Text>
        </View>
      </View>
      <View className="min-w-0 flex-1 basis-0 flex-row items-center justify-end gap-2.5">
        <PerformerStepper compact={!layout.spotLabel} maxFaces={layout.faces} />
        <VolumeControl width={layout.volume} />
        <QueueButton />
        <FullscreenButton onGoToCompare={goToCompare} />
        <MoreMenu track={current} />
      </View>
    </View>
  );
}

/** 전체 화면. 비교 화면 밖에서 누르면 그 화면으로 가면서 띄운다 */
function FullscreenButton({ onGoToCompare }: { onGoToCompare: () => void }) {
  const onPage = useComparePlayer((state) => state.surface === 'slot');
  return (
    <Pressable
      onPress={() => {
        // 누른 그 자리에서 청해야 브라우저가 받아 준다. 조작부는 비교 화면이 그리므로 그 화면으로 간다
        comparePlayer.requestFullscreen();
        if (!onPage) onGoToCompare();
      }}
      accessibilityRole="button"
      accessibilityLabel={onPage ? t('전체 화면 (F)') : t('전체 화면')}
      className="size-8 shrink-0 items-center justify-center rounded-full web:hover:bg-surface-2">
      <Icon as={MaximizeIcon} size={16} className="text-foreground-muted" />
    </Pressable>
  );
}

/** 자주 쓰지 않는 동작 모음: YouTube 원본, 플레이어 닫기 */
function MoreMenu({ track }: { track: ComparePlayerTrack }) {
  const [open, setOpen] = React.useState(false);
  const watchUrl = track.videoId
    ? `https://www.youtube.com/watch?v=${track.videoId}&t=${Math.floor(track.startMs / 1000)}s`
    : null;
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('menu::더 보기')}
            className={cn(
              'size-8 shrink-0 items-center justify-center rounded-full web:hover:bg-surface-2',
              open && 'bg-surface-2'
            )}
          />
        }>
        <Icon as={MoreHorizontalIcon} size={16} className="text-foreground-muted" />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-60 gap-0 p-1.5">
        {watchUrl ? (
          <MenuRow
            icon={ExternalLinkIcon}
            label={t('YouTube 원본 새 창으로')}
            onPress={run(() => void Linking.openURL(watchUrl))}
          />
        ) : null}
        <View className="my-1 h-px bg-border" />
        <MenuRow icon={XIcon} label={t('플레이어 닫기')} onPress={run(() => comparePlayer.close())} />
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-9 flex-row items-center gap-2.5 rounded-md px-2.5 web:hover:bg-surface-2">
      <Icon as={icon} size={15} className="text-foreground-muted" />
      <Text numberOfLines={1} className="flex-1 text-body-sm text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
