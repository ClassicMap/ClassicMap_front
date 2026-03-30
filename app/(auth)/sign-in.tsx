import { SignInForm } from '@/components/sign-in-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ChevronLeftIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

export default function SignInScreen() {
  const router = useRouter();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe ios:mt-0"
      keyboardDismissMode="interactive">
      <View className="w-full max-w-sm">
        <View className="mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-full"
            onPress={() => router.back()}>
            <Icon as={ChevronLeftIcon} className="size-6" />
          </Button>
        </View>
        <SignInForm />
      </View>
    </ScrollView>
  );
}
