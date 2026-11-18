import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

/**
 * 앱은 뒤로가기를 손짓으로 한다(iOS 왼쪽 가장자리 밀기, 안드로이드 시스템 뒤로).
 * 그래서 뒤로 단추는 웹에서만 보인다.
 */
const BACK_BUTTON_ON_PLATFORM = Platform.OS === 'web';

/**
 * 스택 화면의 뒤로 단추를 보일지. 앱이라도 링크로 바로 들어와 뒤에 화면이 없으면
 * 밀어서 돌아갈 곳이 없으니 단추를 남긴다(누르면 각 화면의 기본 화면으로 간다).
 */
export function useStackBackButtonVisible(): boolean {
  const router = useRouter();
  return BACK_BUTTON_ON_PLATFORM || !router.canGoBack();
}
