import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { TicketVendor } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { ChevronRightIcon, ExternalLinkIcon, TicketIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 예매 모달 위에 보이는 공연 요약 */
export interface TicketSummary {
  title: string;
  posterUrl?: string | null;
  /** 예: 9월 30일 (수) 19:30 */
  when?: string;
  where?: string;
  /** 예: 전석 5,000원 / 30,000–150,000원 */
  price?: string;
}

interface TicketVendorsModalProps {
  visible: boolean;
  vendors: TicketVendor[];
  onClose: () => void;
  summary?: TicketSummary;
}

/** 긴 예매 주소 대신 도메인만 보여 준다 (www. 제외) */
export function vendorDomain(url: string): string {
  const match = url.match(/^[a-z]+:\/\/([^/?#]+)/i);
  return (match ? match[1] : url).replace(/^www\./, '');
}

export function openVendorUrl(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert(
      '예매 페이지를 열지 못했어요',
      '잠시 뒤 다시 시도하거나 판매처 사이트에서 공연을 찾아 주세요.'
    );
  });
}

/**
 * 예매처 고르기. 넓은 화면은 가운데 모달, 좁은 화면은 바텀시트.
 * 예매는 판매처 사이트에서 진행돼서, 어디로 가는지(판매처·도메인)를 먼저 보여 준다.
 */
export function TicketVendorsModal({
  visible,
  vendors,
  onClose,
  summary,
}: TicketVendorsModalProps) {
  const { layout } = useBreakpoint();
  const dialog = layout === 'desktop' || layout === 'wide';
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);
  const panelRef = React.useRef<View>(null);

  React.useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [progress, visible]);

  // 웹: ESC로 닫고, 열리면 모달로 포커스를 옮긴다
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const node = panelRef.current as unknown as HTMLElement | null;
    node?.focus?.();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, visible]);

  const sorted = React.useMemo(
    () => [...vendors].sort((a, b) => a.displayOrder - b.displayOrder),
    [vendors]
  );

  const panelStyle = dialog
    ? {
        opacity: progress,
        transform: [
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }
    : {
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) },
        ],
      };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View className={cn('flex-1', dialog ? 'items-center justify-center p-6' : 'justify-end')}>
        <Animated.View
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: progress }}>
          <Pressable
            onPress={onClose}
            accessibilityLabel="예매처 닫기"
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
            className="web:cursor-default"
          />
        </Animated.View>

        {/* Animated.View에는 className이 안 먹어 움직임만 맡기고 모양은 안쪽 View가 맡는다 */}
        <Animated.View
          style={[
            panelStyle,
            dialog ? { width: '100%', maxWidth: 480, maxHeight: '86%' } : { maxHeight: '86%' },
          ]}>
          <View
            ref={panelRef}
            role="dialog"
            aria-modal
            aria-label="예매처 고르기"
            tabIndex={-1}
            style={
              dialog
                ? { maxHeight: '100%' }
                : { maxHeight: '100%', paddingBottom: insets.bottom + 12 }
            }
            className={cn(
              'overflow-hidden border-border bg-background web:outline-none',
              dialog ? 'rounded-2xl border shadow-2xl shadow-black/40' : 'rounded-t-3xl border-t'
            )}>
            {!dialog ? (
              <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-border-strong" />
            ) : null}

            <View className={cn('flex-row items-start gap-3.5 px-5', dialog ? 'pt-5' : 'pt-4')}>
              {summary ? (
                <>
                  <EntityThumb
                    name={summary.title}
                    image={summary.posterUrl}
                    shape="square"
                    size={56}
                    aspect={4 / 3}
                  />
                  <View className="min-w-0 flex-1">
                    <Text variant="caption" className="font-semibold text-primary">
                      예매하기
                    </Text>
                    <Text numberOfLines={2} className="mt-0.5 text-body font-bold text-foreground">
                      {summary.title}
                    </Text>
                    {[summary.when, summary.where].some(Boolean) ? (
                      <Text variant="caption" numberOfLines={2} className="mt-1">
                        {[summary.when, summary.where].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {summary.price ? (
                      <Text variant="mono" className="mt-1 text-caption text-foreground">
                        {summary.price}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                <Text className="min-w-0 flex-1 text-title-3 font-bold text-foreground">
                  예매하기
                </Text>
              )}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={8}
                className="-mr-1.5 -mt-1 size-9 items-center justify-center rounded-full active:bg-surface-2 web:hover:bg-surface-2">
                <Icon as={XIcon} size={18} className="text-foreground-muted" />
              </Pressable>
            </View>

            <View className="mx-5 mt-4 h-px bg-border" />

            <ScrollView
              className="shrink"
              contentContainerClassName="px-5 pb-2 pt-4"
              showsVerticalScrollIndicator={false}>
              {sorted.length === 0 ? (
                <View className="items-center gap-2 rounded-xl bg-surface-2 px-4 py-6">
                  <Icon as={TicketIcon} size={22} className="text-foreground-subtle" />
                  <Text className="text-body-sm font-semibold text-foreground">
                    아직 등록된 예매처가 없어요
                  </Text>
                  <Text variant="caption" className="text-center">
                    공연장이나 주최 측 사이트에서 예매 일정을 확인해 주세요.
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="caption" className="mb-2 font-semibold text-foreground-subtle">
                    예매처 {sorted.length}곳
                  </Text>
                  <View className="gap-2">
                    {sorted.map((vendor) => (
                      <VendorRow key={vendor.id} vendor={vendor} />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <Text variant="caption" className="px-5 pb-5 pt-3 text-foreground-subtle">
              예매는 각 판매처 사이트에서 진행돼요. 좌석과 가격은 판매처에서 한 번 더 확인해 주세요.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function VendorRow({ vendor }: { vendor: TicketVendor }) {
  const name = vendor.vendorName?.trim() || vendorDomain(vendor.vendorUrl);
  return (
    <Pressable
      onPress={() => openVendorUrl(vendor.vendorUrl)}
      accessibilityRole="link"
      accessibilityLabel={`${name}에서 예매하기, 새 창으로 열려요`}
      className="group flex-row items-center gap-3 rounded-xl border border-border px-4 py-3.5 active:bg-surface-2 web:transition-colors web:hover:border-border-strong web:hover:bg-surface-2">
      <View className="size-9 items-center justify-center rounded-lg bg-surface-2 web:group-hover:bg-surface-3">
        <Icon as={TicketIcon} size={17} className="text-foreground-muted" />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-sm font-semibold text-foreground">
          {name}
        </Text>
        <Text variant="caption" numberOfLines={1} className="mt-0.5">
          {vendorDomain(vendor.vendorUrl)}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-caption font-semibold text-primary">예매</Text>
        <Icon
          as={Platform.OS === 'web' ? ExternalLinkIcon : ChevronRightIcon}
          size={15}
          className="text-primary"
        />
      </View>
    </Pressable>
  );
}
