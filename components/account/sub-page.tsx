import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { type Href, useRouter } from 'expo-router';
import { ArrowLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

interface SubPageProps {
  title: string;
  description?: string;
  /** 뒤로 갈 곳이 없을 때(새로고침 등) 갈 곳 */
  fallbackHref?: string;
  children: React.ReactNode;
}

/** 설정 아래 화면(이름·비밀번호·계정 삭제·도움말·약관)의 틀. 한 줄기 640px */
export function SubPage({ title, description, fallbackHref = '/settings', children }: SubPageProps) {
  const router = useRouter();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';

  return (
    <ScrollView
      className="flex-1 bg-background web:bg-surface-1"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={cn('pb-24', wide ? 'px-7 pt-3' : 'px-4')}>
      <View className="w-full max-w-[640px]">
        {!wide ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref as Href))}
            accessibilityLabel="뒤로"
            className="mt-12 size-11 items-center justify-center rounded-full bg-surface-2">
            <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
          </Pressable>
        ) : null}
        <Text variant={wide ? 'title1' : 'title2'} className="mt-4">
          {title}
        </Text>
        {description ? (
          <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
            {description}
          </Text>
        ) : null}
        <View className="mt-7">{children}</View>
      </View>
    </ScrollView>
  );
}

export function FieldMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) {
    return (
      <Text accessibilityRole="alert" className="text-caption text-destructive">
        {error}
      </Text>
    );
  }
  if (success) {
    return <Text className="text-caption text-success">{success}</Text>;
  }
  return null;
}
