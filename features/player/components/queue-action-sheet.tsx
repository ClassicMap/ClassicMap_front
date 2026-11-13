import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import {
  addToQueue,
  queueActionSheet,
  type QueueActionRequest,
  useQueueActionRequest,
} from '@/features/player/lib/queue-actions';
import { t, useLocale } from '@/lib/i18n';
import {
  AlertCircleIcon,
  CheckIcon,
  EyeOffIcon,
  ListEndIcon,
  ListStartIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 터치 화면의 대기열 동작 시트. 루트에 하나만 둔다.
 * 카드·목록 줄을 길게 누르거나 ⋯ 를 누르면 아래에서 올라와 「다음에 재생」·「대기열에 추가」를 고른다
 */
export function QueueActionSheet() {
  useLocale();
  const insets = useSafeAreaInsets();
  const request = useQueueActionRequest();
  // 닫히는 동안에도 내용이 남아 있게 마지막 것을 쥐고 있는다
  const last = React.useRef<QueueActionRequest | null>(null);
  if (request) last.current = request;
  const shown = request ?? last.current;
  // 고르면 결과를 잠깐 보여 주고 닫는다(앱에는 대기열 단추가 튀는 것 같은 다른 신호가 없다)
  const [result, setResult] = React.useState<{ ok: boolean; label: string } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (request) setResult(null);
  }, [request]);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const add = (where: 'next' | 'last') => () => {
    if (!shown || result) return;
    const target = shown;
    void addToQueue(target, where).then((ok) => {
      setResult({
        ok,
        label: !ok
          ? t('틀 수 있는 연주가 없어서 넣지 못했어요')
          : where === 'next'
            ? t('다음에 재생할게요')
            : t('대기열에 넣었어요'),
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => queueActionSheet.close(), ok ? 700 : 1400);
    });
  };
  const dismiss = shown?.onDismiss;
  return (
    <Sheet open={request !== null} onOpenChange={(open) => !open && queueActionSheet.close()}>
      <SheetContent
        side="bottom"
        aria-label={shown ? t('{title} 대기열에 넣기', { title: shown.title }) : undefined}
        closeLabel={t('닫기')}
        style={{ paddingBottom: insets.bottom + 8 }}>
        {shown ? (
          <>
            <View className="border-b border-border px-5 pb-3 pt-4">
              <Text numberOfLines={1} className="text-body font-bold text-foreground">
                {shown.title}
              </Text>
              {shown.subtitle ? (
                <Text variant="caption" numberOfLines={1} className="mt-0.5">
                  {shown.subtitle}
                </Text>
              ) : null}
            </View>
            <View className="px-2 pt-2">
              {result ? (
                <View className="h-[104px] flex-row items-center justify-center gap-2.5 px-3">
                  <Icon
                    as={result.ok ? CheckIcon : AlertCircleIcon}
                    size={19}
                    className={result.ok ? 'text-primary' : 'text-foreground-muted'}
                  />
                  <Text className="text-body font-semibold text-foreground">{result.label}</Text>
                </View>
              ) : (
                <>
                  <SheetRow
                    icon={ListStartIcon}
                    label={t('menu::다음에 재생')}
                    onPress={add('next')}
                  />
                  <SheetRow icon={ListEndIcon} label={t('대기열에 추가')} onPress={add('last')} />
                </>
              )}
              {dismiss && !result ? (
                <SheetRow
                  icon={EyeOffIcon}
                  label={t('관심 없음')}
                  onPress={() => {
                    queueActionSheet.close();
                    dismiss();
                  }}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SheetRow({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-[52px] flex-row items-center gap-3.5 rounded-lg px-3 active:bg-surface-2 web:hover:bg-surface-2">
      <Icon as={icon} size={19} className="text-foreground-muted" />
      <Text numberOfLines={1} className="flex-1 text-body text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
