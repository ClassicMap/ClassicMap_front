import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDialog } from '@/components/ui/dialog/context';
import type { SheetContentProps } from '@/components/ui/dialog/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

/**
 * 가장자리에서 올라오는 패널. 앱 구현(RN Modal). 웹 구현은 index.web.tsx (Base UI Dialog).
 * 여닫기·제목 파트는 dialog 와 같다.
 *
 * 어두운 막은 서서히 나타나고 패널은 가장자리에서 밀려 들어온다(웹의 data-starting-style 과 같은 모양).
 * 움직임은 화면 전체 크기 층을 옮기는 것으로 해서, 패널의 `max-h-[80%]` 같은 비율이 화면 높이를 기준으로 남는다.
 */

const OPEN_MS = 240;
const CLOSE_MS = 180;

function SheetContent({
  side = 'bottom',
  'aria-label': ariaLabel,
  closeLabel,
  className,
  style,
  children,
}: SheetContentProps) {
  const { open, setOpen } = useDialog();
  const { width, height } = useWindowDimensions();
  const progress = React.useRef(new Animated.Value(0)).current;
  // 닫는 움직임이 끝날 때까지 Modal 을 남겨 둔다
  const [mounted, setMounted] = React.useState(open);
  // Modal 이 화면에 다 뜬 뒤에 여는 움직임을 시작한다. iOS 는 Modal 을 띄우는 데 시간이 걸려,
  // 그 전에 시작하면 움직임이 다 끝난 뒤에야 보여 패널이 그냥 나타난다
  const shown = React.useRef(false);
  const slideIn = React.useCallback(() => {
    shown.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // 닫히는 중에 다시 열면 Modal 이 그대로 떠 있어 onShow 가 다시 오지 않는다
      if (shown.current) slideIn();
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      shown.current = false;
      setMounted(false);
    });
    return () => animation.stop();
  }, [open, progress, slideIn]);

  const offset =
    side === 'bottom'
      ? { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }
      : { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={slideIn}
      onRequestClose={() => setOpen(false)}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { transform: [offset] }]}>
        <View
          pointerEvents="box-none"
          className={cn('flex-1', side === 'bottom' ? 'justify-end' : 'flex-row justify-end')}>
          <View
            accessibilityViewIsModal
            accessibilityLabel={ariaLabel}
            className={cn(
              'overflow-hidden bg-surface-1',
              side === 'bottom' ? 'rounded-t-2xl' : 'h-full w-3/4 max-w-sm',
              className
            )}
            style={style}>
            {children}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

export {
  Dialog as Sheet,
  DialogClose as SheetClose,
  SheetContent,
  DialogDescription as SheetDescription,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
  DialogTrigger as SheetTrigger,
};
