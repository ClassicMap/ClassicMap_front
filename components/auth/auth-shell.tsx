import { Icon } from '@/components/ui/icon';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

interface AuthShellProps {
  children: React.ReactNode;
  /** 닫기(뒤로). 없으면 버튼을 그리지 않는다 */
  onClose?: () => void;
}

/**
 * 로그인·회원가입·비밀번호 화면의 틀.
 * 400px 폼 하나만 둔다. 데스크톱은 화면 가운데에, 모바일은 위에서부터 그린다.
 */
export function AuthShell({ children, onClose }: AuthShellProps) {
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';

  const form = (
    <View className="w-full max-w-[400px]">
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          className={cn('mb-4 size-11 items-center justify-center rounded-full', wide ? 'self-end bg-surface-2' : '-ml-2.5')}>
          <Icon as={XIcon} size={20} className="text-foreground" />
        </Pressable>
      ) : null}
      <BrandLogo size={40} className="mb-5" />
      {children}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerClassName={wide ? 'min-h-full items-center justify-center px-12 py-12' : 'px-6 pb-10 pt-4 mt-safe'}>
      {form}
    </ScrollView>
  );
}

/** 인증 폼 입력칸·주 버튼 크기. 엄지로 누르기 편하게 48px */
export const AUTH_INPUT_CLASS = 'h-12 rounded-lg px-3.5 sm:h-12 md:text-body';
export const AUTH_BUTTON_CLASS = 'h-12 w-full rounded-full sm:h-12';

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <View className="mb-6">
      <Text className="text-[28px] font-bold leading-9 tracking-tight text-foreground">{title}</Text>
      {description ? (
        <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text variant="caption" className="text-foreground-subtle">
        {label}
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" className="text-caption text-destructive">
      {message}
    </Text>
  );
}
