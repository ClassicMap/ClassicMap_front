import { useLocale } from '@/lib/i18n';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import * as React from 'react';

export default function ResetPasswordScreen() {
  useLocale();
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
