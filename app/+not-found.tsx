import { EmptyState } from '@/components/ui/empty-state';
import { t } from '@/lib/i18n';
import { type Href, Stack, useRouter } from 'expo-router';
import { CompassIcon } from 'lucide-react-native';
import { View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <EmptyState
          icon={CompassIcon}
          title={t('찾는 화면이 없어요')}
          description={t('주소가 바뀌었거나 없어진 화면이에요.')}
          action={{ label: t('홈으로'), onPress: () => router.replace('/home' as Href) }}
        />
      </View>
    </>
  );
}
