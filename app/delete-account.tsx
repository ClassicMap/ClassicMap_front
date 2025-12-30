import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { clearAllData } from '@/lib/api/mock-db';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon, AlertTriangleIcon, TrashIcon, XCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, ScrollView, View, Linking } from 'react-native';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  const [password, setPassword] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteAccount = async () => {
    if (!password) {
      Alert.alert('오류', '비밀번호를 입력해주세요.');
      return;
    }

    // 최종 확인 다이얼로그
    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Clerk user.delete() 시도
              if (user?.delete) {
                await user.delete();

                // 로컬 데이터 삭제
                await clearAllData();

                // 로그아웃 및 로그인 화면으로 이동
                await signOut();
                router.replace('/(auth)/sign-in');

                Alert.alert('성공', '계정이 삭제되었습니다.');
              } else {
                // user.delete() 메서드가 없는 경우
                throw new Error('delete_method_not_available');
              }
            } catch (error: any) {
              console.error('Account deletion error:', error);

              // Clerk에서 계정 삭제를 지원하지 않는 경우 이메일 문의 안내
              if (error?.message === 'delete_method_not_available' ||
                  error?.code === 'method_not_supported' ||
                  error?.errors?.[0]?.code === 'not_allowed') {
                Alert.alert(
                  '계정 삭제 요청',
                  '계정 삭제를 원하시면 kang3171611@naver.com으로 아래 정보를 포함하여 문의해주세요.\n\n• 이메일: ' + user?.emailAddresses[0]?.emailAddress + '\n• 삭제 사유',
                  [
                    {
                      text: '확인',
                      style: 'default',
                    },
                    {
                      text: '이메일 보내기',
                      onPress: () => {
                        const email = 'kang3171611@naver.com';
                        const subject = 'ClassicMap 계정 삭제 요청';
                        const body = `계정 삭제를 요청합니다.\n\n이메일: ${user?.emailAddresses[0]?.emailAddress}\n삭제 사유: `;
                        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                        Linking.canOpenURL(mailtoUrl).then((supported) => {
                          if (supported) {
                            Linking.openURL(mailtoUrl);
                          } else {
                            Alert.alert('이메일 앱을 열 수 없습니다', `직접 ${email}로 이메일을 보내주세요.`);
                          }
                        });
                      },
                    },
                  ]
                );
              } else {
                // 그 외의 오류 (예: 비밀번호 불일치)
                Alert.alert(
                  '오류',
                  error?.errors?.[0]?.message || '계정 삭제에 실패했습니다. 비밀번호를 확인해주세요.'
                );
              }
            } finally {
              setIsDeleting(false);
              setPassword('');
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setPassword('');
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '계정 삭제',
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
          {/* 경고 카드 */}
          <Card className="border-destructive">
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={AlertTriangleIcon} className="size-5 text-destructive" />
                <CardTitle className="text-destructive">계정 삭제 주의사항</CardTitle>
              </View>
              <CardDescription>
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="bg-destructive/10 p-4 rounded-lg">
                <Text className="text-sm text-destructive font-semibold">
                  ⚠️ 이 작업은 되돌릴 수 없습니다
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* 삭제될 정보 카드 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={XCircleIcon} className="size-5 text-foreground" />
                <CardTitle>삭제될 정보</CardTitle>
              </View>
              <CardDescription>다음 정보들이 영구적으로 삭제됩니다</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="w-2 h-2 rounded-full bg-destructive" />
                <Text className="text-base">프로필 정보 (이름, 이메일, 사진)</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="w-2 h-2 rounded-full bg-destructive" />
                <Text className="text-base">즐겨찾기한 아티스트 목록</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="w-2 h-2 rounded-full bg-destructive" />
                <Text className="text-base">공연 리뷰 및 평점</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="w-2 h-2 rounded-full bg-destructive" />
                <Text className="text-base">사용자 설정 및 선호도</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="w-2 h-2 rounded-full bg-destructive" />
                <Text className="text-base">모든 활동 기록</Text>
              </View>
            </CardContent>
          </Card>

          {/* 비밀번호 확인 카드 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={TrashIcon} className="size-5 text-foreground" />
                <CardTitle>계정 삭제 확인</CardTitle>
              </View>
              <CardDescription>
                계정을 삭제하려면 비밀번호를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label nativeID="password">비밀번호</Label>
                <Input
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  aria-labelledby="password"
                  editable={!isDeleting}
                  autoCapitalize="none"
                />
              </View>

              <View className="mt-4 gap-3">
                <Button
                  variant="destructive"
                  onPress={handleDeleteAccount}
                  disabled={isDeleting || !password}
                >
                  <View className="flex-row items-center gap-2">
                    <Icon as={TrashIcon} className="size-4 text-destructive-foreground" />
                    <Text className="text-destructive-foreground">
                      {isDeleting ? '삭제 중...' : '계정 영구 삭제'}
                    </Text>
                  </View>
                </Button>
                <Button
                  variant="outline"
                  onPress={handleCancel}
                  disabled={isDeleting}
                >
                  <Text>취소</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* 대안 안내 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>계정 삭제가 확실하지 않으신가요?</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground leading-6">
                계정을 삭제하는 대신 다음과 같은 방법을 고려해보세요:{'\n\n'}
                • 알림 설정에서 이메일 및 푸시 알림을 끌 수 있습니다{'\n'}
                • 일시적으로 앱을 사용하지 않으시려면 로그아웃을 이용하세요{'\n'}
                • 프라이버시가 걱정되신다면 설정에서 공개 범위를 조정할 수 있습니다
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
