import { FieldMessage, SubPage } from '@/features/account/components/sub-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { MyPageAPI } from '@/lib/api/client';
import { clearAllData } from '@/lib/api/mock-db';
import { t, useLocale } from '@/lib/i18n';
import { Alert } from '@/lib/utils/alert';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useAuth as useAppAuth } from '@/lib/hooks/useAuth';
import { type Href, Redirect, useRouter } from 'expo-router';
import * as React from 'react';
import { Linking, View } from 'react-native';

const SUPPORT_EMAIL = 'kang3171611@naver.com';

/** 되돌릴 수 없는 삭제를 확인하려고 직접 입력하게 하는 낱말. 언어마다 다르다 */
function confirmWord(): string {
  return t('입력어::삭제');
}

function isUnsupported(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { message?: string; code?: string; errors?: { code?: string }[] };
  return (
    value.message === 'delete_method_not_available' ||
    value.code === 'method_not_supported' ||
    value.errors?.[0]?.code === 'not_allowed'
  );
}

/**
 * 계정 삭제. 되돌릴 수 없으니 "삭제"를 직접 입력해야 버튼이 켜진다.
 * 앱에서 지울 수 없는 계정이면 메일로 요청하는 길을 안내한다.
 */
export default function DeleteAccountScreen() {
  useLocale();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [typed, setTyped] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const email = user?.emailAddresses[0]?.emailAddress ?? '';
  const { isSignedIn, loading } = useAppAuth();

  const openMail = () => {
    const subject = t('ClassicMap 계정 삭제 요청');
    const body = t('계정 삭제를 요청합니다.\n\n이메일: {email}\n삭제 사유: ', { email });
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    ).catch(() => setError(t('메일 앱을 열지 못했어요. {email}로 직접 보내 주세요.', { email: SUPPORT_EMAIL })));
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    // 서버 데이터를 먼저 지우고 로그인 계정을 지운다. 로그인 계정을 먼저 지우면 서버에 지울 권한이 없다
    let dataDeleted = false;
    try {
      if (!user?.delete) throw new Error('delete_method_not_available');
      await MyPageAPI.deleteMyData();
      dataDeleted = true;
      await user.delete();
    } catch (err) {
      if (dataDeleted) {
        setError(t('기록은 지웠지만 로그인 계정을 지우지 못했어요. 잠시 뒤 다시 시도하거나 메일로 요청해 주세요.'));
      } else if (isUnsupported(err)) {
        setError(t('이 계정은 앱에서 바로 지울 수 없어요. 아래 버튼으로 {email}에 삭제를 요청해 주세요.', { email: SUPPORT_EMAIL }));
      } else {
        setError(t('계정을 지우지 못했어요. 잠시 뒤 다시 시도하거나 메일로 요청해 주세요.'));
      }
      setDeleting(false);
      return;
    }
    // 계정은 이미 지워졌다. 뒷정리가 실패해도 "지우지 못했어요"를 띄우지 않는다
    try {
      await clearAllData();
      await signOut();
    } catch {
      // 로컬 정리에 실패해도 계정 삭제 결과는 그대로다
    }
    setDeleting(false);
    router.replace('/home' as Href);
  };

  const confirmRemove = () =>
    Alert.alert(t('계정을 삭제할까요?'), t('평가와 레퍼토리가 모두 지워지고 되돌릴 수 없어요.'), [
      { text: t('취소'), style: 'cancel' },
      { text: t('삭제'), style: 'destructive', onPress: () => void remove() },
    ]);

  if (!loading && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SubPage title={t('계정 삭제')} description={t('계정을 지우면 별점, 레퍼토리, 공개 프로필이 모두 사라지고 되돌릴 수 없어요.')}>
      <View className="gap-4">
        <View className="gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <Text className="text-body-sm font-semibold text-destructive">{t('지워지는 것')}</Text>
          <Text variant="bodySm" className="text-foreground-muted">
            {t('로그인 계정({email}), 남긴 별점, 레퍼토리, 공개 프로필 설정, 취향 답과 들은 기록', {
              email: email || t('이메일'),
            })}
          </Text>
        </View>
        <View className="gap-1.5">
          <Label nativeID="confirmWord">{t('확인을 위해 "{word}"를 입력해 주세요', { word: confirmWord() })}</Label>
          <Input aria-labelledby="confirmWord" value={typed} onChangeText={setTyped} editable={!deleting} autoCapitalize="none" />
        </View>
        <FieldMessage error={error} />
        <View className="flex-row flex-wrap gap-2">
          <Button
            variant="destructive"
            className="rounded-full px-6"
            disabled={typed.trim().toLowerCase() !== confirmWord().toLowerCase() || deleting}
            onPress={confirmRemove}>
            <Text>{deleting ? t('삭제 중…') : t('계정 삭제')}</Text>
          </Button>
          <Button variant="outline" className="rounded-full" onPress={openMail}>
            <Text>{t('메일로 삭제 요청')}</Text>
          </Button>
        </View>
      </View>
    </SubPage>
  );
}
