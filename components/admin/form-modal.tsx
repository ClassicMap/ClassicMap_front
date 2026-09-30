import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ModalProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 저장을 눌렀는데 검증에 걸렸을 때 푸터에 띄우는 안내 */
export const FORM_INVALID_MESSAGE = '표시된 항목을 채우거나 고친 뒤 다시 저장해 주세요.';

/** 모바일 시트: iOS는 페이지 시트, 안드로이드는 시스템 바 아래까지 그리고 여백은 인셋으로 준다. */
const SHEET_PROPS: Partial<ModalProps> =
  Platform.select<Partial<ModalProps>>({
    ios: { presentationStyle: 'pageSheet' },
    android: { statusBarTranslucent: true, navigationBarTranslucent: true },
  }) ?? {};

/** 오버레이에만 그림자를 허용한다 (설계 문서 4.5) */
const PANEL_SHADOW: ViewStyle = { boxShadow: '-12px 0 32px -8px rgba(0, 0, 0, 0.28)' };

export interface FormModalProps {
  visible: boolean;
  title: string;
  /** 제목 아래 한 줄. 수정 중인 항목의 이름 등 */
  subtitle?: string;
  onClose: () => void;
  onSubmit: () => void;
  /** 저장 요청 중. 저장 버튼이 "저장 중…"으로 바뀌고 푸터 버튼이 잠긴다 */
  submitting?: boolean;
  /** 저장이 아닌 작업(삭제 등)이 진행 중일 때 푸터 버튼만 잠근다 */
  busy?: boolean;
  submitLabel?: string;
  /** 폼 전체에 대한 오류 안내. 푸터에 띄워 스크롤 위치와 상관없이 보이게 한다 */
  error?: string;
  children: React.ReactNode;
}

/**
 * 관리자 폼 공통 셸 (설계 문서 7.10).
 * 데스크톱 웹은 오른쪽 슬라이드오버(폭 480)로 띄워 뒤의 목록을 보면서 고칠 수 있게 하고,
 * 그 밖에는 전체 화면 시트로 띄운다. Escape·뒤로 가기는 onRequestClose로 닫는다.
 */
export function FormModal({
  visible,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitting = false,
  busy = false,
  submitLabel = '저장',
  error,
  children,
}: FormModalProps) {
  const { nav } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const titleId = React.useId();
  const panel = nav !== 'tabs';
  const locked = submitting || busy;
  // iOS 페이지 시트는 상태 표시줄 아래에서 시작하므로 위쪽 인셋을 더하지 않는다
  const sheetTop = Platform.OS === 'ios' ? 0 : insets.top;

  const header = (
    <View
      className={cn(
        'flex-row items-center gap-3 border-b border-border',
        panel ? 'min-h-14 py-3 pl-6 pr-3' : 'pb-3 pl-4 pr-2'
      )}
      style={panel ? undefined : { paddingTop: sheetTop + 14 }}>
      <View className="min-w-0 flex-1">
        <Text
          nativeID={titleId}
          role="heading"
          variant={panel ? 'headline' : 'title3'}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Button
        variant="ghost"
        size="icon"
        onPress={onClose}
        accessibilityLabel="닫기"
        className="rounded-full">
        <Icon as={XIcon} size={18} className="text-foreground-muted" />
      </Button>
    </View>
  );

  const body = (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('gap-8', panel ? 'px-6 py-6' : 'px-4 pb-8 pt-5')}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
      automaticallyAdjustKeyboardInsets>
      {children}
    </ScrollView>
  );

  const buttonSize = panel ? 'default' : 'lg';
  const buttonWidth = panel ? 'min-w-[80px]' : 'flex-1';
  const buttons = (
    <>
      <Button
        variant="outline"
        size={buttonSize}
        onPress={onClose}
        disabled={locked}
        className={buttonWidth}>
        <Text>취소</Text>
      </Button>
      <Button
        size={buttonSize}
        onPress={onSubmit}
        disabled={locked}
        accessibilityState={{ busy: submitting, disabled: locked }}
        className={buttonWidth}>
        <Text>{submitting ? '저장 중…' : submitLabel}</Text>
      </Button>
    </>
  );
  const errorText = error ? (
    <Text variant="caption" role="alert" className="text-destructive">
      {error}
    </Text>
  ) : null;

  if (panel) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        aria-labelledby={titleId}>
        <View className="flex-1">
          {/* 패널을 스크림보다 먼저 두어 초점이 패널 안에서 시작하게 하고, 겹침은 z-10으로 올린다 */}
          <View
            className="absolute bottom-0 right-0 top-0 z-10 w-[480px] max-w-[100vw] border-l border-border bg-surface-1 animate-in slide-in-from-right duration-base ease-emphasized motion-reduce:animate-none"
            style={PANEL_SHADOW}>
            {header}
            {body}
            <View className="flex-row items-center gap-2 border-t border-border px-6 py-3">
              <View className="min-w-0 flex-1">{errorText}</View>
              {buttons}
            </View>
          </View>
          <Pressable
            accessibilityLabel="패널 닫기"
            onPress={onClose}
            className="absolute inset-0 bg-black/30"
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      aria-labelledby={titleId}
      {...SHEET_PROPS}>
      <View className="flex-1 bg-background">
        {header}
        {body}
        <View
          className="gap-2.5 border-t border-border px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}>
          {errorText}
          <View className="flex-row gap-2">{buttons}</View>
        </View>
      </View>
    </Modal>
  );
}
