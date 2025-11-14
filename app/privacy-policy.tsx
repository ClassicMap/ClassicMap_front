import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '개인정보 처리방침',
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
            <Text className="text-2xl font-bold">개인정보 처리방침</Text>
            <Text className="text-sm text-muted-foreground">
              최종 업데이트: 2025년 1월
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-base leading-6">
                ClassicMap(이하 "회사")은 이용자의 개인정보를 중요시하며, 「개인정보
                보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련
                법령을 준수하고 있습니다. 회사는 개인정보처리방침을 통하여
                이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고
                있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지
                알려드립니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">1. 개인정보의 수집 및 이용 목적</Text>
              <Text className="text-base leading-6">
                회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는
                개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
                변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
                받는 등 필요한 조치를 이행할 예정입니다.{'\n\n'}

                가. 회원 가입 및 관리{'\n'}
                회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증,
                회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 등을
                목적으로 개인정보를 처리합니다.{'\n\n'}

                나. 서비스 제공{'\n'}
                클래식 음악 정보 제공, 맞춤 서비스 제공, 본인인증 등을 목적으로
                개인정보를 처리합니다.{'\n\n'}

                다. 마케팅 및 광고에의 활용{'\n'}
                신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및
                참여기회 제공 등을 목적으로 개인정보를 처리합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">2. 수집하는 개인정보의 항목</Text>
              <Text className="text-base leading-6">
                회사는 회원가입, 서비스 신청 등을 위해 아래와 같은 개인정보를
                수집하고 있습니다.{'\n\n'}

                가. 필수항목{'\n'}
                - 이메일 주소{'\n'}
                - 이름 (First Name, Last Name){'\n'}
                - 비밀번호 (암호화되어 저장){'\n\n'}

                나. 선택항목{'\n'}
                - 프로필 이미지{'\n\n'}

                다. 자동 수집 항목{'\n'}
                - 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보, 기기 정보
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">3. 개인정보의 처리 및 보유기간</Text>
              <Text className="text-base leading-6">
                회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
                개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서
                개인정보를 처리·보유합니다.{'\n\n'}

                가. 회원 가입 및 관리: 회원 탈퇴 시까지{'\n'}
                다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지{'\n'}
                - 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당
                수사·조사 종료 시까지{'\n'}
                - 서비스 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계
                정산 시까지{'\n\n'}

                나. 서비스 제공: 서비스 제공 완료 시까지{'\n\n'}

                다. 관련 법령에 의한 정보보유{'\n'}
                - 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의
                소비자보호에 관한 법률){'\n'}
                - 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의
                소비자보호에 관한 법률){'\n'}
                - 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의
                소비자보호에 관한 법률){'\n'}
                - 웹사이트 방문 기록: 3개월 (통신비밀보호법)
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">4. 개인정보의 제3자 제공</Text>
              <Text className="text-base leading-6">
                회사는 원칙적으로 이용자의 개인정보를 제1조(개인정보의 수집 및 이용
                목적)에서 명시한 범위 내에서 처리하며, 이용자의 사전 동의 없이는
                본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
                다만, 다음의 경우에는 예외로 합니다:{'\n\n'}

                - 이용자가 사전에 동의한 경우{'\n'}
                - 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                방법에 따라 수사기관의 요구가 있는 경우
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">5. 개인정보의 파기</Text>
              <Text className="text-base leading-6">
                회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
                불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.{'\n\n'}

                가. 파기절차{'\n'}
                이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의
                경우 별도의 서류) 내부 방침 및 기타 관련 법령에 따라 일정기간
                저장된 후 혹은 즉시 파기됩니다.{'\n\n'}

                나. 파기방법{'\n'}
                - 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을
                사용합니다.{'\n'}
                - 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여
                파기합니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">6. 이용자 및 법정대리인의 권리</Text>
              <Text className="text-base leading-6">
                이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할
                수 있으며 가입해지를 요청할 수도 있습니다. 이용자의 개인정보 조회,
                수정을 위해서는 '설정' 메뉴에서 직접 열람, 정정 또는 탈퇴가
                가능하며, 개인정보관리책임자에게 서면, 전화 또는 이메일로 연락하시면
                지체없이 조치하겠습니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">7. 개인정보 보호책임자</Text>
              <Text className="text-base leading-6">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
                처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
                같이 개인정보 보호책임자를 지정하고 있습니다.{'\n\n'}

                개인정보 보호책임자{'\n'}
                - 성명: ClassicMap 운영팀{'\n'}
                - 이메일: support@classicmap.com{'\n\n'}

                이용자는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호
                관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자
                및 담당부서로 문의하실 수 있습니다. 회사는 이용자의 문의에 대해
                지체없이 답변 및 처리해드릴 것입니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">8. 개인정보의 안전성 확보조치</Text>
              <Text className="text-base leading-6">
                회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
                있습니다:{'\n\n'}

                - 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등{'\n'}
                - 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템
                설치, 고유식별정보 등의 암호화, 보안프로그램 설치{'\n'}
                - 물리적 조치: 전산실, 자료보관실 등의 접근통제
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">9. 개인정보 처리방침 변경</Text>
              <Text className="text-base leading-6">
                이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
                변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
                전부터 공지사항을 통하여 고지할 것입니다.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold">10. 권익침해 구제방법</Text>
              <Text className="text-base leading-6">
                이용자는 아래의 기관에 대해 개인정보 침해에 대한 피해구제, 상담
                등을 문의하실 수 있습니다:{'\n\n'}

                ▶ 개인정보 침해신고센터 (한국인터넷진흥원 운영){'\n'}
                - 소관업무: 개인정보 침해사실 신고, 상담 신청{'\n'}
                - 홈페이지: privacy.kisa.or.kr{'\n'}
                - 전화: (국번없이) 118{'\n\n'}

                ▶ 개인정보 분쟁조정위원회{'\n'}
                - 소관업무: 개인정보 분쟁조정신청, 집단분쟁조정 (민사적 해결){'\n'}
                - 홈페이지: www.kopico.go.kr{'\n'}
                - 전화: (국번없이) 1833-6972{'\n\n'}

                ▶ 대검찰청 사이버범죄수사단: 02-3480-3573 (www.spo.go.kr){'\n'}
                ▶ 경찰청 사이버안전국: 182 (cyberbureau.police.go.kr)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
