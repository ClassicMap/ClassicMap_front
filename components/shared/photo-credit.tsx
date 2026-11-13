import { Text } from '@/components/ui/text';
import type { ImageCredit } from '@/types/models';
import { t, useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';

/**
 * 사진 출처 한 줄. 위키미디어 사진은 저작자 표시가 라이선스 조건이라 작가·라이선스를 밝히고,
 * 보도용 사진은 출처 이름을, 애플뮤직 사진은 그 이름을 쓴다. 누르면 출처 페이지가 열린다
 */
export function PhotoCredit({
  imageUrl,
  credit,
  centered,
}: {
  imageUrl?: string;
  credit?: ImageCredit | null;
  centered: boolean;
}) {
  useLocale();
  const label = credit
    ? credit.author && credit.license
      ? `${credit.author} · ${credit.license}`
      : (credit.creditLine ?? credit.author ?? null)
    : imageUrl && /(^|\.)mzstatic\.com\//.test(imageUrl.replace(/^https?:\/\//, ''))
      ? 'Apple Music'
      : null;
  if (!label) return null;
  const text = (
    <Text variant="micro" numberOfLines={1} className="text-foreground-subtle">
      {t('사진: {label}', { label })}
    </Text>
  );
  return credit ? (
    <Pressable
      onPress={() => void Linking.openURL(credit.sourceUrl).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel={t('사진 출처: {label}', { label })}
      className={cn(
        'mt-4 max-w-full web:hover:opacity-80',
        centered ? 'self-center' : 'self-start'
      )}>
      {text}
    </Pressable>
  ) : (
    <View className={cn('mt-4 max-w-full', centered ? 'self-center' : 'self-start')}>{text}</View>
  );
}
