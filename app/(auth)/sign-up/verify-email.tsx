import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailForm } from '@/components/verify-email-form';
import * as React from 'react';

export default function VerifyEmailScreen() {
  return (
    <AuthShell>
      <VerifyEmailForm />
    </AuthShell>
  );
}
