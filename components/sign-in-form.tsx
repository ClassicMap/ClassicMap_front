import { AUTH_BUTTON_CLASS, AUTH_INPUT_CLASS, AuthDivider, AuthHeading, FieldError } from '@/components/auth/auth-shell';
import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import * as React from 'react';
import { type TextInput, View } from 'react-native';

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const passwordInputRef = React.useRef<TextInput>(null);
  const [error, setError] = React.useState<{ email?: string; password?: string }>({});

  async function onSubmit() {
    if (!isLoaded) {
      return;
    }

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === 'complete') {
        setError({ email: '', password: '' });
        // 화면 이동은 로그인 화면이 로그인 상태를 보고 한 번만 한다 (두 번 뒤로 가지 않게)
        await setActive({ session: signInAttempt.createdSessionId });
        return;
      }
    } catch (err: any) {
      if (err?.errors && Array.isArray(err.errors)) {
        const newErrors: { email?: string; password?: string } = {};

        err.errors.forEach((error: any) => {
          const field = error.meta?.paramName || '';
          const message = error.message || error.longMessage || '';
          const translatedMessage = translateClerkError(message);

          if (field === 'identifier' || field === 'email_address') {
            newErrors.email = translatedMessage;
          } else if (field === 'password') {
            newErrors.password = translatedMessage;
          } else {
            newErrors.password = translatedMessage;
          }
        });

        setError(newErrors);
        return;
      }

      if (err instanceof Error) {
        const message = err.message;
        const translatedMessage = translateClerkError(message);
        const lowerMessage = message.toLowerCase();
        const isEmailMessage = lowerMessage.includes('identifier') || lowerMessage.includes('email');

        setError(isEmailMessage ? { email: translatedMessage } : { password: translatedMessage });
        return;
      }
    }
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }


  return (
    <View>
      <AuthHeading title="로그인" description="레퍼토리와 별점을 어느 기기에서든 이어서 봐요." />
      <SocialConnections />
      <AuthDivider label="또는 이메일로" />
      <View className="gap-4">
        <View className="gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            placeholder="name@example.com"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            aria-invalid={Boolean(error.email)}
            className={AUTH_INPUT_CLASS}
            onChangeText={setEmail}
            onSubmitEditing={onEmailSubmitEditing}
            returnKeyType="next"
            submitBehavior="submit"
          />
          <FieldError message={error.email} />
        </View>
        <View className="gap-1.5">
          <View className="flex-row items-baseline justify-between">
            <Label htmlFor="password">비밀번호</Label>
            <Link href="/(auth)/forgot-password" className="text-caption text-foreground-muted">
              비밀번호를 잊었어요
            </Link>
          </View>
          <Input
            ref={passwordInputRef}
            id="password"
            placeholder="비밀번호"
            secureTextEntry
            autoComplete="current-password"
            aria-invalid={Boolean(error.password)}
            className={AUTH_INPUT_CLASS}
            onChangeText={setPassword}
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
          <FieldError message={error.password} />
        </View>
        <Button className={AUTH_BUTTON_CLASS} onPress={onSubmit}>
          <Text className="font-bold">로그인</Text>
        </Button>
      </View>
      <Text variant="bodySm" className="mt-5 text-center text-foreground-muted">
        처음이에요?{' '}
        <Link href="/(auth)/sign-up" className="font-semibold text-foreground">
          회원가입
        </Link>
      </Text>
      <View className="mt-6 h-px bg-border" />
      <Text variant="caption" className="mt-4 text-center text-foreground-subtle">
        로그인 없이도 비교·검색·공연은 모두 볼 수 있어요.
      </Text>
    </View>
  );
}
