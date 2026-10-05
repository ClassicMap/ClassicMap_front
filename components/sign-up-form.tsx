import { AUTH_BUTTON_CLASS, AUTH_INPUT_CLASS, AuthDivider, AuthHeading, FieldError } from '@/components/auth/auth-shell';
import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as React from 'react';
import { Platform, TextInput, View } from 'react-native';

type SignUpErrors = { firstName?: string; lastName?: string; email?: string; password?: string; form?: string };

/** 입력칸에 붙일 수 없는 오류(보안 확인·네트워크 등)도 사용자가 다음에 할 일을 알 수 있게 한다 */
const SIGN_UP_FALLBACK_ERROR = '가입을 마치지 못했어요. 잠시 뒤 다시 시도하거나 다른 브라우저에서 가입해 주세요.';

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
  const [error, setError] = React.useState<SignUpErrors>({});

  async function onSubmit() {
    if (!isLoaded) return;

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      router.push(`/(auth)/sign-up/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      if (err?.errors && Array.isArray(err.errors)) {
        const newErrors: SignUpErrors = {};

        err.errors.forEach((error: any) => {
          const field = error.meta?.paramName || '';
          const message = error.message || error.longMessage || '';

          if (message.toLowerCase().includes('data breach')) {
            return;
          }

          const translatedMessage = translateClerkError(message);

          if (field === 'first_name') {
            newErrors.firstName = translatedMessage;
          } else if (field === 'last_name') {
            newErrors.lastName = translatedMessage;
          } else if (field === 'email_address') {
            newErrors.email = translatedMessage;
          } else if (field === 'password') {
            newErrors.password = translatedMessage;
          } else {
            newErrors.form ??= translatedMessage;
          }
        });

        setError(Object.keys(newErrors).length > 0 ? newErrors : { form: SIGN_UP_FALLBACK_ERROR });
        return;
      }

      if (err instanceof Error) {
        const message = err.message;
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('data breach')) {
          return;
        }

        const translatedMessage = translateClerkError(message);
        const isEmailMessage = lowerMessage.includes('identifier') || lowerMessage.includes('email');
        const isPasswordMessage = lowerMessage.includes('password');
        const isFirstNameMessage = lowerMessage.includes('first');
        const isLastNameMessage = lowerMessage.includes('last');

        if (isFirstNameMessage) {
          setError({ firstName: translatedMessage });
        } else if (isLastNameMessage) {
          setError({ lastName: translatedMessage });
        } else if (isEmailMessage) {
          setError({ email: translatedMessage });
        } else if (isPasswordMessage) {
          setError({ password: translatedMessage });
        } else {
          setError({ form: translatedMessage });
        }
        return;
      }
      setError({ form: SIGN_UP_FALLBACK_ERROR });
    }
  }


  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  // 한국어 이름 순서: 성 → 이름 → 이메일 → 비밀번호
  function onLastNameSubmitEditing() {
    firstNameInputRef.current?.focus();
  }

  function onFirstNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  return (
    <View>
      <AuthHeading title="회원가입" description="레퍼토리와 별점을 남기려면 계정이 필요해요." />
      <SocialConnections />
      <AuthDivider label="또는 이메일로" />
      <View className="gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label htmlFor="lastName">성</Label>
            <Input
              ref={lastNameInputRef}
              id="lastName"
              placeholder="성"
              autoComplete="name-family"
              autoCapitalize="words"
              aria-invalid={Boolean(error.lastName)}
              className={AUTH_INPUT_CLASS}
              onChangeText={setLastName}
              onSubmitEditing={onLastNameSubmitEditing}
              returnKeyType="next"
              submitBehavior="submit"
            />
            <FieldError message={error.lastName} />
          </View>
          <View className="flex-1 gap-1.5">
            <Label htmlFor="firstName">이름</Label>
            <Input
              ref={firstNameInputRef}
              id="firstName"
              placeholder="이름"
              autoComplete="name-given"
              autoCapitalize="words"
              aria-invalid={Boolean(error.firstName)}
              className={AUTH_INPUT_CLASS}
              onChangeText={setFirstName}
              onSubmitEditing={onFirstNameSubmitEditing}
              returnKeyType="next"
              submitBehavior="submit"
            />
            <FieldError message={error.firstName} />
          </View>
        </View>
        <View className="gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            ref={emailInputRef}
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
          <Label htmlFor="password">비밀번호</Label>
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
        {/* 웹 봇 방지(Clerk CAPTCHA)가 필요할 때 여기에 그린다. 없으면 보이지 않는 방식으로만 시도한다 */}
        {Platform.OS === 'web' ? <View nativeID="clerk-captcha" /> : null}
        <FieldError message={error.form} />
        <Button className={AUTH_BUTTON_CLASS} onPress={onSubmit}>
          <Text className="font-bold">가입하고 인증 메일 받기</Text>
        </Button>
      </View>
      <Text variant="bodySm" className="mt-5 text-center text-foreground-muted">
        이미 계정이 있어요?{' '}
        <Link href="/(auth)/sign-in" dismissTo className="font-semibold text-foreground">
          로그인
        </Link>
      </Text>
    </View>
  );
}
