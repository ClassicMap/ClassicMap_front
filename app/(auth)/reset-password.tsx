import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/reset-password-form';
import * as React from 'react';

export default function ResetPasswordScreen() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
