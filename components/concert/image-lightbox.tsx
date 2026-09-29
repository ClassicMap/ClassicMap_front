import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  type GestureResponderEvent,
  Image,
  type PointerEvent,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;
const CLICK_ZOOM = 2;
/** 세로가 폭의 두 배를 넘으면 상세 소개처럼 긴 이미지로 보고 폭에 맞춰 세로로 스크롤한다 */
const LONG_RATIO = 2;
const MAX_FIT_WIDTH = 1040;
const DRAG_THRESHOLD = 4;

interface ImageLightboxProps {
  images: readonly string[];
  /** 열려 있으면 보이는 이미지 번호, 닫혀 있으면 null */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * 공연 소개 이미지 크게 보기.
 * 웹: 클릭하면 그 지점으로 확대, 드래그로 이동, ⌘/Ctrl+휠·+/− 버튼·키보드(+ − 0 ← → Esc).
 * 네이티브: iOS는 두 손가락으로 확대, 긴 이미지는 폭에 맞춰 세로로 스크롤.
 */
export function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const visible = index !== null && images.length > 0;
  const current = visible ? Math.min(Math.max(index, 0), images.length - 1) : 0;
  const uri = images[current];
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [ratio, setRatio] = React.useState<number | null>(null);
  const [natural, setNatural] = React.useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [failed, setFailed] = React.useState(false);

  const count = images.length;
  const go = React.useCallback(
    (delta: number) => {
      if (count < 2) return;
      onIndexChange((current + delta + count) % count);
    },
    [count, current, onIndexChange]
  );

  React.useEffect(() => {
    if (!visible || !uri) return;
    setZoom(1);
    setRatio(null);
    setNatural(null);
    setFailed(false);
    let alive = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (!alive || width <= 0 || height <= 0) return;
        setNatural({ width, height });
        setRatio(width / height);
      },
      () => alive && setFailed(true)
    );
    return () => {
      alive = false;
    };
  }, [uri, visible]);

  const stepZoom = React.useCallback((direction: 1 | -1) => {
    setZoom((value) => {
      const steps = ZOOM_STEPS as readonly number[];
      if (direction > 0) return steps.find((step) => step > value + 0.01) ?? steps[steps.length - 1];
      return [...steps].reverse().find((step) => step < value - 0.01) ?? 1;
    });
  }, []);

  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === '+' || event.key === '=') stepZoom(1);
      else if (event.key === '-') stepZoom(-1);
      else if (event.key === '0') setZoom(1);
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, onClose, stepZoom, visible]);

  const topBar = 56 + insets.top;
  const viewportWidth = windowWidth;
  // 웹은 아래 조작 안내 한 줄 높이도 뺀다
  const viewportHeight = windowHeight - topBar - insets.bottom - (Platform.OS === 'web' && windowWidth >= 768 ? 32 : 0);
  const wide = windowWidth >= 768;
  const gutter = Platform.OS === 'web' ? (wide ? 48 : 12) : 0;

  // 기본 크기: 긴 이미지는 폭에 맞춤, 나머지는 화면 안에 다 들어오게
  let fitWidth = 0;
  if (ratio && natural) {
    const maxWidth = Math.min(viewportWidth - gutter * 2, MAX_FIT_WIDTH, Platform.OS === 'web' ? natural.width : Infinity);
    const long = 1 / ratio > LONG_RATIO;
    fitWidth = long ? maxWidth : Math.min(maxWidth, (viewportHeight - gutter) * ratio);
  }
  const imageWidth = fitWidth * zoom;
  const imageHeight = ratio ? imageWidth / ratio : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: 'rgba(6, 6, 6, 0.97)' }}>
        <View
          style={{ paddingTop: insets.top, height: topBar }}
          className="flex-row items-center justify-between gap-3 px-3">
          <Text className="w-20 pl-2 text-body-sm font-semibold text-white/80" accessibilityLiveRegion="polite">
            {count > 1 ? `${current + 1} / ${count}` : ''}
          </Text>
          <View className="flex-row items-center gap-1">
            {Platform.OS === 'web' ? (
              <>
                <BarButton label="축소" onPress={() => stepZoom(-1)} disabled={zoom <= 1}>
                  <Icon as={MinusIcon} size={18} className="text-white" />
                </BarButton>
                <Pressable
                  onPress={() => setZoom(1)}
                  accessibilityLabel="원래 크기로"
                  className="h-9 min-w-14 items-center justify-center rounded-full px-2 web:hover:bg-white/10">
                  <Text variant="mono" className="text-caption text-white/80">
                    {Math.round(zoom * 100)}%
                  </Text>
                </Pressable>
                <BarButton label="확대" onPress={() => stepZoom(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}>
                  <Icon as={PlusIcon} size={18} className="text-white" />
                </BarButton>
                <View className="mx-1.5 h-5 w-px bg-white/20" />
              </>
            ) : null}
            {uri ? (
              <BarButton label="원본 이미지 새 창으로 열기" onPress={() => Linking.openURL(uri).catch(() => undefined)}>
                <Icon as={ExternalLinkIcon} size={17} className="text-white" />
              </BarButton>
            ) : null}
            <BarButton label="닫기" onPress={onClose}>
              <Icon as={XIcon} size={20} className="text-white" />
            </BarButton>
          </View>
        </View>

        <View className="flex-1">
          {failed ? (
            <View className="flex-1 items-center justify-center gap-2 px-6">
              <Text className="text-body font-semibold text-white">이미지를 불러오지 못했어요</Text>
              <Text className="text-center text-caption text-white/60">원본 열기로 판매처 사이트의 이미지를 확인해 주세요.</Text>
            </View>
          ) : !ratio ? null : Platform.OS === 'web' ? (
            <WebZoomCanvas
              key={uri}
              uri={uri}
              width={imageWidth}
              height={imageHeight}
              zoom={zoom}
              padding={gutter / 2}
              onZoom={setZoom}
              onBackdrop={onClose}
            />
          ) : (
            <ScrollView
              key={uri}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
              contentContainerStyle={{
                minHeight: viewportHeight,
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: insets.bottom,
              }}>
              <Image source={{ uri }} style={{ width: imageWidth, height: imageHeight }} resizeMode="contain" />
            </ScrollView>
          )}

          {count > 1 ? (
            <>
              <NavButton side="left" onPress={() => go(-1)} />
              <NavButton side="right" onPress={() => go(1)} />
            </>
          ) : null}
        </View>

        {Platform.OS === 'web' && wide ? (
          <Text className="pb-3 text-center text-caption text-white/45">
            누르면 확대돼요 · 드래그해서 옮기고 ⌘/Ctrl+휠로 크기를 바꿔요 · Esc로 닫아요
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

function BarButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={cn(
        'size-10 items-center justify-center rounded-full active:bg-white/15 web:hover:bg-white/10',
        disabled && 'opacity-35'
      )}>
      {children}
    </Pressable>
  );
}

function NavButton({ side, onPress }: { side: 'left' | 'right'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? '이전 이미지' : '다음 이미지'}
      style={{ position: 'absolute', top: '50%', marginTop: -24, [side]: 12 }}
      className="size-12 items-center justify-center rounded-full bg-black/55 active:bg-black/75 web:hover:bg-black/75">
      <Icon as={side === 'left' ? ChevronLeftIcon : ChevronRightIcon} size={24} className="text-white" />
    </Pressable>
  );
}

interface WebZoomCanvasProps {
  uri: string;
  width: number;
  height: number;
  zoom: number;
  /** 이미지 둘레 여백. 기본 크기 계산의 여백(gutter)의 절반 */
  padding: number;
  onZoom: (zoom: number) => void;
  onBackdrop: () => void;
}

/**
 * 웹 확대 캔버스. 스크롤 영역 안에 확대한 크기로 이미지를 두고,
 * 누른 지점이 화면 가운데 오도록 스크롤을 맞춘다. 드래그는 스크롤 이동으로 바꾼다.
 */
function WebZoomCanvas({ uri, width, height, zoom, padding, onZoom, onBackdrop }: WebZoomCanvasProps) {
  const scrollRef = React.useRef<View>(null);
  const anchor = React.useRef<{ x: number; y: number; from: number } | null>(null);
  const drag = React.useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = React.useRef(false);

  const element = () => scrollRef.current as unknown as HTMLElement | null;

  // 확대 배율이 바뀌면 기준점(누른 곳, 없으면 화면 가운데)이 그대로 보이게 스크롤을 옮긴다
  const previousZoom = React.useRef(zoom);
  React.useLayoutEffect(() => {
    const node = element();
    const from = previousZoom.current;
    previousZoom.current = zoom;
    if (!node || from === zoom) return;
    const point = anchor.current ?? {
      x: node.scrollLeft + node.clientWidth / 2,
      y: node.scrollTop + node.clientHeight / 2,
      from,
    };
    anchor.current = null;
    const scale = zoom / point.from;
    node.scrollLeft = point.x * scale - node.clientWidth / 2;
    node.scrollTop = point.y * scale - node.clientHeight / 2;
  }, [zoom]);

  React.useEffect(() => {
    const node = element();
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const next = Math.min(4, Math.max(1, zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const rect = node.getBoundingClientRect();
      anchor.current = {
        x: node.scrollLeft + event.clientX - rect.left,
        y: node.scrollTop + event.clientY - rect.top,
        from: zoom,
      };
      onZoom(Math.round(next * 100) / 100);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [onZoom, zoom]);

  const onImagePress = (event: GestureResponderEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const node = element();
    if (!node) return;
    if (zoom > 1) {
      onZoom(1);
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    // 이미지 안 좌표를 스크롤 영역 좌표로 (이미지가 가운데 놓여 있을 수 있다)
    const offsetX = Math.max(0, (node.clientWidth - width) / 2);
    const offsetY = Math.max(0, (node.clientHeight - height) / 2);
    anchor.current = { x: offsetX + locationX, y: offsetY + locationY, from: 1 };
    onZoom(CLICK_ZOOM);
  };

  const pointerHandlers =
    zoom > 1
      ? {
          onPointerDown: (event: PointerEvent) => {
            const node = element();
            if (!node) return;
            drag.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY, left: node.scrollLeft, top: node.scrollTop, moved: false };
          },
          onPointerMove: (event: PointerEvent) => {
            const node = element();
            const start = drag.current;
            if (!node || !start) return;
            const dx = event.nativeEvent.clientX - start.x;
            const dy = event.nativeEvent.clientY - start.y;
            if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            start.moved = true;
            node.scrollLeft = start.left - dx;
            node.scrollTop = start.top - dy;
          },
          onPointerUp: () => {
            if (drag.current?.moved) suppressClick.current = true;
            drag.current = null;
          },
          onPointerLeave: () => {
            drag.current = null;
          },
        }
      : {};

  return (
    <View ref={scrollRef} style={{ flex: 1, overflow: 'scroll' }} {...pointerHandlers}>
      <Pressable
        onPress={onBackdrop}
        accessibilityLabel="닫기"
        style={{ minWidth: '100%', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding }}
        className="web:cursor-default">
        <Pressable
          onPress={onImagePress}
          accessibilityRole="imagebutton"
          accessibilityLabel={zoom > 1 ? '원래 크기로' : '확대하기'}
          className={cn(zoom > 1 ? 'web:cursor-grab web:active:cursor-grabbing' : 'web:cursor-zoom-in')}>
          <Image
            source={{ uri }}
            style={{ width, height }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </Pressable>
    </View>
  );
}
