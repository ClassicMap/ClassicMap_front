import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailForm } from '@/components/verify-email-form';
import * as React from 'react';

export default function VerifyEmailScreen() {
  useLocale();
  return (
    <AuthShell>
      <VerifyEmailForm />
    </AuthShell>
  );
}
