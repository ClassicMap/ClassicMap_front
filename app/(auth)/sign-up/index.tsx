import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/sign-up-form';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Platform } from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      // 웹 구현에는 dismissBrowser가 없어 undefined가 돌아온다. 닫을 인앱 브라우저도 네이티브에만 있다
      if (Platform.OS !== 'web') WebBrowser.dismissBrowser().catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace('/home' as Href);
    }
  }, [isSignedIn, router]);

  return (
    <AuthShell onClose={() => (router.canGoBack() ? router.back() : router.replace('/home' as Href))}>
      <SignUpForm />
    </AuthShell>
  );
}
