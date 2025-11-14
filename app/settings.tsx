import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useUser } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, LockIcon, FileTextIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { getImageUrl } from '@/lib/utils/image';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();

  // 사용자 정보
  const userInitials = React.useMemo(() => {
    const name = user?.fullName || user?.emailAddresses[0]?.emailAddress || 'Unknown';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  }, [user?.fullName, user?.emailAddresses]);

  const userImageSource = React.useMemo(() => {
    return user?.imageUrl ? { uri: getImageUrl(user.imageUrl) } : undefined;
  }, [user?.imageUrl]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '설정',
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
          {/* 사용자 정보 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>회원님의 프로필 정보를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center gap-4">
                <Avatar alt="User avatar" className="size-16">
                  <AvatarImage source={userImageSource} />
                  <AvatarFallback>
                    <Text className="text-2xl">{userInitials}</Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="text-lg font-semibold">{user?.fullName || '이름 없음'}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {user?.emailAddresses[0]?.emailAddress}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* 계정 관리 섹션 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={UserIcon} className="size-5 text-foreground" />
                <CardTitle>계정 관리</CardTitle>
              </View>
              <CardDescription>계정 정보를 수정하거나 보안 설정을 변경할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent className="gap-2">
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/edit-profile')}
              >
                <View className="flex-row items-center gap-3">
                  <Icon as={UserIcon} className="size-5 text-muted-foreground" />
                  <View>
                    <Text className="text-base">프로필 수정</Text>
                    <Text className="text-sm text-muted-foreground">이름 변경</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
              </Button>
              <Separator />
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/change-password')}
              >
                <View className="flex-row items-center gap-3">
                  <Icon as={LockIcon} className="size-5 text-muted-foreground" />
                  <View>
                    <Text className="text-base">비밀번호 변경</Text>
                    <Text className="text-sm text-muted-foreground">계정 보안 설정</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>

          {/* 약관 및 정책 섹션 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={FileTextIcon} className="size-5 text-foreground" />
                <CardTitle>약관 및 정책</CardTitle>
              </View>
              <CardDescription>서비스 이용약관 및 개인정보 처리방침</CardDescription>
            </CardHeader>
            <CardContent className="gap-2">
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/terms-of-service')}
              >
                <Text className="text-base">이용약관 (EULA)</Text>
                <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
              </Button>
              <Separator />
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/privacy-policy')}
              >
                <Text className="text-base">개인정보 처리방침</Text>
                <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
