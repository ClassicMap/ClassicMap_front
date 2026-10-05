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
      // 웹·안드로이드 구현은 dismissBrowser가 undefined를 돌려준다. 닫을 인앱 브라우저는 iOS에만 남는다
      if (Platform.OS !== 'web') Promise.resolve(WebBrowser.dismissBrowser()).catch(() => {});
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
