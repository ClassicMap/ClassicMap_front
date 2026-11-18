import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { useAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Platform } from 'react-native';
import { goBackOr } from '@/lib/navigation/go';

export default function SignInScreen() {
  useLocale();
  const { isSignedIn } = useAuth();

  // 소셜 로그인 등으로 인증 상태가 변하면 자동으로 뒤로가기
  React.useEffect(() => {
    if (isSignedIn) {
      // 웹·안드로이드 구현은 dismissBrowser가 undefined를 돌려준다. 닫을 인앱 브라우저는 iOS에만 남는다
      if (Platform.OS !== 'web') Promise.resolve(WebBrowser.dismissBrowser()).catch(() => {});
      goBackOr('/home', { web: 'replace' });
    }
  }, [isSignedIn]);

  return (
    <AuthShell onClose={() => goBackOr('/home', { web: 'replace' })}>
      <SignInForm />
    </AuthShell>
  );
}
