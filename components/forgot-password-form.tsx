import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">비밀번호 재설정</CardTitle>
          <CardDescription className="text-center sm:text-left">
            이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                defaultValue={email}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                onSubmitEditing={onSubmit}
                returnKeyType="send"
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>
            <Button className="w-full" onPress={onSubmit}>
              <Text>비밀번호 재설정</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
