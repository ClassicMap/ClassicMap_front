import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon, ChevronDownIcon, ChevronUpIcon, MailIcon, AlertCircleIcon, FileTextIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View, Linking, Alert } from 'react-native';

export default function HelpScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const faqs = [
    {
      question: 'ClassicMap이란 무엇인가요?',
      answer: 'ClassicMap은 클래식 음악 입문자를 위한 로드맵 서비스입니다. 다양한 아티스트, 공연 정보, 작곡가 정보를 제공하여 클래식 음악을 쉽게 접할 수 있도록 도와드립니다.'
    },
    {
      question: '어떻게 아티스트를 검색하나요?',
      answer: '홈 화면 상단의 검색창을 통해 아티스트 이름을 입력하거나, 아티스트 탭에서 카테고리별로 아티스트를 탐색할 수 있습니다.'
    },
    {
      question: '영상 비교 기능은 어떻게 사용하나요?',
      answer: '비교 탭에서 동일한 곡의 서로 다른 연주를 선택하여 나란히 비교할 수 있습니다. 여러 아티스트의 해석을 비교해보세요.'
    },
    {
      question: '공연 정보는 어디서 가져오나요?',
      answer: 'ClassicMap은 다양한 클래식 음악 공연장 및 공식 데이터베이스에서 정보를 수집하여 제공합니다.'
    },
    {
      question: '계정을 어떻게 삭제하나요?',
      answer: '설정 > 계정 관리 > 계정 삭제 메뉴에서 계정을 삭제할 수 있습니다. 계정 삭제 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.'
    }
  ];

  const handleSendEmail = () => {
    const email = 'kang3171611@naver.com';
    const subject = 'ClassicMap 문의';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.canOpenURL(mailtoUrl).then((supported) => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('이메일 앱을 열 수 없습니다', `직접 ${email}로 이메일을 보내주세요.`);
      }
    });
  };

  const handleReportProblem = () => {
    const email = 'kang3171611@naver.com';
    const subject = 'ClassicMap 문제 신고';
    const body = '문제 내용:\n\n\n발생 시점:\n\n\n기기 정보:\n\n';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(mailtoUrl).then((supported) => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('이메일 앱을 열 수 없습니다', `직접 ${email}로 이메일을 보내주세요.`);
      }
    });
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '도움말 및 지원',
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
          {/* 앱 정보 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle>ClassicMap</CardTitle>
              <CardDescription>버전 1.0.0</CardDescription>
            </CardHeader>
            <CardContent>
              <Text className="text-base leading-6">
                클래식 음악 입문자를 위한 로드맵 서비스
              </Text>
              <Text className="text-sm text-muted-foreground mt-2">
                아티스트, 공연, 작곡가 정보를 제공하여 클래식 음악의 세계를 쉽게 탐험할 수 있습니다.
              </Text>
            </CardContent>
          </Card>

          {/* FAQ 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle>자주 묻는 질문</CardTitle>
              <CardDescription>궁금하신 내용을 확인해보세요</CardDescription>
            </CardHeader>
            <CardContent className="gap-2">
              {faqs.map((faq, index) => (
                <View key={index}>
                  {index > 0 && <Separator className="my-2" />}
                  <Button
                    variant="ghost"
                    className="flex-col items-start px-0 py-2"
                    onPress={() => toggleFaq(index)}
                  >
                    <View className="flex-row justify-between items-center w-full">
                      <Text className="text-base font-medium flex-1">{faq.question}</Text>
                      <Icon
                        as={expandedFaq === index ? ChevronUpIcon : ChevronDownIcon}
                        className="size-5 text-muted-foreground ml-2"
                      />
                    </View>
                    {expandedFaq === index && (
                      <Text className="text-sm text-muted-foreground mt-2 leading-6">
                        {faq.answer}
                      </Text>
                    )}
                  </Button>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* 문의하기 섹션 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={MailIcon} className="size-5 text-foreground" />
                <CardTitle>문의하기</CardTitle>
              </View>
              <CardDescription>서비스 이용 중 문의사항이 있으신가요?</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">이메일</Text>
                <Text className="text-base">kang3171611@naver.com</Text>
              </View>
              <Button onPress={handleSendEmail} className="w-full">
                <View className="flex-row items-center gap-2">
                  <Icon as={MailIcon} className="size-4 text-primary-foreground" />
                  <Text className="text-primary-foreground">이메일 보내기</Text>
                </View>
              </Button>
            </CardContent>
          </Card>

          {/* 문제 신고 섹션 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={AlertCircleIcon} className="size-5 text-foreground" />
                <CardTitle>문제 신고</CardTitle>
              </View>
              <CardDescription>버그나 오류를 발견하셨나요?</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onPress={handleReportProblem}
                className="w-full"
              >
                <View className="flex-row items-center gap-2">
                  <Icon as={AlertCircleIcon} className="size-4" />
                  <Text>버그 리포트 보내기</Text>
                </View>
              </Button>
            </CardContent>
          </Card>

          {/* 약관 및 정책 링크 */}
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={FileTextIcon} className="size-5 text-foreground" />
                <CardTitle>약관 및 정책</CardTitle>
              </View>
            </CardHeader>
            <CardContent className="gap-2">
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/terms-of-service')}
              >
                <Text className="text-base">이용약관 (EULA)</Text>
                <Icon as={ChevronLeftIcon} className="size-5 text-muted-foreground rotate-180" />
              </Button>
              <Separator />
              <Button
                variant="ghost"
                className="flex-row justify-between items-center px-4"
                onPress={() => router.push('/privacy-policy')}
              >
                <Text className="text-base">개인정보 처리방침</Text>
                <Icon as={ChevronLeftIcon} className="size-5 text-muted-foreground rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
