import { useLocale } from '@/lib/i18n';
import { Stack } from 'expo-router';

const SCREEN_OPTIONS = {
  headerShown: false,
};
export default function SignUpLayout() {
  useLocale();
  return <Stack screenOptions={SCREEN_OPTIONS} />;
}
