import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '이용약관',
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
          <View className="gap-4">
            <Text className="text-2xl font-bold">ClassicMap 이용약관</Text>
            <Text className="text-sm text-muted-foreground">
              최종 업데이트: 2025년 1월
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-lg font-semibold">제 1 조 (목적)</Text>
              <Text className="text-base leading-6">
                본 약관은 ClassicMap(이하 "서비스")이 제공하는 클래식 음악 정보 서비스의
                이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한
                사항을 규정함을 목적으로 합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 2 조 (용어의 정의)</Text>
              <Text className="text-base leading-6">
                1. "서비스"라 함은 구현되는 단말기(PC, TV, 휴대형 단말기 등의 각종
                유무선 장치를 포함)와 상관없이 "이용자"가 이용할 수 있는 ClassicMap
                서비스를 의미합니다.{'\n\n'}
                2. "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및
                비회원을 말합니다.{'\n\n'}
                3. "회원"이라 함은 회사에 개인정보를 제공하여 회원등록을 한 자로서,
                회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를
                계속적으로 이용할 수 있는 자를 말합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 3 조 (약관의 게시와 개정)</Text>
              <Text className="text-base leading-6">
                1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기
                화면에 게시합니다.{'\n\n'}
                2. 회사는 필요하다고 인정되는 경우 본 약관을 개정할 수 있으며, 회사가
                약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과
                함께 서비스의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지
                공지합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 4 조 (회원가입)</Text>
              <Text className="text-base leading-6">
                1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이
                약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.{'\n\n'}
                2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음
                각호에 해당하지 않는 한 회원으로 등록합니다:{'\n'}
                   - 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는
                경우{'\n'}
                   - 등록 내용에 허위, 기재누락, 오기가 있는 경우{'\n'}
                   - 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고
                판단되는 경우
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 5 조 (서비스의 제공 및 변경)</Text>
              <Text className="text-base leading-6">
                1. 회사는 다음과 같은 업무를 수행합니다:{'\n'}
                   - 클래식 음악 아티스트, 공연, 작곡가 정보 제공{'\n'}
                   - 음악 비교 및 타임라인 기능 제공{'\n'}
                   - 기타 회사가 정하는 업무{'\n\n'}
                2. 회사는 서비스의 내용, 품질 및 서비스 제공 방법을 변경할 수
                있습니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 6 조 (서비스의 중단)</Text>
              <Text className="text-base leading-6">
                1. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의
                두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할
                수 있습니다.{'\n\n'}
                2. 회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로
                인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 회사가
                고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 7 조 (회원탈퇴 및 자격 상실 등)</Text>
              <Text className="text-base leading-6">
                1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시
                회원탈퇴를 처리합니다.{'\n\n'}
                2. 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한
                및 정지시킬 수 있습니다:{'\n'}
                   - 가입 신청 시에 허위 내용을 등록한 경우{'\n'}
                   - 다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등
                전자상거래 질서를 위협하는 경우{'\n'}
                   - 서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에
                반하는 행위를 하는 경우
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 8 조 (개인정보보호)</Text>
              <Text className="text-base leading-6">
                회사는 이용자의 개인정보 수집시 서비스제공을 위하여 필요한 범위에서
                최소한의 개인정보를 수집합니다. 회사는 관련법령이 정하는 바에 따라
                이용자의 개인정보를 보호하기 위해 노력합니다. 이용자 개인정보의
                보호 및 사용에 대해서는 관련법령 및 회사의 개인정보처리방침이
                적용됩니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 9 조 (회사의 의무)</Text>
              <Text className="text-base leading-6">
                1. 회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지
                않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 서비스를
                제공하는데 최선을 다하여야 합니다.{'\n\n'}
                2. 회사는 이용자가 안전하게 서비스를 이용할 수 있도록 이용자의
                개인정보 보호를 위한 보안 시스템을 갖추어야 합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">제 10 조 (이용자의 의무)</Text>
              <Text className="text-base leading-6">
                이용자는 다음 행위를 하여서는 안 됩니다:{'\n'}
                1. 신청 또는 변경 시 허위 내용의 등록{'\n'}
                2. 타인의 정보 도용{'\n'}
                3. 회사가 게시한 정보의 변경{'\n'}
                4. 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는
                게시{'\n'}
                5. 회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해{'\n'}
                6. 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위{'\n'}
                7. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는
                정보를 서비스에 공개 또는 게시하는 행위
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
