import { Button } from '@/components/ui/button';
import { AUTH_BUTTON_CLASS, AUTH_INPUT_CLASS, AuthHeading, FieldError } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignUp } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { type TextStyle, View } from 'react-native';

const RESEND_CODE_INTERVAL_SECONDS = 30;

const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

export function VerifyEmailForm() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  async function onSubmit() {
    if (!isLoaded) return;

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        return;
      }
      // TODO: Handle other statuses
      // If the status is not complete, check why. User may need to
      // complete further steps.
    } catch (err: any) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling

      // Clerk 에러 처리
      if (err?.errors && Array.isArray(err.errors)) {
        const message = err.errors[0]?.message || err.errors[0]?.longMessage || '';
        setError(translateClerkError(message));
        return;
      }

      // 기본 에러 처리
      if (err instanceof Error) {
        setError(translateClerkError(err.message));
        return;
      }
    }
  }

  async function onResendCode() {
    if (!isLoaded) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      restartCountdown();
    } catch (err: any) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling

      // Clerk 에러 처리
      if (err?.errors && Array.isArray(err.errors)) {
        const message = err.errors[0]?.message || err.errors[0]?.longMessage || '';
        setError(translateClerkError(message));
        return;
      }

      // 기본 에러 처리
      if (err instanceof Error) {
        setError(translateClerkError(err.message));
        return;
      }
    }
  }

  return (
    <View>
      <AuthHeading
        title="이메일 인증"
        description={`${email || '입력한 이메일'}로 보낸 인증 코드를 입력해 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.`}
      />
      <View className="gap-4">
        <View className="gap-1.5">
          <Label htmlFor="code">인증 코드</Label>
          <Input
            id="code"
            autoCapitalize="none"
            aria-invalid={Boolean(error)}
            className={`${AUTH_INPUT_CLASS} font-mono tracking-[0.3em]`}
            onChangeText={setCode}
            returnKeyType="send"
            keyboardType="numeric"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            onSubmitEditing={onSubmit}
          />
          <FieldError message={error} />
        </View>
        <Button className={AUTH_BUTTON_CLASS} onPress={onSubmit}>
          <Text className="font-bold">인증하고 시작하기</Text>
        </Button>
        <View className="flex-row items-center justify-center gap-4">
          <Button variant="link" size="sm" disabled={countdown > 0} onPress={onResendCode}>
            <Text className="text-caption">
              코드 다시 받기{' '}
              {countdown > 0 ? (
                <Text className="text-caption" style={TABULAR_NUMBERS_STYLE}>
                  ({countdown}초)
                </Text>
              ) : null}
            </Text>
          </Button>
          <Button variant="link" size="sm" onPress={router.back}>
            <Text className="text-caption text-foreground-muted">취소</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = React.useCallback(() => {
    setCountdown(seconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  React.useEffect(() => {
    startCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCountdown]);

  return { countdown, restartCountdown: startCountdown };
}
