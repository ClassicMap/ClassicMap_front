import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';

export default function ForgotPasswordScreen() {
  useLocale();
  const router = useRouter();
  return (
    <AuthShell onClose={() => (router.canGoBack() ? router.back() : router.replace('/sign-in' as Href))}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
