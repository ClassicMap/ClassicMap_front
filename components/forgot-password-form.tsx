import { Button } from '@/components/ui/button';
import { AUTH_BUTTON_CLASS, AUTH_INPUT_CLASS, AuthHeading, FieldError } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router/build/hooks';
import * as React from 'react';
import { View } from 'react-native';

export function ForgotPasswordForm() {
  const { email: emailParam = '' } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = React.useState(emailParam);
  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = React.useState<{ email?: string; password?: string }>({});

  const onSubmit = async () => {
    if (!email) {
      setError({ email: '이메일을 입력해주세요' });
      return;
    }
    if (!isLoaded) {
      return;
    }

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      router.push(`/(auth)/reset-password?email=${email}`);
    } catch (err: any) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling

      // Clerk 에러 처리
      if (err?.errors && Array.isArray(err.errors)) {
        const message = err.errors[0]?.message || err.errors[0]?.longMessage || '';
        setError({ email: translateClerkError(message) });
        return;
      }

      // 기본 에러 처리
      if (err instanceof Error) {
        setError({ email: translateClerkError(err.message) });
        return;
      }
    }
  };

  return (
    <View>
      <AuthHeading
        title="비밀번호 찾기"
        description="가입한 이메일로 인증 코드를 보내 드려요. 코드를 넣으면 새 비밀번호를 정할 수 있어요."
      />
      <View className="gap-4">
        <View className="gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            defaultValue={email}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            aria-invalid={Boolean(error.email)}
            className={AUTH_INPUT_CLASS}
            onChangeText={setEmail}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
          />
          <FieldError message={error.email} />
        </View>
        <Button className={AUTH_BUTTON_CLASS} onPress={onSubmit}>
          <Text className="font-bold">인증 코드 받기</Text>
        </Button>
      </View>
    </View>
  );
}
