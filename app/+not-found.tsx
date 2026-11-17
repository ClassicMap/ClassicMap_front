import { EmptyState } from '@/components/ui/empty-state';
import { t, useLocale } from '@/lib/i18n';
import { Stack } from 'expo-router';
import { CompassIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { go } from '@/lib/navigation/go';

export default function NotFoundScreen() {
  useLocale();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <EmptyState
          icon={CompassIcon}
          title={t('찾는 화면이 없어요')}
          description={t('주소가 바뀌었거나 없어진 화면이에요.')}
          action={{ label: t('홈으로'), onPress: () => go('/home', { web: 'replace' }) }}
        />
      </View>
    </>
  );
}
