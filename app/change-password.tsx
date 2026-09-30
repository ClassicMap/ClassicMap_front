import { FieldMessage, SubPage } from '@/components/account/sub-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { translateClerkError } from '@/lib/clerk/error-translator';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { View } from 'react-native';

const MIN_LENGTH = 8;

function clerkMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const list = (error as { errors?: { message?: string }[] }).errors;
    if (list?.[0]?.message) return translateClerkError(list[0].message);
  }
  return '비밀번호를 바꾸지 못했어요. 현재 비밀번호를 확인한 뒤 다시 시도해 주세요.';
}

export default function ChangePasswordScreen() {
  const { user } = useUser();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const save = async () => {
    if (!current || !next || !confirm) {
      setError('세 칸을 모두 입력해 주세요.');
      return;
    }
    if (next.length < MIN_LENGTH) {
      setError(`새 비밀번호는 ${MIN_LENGTH}자 이상으로 정해 주세요.`);
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호 두 칸이 달라요. 다시 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await user?.updatePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setSaved(true);
    } catch (err) {
      setError(clerkMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubPage title="비밀번호 변경" description="이메일로 가입한 계정의 비밀번호를 바꿔요.">
      <View className="gap-4">
        <View className="gap-1.5">
          <Label nativeID="current">현재 비밀번호</Label>
          <Input aria-labelledby="current" secureTextEntry autoComplete="current-password" value={current} onChangeText={setCurrent} editable={!saving} />
        </View>
        <View className="gap-1.5">
          <Label nativeID="next">새 비밀번호</Label>
          <Input
            aria-labelledby="next"
            secureTextEntry
            autoComplete="new-password"
            placeholder={`${MIN_LENGTH}자 이상`}
            value={next}
            onChangeText={setNext}
            editable={!saving}
          />
        </View>
        <View className="gap-1.5">
          <Label nativeID="confirm">새 비밀번호 확인</Label>
          <Input aria-labelledby="confirm" secureTextEntry autoComplete="new-password" value={confirm} onChangeText={setConfirm} editable={!saving} />
        </View>
        <FieldMessage error={error} success={saved ? '비밀번호를 바꿨어요.' : null} />
        <Button className="self-start rounded-full px-6" onPress={save} disabled={saving}>
          <Text>{saving ? '바꾸는 중…' : '비밀번호 바꾸기'}</Text>
        </Button>
      </View>
    </SubPage>
  );
}
