import { Alert as RNAlert, Platform } from 'react-native';

/**
 * 크로스 플랫폼 Alert 유틸리티
 * iOS/Android: React Native Alert 사용
 * Web: window.confirm/alert 사용 (차단 시 자동으로 콜백 실행)
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  ) => {
    if (Platform.OS === 'web') {
      // 웹에서는 window.alert/confirm 사용
      const fullMessage = message ? `${title}\n\n${message}` : title;

      if (buttons && buttons.length > 1) {
        // 여러 버튼이 있는 경우 confirm 사용
        try {
          const confirmed = window.confirm(fullMessage);

          if (confirmed) {
            // 확인 버튼 (destructive 또는 마지막 버튼)
            const confirmButton = buttons.find(b => b.style === 'destructive') || buttons[buttons.length - 1];
            confirmButton.onPress?.();
          } else {
            // 취소 버튼
            const cancelButton = buttons.find(b => b.style === 'cancel');
            cancelButton?.onPress?.();
          }
        } catch (error) {
          // confirm이 차단된 경우: 콘솔에 메시지만 출력하고 아무 동작도 하지 않음
          console.warn('[Alert] Dialog blocked by browser:', error);
          console.log(`${title}: ${message}`);
        }
      } else {
        // 버튼이 1개 이하인 경우 alert 사용
        try {
          window.alert(fullMessage);
          buttons?.[0]?.onPress?.();
        } catch (error) {
          // alert이 차단된 경우: 콜백만 실행
          console.warn('[Alert] Dialog blocked by browser:', error);
          console.log(`${title}: ${message}`);
          buttons?.[0]?.onPress?.();
        }
      }
    } else {
      // iOS/Android는 기본 Alert 사용
      RNAlert.alert(
        title,
        message,
        buttons as any
      );
    }
  },
};
