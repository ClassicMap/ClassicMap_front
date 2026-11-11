import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';
import * as React from 'react';

export default function VerifyEmailScreen() {
  useLocale();
  return (
    <AuthShell>
      <VerifyEmailForm />
    </AuthShell>
  );
}
