import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import type { TriggerRef } from '@rn-primitives/popover';
import { LogOutIcon, SettingsIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/utils/alert';
import { getImageUrl } from '@/lib/utils/image';

export function UserMenu({ iconColor }: { iconColor?: string } = {}) {
  const { user } = useUser();
  const { signOut, isSignedIn } = useAuth();
  const router = useRouter();
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  // 로그인되지 않은 경우 관리자 로그인 페이지로 이동
  function onAdminLogin() {
    router.push('/(auth)/admin-login');
  }

  async function onSignOut() {
    try {
      setIsSigningOut(true);
      popoverTriggerRef.current?.close();
      await signOut();
      // 로그아웃 성공 - 조용히 처리 (페이지 전환이 피드백 역할)
    } catch (error) {
      console.error('로그아웃 실패:', error);
      Alert.alert(
        '로그아웃 실패',
        '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인', style: 'default' }]
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function onManageAccount() {
    popoverTriggerRef.current?.close();
    router.push('/settings');
  }

  // 로그인되지 않은 경우 관리자 로그인 버튼만 표시
  if (!isSignedIn) {
    return (
      <Button variant="ghost" size="icon" className="size-8 rounded-full" onPress={onAdminLogin}>
        <Icon as={SettingsIcon} color={iconColor} className="size-5" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar iconColor={iconColor} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-80 p-0">
        <View className="gap-3 border-b border-border p-3">
          <View className="flex-row items-center gap-3">
            <UserAvatar className="size-10" />
            <View className="flex-1">
              <Text className="font-medium leading-5">
                {user?.fullName || user?.emailAddresses[0]?.emailAddress}
              </Text>
              {user?.fullName?.length ? (
                <Text className="text-sm font-normal leading-4 text-muted-foreground">
                  {user?.username || user?.emailAddresses[0]?.emailAddress}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-3 py-0.5">
            <Button
              variant="outline"
              size="sm"
              onPress={onManageAccount}
              disabled={isSigningOut}>
              <Icon as={SettingsIcon} className="size-4" />
              <Text>계정 관리</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={onSignOut}
              disabled={isSigningOut}>
              {isSigningOut ? (
                <ActivityIndicator size="small" />
              ) : (
                <Icon as={LogOutIcon} className="size-4" />
              )}
              <Text>{isSigningOut ? '로그아웃 중...' : '로그아웃'}</Text>
            </Button>
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar(props: Omit<React.ComponentProps<typeof Avatar>, 'alt'> & { iconColor?: string }) {
  const { user } = useUser();
  const { iconColor, ...avatarProps } = props;

  const { initials, imageSource, userName } = React.useMemo(() => {
    const userName = user?.fullName || user?.emailAddresses[0]?.emailAddress || 'Unknown';
    const initials = userName
      .split(' ')
      .map((name) => name[0])
      .join('');

    const imageSource = user?.imageUrl ? { uri: getImageUrl(user.imageUrl) } : undefined;
    return { initials, imageSource, userName };
  }, [user?.imageUrl, user?.fullName, user?.emailAddresses[0]?.emailAddress]);

  return (
    <Avatar alt={`${userName}'s avatar`} {...avatarProps}>
      <AvatarImage source={imageSource} />
      <AvatarFallback>
        <Text style={iconColor ? { color: iconColor } : undefined}>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
