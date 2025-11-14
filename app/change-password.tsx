import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useUser } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon, LockIcon, ShieldCheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useUser();

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // 비밀번호 업데이트 함수
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('오류', '모든 비밀번호 필드를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('오류', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await user?.updatePassword({
        currentPassword,
        newPassword,
      });
      Alert.alert('성공', '비밀번호가 성공적으로 변경되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      console.error('Password update error:', JSON.stringify(err, null, 2));
      Alert.alert('오류', err?.errors?.[0]?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '비밀번호 변경',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="icon"
              onPress={handleCancel}
              className="ml-2"
            >
              <Icon as={ChevronLeftIcon} className="size-6" />
            </Button>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-background">
        <View className="gap-6 p-6">
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={LockIcon} className="size-5 text-foreground" />
                <CardTitle>새 비밀번호 설정</CardTitle>
              </View>
              <CardDescription>
                계정 보안을 위해 안전한 비밀번호를 설정해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label nativeID="currentPassword">현재 비밀번호</Label>
                <Input
                  placeholder="현재 비밀번호를 입력하세요"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  aria-labelledby="currentPassword"
                  editable={!isUpdatingPassword}
                  autoCapitalize="none"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="newPassword">새 비밀번호</Label>
                <Input
                  placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  aria-labelledby="newPassword"
                  editable={!isUpdatingPassword}
                  autoCapitalize="none"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="confirmPassword">새 비밀번호 확인</Label>
                <Input
                  placeholder="새 비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  aria-labelledby="confirmPassword"
                  editable={!isUpdatingPassword}
                  autoCapitalize="none"
                />
              </View>
              <View className="mt-4 gap-3">
                <Button
                  onPress={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                >
                  <Text>{isUpdatingPassword ? '변경 중...' : '비밀번호 변경'}</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={handleCancel}
                  disabled={isUpdatingPassword}
                >
                  <Text>취소</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={ShieldCheckIcon} className="size-5 text-foreground" />
                <CardTitle>안전한 비밀번호 가이드</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground leading-6">
                • 최소 8자 이상 사용{'\n'}
                • 영문 대소문자, 숫자, 특수문자를 조합{'\n'}
                • 다른 사이트와 동일한 비밀번호 사용 금지{'\n'}
                • 생일, 전화번호 등 개인정보 사용 금지{'\n'}
                • 정기적으로 비밀번호 변경 권장
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
