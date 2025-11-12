import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { ArrowLeftIcon, FileTextIcon, ShieldIcon, BookOpenIcon, ChevronRightIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

export default function SettingsScreen() {
  const router = useRouter();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.error('Failed to open URL');
    });
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-background border-b border-border">
          <View className="flex-row items-center gap-4 px-4 pt-12 pb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="size-10 items-center justify-center"
            >
              <Icon as={ArrowLeftIcon} size={24} className="text-foreground" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold">설정</Text>
          </View>
        </View>

        <View className="gap-6 p-4">
          {/* Account Section */}
          <View className="gap-3">
            <Text className="text-lg font-bold">계정</Text>
            <Card className="p-0 overflow-hidden">
              <TouchableOpacity
                className="flex-row items-center justify-between p-4 border-b border-border active:bg-accent"
                onPress={() => {
                  // TODO: Navigate to profile settings
                }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Icon as={ShieldIcon} size={20} className="text-primary" />
                  <View className="flex-1">
                    <Text className="font-medium">프로필 설정</Text>
                    <Text className="text-sm text-muted-foreground">이름, 이메일 등 계정 정보 관리</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Legal Section */}
          <View className="gap-3">
            <Text className="text-lg font-bold">약관 및 정책</Text>
            <Card className="p-0 overflow-hidden">
              <TouchableOpacity
                className="flex-row items-center justify-between p-4 border-b border-border active:bg-accent"
                onPress={() => handleOpenLink('https://www.example.com/terms')}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Icon as={FileTextIcon} size={20} className="text-primary" />
                  <View className="flex-1">
                    <Text className="font-medium">서비스 이용약관</Text>
                    <Text className="text-sm text-muted-foreground">ClassicMap 서비스 이용약관</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between p-4 border-b border-border active:bg-accent"
                onPress={() => handleOpenLink('https://www.example.com/privacy')}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Icon as={ShieldIcon} size={20} className="text-primary" />
                  <View className="flex-1">
                    <Text className="font-medium">개인정보 처리방침</Text>
                    <Text className="text-sm text-muted-foreground">개인정보 수집 및 이용에 관한 안내</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between p-4 active:bg-accent"
                onPress={() => handleOpenLink('https://www.example.com/eula')}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Icon as={BookOpenIcon} size={20} className="text-primary" />
                  <View className="flex-1">
                    <Text className="font-medium">EULA (최종 사용자 라이선스 계약)</Text>
                    <Text className="text-sm text-muted-foreground">소프트웨어 사용 라이선스</Text>
                  </View>
                </View>
                <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
              </TouchableOpacity>
            </Card>
          </View>

          {/* App Info */}
          <View className="gap-3">
            <Text className="text-lg font-bold">앱 정보</Text>
            <Card className="p-4">
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">버전</Text>
                  <Text className="font-medium">1.0.0</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">빌드 번호</Text>
                  <Text className="font-medium">100</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Footer */}
          <View className="items-center py-4">
            <Text className="text-sm text-muted-foreground text-center">
              © 2024 ClassicMap. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
