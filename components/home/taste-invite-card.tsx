import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

interface TasteInviteCardProps {
  onStart: () => void;
  onDismiss: () => Promise<void>;
}

/** 취향을 아직 안 알려 준 사람에게 홈 위에서 권한다. 가입한 사람은 처음 한 번 전체 화면으로도 연다 */
export function TasteInviteCard({ onStart, onDismiss }: TasteInviteCardProps) {
  const [busy, setBusy] = React.useState(false);
  const dismiss = async () => {
    setBusy(true);
    try {
      await onDismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="rounded-xl border border-border bg-surface-2 p-4 web:p-5">
      <Text variant="headline">취향을 알려 주면 홈이 달라져요</Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        질문 네 개, 30초면 끝나요. 고른 답에 맞춰 오늘의 비교와 추천 셸프를 골라 드려요.
      </Text>
      <View className="mt-4 flex-row items-center gap-2">
        <Button size="sm" disabled={busy} onPress={onStart}>
          <Text>취향 알려 주기</Text>
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onPress={dismiss}>
          <Text className="text-foreground-muted">괜찮아요</Text>
        </Button>
      </View>
    </View>
  );
}
