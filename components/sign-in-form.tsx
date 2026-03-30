import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { type TextInput, View } from 'react-native';

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const passwordInputRef = React.useRef<TextInput>(null);
  const [error, setError] = React.useState<{ email?: string; password?: string }>({});
  const router = useRouter();

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
        await setActive({ session: signInAttempt.createdSessionId });
        router.back();
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

  function onCancel() {
    router.back();
  }

  return (
    <View className="gap-6">
      <View className="mb-4 gap-2">
        <Text className="text-center text-4xl font-bold">🎼</Text>
        <Text className="text-center text-3xl font-bold">클래식 음악의 세계로</Text>
        <Text className="text-center text-base text-muted-foreground">
          다시 만나서 반갑습니다
        </Text>
      </View>
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">로그인</CardTitle>
          <CardDescription className="text-center sm:text-left">
            이메일과 비밀번호로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                placeholder="이메일을 입력하세요"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>
            <View className="gap-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                placeholder="비밀번호를 입력하세요"
                secureTextEntry
                onChangeText={setPassword}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error.password ? (
                <Text className="text-sm font-medium text-destructive">{error.password}</Text>
              ) : null}
            </View>
            <View className="gap-3">
              <Button className="w-full" onPress={onSubmit}>
                <Text>로그인</Text>
              </Button>
              <Button variant="outline" className="w-full" onPress={onCancel}>
                <Text>취소</Text>
              </Button>
            </View>
          </View>
          <Text className="text-center text-sm">
            아직 계정이 없으신가요?{' '}
            <Link href="/(auth)/sign-up" className="text-sm underline underline-offset-4">
              회원가입
            </Link>
          </Text>
          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="px-4 text-sm text-muted-foreground">또는</Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
        </CardContent>
      </Card>
    </View>
  );
}
