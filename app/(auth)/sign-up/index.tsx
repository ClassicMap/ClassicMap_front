import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/sign-up-form';
import { useAuth } from '@clerk/clerk-expo';
import { type Href, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';

export default function SignUpScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      WebBrowser.dismissBrowser().catch(() => {});
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
