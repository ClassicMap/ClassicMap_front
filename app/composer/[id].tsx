import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { View, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, Platform, Linking } from 'react-native';
import { Alert } from '@/lib/utils/alert';
import { 
  ArrowLeftIcon, 
  CalendarIcon,
  MapPinIcon,
  BookOpenIcon,
  MusicIcon,
  MoonStarIcon,
  SunIcon,
  TrashIcon,
  PlusIcon,
  EditIcon
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserMenu } from '@/components/user-menu';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ComposerAPI } from '@/lib/api/client';
import { AdminComposerAPI, AdminPieceAPI } from '@/lib/api/admin';
import { useAuth } from '@/lib/hooks/useAuth';
import { PieceFormModal } from '@/components/admin/PieceFormModal';
import { ComposerFormModal } from '@/components/admin/ComposerFormModal';
import type { Composer, Piece } from '@/lib/types/models';
import { getImageUrl } from '@/lib/utils/image';
import { prefetchImages } from '@/components/optimized-image';

interface ComposerWithPieces extends Composer {
  majorPieces?: Piece[];
}

// 시대별 색상 매핑
const ERA_COLORS: Record<string, string> = {
  '바로크': '#9333ea',
  '고전주의': '#3b82f6',
  '낭만주의': '#ec4899',
  '근현대': '#22c55e',
};

const COMPOSER_DETAILS: Record<string, any> = {
  '1': {
    id: '1',
    name: '바흐',
    fullName: '요한 제바스티안 바흐',
    englishName: 'Johann Sebastian Bach',
    period: '바로크',
    birthYear: 1685,
    deathYear: 1750,
    nationality: '독일',
    avatar: 'https://i.pravatar.cc/150?img=33',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    bio: '바로크 시대의 가장 위대한 작곡가 중 한 명. 대위법의 대가로, 종교 음악과 기악 음악 모든 분야에서 뛰어난 작품을 남겼습니다.',
    majorWorks: [
      { id: '1', title: '마태 수난곡' },
      { id: '2', title: '브란덴부르크 협주곡' },
      { id: '3', title: '골드베르크 변주곡' },
      { id: '4', title: '평균율 클라비어곡집' },
      { id: '5', title: '무반주 첼로 모음곡' },
    ],
    style: '정교한 대위법, 깊은 종교성, 수학적 구조미',
    influence: '모차르트, 베토벤, 멘델스존 등 후대 작곡가들에게 지대한 영향',
  },
  '2': {
    id: '2',
    name: '모차르트',
    fullName: '볼프강 아마데우스 모차르트',
    englishName: 'Wolfgang Amadeus Mozart',
    period: '고전주의',
    birthYear: 1756,
    deathYear: 1791,
    nationality: '오스트리아',
    avatar: 'https://i.pravatar.cc/150?img=12',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '천재 음악가의 대명사. 35년이라는 짧은 생애 동안 600곡이 넘는 작품을 남겼으며, 오페라, 교향곡, 협주곡 모든 분야에서 걸작을 창조했습니다.',
    majorWorks: [
      { id: '6', title: '피가로의 결혼' },
      { id: '7', title: '돈 조반니' },
      { id: '8', title: '마술피리' },
      { id: '9', title: '교향곡 40번' },
      { id: '10', title: '피아노 협주곡 21번' },
    ],
    style: '완벽한 형식미, 맑고 우아한 선율, 균형잡힌 구조',
    influence: '고전주의 음악의 정점, 베토벤과 슈베르트에게 큰 영향',
  },
  '3': {
    id: '3',
    name: '베토벤',
    fullName: '루트비히 판 베토벤',
    englishName: 'Ludwig van Beethoven',
    period: '고전주의',
    birthYear: 1770,
    deathYear: 1827,
    nationality: '독일',
    avatar: 'https://i.pravatar.cc/150?img=59',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '고전주의에서 낭만주의로의 다리를 놓은 위대한 작곡가. 청각을 잃은 후에도 불굴의 의지로 인류 최고의 음악을 작곡했습니다.',
    majorWorks: [
      { id: '11', title: '교향곡 9번 "합창"' },
      { id: '12', title: '교향곡 5번 "운명"' },
      { id: '13', title: '피아노 소나타 "열정"' },
      { id: '14', title: '피아노 소나타 "월광"' },
      { id: '15', title: '현악 사중주 후기 작품' },
    ],
    style: '영웅적 스케일, 극적 대비, 혁신적 형식 확장',
    influence: '모든 후대 작곡가들의 영원한 모델',
  },
  '4': {
    id: '4',
    name: '쇼팽',
    fullName: '프레데리크 쇼팽',
    englishName: 'Frédéric Chopin',
    period: '낭만주의',
    birthYear: 1810,
    deathYear: 1849,
    nationality: '폴란드',
    avatar: 'https://i.pravatar.cc/150?img=13',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
    bio: '피아노의 시인. 거의 모든 작품을 피아노를 위해 작곡했으며, 피아노 음악의 가능성을 극대화한 작곡가입니다.',
    majorWorks: [
      { id: '16', title: '발라드 1번' },
      { id: '17', title: '녹턴 작품 9-2' },
      { id: '18', title: '에튀드 작품 10, 25' },
      { id: '19', title: '피아노 협주곡 1번' },
      { id: '20', title: '폴로네즈 "영웅"' },
    ],
    style: '서정적 선율, 섬세한 화성, 폴란드 민족 정서',
    influence: '피아노 음악의 혁명, 리스트, 드뷔시 등에게 영향',
  },
  '5': {
    id: '5',
    name: '차이콥스키',
    fullName: '표트르 일리치 차이콥스키',
    englishName: 'Pyotr Ilyich Tchaikovsky',
    period: '낭만주의',
    birthYear: 1840,
    deathYear: 1893,
    nationality: '러시아',
    avatar: 'https://i.pravatar.cc/150?img=60',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '러시아 낭만주의를 대표하는 작곡가. 발레 음악과 교향곡에서 특히 뛰어났으며, 서정적이면서도 극적인 음악으로 유명합니다.',
    majorWorks: [
      { id: '21', title: '백조의 호수' },
      { id: '22', title: '호두까기 인형' },
      { id: '23', title: '교향곡 6번 "비창"' },
      { id: '24', title: '피아노 협주곡 1번' },
      { id: '25', title: '1812 서곡' },
    ],
    style: '극적 표현력, 러시아 민족 선율, 화려한 관현악',
    influence: '러시아 음악의 세계화, 라흐마니노프에게 영향',
  },
  '6': {
    id: '6',
    name: '드뷔시',
    fullName: '클로드 드뷔시',
    englishName: 'Claude Debussy',
    period: '근현대',
    birthYear: 1862,
    deathYear: 1918,
    nationality: '프랑스',
    avatar: 'https://i.pravatar.cc/150?img=56',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '인상주의 음악의 창시자. 전통적 화성에서 벗어나 색채적이고 분위기 있는 새로운 음악 언어를 창조했습니다.',
    majorWorks: [
      { id: '26', title: '목신의 오후 전주곡' },
      { id: '27', title: '달빛' },
      { id: '28', title: '바다' },
      { id: '29', title: '전주곡집' },
      { id: '30', title: '어린이 차지' },
    ],
    style: '색채적 화성, 인상주의적 분위기, 자유로운 형식',
    influence: '20세기 음악의 문을 열음, 라벨, 현대 작곡가들에게 영향',
  },
  '7': {
    id: '7',
    name: '라흐마니노프',
    fullName: '세르게이 라흐마니노프',
    englishName: 'Sergei Rachmaninoff',
    period: '근현대',
    birthYear: 1873,
    deathYear: 1943,
    nationality: '러시아',
    avatar: 'https://i.pravatar.cc/150?img=65',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    bio: '낭만주의 시대 마지막 거장. 뛰어난 피아니스트이자 작곡가로, 서정적이고 웅장한 피아노 협주곡들로 유명합니다.',
        majorWorks: [
      { id: '66', title: '31' },
      { id: '67', title: '32' },
      { id: '68', title: '33' },
      { id: '69', title: '34' },
      { id: '70', title: '35' },
    ],
    style: '서정적 선율, 웅장한 스케일, 러시아적 정서',
    influence: '낭만주의 전통의 계승, 현대 피아노 레퍼토리의 핵심',
  },
  'vivaldi': {
    id: 'vivaldi',
    name: '비발디',
    fullName: '안토니오 비발디',
    englishName: 'Antonio Vivaldi',
    period: '바로크',
    birthYear: 1678,
    deathYear: 1741,
    nationality: '이탈리아',
    avatar: 'https://i.pravatar.cc/150?img=14',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
    bio: '붉은 머리의 사제로 알려진 바로크 시대의 거장. 협주곡 형식의 완성자로, 500곡이 넘는 협주곡을 작곡했습니다.',
        majorWorks: [
      { id: '71', title: '사계' },
      { id: '72', title: '조화의 영감' },
      { id: '73', title: '글로리아' },
      { id: '74', title: '만돌린 협주곡' },
    ],
    style: '화려한 바이올린 기교, 생동감 넘치는 리듬, 선명한 대비',
    influence: '바흐에게 영향, 협주곡 형식의 표준화',
  },
  'handel': {
    id: 'handel',
    name: '헨델',
    fullName: '게오르크 프리드리히 헨델',
    englishName: 'Georg Friedrich Händel',
    period: '바로크',
    birthYear: 1685,
    deathYear: 1759,
    nationality: '독일',
    avatar: 'https://i.pravatar.cc/150?img=51',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '바흐와 함께 바로크 음악을 대표하는 작곡가. 특히 오라토리오와 오페라에서 뛰어난 작품을 남겼습니다.',
        majorWorks: [
      { id: '75', title: '메시아' },
      { id: '76', title: '수상음악' },
      { id: '77', title: '왕궁의 불꽃놀이' },
      { id: '78', title: '오페라 "리날도"' },
    ],
    style: '장엄한 합창, 극적 표현, 이탈리아 오페라 양식',
    influence: '영국 음악의 기틀 마련, 하이든과 모차르트에게 영향',
  },
  'haydn': {
    id: 'haydn',
    name: '하이든',
    fullName: '요제프 하이든',
    englishName: 'Joseph Haydn',
    period: '고전주의',
    birthYear: 1732,
    deathYear: 1809,
    nationality: '오스트리아',
    avatar: 'https://i.pravatar.cc/150?img=52',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '교향곡의 아버지, 현악 사중주의 아버지로 불리는 고전주의 음악의 대가. 100곡이 넘는 교향곡을 작곡했습니다.',
        majorWorks: [
      { id: '79', title: '교향곡 94번 "놀람"' },
      { id: '80', title: '교향곡 101번 "시계"' },
      { id: '81', title: '천지창조' },
      { id: '82', title: '현악 사중주 "황제"' },
    ],
    style: '명료한 형식, 유머와 기지, 균형잡힌 구조',
    influence: '소나타 형식의 완성, 모차르트와 베토벤에게 영향',
  },
  'brahms': {
    id: 'brahms',
    name: '브람스',
    fullName: '요하네스 브람스',
    englishName: 'Johannes Brahms',
    period: '낭만주의',
    birthYear: 1833,
    deathYear: 1897,
    nationality: '독일',
    avatar: 'https://i.pravatar.cc/150?img=53',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    bio: '낭만주의 시대의 보수적 거장. 고전적 형식미와 낭만적 정서를 완벽하게 조화시킨 작곡가입니다.',
        majorWorks: [
      { id: '83', title: '교향곡 1번' },
      { id: '84', title: '바이올린 협주곡' },
      { id: '85', title: '독일 레퀴엠' },
      { id: '86', title: '헝가리 무곡' },
      { id: '87', title: '간주곡 Op.117' },
    ],
    style: '고전적 형식, 깊은 서정성, 정교한 대위법',
    influence: '베토벤의 전통 계승, 쇤베르크에게 영향',
  },
  'liszt': {
    id: 'liszt',
    name: '리스트',
    fullName: '프란츠 리스트',
    englishName: 'Franz Liszt',
    period: '낭만주의',
    birthYear: 1811,
    deathYear: 1886,
    nationality: '헝가리',
    avatar: 'https://i.pravatar.cc/150?img=68',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '피아노의 마왕. 당대 최고의 피아니스트이자 작곡가로, 초절기교를 요구하는 화려한 피아노 작품들을 남겼습니다.',
        majorWorks: [
      { id: '88', title: '초절기교 연습곡' },
      { id: '89', title: '헝가리 광시곡' },
      { id: '90', title: '피아노 소나타 B단조' },
      { id: '91', title: '파우스트 교향곡' },
    ],
    style: '화려한 기교, 극적 표현, 교향시 형식 창조',
    influence: '바그너와 친분, 현대 피아노 기교의 기반',
  },
  'schumann': {
    id: 'schumann',
    name: '슈만',
    fullName: '로베르트 슈만',
    englishName: 'Robert Schumann',
    period: '낭만주의',
    birthYear: 1810,
    deathYear: 1856,
    nationality: '독일',
    avatar: 'https://i.pravatar.cc/150?img=15',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '낭만주의의 진정한 시인. 문학적 상상력이 풍부한 피아노 작품과 가곡으로 유명합니다.',
        majorWorks: [
      { id: '92', title: '어린이 정경' },
      { id: '93', title: '카니발' },
      { id: '94', title: '크라이슬레리아나' },
      { id: '95', title: '시인의 사랑' },
      { id: '96', title: '피아노 협주곡' },
    ],
    style: '문학적 표현, 내면적 감정, 시적 상상력',
    influence: '브람스의 멘토, 낭만주의 가곡과 피아노 음악 발전',
  },
  'stravinsky': {
    id: 'stravinsky',
    name: '스트라빈스키',
    fullName: '이고르 스트라빈스키',
    englishName: 'Igor Stravinsky',
    period: '근현대',
    birthYear: 1882,
    deathYear: 1971,
    nationality: '러시아',
    avatar: 'https://i.pravatar.cc/150?img=67',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
    bio: '20세기 음악의 혁명가. 리듬과 불협화음의 대담한 사용으로 현대 음악의 새 장을 열었습니다.',
        majorWorks: [
      { id: '97', title: '봄의 제전' },
      { id: '98', title: '페트루슈카' },
      { id: '99', title: '불새' },
      { id: '100', title: '병사의 이야기' },
    ],
    style: '혁신적 리듬, 원시적 에너지, 신고전주의',
    influence: '20세기 현대 음악의 방향성 제시',
  },
  'prokofiev': {
    id: 'prokofiev',
    name: '프로코피예프',
    fullName: '세르게이 프로코피예프',
    englishName: 'Sergei Prokofiev',
    period: '근현대',
    birthYear: 1891,
    deathYear: 1953,
    nationality: '러시아',
    avatar: 'https://i.pravatar.cc/150?img=69',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '20세기 러시아 작곡가. 신고전주의 양식과 독특한 멜로디 감각으로 유명하며, 발레와 오페라, 교향곡 등 다양한 장르에서 활약했습니다.',
        majorWorks: [
      { id: '101', title: '피터와 늑대' },
      { id: '102', title: '로미오와 줄리엣' },
      { id: '103', title: '피아노 협주곡 3번' },
      { id: '104', title: '교향곡 5번' },
      { id: '105', title: '피아노 소나타 7번' },
    ],
    style: '신고전주의, 날카로운 리듬, 풍자적 표현',
    influence: '소비에트 음악의 발전, 현대 발레 음악에 큰 영향',
  },
  'shostakovich': {
    id: 'shostakovich',
    name: '쇼스타코비치',
    fullName: '드미트리 쇼스타코비치',
    englishName: 'Dmitri Shostakovich',
    period: '근현대',
    birthYear: 1906,
    deathYear: 1975,
    nationality: '러시아',
    avatar: 'https://i.pravatar.cc/150?img=70',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    bio: '소비에트 시대를 대표하는 작곡가. 정치적 억압 속에서도 15개의 교향곡과 15개의 현악 사중주를 남기며 인간의 고뇌를 음악으로 표현했습니다.',
        majorWorks: [
      { id: '106', title: '교향곡 5번' },
      { id: '107', title: '교향곡 7번 "레닌그라드"' },
      { id: '108', title: '교향곡 10번' },
      { id: '109', title: '현악 사중주 8번' },
      { id: '110', title: '피아노 협주곡 2번' },
    ],
    style: '풍자와 비극의 대비, 강렬한 표현, 복잡한 대위법',
    influence: '20세기 교향곡의 중요한 작곡가, 현대 작곡가들에게 영향',
  },
  'bartok': {
    id: 'bartok',
    name: '바르톡',
    fullName: '벨러 바르톡',
    englishName: 'Béla Bartók',
    period: '근현대',
    birthYear: 1881,
    deathYear: 1945,
    nationality: '헝가리',
    avatar: 'https://i.pravatar.cc/150?img=11',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '헝가리의 작곡가이자 민속음악 연구자. 동유럽 민속음악을 현대 음악 언어와 결합시켜 독창적인 스타일을 창조했습니다.',
        majorWorks: [
      { id: '111', title: '현악 사중주 1-6번' },
      { id: '112', title: '관현악을 위한 협주곡' },
      { id: '113', title: '피아노 협주곡 3번' },
      { id: '114', title: '루마니아 민속 무곡' },
      { id: '115', title: '미크로코스모스' },
    ],
    style: '민속음악 요소, 복잡한 리듬, 독특한 화성',
    influence: '민족주의 음악의 현대화, 현대 작곡 기법에 영향',
  },
  'ravel': {
    id: 'ravel',
    name: '라벨',
    fullName: '모리스 라벨',
    englishName: 'Maurice Ravel',
    period: '근현대',
    birthYear: 1875,
    deathYear: 1937,
    nationality: '프랑스',
    avatar: 'https://i.pravatar.cc/150?img=16',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '프랑스 인상주의 음악의 대가. 정교한 관현악법과 색채적 화성으로 유명하며, "볼레로"로 전 세계적 명성을 얻었습니다.',
        majorWorks: [
      { id: '116', title: '볼레로' },
      { id: '117', title: '다프니스와 클로에' },
      { id: '118', title: '피아노 협주곡 G장조' },
      { id: '119', title: '왈츠' },
      { id: '120', title: '죽은 왕녀를 위한 파반' },
    ],
    style: '정교한 관현악법, 인상주의적 색채, 완벽한 형식미',
    influence: '20세기 관현악법의 교과서, 현대 작곡가들에게 영향',
  },
  'gershwin': {
    id: 'gershwin',
    name: '거슈윈',
    fullName: '조지 거슈윈',
    englishName: 'George Gershwin',
    period: '근현대',
    birthYear: 1898,
    deathYear: 1937,
    nationality: '미국',
    avatar: 'https://i.pravatar.cc/150?img=17',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop',
    bio: '재즈와 클래식을 융합한 미국 작곡가. 38년의 짧은 생애 동안 미국 음악의 정체성을 확립했습니다.',
        majorWorks: [
      { id: '121', title: '랩소디 인 블루' },
      { id: '122', title: '파리의 미국인' },
      { id: '123', title: '포기와 베스' },
      { id: '124', title: '피아노 협주곡 F장조' },
      { id: '125', title: 'I Got Rhythm 변주곡' },
    ],
    style: '재즈와 클래식의 융합, 미국적 정서, 블루스 화성',
    influence: '미국 음악의 정체성 확립, 크로스오버 음악의 선구자',
  },
  'copland': {
    id: 'copland',
    name: '코플랜드',
    fullName: '아론 코플랜드',
    englishName: 'Aaron Copland',
    period: '근현대',
    birthYear: 1900,
    deathYear: 1990,
    nationality: '미국',
    avatar: 'https://i.pravatar.cc/150?img=18',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '미국 클래식 음악의 아버지. 미국의 개척정신과 광활한 자연을 음악으로 표현한 작곡가입니다.',
        majorWorks: [
      { id: '126', title: '애팔래치아의 봄' },
      { id: '127', title: '로데오' },
      { id: '128', title: '빌리 더 키드' },
      { id: '129', title: '팡파레' },
      { id: '130', title: '평범한 사람을 위한 팡파레' },
    ],
    style: '미국 민요 사용, 열린 화성, 서부 개척 정신',
    influence: '미국 음악의 정체성 확립, 영화 음악에 영향',
  },
  'bernstein': {
    id: 'bernstein',
    name: '번스타인',
    fullName: '레너드 번스타인',
    englishName: 'Leonard Bernstein',
    period: '근현대',
    birthYear: 1918,
    deathYear: 1990,
    nationality: '미국',
    avatar: 'https://i.pravatar.cc/150?img=19',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '작곡가이자 지휘자, 교육자. 클래식과 브로드웨이를 넘나들며 음악의 대중화에 기여했습니다.',
        majorWorks: [
      { id: '131', title: '웨스트 사이드 스토리' },
      { id: '132', title: '캔디드' },
      { id: '133', title: '온 더 타운' },
      { id: '134', title: '교향곡 2번 "불안의 시대"' },
      { id: '135', title: '세레나데' },
    ],
    style: '브로드웨이와 클래식 융합, 재즈 요소, 극적 표현',
    influence: '음악 교육의 선구자, 현대 뮤지컬 발전에 기여',
  },
  'williams': {
    id: 'williams',
    name: '존 윌리엄스',
    fullName: '존 윌리엄스',
    englishName: 'John Williams',
    period: '근현대',
    birthYear: 1932,
    deathYear: 2024,
    nationality: '미국',
    avatar: 'https://i.pravatar.cc/150?img=20',
    coverImage: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&h=400&fit=crop',
    bio: '영화 음악의 거장. 스타워즈, 해리포터, 인디아나 존스 등 수많은 명작 영화의 음악을 작곡했습니다.',
        majorWorks: [
      { id: '136', title: '스타워즈 메인 테마' },
      { id: '137', title: '쉰들러 리스트' },
      { id: '138', title: '해리포터와 마법사의 돌' },
      { id: '139', title: '인디아나 존스' },
      { id: '140', title: 'E.T.' },
    ],
    style: '웅장한 오케스트레이션, 기억하기 쉬운 주제, 낭만주의 전통',
    influence: '현대 영화 음악의 표준 확립',
  },
  'glass': {
    id: 'glass',
    name: '글래스',
    fullName: '필립 글래스',
    englishName: 'Philip Glass',
    period: '근현대',
    birthYear: 1937,
    deathYear: 2024,
    nationality: '미국',
    avatar: 'https://i.pravatar.cc/150?img=21',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&h=400&fit=crop',
    bio: '미니멀리즘 음악의 선구자. 반복적 패턴과 점진적 변화를 통해 독특한 음악 세계를 창조했습니다.',
        majorWorks: [
      { id: '141', title: '아인슈타인 온 더 비치' },
      { id: '142', title: '바이올린 협주곡 1번' },
      { id: '143', title: '글래스워크스' },
      { id: '144', title: '메타모포시스' },
      { id: '145', title: '시간의 해변' },
    ],
    style: '미니멀리즘, 반복 패턴, 점진적 변화',
    influence: '현대 음악과 영화 음악에 큰 영향',
  },
  'richter': {
    id: 'richter',
    name: '리히터',
    fullName: '막스 리히터',
    englishName: 'Max Richter',
    period: '근현대',
    birthYear: 1966,
    deathYear: 2024,
    nationality: '영국',
    avatar: 'https://i.pravatar.cc/150?img=22',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    bio: '현대 포스트클래시컬 음악의 대표 주자. 클래식과 전자음악을 결합하여 명상적이고 감성적인 음악을 창조합니다.',
        majorWorks: [
      { id: '146', title: 'Sleep' },
      { id: '147', title: 'Recomposed: Vivaldi - The Four Seasons' },
      { id: '148', title: 'On the Nature of Daylight' },
      { id: '149', title: 'Memoryhouse' },
      { id: '150', title: 'The Blue Notebooks' },
    ],
    style: '포스트클래시컬, 미니멀리즘, 전자음악 융합',
    influence: '현대 클래식과 영화 음악의 새로운 방향 제시',
  },
};

export default function ComposerDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [composer, setComposer] = React.useState<ComposerWithPieces | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPieceFormModal, setShowPieceFormModal] = React.useState(false);
  const [editingPiece, setEditingPiece] = React.useState<Piece | undefined>(undefined);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = React.useState(false);
  const coverImageOpacity = React.useRef(new Animated.Value(0)).current;
  const { canEdit } = useAuth();

  React.useEffect(() => {
    if (id) {
      loadComposer();
    }
  }, [id]);

  const loadComposer = async () => {
    setLoading(true);
    setImagesLoaded(false);
    setError(null);
    try {
      const data = await ComposerAPI.getById(Number(id));

      // 각 major piece의 상세 정보 가져오기
      if (data?.majorPieces && data.majorPieces.length > 0) {
        const detailedPieces = await Promise.all(
          data.majorPieces.map(async (piece) => {
            try {
              const fullPiece = await ComposerAPI.getPieceById(piece.id);
              return fullPiece || piece;
            } catch (error) {
              console.error(`Failed to load piece ${piece.id}:`, error);
              return piece;
            }
          })
        );
        data.majorPieces = detailedPieces;
      }

      setComposer(data);

      // 이미지 프리페치
      const imagesToLoad = [data.avatarUrl, data.coverImageUrl].filter(Boolean);
      await prefetchImages(imagesToLoad);
      setImagesLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load composer:', err);
      setError('작곡가 정보를 불러오는데 실패했습니다.');
      setLoading(false);
      setImagesLoaded(true);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await ComposerAPI.getById(Number(id));

      // 각 major piece의 상세 정보 가져오기
      if (data?.majorPieces && data.majorPieces.length > 0) {
        const detailedPieces = await Promise.all(
          data.majorPieces.map(async (piece) => {
            try {
              const fullPiece = await ComposerAPI.getPieceById(piece.id);
              return fullPiece || piece;
            } catch (error) {
              console.error(`Failed to load piece ${piece.id}:`, error);
              return piece;
            }
          })
        );
        data.majorPieces = detailedPieces;
      }

      setComposer(data);

      const imagesToLoad = [data.avatarUrl, data.coverImageUrl].filter(Boolean);
      await prefetchImages(imagesToLoad);

      setError(null);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to refresh composer:', err);
      setError('작곡가 정보를 불러오는데 실패했습니다.');
      setRefreshing(false);
    }
  }, [id]);

  const handlePieceClick = (pieceId: number, pieceTitle: string) => {
    router.push(`/(tabs)/compare?pieceId=${pieceId}&composerId=${id}`);
  };

  const handleDeletePiece = (pieceId: number, title: string) => {
    Alert.alert(
      '작품 삭제',
      `${title}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminPieceAPI.delete(pieceId);
              Alert.alert('성공', '작품이 삭제되었습니다.');
              loadComposer();
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleCoverImageLoad = () => {
    setCoverImageLoaded(true);
    Animated.timing(coverImageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCoverImageError = () => {
    setCoverImageLoaded(true);
    Animated.timing(coverImageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleDeleteComposer = () => {
    if (!composer) return;
    Alert.alert(
      '작곡가 삭제',
      `${composer.name}을(를) 삭제하시겠습니까? 모든 작품도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminComposerAPI.delete(composer.id);
              Alert.alert('성공', '작곡가가 삭제되었습니다.');
              router.back();
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading || !imagesLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="text-center text-muted-foreground mt-4">
          {loading ? '작곡가 정보를 불러오는 중...' : '이미지를 불러오는 중...'}
        </Text>
      </View>
    );
  }

  if (error || !composer) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Card className="p-8 w-full max-w-md">
          <Text className="text-center text-destructive mb-4">
            {error || '작곡가를 찾을 수 없습니다'}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            <Text>뒤로 가기</Text>
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cover Image with overlays */}
        <View className="relative h-64">
          {!coverImageLoaded && (
            <View className="h-full w-full bg-muted items-center justify-center">
              <ActivityIndicator size="large" />
            </View>
          )}
          {composer.coverImageUrl ? (
            Platform.OS === 'web' ? (
              <Image
                source={{ uri: getImageUrl(composer.coverImageUrl) }}
                className="h-full w-full"
                style={{ opacity: coverImageLoaded ? 1 : 0 }}
                resizeMode="cover"
                onLoad={handleCoverImageLoad}
                onError={handleCoverImageError}
              />
            ) : (
              <Animated.Image
                source={{ uri: getImageUrl(composer.coverImageUrl) }}
                className="h-full w-full"
                style={{ opacity: coverImageOpacity }}
                resizeMode="cover"
                onLoad={handleCoverImageLoad}
                onError={handleCoverImageError}
              />
            )
          ) : (
            <View
              className="h-full w-full bg-muted items-center justify-center"
              onLayout={handleCoverImageLoad}
            >
              <Icon as={MusicIcon} size={64} className="text-muted-foreground" />
            </View>
          )}
          <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
          
          {/* Theme and User Menu overlay at top */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pt-12 pb-3">
            <TouchableOpacity
              onPress={toggleColorScheme}
              className="size-10 items-center justify-center rounded-full bg-black/30"
            >
              <Icon as={colorScheme === 'dark' ? SunIcon : MoonStarIcon} size={24} color="white" />
            </TouchableOpacity>
            <View className="items-center justify-center rounded-full bg-black/30">
              <UserMenu iconColor="white" />
            </View>
          </View>
          
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4 bottom-4 rounded-full bg-black/50 p-2"
          >
            <Icon as={ArrowLeftIcon} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="gap-6 p-4 pb-20">
          {/* Profile Section */}
          <View className="items-center gap-3 -mt-12">
            <Avatar alt={composer.name} className="size-24 border-4 border-background">
              <AvatarImage source={{ uri: getImageUrl(composer.avatarUrl) }} />
              <AvatarFallback>
                <Text className="text-2xl">{composer.name[0]}</Text>
              </AvatarFallback>
            </Avatar>
            
            <View className="items-center gap-2">
              <Text className="text-2xl font-bold">{composer.fullName}</Text>
              <Text className="text-muted-foreground">{composer.englishName}</Text>
              <View className="flex-row items-center gap-2">
                <View
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: (ERA_COLORS[composer.period] || '#888') + '20',
                    borderWidth: 2,
                    borderColor: ERA_COLORS[composer.period] || '#888'
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: ERA_COLORS[composer.period] || '#888' }}
                  >
                    {composer.period}
                  </Text>
                </View>
                {composer.tier && (
                  <View
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: composer.tier === 'S' ? '#fbbf24' : composer.tier === 'A' ? '#a78bfa' : '#60a5fa',
                      borderWidth: 2,
                      borderColor: composer.tier === 'S' ? '#f59e0b' : composer.tier === 'A' ? '#8b5cf6' : '#3b82f6'
                    }}
                  >
                    <Text className="text-sm font-bold text-white">
                      Tier {composer.tier}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Basic Info */}
          <Card className="p-4">
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">
                  {composer.birthYear} - {composer.deathYear}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Icon as={MapPinIcon} size={16} className="text-muted-foreground" />
                <Text className="text-sm">{composer.nationality}</Text>
              </View>
            </View>
            {canEdit && (
              <View className="flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => setEditModalVisible(true)}
                >
                  <Icon as={EditIcon} size={16} className="mr-2" />
                  <Text>수정</Text>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={handleDeleteComposer}
                >
                  <Icon as={TrashIcon} size={16} className="mr-2" />
                  <Text>삭제</Text>
                </Button>
              </View>
            )}
          </Card>

          {/* Bio */}
          {composer.bio && (
            <Card className="p-4">
              <Text className="mb-2 text-lg font-bold">소개</Text>
              <Text className="leading-6 text-muted-foreground">{composer.bio}</Text>
            </Card>
          )}

          {/* Style */}
          {composer.style && (
            <Card className="p-4">
              <Text className="mb-2 text-lg font-bold">음악 스타일</Text>
              <Text className="leading-6 text-muted-foreground">{composer.style}</Text>
            </Card>
          )}

          {/* Influence */}
          {composer.influence && (
            <Card className="p-4">
              <Text className="mb-2 text-lg font-bold">음악사적 영향</Text>
              <Text className="leading-6 text-muted-foreground">{composer.influence}</Text>
            </Card>
          )}

          {/* Major Works */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold">주요 작품</Text>
              {canEdit && (
                <Button size="sm" onPress={() => {
                  setEditingPiece(undefined);
                  setShowPieceFormModal(true);
                }}>
                  <Icon as={PlusIcon} size={14} className="text-primary-foreground mr-1" />
                  <Text className="text-sm">작품 추가</Text>
                </Button>
              )}
            </View>
            {composer.majorPieces && composer.majorPieces.length > 0 ? (
              <View className="gap-2">
                {composer.majorPieces.map((work, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePieceClick(work.id, work.title)}
                    activeOpacity={0.7}
                  >
                    <Card className="p-4">
                      <View className="flex-row items-center gap-3">
                        <Icon as={MusicIcon} size={20} className="text-primary" />
                        <View className="flex-1">
                          <Text className="font-medium">{work.title}</Text>
                          {work.opusNumber && (
                            <Text className="text-sm text-muted-foreground">{work.opusNumber}</Text>
                          )}
                        </View>

                        {/* 음악 스트리밍 아이콘 */}
                        {(work.spotifyUrl || work.appleMusicUrl) && (
                          <View className="flex-row gap-2">
                            {work.spotifyUrl && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Linking.openURL(work.spotifyUrl!);
                                }}
                                className="h-8 w-8 items-center justify-center"
                              >
                                <Image
                                  source={require('@/assets/spotify.png')}
                                  className="h-8 w-8"
                                  resizeMode="contain"
                                />
                              </TouchableOpacity>
                            )}
                            {work.appleMusicUrl && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Linking.openURL(work.appleMusicUrl!);
                                }}
                                className="h-8 w-8 items-center justify-center"
                              >
                                <Image
                                  source={require('@/assets/apple_music_classical.png')}
                                  className="h-8 w-8"
                                  resizeMode="contain"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {/* 관리자 버튼 */}
                        {canEdit && (
                          <View className="flex-row gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onPress={async (e) => {
                                e.stopPropagation();
                                // Piece 전체 정보를 API로 가져오기
                                try {
                                  const pieceData = await ComposerAPI.getPieceById(work.id);
                                  setEditingPiece(pieceData);
                                  setShowPieceFormModal(true);
                                } catch (error) {
                                  console.error('Failed to load piece:', error);
                                  Alert.alert('오류', '작품 정보를 불러오는데 실패했습니다.');
                                }
                              }}
                            >
                              <Icon as={EditIcon} size={16} className="text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeletePiece(work.id, work.title);
                              }}
                            >
                              <Icon as={TrashIcon} size={16} className="text-destructive" />
                            </Button>
                          </View>
                        )}

                        <Icon as={ArrowLeftIcon} size={16} className="text-muted-foreground rotate-180" />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Card className="p-6">
                <Text className="text-center text-muted-foreground">
                  {canEdit ? '작품을 추가해주세요.' : '아직 등록된 주요 작품이 없습니다.'}
                </Text>
              </Card>
            )}
          </View>
        </View>

        {showPieceFormModal && (
          <PieceFormModal
            visible={showPieceFormModal}
            composerId={Number(id)}
            piece={editingPiece}
            onClose={() => {
              setShowPieceFormModal(false);
              setEditingPiece(undefined);
            }}
            onSuccess={loadComposer}
          />
        )}

        {/* Edit Modal */}
        {composer && (
          <ComposerFormModal
            visible={editModalVisible}
            composer={composer}
            onClose={() => setEditModalVisible(false)}
            onSuccess={() => {
              loadComposer();
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}
