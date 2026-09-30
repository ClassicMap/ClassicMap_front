import { FieldMessage, SubPage } from '@/components/account/sub-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { View } from 'react-native';

function clerkMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const list = (error as { errors?: { message?: string }[] }).errors;
    if (list?.[0]?.message) return translateClerkError(list[0].message);
  }
  return '이름을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}

/** 계정 이름(로그인 계정의 성·이름). 공개 프로필의 표시 이름은 설정 > 프로필에서 바꾼다 */
export default function EditProfileScreen() {
  const { user } = useUser();
  const [lastName, setLastName] = React.useState(user?.lastName || '');
  const [firstName, setFirstName] = React.useState(user?.firstName || '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('성과 이름을 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await user?.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setSaved(true);
    } catch (err) {
      setError(clerkMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubPage
      title="계정 이름"
      description="로그인 계정에 쓰는 이름이에요. 공개 프로필에 보이는 이름은 설정 > 프로필에서 따로 바꿔요.">
      <View className="gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label nativeID="lastName">성</Label>
            <Input aria-labelledby="lastName" value={lastName} onChangeText={setLastName} editable={!saving} />
          </View>
          <View className="flex-1 gap-1.5">
            <Label nativeID="firstName">이름</Label>
            <Input aria-labelledby="firstName" value={firstName} onChangeText={setFirstName} editable={!saving} />
          </View>
        </View>
        <FieldMessage error={error} success={saved ? '이름을 바꿨어요.' : null} />
        <Button className="self-start rounded-full px-6" onPress={save} disabled={saving}>
          <Text>{saving ? '저장 중…' : '저장'}</Text>
        </Button>
        <Text variant="caption" className="mt-2 text-foreground-subtle">
          이메일 주소는 계정 보안 때문에 바꿀 수 없어요.
        </Text>
      </View>
    </SubPage>
  );
}
