import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useUser } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon, UserIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUser();

  // 이름 변경 상태
  const [firstName, setFirstName] = React.useState(user?.firstName || '');
  const [lastName, setLastName] = React.useState(user?.lastName || '');
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);

  // 이름 업데이트 함수
  const handleUpdateName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('오류', '이름과 성을 모두 입력해주세요.');
      return;
    }

    setIsUpdatingName(true);
    try {
      await user?.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      Alert.alert('성공', '이름이 성공적으로 변경되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      console.error('Name update error:', JSON.stringify(err, null, 2));
      Alert.alert('오류', err?.errors?.[0]?.message || '이름 변경에 실패했습니다.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '프로필 수정',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => router.back()}
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
                <Icon as={UserIcon} className="size-5 text-foreground" />
                <CardTitle>이름 변경</CardTitle>
              </View>
              <CardDescription>
                회원님의 이름을 수정할 수 있습니다. 변경된 이름은 프로필에 즉시 반영됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label nativeID="firstName">이름 (First Name)</Label>
                <Input
                  placeholder="이름을 입력하세요"
                  value={firstName}
                  onChangeText={setFirstName}
                  aria-labelledby="firstName"
                  editable={!isUpdatingName}
                />
              </View>
              <View className="gap-2">
                <Label nativeID="lastName">성 (Last Name)</Label>
                <Input
                  placeholder="성을 입력하세요"
                  value={lastName}
                  onChangeText={setLastName}
                  aria-labelledby="lastName"
                  editable={!isUpdatingName}
                />
              </View>
              <View className="mt-4 gap-3">
                <Button
                  onPress={handleUpdateName}
                  disabled={isUpdatingName}
                >
                  <Text>{isUpdatingName ? '업데이트 중...' : '저장'}</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => router.back()}
                  disabled={isUpdatingName}
                >
                  <Text>취소</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>참고사항</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground leading-6">
                • 이름은 언제든지 변경할 수 있습니다.{'\n'}
                • 변경된 이름은 프로필과 댓글 등 모든 곳에 표시됩니다.{'\n'}
                • 이메일 주소는 계정 보안상 변경할 수 없습니다.
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
