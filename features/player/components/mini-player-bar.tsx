import { MiniVideoTarget } from '@/features/player/components/mini-video-target';
import { compareHrefFor, tabBarHeight, usePlayerBarVisible } from '@/features/player/components/player-bar-helpers';
import { QueuePanel } from '@/features/player/components/queue-panel';
import { useSongNav } from '@/features/player/components/song-nav';
import { EntityThumb } from '@/components/shared/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { LAYER } from '@/lib/design/layers';
import { relocalize, t, useLocale } from '@/lib/i18n';
import { shell, useShell } from '@/lib/layout/shell-state';
import { cn } from '@/lib/utils';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { useRouter, useSegments } from 'expo-router';
import { ListMusicIcon, PauseIcon, PlayIcon, SkipForwardIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Animated, PanResponder, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 미니 플레이어를 이만큼(px) 밀면 이전·다음 곡으로 넘어간다 */
const SWIPE_DISTANCE = 56;

/**
 * 모바일(좁은 웹·네이티브) 미니 플레이어. 비교 화면 밖에서 듣고 있을 때 탭바 바로 위에 뜬다.
 * 누르면 그 비교 화면으로 돌아가 같은 연주가 같은 자리에서 이어진다.
 * 왼쪽 작은 자리에 재생 중인 영상이 그대로 옮겨 와 뜬다 (웹은 셸 영상, 네이티브는 루트의 YouTube).
 * ⏭는 재생 목록의 다음 곡, 왼쪽으로 밀면 다음 곡·오른쪽으로 밀면 이전 곡이다.
 */
export function MiniPlayerBar() {
  const { locale } = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const stored = useComparePlayer((state) => state.current);
  // 저장해 둔 곡 이름을 지금 언어로(언어를 바꿔도 재생 중인 곡이 그대로 보이게)
  const current = React.useMemo(() => (stored ? relocalize(stored) : stored), [stored, locale]);
  const playing = useComparePlayer((state) => state.playing);
  const restored = useComparePlayer((state) => state.restored);
  const progress = useComparePlayer((state) => state.progress);
  const hasMedia = useComparePlayer((state) => state.mediaAttached);
  const nav = useSongNav();
  // 밀기: 글자 줄만 손가락을 따라 움직인다(네이티브 영상은 루트에서 자리 좌표로 그려서 같이 움직이지 않는다)
  const dragX = React.useRef(new Animated.Value(0)).current;
  const swipe = React.useMemo(() => {
    const settle = () =>
      Animated.spring(dragX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    return PanResponder.create({
      // 옆으로 뚜렷하게 움직일 때만 가져간다. 그냥 누르면 아래 누르기(비교 화면으로)가 받는다
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_event, gesture) => dragX.setValue(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -SWIPE_DISTANCE) comparePlayer.next();
        else if (gesture.dx >= SWIPE_DISTANCE) comparePlayer.previousSong();
        settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [dragX]);

  // 영상이 비교 화면 자리에 떠 있지 않으면 띄운다 (다른 화면이거나, 비교 화면이 다른 작품을 보고 있을 때)
  // 대기열은 아래에서 올라오는 시트로 연다(데스크톱은 오른쪽 패널)
  const queueVisible = useShell((state) => state.queueSheetOpen);
  const setQueueVisible = shell.setQueueSheetOpen;
  const visible = usePlayerBarVisible();
  // 미니 플레이어가 사라지면(플레이어를 닫거나 넓은 창으로 바뀌면) 열어 둔 시트도 닫는다
  React.useEffect(() => {
    if (!visible) shell.setQueueSheetOpen(false);
  }, [visible]);
  React.useEffect(() => () => shell.setQueueSheetOpen(false), []);
  if (!current || !visible) return null;

  const inTabs = segments[0] === '(tabs)';
  const bottom = (inTabs ? tabBarHeight(insets.bottom) : insets.bottom) + 8;
  const ratio = progress.duration > 0 ? Math.min(1, progress.current / progress.duration) : 0;
  const goToCompare = () => router.navigate(compareHrefFor(current));
  // 네이티브에서 비교 화면이 사라져 미디어가 없으면 누르면 비교 화면으로 가서 이어 듣는다
  const canToggle = Platform.OS === 'web' || hasMedia;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 8, right: 8, bottom, zIndex: LAYER.floating }}>
      <View className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-lg shadow-black/30">
        <View className="h-[60px] flex-row items-center gap-3 pl-2 pr-1.5">
          {/* 밀기는 감싼 칸이 받는다. Pressable 은 자기 누르기 신호로 넘겨받은 손잡이를 덮어쓴다 */}
          <View {...swipe.panHandlers} style={{ flex: 1, minWidth: 0 }}>
            <Pressable
              onPress={goToCompare}
              accessibilityRole="link"
              accessibilityLabel={t('{name} 비교 화면으로', { name: current.artistName })}
              accessibilityHint={t('옆으로 밀면 이전·다음 곡으로 넘어가요')}
              className="min-w-0 flex-1 flex-row items-center gap-3">
              {current.videoId || Platform.OS === 'web' ? (
                <MiniVideoTarget width={80} height={45} />
              ) : (
                <EntityThumb
                  name={current.artistName}
                  image={current.artistImageUrl}
                  shape="circle"
                  size={40}
                />
              )}
              <Animated.View style={{ flex: 1, minWidth: 0, transform: [{ translateX: dragX }] }}>
                <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
                  {current.artistName}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {restored
                    ? t('이어 듣기 · {sector}', { sector: current.sectorName })
                    : `${current.sectorName} · ${current.pieceTitle}`}
                </Text>
              </Animated.View>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              if (!canToggle || !comparePlayer.togglePlay()) goToCompare();
            }}
            accessibilityLabel={playing ? t('일시정지') : restored ? t('이어 듣기') : t('재생')}
            className="size-11 items-center justify-center rounded-full">
            <Icon
              as={playing ? PauseIcon : PlayIcon}
              size={20}
              className="fill-foreground text-foreground"
            />
          </Pressable>
          <Pressable
            onPress={() => comparePlayer.next()}
            disabled={!nav.hasNext}
            accessibilityLabel={nav.nextLabel}
            className={cn(
              'size-9 items-center justify-center rounded-full',
              !nav.hasNext && 'opacity-30'
            )}>
            <Icon as={SkipForwardIcon} size={18} className="fill-foreground text-foreground" />
          </Pressable>
          <Pressable
            onPress={() => setQueueVisible(true)}
            accessibilityLabel={t('재생 대기열')}
            className="size-9 items-center justify-center rounded-full">
            <Icon as={ListMusicIcon} size={18} className="text-foreground" />
          </Pressable>
          <Pressable
            onPress={() => comparePlayer.close()}
            accessibilityLabel={t('플레이어 닫기')}
            className="size-9 items-center justify-center rounded-full">
            <Icon as={XIcon} size={18} className="text-foreground-muted" />
          </Pressable>
        </View>
        <View className="h-0.5 bg-surface-3">
          <View className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
        </View>
      </View>
      <Sheet open={queueVisible} onOpenChange={setQueueVisible}>
        <SheetContent
          side="bottom"
          aria-label={t('재생 대기열')}
          closeLabel={t('대기열 닫기')}
          style={{ height: '82%', paddingBottom: insets.bottom }}>
          <QueuePanel onClose={() => setQueueVisible(false)} />
        </SheetContent>
      </Sheet>
    </View>
  );
}
