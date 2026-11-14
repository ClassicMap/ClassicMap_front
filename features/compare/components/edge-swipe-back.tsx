import { useFocusEffect, useNavigation } from 'expo-router';
import * as React from 'react';
import { Animated, BackHandler, PanResponder, Platform, useWindowDimensions } from 'react-native';

/** 이 폭 안에서 시작한 밀기만 뒤로가기로 본다. 본문 좌우 여백(16px) 안이라 슬라이더·가로 목록을 건드리지 않는다 */
const EDGE_WIDTH = 16;

interface EdgeSwipeBackProps {
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * 비교 탭의 단계(작곡가 → 작품 → 비교 → 1:1)는 주소 파라미터만 바꿔서 스택의 밀어서 뒤로가기가 없다.
 * iOS 는 왼쪽 가장자리에서 밀면 화면이 손가락을 따라가다 위 단계로 돌아가고, 안드로이드는 시스템 뒤로가 위 단계로 간다.
 */
export function EdgeSwipeBack({ onBack, children }: EdgeSwipeBackProps) {
  const latest = React.useRef(onBack);
  latest.current = onBack;
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const widthRef = React.useRef(width);
  widthRef.current = width;
  const dragX = React.useRef(new Animated.Value(0)).current;
  // 손가락을 댄 자리. PanResponder 의 x0 은 응답자가 되기 전에는 0 이라 쓸 수 없다
  const startX = React.useRef(Number.POSITIVE_INFINITY);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        // 탭이 보일 때만 잡는다. 비교 탭 위에 올린 상세 화면의 뒤로가기는 가로채지 않는다
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
          latest.current();
          return true;
        });
        return () => subscription.remove();
      }
      // 탭 묶음이 스택 위에 올라와 있으면(상세 화면에서 비교로 왔을 때) 같은 가장자리 밀기를 스택이 먼저 가져간다.
      // 단계 안에 있는 동안은 스택 밀기를 끄고, 맨 첫 단계에서 다시 켠다
      const stack = navigation.getParent();
      stack?.setOptions({ gestureEnabled: false });
      return () => stack?.setOptions({ gestureEnabled: true });
    }, [navigation])
  );

  const pan = React.useMemo(() => {
    const settle = () =>
      Animated.spring(dragX, { toValue: 0, bounciness: 0, useNativeDriver: true }).start();
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        startX.current = event.nativeEvent.pageX;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        startX.current <= EDGE_WIDTH && gesture.dx > 10 && gesture.dx > Math.abs(gesture.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => dragX.setValue(Math.max(0, gesture.dx)),
      onPanResponderRelease: (_event, gesture) => {
        const distance = widthRef.current;
        if (gesture.dx > distance / 3 || (gesture.vx > 0.5 && gesture.dx > 40)) {
          // 다 밀려 나간 뒤 위 단계로 바꾼다. 단계마다 다른 화면이라 이 화면은 그대로 사라진다
          Animated.timing(dragX, {
            toValue: distance,
            duration: 160,
            useNativeDriver: true,
          }).start(() => latest.current());
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  }, [dragX]);

  if (Platform.OS !== 'ios') return <>{children}</>;

  return (
    <Animated.View
      {...pan.panHandlers}
      // VoiceOver 의 두 손가락 Z(돌아가기) 동작
      onAccessibilityEscape={() => latest.current()}
      style={{ flex: 1, transform: [{ translateX: dragX }] }}>
      {children}
    </Animated.View>
  );
}
