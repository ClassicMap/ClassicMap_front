import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as React from 'react';
import { TextInput, View } from 'react-native';

export function SignUpForm() {
  const { signUp, isLoaded } = useSignUp();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const firstNameInputRef = React.useRef<TextInput>(null);
  const lastNameInputRef = React.useRef<TextInput>(null);
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [error, setError] = React.useState<{ firstName?: string; lastName?: string; email?: string; password?: string }>({});

  async function onSubmit() {
    if (!isLoaded) return;

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      router.push(`/(auth)/sign-up/verify-email?email=${email}`);
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) {
        const isEmailMessage =
          err.message.toLowerCase().includes('identifier') ||
          err.message.toLowerCase().includes('email');
        const isPasswordMessage = err.message.toLowerCase().includes('password');
        const isFirstNameMessage = err.message.toLowerCase().includes('first');
        const isLastNameMessage = err.message.toLowerCase().includes('last');
        
        if (isFirstNameMessage) {
          setError({ firstName: err.message });
        } else if (isLastNameMessage) {
          setError({ lastName: err.message });
        } else if (isEmailMessage) {
          setError({ email: err.message });
        } else if (isPasswordMessage) {
          setError({ password: err.message });
        }
        return;
      }
      console.error(JSON.stringify(err, null, 2));
    }
  }

  function onFirstNameSubmitEditing() {
    lastNameInputRef.current?.focus();
  }

  function onLastNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  return (
    <View className="gap-6">
      <View className="mb-4 gap-2">
        <Text className="text-center text-4xl font-bold">🎵</Text>
        <Text className="text-center text-3xl font-bold">클래식 여정을 시작하세요</Text>
        <Text className="text-center text-base text-muted-foreground">
          발견부터 공연 관람까지, 함께 합니다
        </Text>
      </View>
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">회원가입</CardTitle>
          <CardDescription className="text-center sm:text-left">
            몇 가지 정보만 입력하면 바로 시작할 수 있어요
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="firstName">이름</Label>
              <Input
                id="firstName"
                placeholder="길동"
                autoComplete="name-given"
                autoCapitalize="words"
                onChangeText={setFirstName}
                onSubmitEditing={onFirstNameSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
              {error.firstName ? (
                <Text className="text-sm font-medium text-destructive">{error.firstName}</Text>
              ) : null}
            </View>
            <View className="gap-1.5">
              <Label htmlFor="lastName">성</Label>
              <Input
                ref={lastNameInputRef}
                id="lastName"
                placeholder="김"
                autoComplete="name-family"
                autoCapitalize="words"
                onChangeText={setLastName}
                onSubmitEditing={onLastNameSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
              {error.lastName ? (
                <Text className="text-sm font-medium text-destructive">{error.lastName}</Text>
              ) : null}
            </View>
            <View className="gap-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="your@email.com"
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
              <View className="flex-row items-center">
                <Label htmlFor="password">비밀번호</Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                onChangeText={setPassword}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error.password ? (
                <Text className="text-sm font-medium text-destructive">{error.password}</Text>
              ) : null}
            </View>
            <Button className="w-full" onPress={onSubmit}>
              <Text>시작하기</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            이미 계정이 있으신가요?{' '}
            <Link href="/(auth)/sign-in" dismissTo className="text-sm underline underline-offset-4">
              로그인
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
