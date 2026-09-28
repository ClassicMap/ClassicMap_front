import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/sign-in-form';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // 소셜 로그인 등으로 인증 상태가 변하면 자동으로 뒤로가기
  React.useEffect(() => {
    if (isSignedIn) {
      WebBrowser.dismissBrowser().catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace('/home' as Href);
    }
  }, [isSignedIn, router]);

  return (
    <AuthShell onClose={() => (router.canGoBack() ? router.back() : router.replace('/home' as Href))}>
      <SignInForm />
    </AuthShell>
  );
}
