import { Button } from '@/components/ui/button';
import { AUTH_BUTTON_CLASS, AUTH_INPUT_CLASS, AuthHeading, FieldError } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignIn } from '@clerk/clerk-expo';
import { type Href, router } from 'expo-router';
import * as React from 'react';
import { TextInput, View } from 'react-native';

export function ResetPasswordForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const passwordInputRef = React.useRef<TextInput>(null);
  const [error, setError] = React.useState({ code: '', password: '' });

  async function onSubmit() {
    if (!isLoaded) {
      return;
    }
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        // 새 비밀번호로 로그인된 상태가 된다. 찾기·재설정 화면을 닫고 홈으로
        await setActive({ session: result.createdSessionId });
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home' as Href);
        return;
      }
      setError({ code: '재설정을 마치지 못했어요. 코드를 다시 받아 입력해 주세요.', password: '' });
    } catch (err: any) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling

      // Clerk 에러 처리
      if (err?.errors && Array.isArray(err.errors)) {
        const newErrors: { code: string; password: string } = { code: '', password: '' };

        err.errors.forEach((error: any) => {
          const field = error.meta?.paramName || '';
          const message = error.message || error.longMessage || '';

          // 패스워드 유출 검증 에러는 무시
          if (message.toLowerCase().includes('data breach')) {
            return;
          }

          const translatedMessage = translateClerkError(message);

          if (field === 'password') {
            newErrors.password = translatedMessage;
          } else if (field === 'code') {
            newErrors.code = translatedMessage;
          } else {
            const isPasswordMessage = message.toLowerCase().includes('password');
            if (isPasswordMessage) {
              newErrors.password = translatedMessage;
            } else {
              newErrors.code = translatedMessage;
            }
          }
        });

        setError(newErrors);
        return;
      }

      // 기본 에러 처리
      if (err instanceof Error) {
        const message = err.message;

        // 패스워드 유출 검증 에러는 무시
        if (message.toLowerCase().includes('data breach')) {
          return;
        }

        const translatedMessage = translateClerkError(message);
        const isPasswordMessage = message.toLowerCase().includes('password');
        setError({ code: '', password: isPasswordMessage ? translatedMessage : '' });
        return;
      }
    }
  }

  // 메일에서 방금 본 코드를 먼저, 그다음 새 비밀번호
  function onCodeSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  return (
    <View>
      <AuthHeading title="새 비밀번호 정하기" description="메일로 받은 인증 코드를 넣고 새 비밀번호를 정해 주세요." />
      <View className="gap-4">
        <View className="gap-1.5">
          <Label htmlFor="code">인증 코드</Label>
          <Input
            id="code"
            autoCapitalize="none"
            aria-invalid={Boolean(error.code)}
            className={`${AUTH_INPUT_CLASS} font-mono tracking-[0.3em]`}
            onChangeText={setCode}
            returnKeyType="next"
            submitBehavior="submit"
            keyboardType="numeric"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            onSubmitEditing={onCodeSubmitEditing}
          />
          <FieldError message={error.code} />
        </View>
        <View className="gap-1.5">
          <Label htmlFor="password">새 비밀번호</Label>
          <Input
            ref={passwordInputRef}
            id="password"
            placeholder="8자 이상"
            secureTextEntry
            autoComplete="new-password"
            aria-invalid={Boolean(error.password)}
            className={AUTH_INPUT_CLASS}
            onChangeText={setPassword}
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
          <FieldError message={error.password} />
        </View>
        <Button className={AUTH_BUTTON_CLASS} onPress={onSubmit}>
          <Text className="font-bold">비밀번호 바꾸기</Text>
        </Button>
      </View>
    </View>
  );
}
