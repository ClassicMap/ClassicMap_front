import { MiniVideoTarget } from '@/components/player/mini-video-target';
import { compareHrefFor, tabBarHeight, useSettled } from '@/components/player/player-bar-helpers';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { comparePlayer, useComparePlayer } from '@/lib/player/compare-player-store';
import { useRouter, useSegments } from 'expo-router';
import { PauseIcon, PlayIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 모바일(좁은 웹·네이티브) 미니 플레이어. 비교 화면 밖에서 듣고 있을 때 탭바 바로 위에 뜬다.
 * 누르면 그 비교 화면으로 돌아가 같은 연주가 같은 자리에서 이어진다.
 * 왼쪽 작은 자리에 재생 중인 영상이 그대로 옮겨 와 뜬다 (웹은 셸 영상, 네이티브는 루트의 YouTube).
 */
export function MiniPlayerBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const current = useComparePlayer((state) => state.current);
  const playing = useComparePlayer((state) => state.playing);
  const restored = useComparePlayer((state) => state.restored);
  const surface = useComparePlayer((state) => state.surface);
  const focus = useComparePlayer((state) => state.focus);
  const progress = useComparePlayer((state) => state.progress);
  const hasMedia = useComparePlayer((state) => state.mediaAttached);

  // 영상이 비교 화면 자리에 떠 있지 않으면 띄운다 (다른 화면이거나, 비교 화면이 다른 작품을 보고 있을 때)
  const wanted = Boolean(current) && !focus && surface !== 'slot';
  const visible = useSettled(wanted);
  if (!current || !visible) return null;

  const inTabs = segments[0] === '(tabs)';
  const bottom = (inTabs ? tabBarHeight(insets.bottom) : insets.bottom) + 8;
  const ratio = progress.duration > 0 ? Math.min(1, progress.current / progress.duration) : 0;
  const goToCompare = () => router.navigate(compareHrefFor(current));
  // 네이티브에서 비교 화면이 사라져 미디어가 없으면 누르면 비교 화면으로 가서 이어 듣는다
  const canToggle = Platform.OS === 'web' || hasMedia;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, right: 8, bottom, zIndex: 30 }}>
      <View className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-lg shadow-black/30">
        <View className="h-[60px] flex-row items-center gap-3 pl-2 pr-1.5">
          <Pressable
            onPress={goToCompare}
            accessibilityRole="link"
            accessibilityLabel={`${current.artistName} 비교 화면으로`}
            className="min-w-0 flex-1 flex-row items-center gap-3">
            {current.videoId || Platform.OS === 'web' ? (
              <MiniVideoTarget width={80} height={45} />
            ) : (
              <EntityThumb name={current.artistName} image={current.artistImageUrl} shape="circle" size={40} />
            )}
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
                {current.artistName}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {restored ? `이어 듣기 · ${current.sectorName}` : `${current.sectorName} · ${current.pieceTitle}`}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!canToggle || !comparePlayer.togglePlay()) goToCompare();
            }}
            accessibilityLabel={playing ? '일시정지' : restored ? '이어 듣기' : '재생'}
            className="size-11 items-center justify-center rounded-full">
            <Icon as={playing ? PauseIcon : PlayIcon} size={20} className="fill-foreground text-foreground" />
          </Pressable>
          <Pressable
            onPress={() => comparePlayer.close()}
            accessibilityLabel="플레이어 닫기"
            className="size-10 items-center justify-center rounded-full">
            <Icon as={XIcon} size={18} className="text-foreground-muted" />
          </Pressable>
        </View>
        <View className="h-0.5 bg-surface-3">
          <View className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
        </View>
      </View>
    </View>
  );
}
