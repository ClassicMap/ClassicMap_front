import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';

export default function ForgotPasswordScreen() {
  useLocale();
  const router = useRouter();
  return (
    <AuthShell
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/sign-in' as Href))}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
