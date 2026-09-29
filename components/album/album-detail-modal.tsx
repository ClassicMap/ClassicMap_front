import { albumBadge, albumDate } from '@/components/album/album-card';
import { FavoriteButton } from '@/components/favorite-button';
import { Badge } from '@/components/ui/badge';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { RecordingListItem } from '@/lib/api/client';
import { getArtistCategoryLabel } from '@/lib/design/artist-category';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { type Href, useRouter } from 'expo-router';
import { ChevronRightIcon, ExternalLinkIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Animated, Easing, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ListenLink {
  service: string;
  url: string;
}

/** 들으러 가는 곳. 음원은 각 서비스에서 재생되니 어디로 가는지 이름을 그대로 보여 준다 */
export function albumListenLinks(album: Pick<RecordingListItem, 'appleMusicUrl' | 'spotifyUrl' | 'youtubeMusicUrl'>): ListenLink[] {
  const links: ListenLink[] = [];
  if (album.appleMusicUrl) links.push({ service: 'Apple Music', url: album.appleMusicUrl });
  if (album.spotifyUrl) links.push({ service: 'Spotify', url: album.spotifyUrl });
  if (album.youtubeMusicUrl) links.push({ service: 'YouTube Music', url: album.youtubeMusicUrl });
  return links;
}

function openLink(link: ListenLink) {
  Linking.openURL(link.url).catch(() =>
    Alert.alert(`${link.service}를 열지 못했어요`, '잠시 뒤 다시 눌러 주세요. 계속 안 되면 앱에서 앨범 이름으로 찾아 주세요.')
  );
}

interface AlbumDetailModalProps {
  /** 보여 줄 앨범. null 이면 닫힌다 */
  album: RecordingListItem | null;
  onClose: () => void;
}

/**
 * 앨범 정보. 넓은 화면은 가운데 모달, 좁은 화면은 바텀시트.
 * 큰 커버, 연주자, 레이블·발매일·트랙 수, 스트리밍 바로가기, 레퍼토리 담기.
 */
export function AlbumDetailModal({ album, onClose }: AlbumDetailModalProps) {
  const router = useRouter();
  const { layout } = useBreakpoint();
  const dialog = layout === 'desktop' || layout === 'wide';
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(0)).current;
  const visible = album !== null;
  const [shown, setShown] = React.useState<RecordingListItem | null>(album);

  React.useEffect(() => {
    if (album) setShown(album);
    Animated.timing(progress, {
      toValue: album ? 1 : 0,
      duration: album ? 220 : 160,
      easing: album ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !album) setShown(null);
    });
  }, [album, progress]);

  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, visible]);

  if (!shown) return null;

  const badge = albumBadge(shown);
  const links = albumListenLinks(shown);
  const facts = [
    { label: '레이블', value: shown.label },
    { label: badge === '발매 예정' ? '발매 예정일' : '발매일', value: albumDate(shown) },
    { label: '트랙', value: shown.trackCount ? `${shown.trackCount}곡` : null },
    {
      label: '형태',
      value: shown.isSingle ? '싱글' : shown.isCompilation ? '모음집' : null,
    },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  const panelStyle = dialog
    ? {
        opacity: progress,
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
      }
    : { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }] };

  const coverSize = dialog ? 220 : 168;

  return (
    <Modal visible={shown !== null} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className={cn('flex-1', dialog ? 'items-center justify-center p-6' : 'justify-end')}>
        <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: progress }}>
          <Pressable
            onPress={onClose}
            accessibilityLabel="앨범 정보 닫기"
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
            className="web:cursor-default"
          />
        </Animated.View>

        {/* Animated.View에는 className이 안 먹어 움직임만 맡기고 모양은 안쪽 View가 맡는다 */}
        <Animated.View style={[panelStyle, dialog ? { width: '100%', maxWidth: 640, maxHeight: '88%' } : { maxHeight: '90%' }]}>
          <View
            role="dialog"
            aria-modal
            aria-label={`${shown.title} 앨범 정보`}
            style={dialog ? { maxHeight: '100%' } : { maxHeight: '100%', paddingBottom: insets.bottom + 12 }}
            className={cn(
              'overflow-hidden border-border bg-background',
              dialog ? 'rounded-2xl border shadow-2xl shadow-black/40' : 'rounded-t-3xl border-t'
            )}>
            {!dialog ? <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-border-strong" /> : null}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={8}
              className="absolute right-3 top-3 z-10 size-9 items-center justify-center rounded-full active:bg-surface-2 web:hover:bg-surface-2">
              <Icon as={XIcon} size={18} className="text-foreground-muted" />
            </Pressable>

            <ScrollView className="shrink" contentContainerClassName={cn('p-5', dialog ? 'pt-6' : 'pt-4')}>
              <View className={cn(dialog ? 'flex-row gap-6' : 'items-center')}>
                <EntityThumb name={shown.title} image={shown.coverUrl} shape="square" size={coverSize} />
                <View className={cn('min-w-0', dialog ? 'flex-1 pt-1' : 'mt-4 w-full')}>
                  {badge ? (
                    <Badge tone={badge === '발매 예정' ? 'info' : 'accent'} label={badge} className="mb-2" />
                  ) : null}
                  <Text className="pr-8 text-title-3 font-bold text-foreground">{shown.title}</Text>
                  <Pressable
                    onPress={() => {
                      onClose();
                      router.push(`/artist/${shown.artistId}` as Href);
                    }}
                    accessibilityRole="link"
                    accessibilityLabel={`${shown.artistName} 아티스트 보기`}
                    className="-mx-2 mt-3 flex-row items-center gap-2.5 self-start rounded-full py-1 pl-1 pr-2 active:bg-surface-2 web:hover:bg-surface-2">
                    <EntityThumb name={shown.artistName} image={shown.artistImageUrl} shape="circle" size={28} />
                    <View>
                      <Text className="text-body-sm font-semibold text-foreground">{shown.artistName}</Text>
                      {shown.artistCategory ? (
                        <Text variant="caption" className="text-foreground-subtle">
                          {getArtistCategoryLabel(shown.artistCategory)}
                        </Text>
                      ) : null}
                    </View>
                    <Icon as={ChevronRightIcon} size={15} className="text-foreground-subtle" />
                  </Pressable>

                  {facts.length > 0 ? (
                    <View className="mt-4 gap-1.5">
                      {facts.map((fact) => (
                        <View key={fact.label} className="flex-row gap-3">
                          <Text variant="caption" className="w-20 text-foreground-subtle">
                            {fact.label}
                          </Text>
                          <Text variant="caption" className="min-w-0 flex-1 text-foreground">
                            {fact.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <FavoriteButton kind="recordings" id={shown.id} name={shown.title} variant="labeled" className="mt-5 self-start" />
                </View>
              </View>

              <View className="mt-6 h-px bg-border" />
              <Text variant="caption" className="mb-2 mt-4 font-semibold text-foreground-subtle">
                들으러 가기
              </Text>
              {links.length === 0 ? (
                <Text variant="caption">
                  연결된 스트리밍 링크가 아직 없어요. 쓰는 음악 앱에서 앨범 이름으로 찾아 주세요.
                </Text>
              ) : (
                <View className="gap-2">
                  {links.map((link) => (
                    <Pressable
                      key={link.service}
                      onPress={() => openLink(link)}
                      accessibilityRole="link"
                      accessibilityLabel={`${link.service}에서 듣기, 새 창으로 열려요`}
                      className="flex-row items-center gap-3 rounded-xl border border-border px-4 py-3 active:bg-surface-2 web:transition-colors web:hover:border-border-strong web:hover:bg-surface-2">
                      <Text className="min-w-0 flex-1 text-body-sm font-semibold text-foreground">{link.service}</Text>
                      <Text variant="caption" className="text-primary">
                        듣기
                      </Text>
                      <Icon as={ExternalLinkIcon} size={14} className="text-primary" />
                    </Pressable>
                  ))}
                </View>
              )}
              <Text variant="caption" className="mt-3 text-foreground-subtle">
                음원은 각 서비스에서 재생돼요. 앨범 정보는 Apple Music 카탈로그를 기준으로 해요.
              </Text>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
