import { SubPage } from '@/components/account/sub-page';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import Constants from 'expo-constants';
import { type Href, useRouter } from 'expo-router';
import { ChevronDownIcon, ChevronRightIcon, MailIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';

const SUPPORT_EMAIL = 'kang3171611@naver.com';

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'ClassicMap은 무엇을 하는 앱인가요?',
    answer:
      '같은 곡의 같은 구간을 여러 연주자로 이어 들으며 비교하는 앱이에요. 작곡가·연주자·작품·공연 정보도 함께 볼 수 있어요.',
  },
  {
    question: '비교는 어떻게 하나요?',
    answer:
      '비교 탭에서 작품을 고르면 구간 칩과 연주자 목록이 나와요. 연주자를 누르면 그 연주의 해당 구간만 재생되고, 데스크톱에서는 ←→ 키로 같은 지점에서 연주자를 바꿔 들을 수 있어요.',
  },
  {
    question: '영상은 어디서 가져오나요?',
    answer: '연주 영상은 YouTube 원본의 해당 구간이에요. 비교 화면의 "YouTube 원본" 링크로 전체 영상을 볼 수 있어요.',
  },
  {
    question: '공연 정보는 어디서 오나요?',
    answer: 'KOPIS 공연예술통합전산망의 공개 데이터를 매일 받아 와요. 예매는 각 예매처로 연결돼요.',
  },
  {
    question: '레퍼토리는 무엇인가요?',
    answer:
      '작곡가·연주자·작품·공연에서 "레퍼토리에 담기"를 누르면 모이는 나만의 목록이에요. 로그인하면 어느 기기에서든 이어서 볼 수 있어요.',
  },
  {
    question: '계정은 어떻게 삭제하나요?',
    answer: '설정 > 계정 > 계정 삭제에서 지울 수 있어요. 지우면 별점과 레퍼토리가 모두 사라지고 되돌릴 수 없어요.',
  },
];

function openMail(subject: string, body = '') {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('메일 앱을 열지 못했어요', `${SUPPORT_EMAIL}로 직접 보내 주세요.`)
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const [open, setOpen] = React.useState<number | null>(0);
  const version = Constants.expoConfig?.version;

  return (
    <SubPage title="도움말" description={version ? `ClassicMap ${version}` : undefined}>
      <Text variant="headline">자주 묻는 질문</Text>
      <View className="mt-2">
        {FAQS.map((faq, index) => {
          const expanded = open === index;
          return (
            <View key={faq.question} className={cn(index > 0 && 'border-t border-border')}>
              <Pressable
                onPress={() => setOpen(expanded ? null : index)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                className="min-h-12 flex-row items-center gap-3 py-3">
                <Text className="flex-1 text-body-sm font-semibold text-foreground">{faq.question}</Text>
                <Icon
                  as={ChevronDownIcon}
                  size={16}
                  className={cn('text-foreground-subtle', expanded && 'rotate-180')}
                />
              </Pressable>
              {expanded ? (
                <Text variant="bodySm" className="pb-4 text-foreground-muted">
                  {faq.answer}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text variant="headline" className="mt-10">
        문의
      </Text>
      <Text variant="bodySm" className="mt-1 text-foreground-muted">
        {`답은 ${SUPPORT_EMAIL}로 보내 드려요.`}
      </Text>
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Button className="rounded-full" onPress={() => openMail('ClassicMap 문의')}>
          <Icon as={MailIcon} size={15} className="text-primary-foreground" />
          <Text>메일로 문의하기</Text>
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onPress={() => openMail('ClassicMap 문제 신고', '문제 내용:\n\n\n발생 시점:\n\n\n기기 정보:\n\n')}>
          <Text>문제 신고하기</Text>
        </Button>
      </View>

      <Text variant="headline" className="mt-10">
        약관 및 정책
      </Text>
      <View className="mt-2">
        {[
          { label: '이용약관', href: '/terms-of-service' },
          { label: '개인정보 처리방침', href: '/privacy-policy' },
        ].map((item, index) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as Href)}
            accessibilityRole="link"
            className={cn('min-h-12 flex-row items-center justify-between', index > 0 && 'border-t border-border')}>
            <Text className="text-body-sm text-foreground">{item.label}</Text>
            <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" />
          </Pressable>
        ))}
      </View>
    </SubPage>
  );
}
