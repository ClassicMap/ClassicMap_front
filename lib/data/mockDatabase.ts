// ============================================
// Mock Database - database_schema.sql과 동일한 구조
// ============================================

import type { 
  Composer, 
  Piece, 
  ComposerMajorPiece, 
  Artist, 
  Performance 
} from '@/lib/types/models';

// ============================================
// 1. 작곡가 (Composers)
// ============================================
export const MOCK_COMPOSERS: Composer[] = [
  {
    id: 1,
    name: '바흐',
    fullName: '요한 제바스티안 바흐',
    englishName: 'Johann Sebastian Bach',
    period: '바로크',
    birthYear: 1685,
    deathYear: 1750,
    nationality: '독일',
    imageUrl: 'https://i.pravatar.cc/150?img=33',
    bio: '바로크 시대의 가장 위대한 작곡가 중 한 명. 대위법의 대가로, 종교 음악과 기악 음악 모든 분야에서 뛰어난 작품을 남겼습니다.',
    style: '정교한 대위법, 깊은 종교성, 수학적 구조미',
    influence: '모차르트, 베토벤, 멘델스존 등 후대 작곡가들에게 지대한 영향',
  },
  {
    id: 2,
    name: '모차르트',
    fullName: '볼프강 아마데우스 모차르트',
    englishName: 'Wolfgang Amadeus Mozart',
    period: '고전주의',
    birthYear: 1756,
    deathYear: 1791,
    nationality: '오스트리아',
    imageUrl: 'https://i.pravatar.cc/150?img=12',
    bio: '천재 음악가의 대명사. 35년이라는 짧은 생애 동안 600곡이 넘는 작품을 남겼으며, 오페라, 교향곡, 협주곡 모든 분야에서 걸작을 창조했습니다.',
    style: '완벽한 형식미, 맑고 우아한 선율, 균형잡힌 구조',
    influence: '고전주의 음악의 정점, 베토벤과 슈베르트에게 큰 영향',
  },
  {
    id: 3,
    name: '베토벤',
    fullName: '루트비히 판 베토벤',
    englishName: 'Ludwig van Beethoven',
    period: '고전주의',
    birthYear: 1770,
    deathYear: 1827,
    nationality: '독일',
    imageUrl: 'https://i.pravatar.cc/150?img=59',
    bio: '고전주의에서 낭만주의로 넘어가는 교량 역할을 한 위대한 작곡가. 청각 장애를 극복하고 인류 역사상 가장 위대한 음악을 남겼습니다.',
    style: '영웅적이고 극적인 표현, 형식의 확대와 혁신',
    influence: '이후 모든 작곡가들에게 절대적 영향',
  },
  {
    id: 4,
    name: '쇼팽',
    fullName: '프레데리크 쇼팽',
    englishName: 'Frédéric Chopin',
    period: '낭만주의',
    birthYear: 1810,
    deathYear: 1849,
    nationality: '폴란드',
    imageUrl: 'https://i.pravatar.cc/150?img=13',
    bio: '피아노의 시인. 거의 모든 작품을 피아노를 위해 작곡했으며, 피아노 음악의 가능성을 극대화한 작곡가입니다.',
    style: '서정적 선율, 섬세한 화성, 폴란드 민족 정서',
    influence: '피아노 음악의 혁명, 리스트, 드뷔시 등에게 영향',
  },
  {
    id: 5,
    name: '차이콥스키',
    fullName: '표트르 일리치 차이콥스키',
    englishName: 'Pyotr Ilyich Tchaikovsky',
    period: '낭만주의',
    birthYear: 1840,
    deathYear: 1893,
    nationality: '러시아',
    imageUrl: 'https://i.pravatar.cc/150?img=60',
    bio: '러시아 낭만주의의 거장. 발레 음악과 교향곡, 협주곡에서 뛰어난 업적을 남겼습니다.',
    style: '정열적이고 극적인 표현, 러시아 민족적 색채',
    influence: '러시아 음악의 세계화에 기여',
  },
  {
    id: 6,
    name: '라흐마니노프',
    fullName: '세르게이 라흐마니노프',
    englishName: 'Sergei Rachmaninoff',
    period: '근현대',
    birthYear: 1873,
    deathYear: 1943,
    nationality: '러시아',
    imageUrl: 'https://i.pravatar.cc/150?img=65',
    bio: '낭만주의의 마지막 거장. 피아니스트이자 작곡가로서 풍부한 화성과 서정적 선율의 작품을 남겼습니다.',
    style: '풍부한 화성, 서정적 선율, 러시아적 우수',
    influence: '20세기 피아노 음악에 지대한 영향',
  },
  {
    id: 7,
    name: '드뷔시',
    fullName: '클로드 드뷔시',
    englishName: 'Claude Debussy',
    period: '근현대',
    birthYear: 1862,
    deathYear: 1918,
    nationality: '프랑스',
    imageUrl: 'https://i.pravatar.cc/150?img=56',
    bio: '인상주의 음악의 창시자. 전통적인 화성과 형식에서 벗어나 새로운 음악 언어를 창조했습니다.',
    style: '색채적 화성, 섬세한 음향, 자유로운 형식',
    influence: '20세기 현대 음악의 문을 연 선구자',
  },
];

// ============================================
// 2. 곡 (Pieces)
// ============================================
export const MOCK_PIECES: Piece[] = [
  // 바흐 곡들
  {
    id: 1,
    composerId: 1,
    title: '골드베르크 변주곡',
    description: '바흐의 건반 음악 중 최고봉으로 평가받는 작품입니다. 아리아 주제와 30개의 변주로 구성되어 있으며, 연주자의 해석에 따라 완전히 다른 곡이 됩니다.',
    opusNumber: 'BWV 988',
    compositionYear: 1741,
  },
  {
    id: 2,
    composerId: 1,
    title: '평균율 클라비어 1권',
    description: '24개 장조와 단조의 전주곡과 푸가 모음집으로, 서양 음악의 구약성경이라 불립니다.',
    opusNumber: 'BWV 846-869',
    compositionYear: 1722,
  },
  {
    id: 3,
    composerId: 1,
    title: '토카타와 푸가 D단조',
    description: '바흐의 오르간 작품 중 가장 유명한 곡으로, 극적인 토카타 도입부가 인상적입니다.',
    opusNumber: 'BWV 565',
    compositionYear: 1704,
  },
  // 모차르트 곡들
  {
    id: 4,
    composerId: 2,
    title: '피아노 협주곡 21번',
    description: '모차르트의 협주곡 중 가장 서정적이고 아름다운 작품입니다. 2악장은 영화 "엘비라 마디간"에 사용되어 유명해졌습니다.',
    opusNumber: 'K. 467',
    compositionYear: 1785,
  },
  {
    id: 5,
    composerId: 2,
    title: '레퀴엠',
    description: '모차르트가 생전에 완성하지 못하고 세상을 떠난 작품입니다. 죽음에 대한 명상과 구원의 메시지가 담겨 있습니다.',
    opusNumber: 'K. 626',
    compositionYear: 1791,
  },
  {
    id: 6,
    composerId: 2,
    title: '터키 행진곡',
    description: '피아노 소나타 11번의 3악장으로, 경쾌하고 귀여운 선율로 사랑받는 곡입니다.',
    opusNumber: 'K. 331',
    compositionYear: 1783,
  },
  // 베토벤 곡들
  {
    id: 7,
    composerId: 3,
    title: '피아노 소나타 23번 "열정"',
    description: '베토벤의 가장 극적이고 격렬한 소나타 중 하나입니다. 1악장의 강렬한 리듬과 3악장의 폭풍 같은 전개가 인상적입니다.',
    opusNumber: 'Op. 57',
    compositionYear: 1806,
  },
  {
    id: 8,
    composerId: 3,
    title: '피아노 소나타 14번 "월광"',
    description: '베토벤이 사랑했던 여제자에게 헌정한 작품입니다. 1악장의 명상적인 분위기와 3악장의 격정적인 대비가 특징입니다.',
    opusNumber: 'Op. 27 No. 2',
    compositionYear: 1801,
  },
  {
    id: 9,
    composerId: 3,
    title: '교향곡 9번 "합창"',
    description: '베토벤의 마지막 교향곡이자 인류 역사상 가장 위대한 작품 중 하나입니다. 4악장의 "환희의 송가"는 전 세계인이 사랑하는 선율입니다.',
    opusNumber: 'Op. 125',
    compositionYear: 1824,
  },
  // 쇼팽 곡들
  {
    id: 10,
    composerId: 4,
    title: '발라드 1번',
    description: '쇼팽의 4개 발라드 중 첫 번째 작품으로, 서정적인 선율과 극적인 전개가 특징입니다.',
    opusNumber: 'Op. 23',
    compositionYear: 1835,
  },
  {
    id: 11,
    composerId: 4,
    title: '녹턴 Op.9 No.2',
    description: '쇼팽의 가장 유명한 녹턴 중 하나로, 밤의 정취를 담은 서정적인 작품입니다.',
    opusNumber: 'Op. 9 No. 2',
    compositionYear: 1832,
  },
  {
    id: 12,
    composerId: 4,
    title: '영웅 폴로네즈',
    description: '쇼팽의 폴로네즈 중 가장 웅장하고 화려한 곡으로, 폴란드의 영웅적 정신을 담았습니다.',
    opusNumber: 'Op. 53',
    compositionYear: 1842,
  },
  {
    id: 13,
    composerId: 4,
    title: '피아노 협주곡 1번',
    description: '쇼팽이 20세에 작곡한 협주곡으로, 2악장의 로맨틱한 선율이 특히 유명합니다.',
    opusNumber: 'Op. 11',
    compositionYear: 1830,
  },
  // 차이콥스키 곡들
  {
    id: 14,
    composerId: 5,
    title: '피아노 협주곡 1번',
    description: '웅장한 호른의 서주로 시작하는 차이콥스키의 대표작입니다.',
    opusNumber: 'Op. 23',
    compositionYear: 1875,
  },
  {
    id: 15,
    composerId: 5,
    title: '백조의 호수',
    description: '클래식 발레의 걸작으로, 백조로 변한 공주의 슬픈 사랑 이야기를 담았습니다.',
    opusNumber: 'Op. 20',
    compositionYear: 1876,
  },
  {
    id: 16,
    composerId: 5,
    title: '교향곡 6번 "비창"',
    description: '차이콥스키의 마지막 교향곡으로, 죽음을 예감한 듯한 비극적 정서가 담겨 있습니다.',
    opusNumber: 'Op. 74',
    compositionYear: 1893,
  },
  // 라흐마니노프 곡들
  {
    id: 17,
    composerId: 6,
    title: '피아노 협주곡 2번',
    description: '라흐마니노프의 가장 유명한 작품으로, 풍부한 화성과 서정적인 선율이 특징입니다.',
    opusNumber: 'Op. 18',
    compositionYear: 1901,
  },
  {
    id: 18,
    composerId: 6,
    title: '피아노 협주곡 3번',
    description: '피아노 협주곡 중 가장 어려운 곡으로 손꼽히는 작품입니다.',
    opusNumber: 'Op. 30',
    compositionYear: 1909,
  },
  {
    id: 19,
    composerId: 6,
    title: '보칼리제',
    description: '가사 없이 모음으로만 부르는 성악곡으로, 라흐마니노프 특유의 애절한 선율이 돋보입니다.',
    opusNumber: 'Op. 34 No. 14',
    compositionYear: 1915,
  },
];

// ============================================
// 3. 작곡가 주요 곡 연결
// ============================================
export const MOCK_COMPOSER_MAJOR_PIECES: ComposerMajorPiece[] = [
  // 바흐
  { id: 1, composerId: 1, pieceId: 1, displayOrder: 1 },
  { id: 2, composerId: 1, pieceId: 2, displayOrder: 2 },
  { id: 3, composerId: 1, pieceId: 3, displayOrder: 3 },
  // 모차르트
  { id: 4, composerId: 2, pieceId: 4, displayOrder: 1 },
  { id: 5, composerId: 2, pieceId: 5, displayOrder: 2 },
  { id: 6, composerId: 2, pieceId: 6, displayOrder: 3 },
  // 베토벤
  { id: 7, composerId: 3, pieceId: 7, displayOrder: 1 },
  { id: 8, composerId: 3, pieceId: 8, displayOrder: 2 },
  { id: 9, composerId: 3, pieceId: 9, displayOrder: 3 },
  // 쇼팽
  { id: 10, composerId: 4, pieceId: 10, displayOrder: 1 },
  { id: 11, composerId: 4, pieceId: 11, displayOrder: 2 },
  { id: 12, composerId: 4, pieceId: 12, displayOrder: 3 },
  { id: 13, composerId: 4, pieceId: 13, displayOrder: 4 },
  // 차이콥스키
  { id: 14, composerId: 5, pieceId: 14, displayOrder: 1 },
  { id: 15, composerId: 5, pieceId: 15, displayOrder: 2 },
  { id: 16, composerId: 5, pieceId: 16, displayOrder: 3 },
  // 라흐마니노프
  { id: 17, composerId: 6, pieceId: 17, displayOrder: 1 },
  { id: 18, composerId: 6, pieceId: 18, displayOrder: 2 },
  { id: 19, composerId: 6, pieceId: 19, displayOrder: 3 },
];

// ============================================
// 4. 아티스트 (Artists)
// ============================================
export const MOCK_ARTISTS: Artist[] = [
  {
    id: 1,
    name: '조성진',
    englishName: 'Seong-Jin Cho',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    nationality: '대한민국',
    birthYear: '1994',
    bio: '2015년 쇼팽 콩쿠르 우승자로, 섬세하고 깊이 있는 해석으로 전 세계 클래식 음악 팬들의 사랑을 받고 있습니다.',
    style: '섬세하고 시적인 표현, 명료한 터치, 깊이 있는 음악성',
    concertCount: 120,
    countryCount: 35,
    albumCount: 8,
  },
  {
    id: 2,
    name: '임윤찬',
    englishName: 'Yunchan Lim',
    category: '피아니스트',
    tier: 'Rising',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    nationality: '대한민국',
    birthYear: '2004',
    bio: '2022년 반 클라이번 콩쿠르 최연소 우승자. 압도적인 기교와 깊은 음악성으로 세계를 놀라게 한 신성입니다.',
    style: '압도적 기교, 성숙한 음악성, 깊이 있는 해석',
    concertCount: 50,
    countryCount: 15,
    albumCount: 2,
  },
  {
    id: 3,
    name: '마르타 아르헤리치',
    englishName: 'Martha Argerich',
    category: '피아니스트',
    tier: 'S',
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    nationality: '아르헨티나',
    birthYear: '1941',
    bio: '20세기 최고의 피아니스트 중 한 명. 격정적이고 자유로운 해석으로 유명합니다.',
    style: '격정적이고 자유로운 템포, 강렬한 다이나믹',
    concertCount: 500,
    countryCount: 60,
    albumCount: 50,
  },
  {
    id: 4,
    name: '유자 왕',
    englishName: 'Yuja Wang',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    nationality: '중국',
    birthYear: '1987',
    bio: '화려한 테크닉과 카리스마 넘치는 연주로 전 세계를 사로잡은 피아니스트입니다.',
    style: '화려한 테크닉, 드라마틱한 표현',
    concertCount: 200,
    countryCount: 45,
    albumCount: 15,
  },
  {
    id: 5,
    name: '랑랑',
    englishName: 'Lang Lang',
    category: '피아니스트',
    tier: 'S',
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    nationality: '중국',
    birthYear: '1982',
    bio: '세계에서 가장 유명한 피아니스트 중 한 명. 화려하고 열정적인 연주 스타일이 특징입니다.',
    style: '화려하고 열정적인 연주, 극적인 표현',
    concertCount: 300,
    countryCount: 50,
    albumCount: 20,
  },
  {
    id: 6,
    name: '다니엘 바렌보임',
    englishName: 'Daniel Barenboim',
    category: '피아니스트',
    tier: 'S',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    nationality: '아르헨티나',
    birthYear: '1942',
    bio: '피아니스트이자 지휘자로 활동하는 거장. 지적이고 구조적인 해석이 특징입니다.',
    style: '지적이고 구조적인 접근, 깊이 있는 해석',
    concertCount: 600,
    countryCount: 70,
    albumCount: 100,
  },
  {
    id: 7,
    name: '글렌 굴드',
    englishName: 'Glenn Gould',
    category: '피아니스트',
    tier: 'S',
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    nationality: '캐나다',
    birthYear: '1932',
    bio: '바흐 해석의 대가. 독창적이고 혁신적인 연주로 전설이 된 피아니스트입니다.',
    style: '명료한 아티큘레이션, 독창적 해석',
    concertCount: 100,
    countryCount: 20,
    albumCount: 40,
  },
];

// ============================================
// 5. 연주 (Performances)
// ============================================
export const MOCK_PERFORMANCES: Performance[] = [
  // 쇼팽 발라드 1번 연주들
  {
    id: 1,
    pieceId: 10,
    artistId: 3,
    videoPlatform: 'youtube',
    videoId: 'Ce8p0VcTbuA',
    startTime: 0,
    endTime: 540,
    characteristic: '격정적이고 자유로운 템포, 강렬한 다이나믹',
    viewCount: 1500000,
    rating: 4.9,
  },
  {
    id: 2,
    pieceId: 10,
    artistId: 2,
    videoPlatform: 'youtube',
    videoId: 'tJT3v2KIWOM',
    startTime: 0,
    endTime: 540,
    characteristic: '섬세하고 서정적인 해석, 명확한 구조감',
    viewCount: 800000,
    rating: 4.8,
  },
  {
    id: 3,
    pieceId: 10,
    artistId: 4,
    videoPlatform: 'youtube',
    videoId: '_I6kQ7F5hrs',
    startTime: 0,
    endTime: 540,
    characteristic: '화려한 테크닉, 드라마틱한 표현',
    viewCount: 1200000,
    rating: 4.7,
  },
  // 쇼팽 녹턴 Op.9 No.2 연주들
  {
    id: 4,
    pieceId: 11,
    artistId: 1,
    videoPlatform: 'youtube',
    videoId: 'liTSRH4fix4',
    startTime: 0,
    endTime: 270,
    characteristic: '현대적 감성, 섬세한 터치와 절제미',
    viewCount: 2000000,
    rating: 4.9,
  },
  // 베토벤 열정 소나타 연주들
  {
    id: 5,
    pieceId: 7,
    artistId: 6,
    videoPlatform: 'youtube',
    videoId: 'hbVGB85C0-Y',
    startTime: 0,
    endTime: 600,
    characteristic: '지적이고 구조적인 접근, 깊이 있는 해석',
    viewCount: 900000,
    rating: 4.8,
  },
  {
    id: 6,
    pieceId: 7,
    artistId: 1,
    videoPlatform: 'youtube',
    videoId: 'SrcOcKYQX3c',
    startTime: 0,
    endTime: 600,
    characteristic: '젊고 역동적인 에너지, 명확한 아티큘레이션',
    viewCount: 750000,
    rating: 4.7,
  },
  // 라흐마니노프 협주곡 2번 연주들
  {
    id: 7,
    pieceId: 17,
    artistId: 5,
    videoPlatform: 'youtube',
    videoId: 'rEGOihjqO9w',
    startTime: 0,
    endTime: 660,
    characteristic: '화려하고 열정적인 연주, 극적인 표현',
    viewCount: 3000000,
    rating: 4.6,
  },
  {
    id: 8,
    pieceId: 17,
    artistId: 4,
    videoPlatform: 'youtube',
    videoId: 'L8cCPH1qnYI',
    startTime: 0,
    endTime: 660,
    characteristic: '섬세한 감성, 서정적이고 우아한 터치',
    viewCount: 2500000,
    rating: 4.8,
  },
  // 골드베르크 변주곡 연주들
  {
    id: 9,
    pieceId: 1,
    artistId: 7,
    videoPlatform: 'youtube',
    videoId: 'N2YMSt3yfko',
    startTime: 0,
    endTime: 2400,
    characteristic: '빠른 템포, 명료한 아티큘레이션, 젊은 에너지 (1955년 녹음)',
    viewCount: 5000000,
    rating: 5.0,
  },
  {
    id: 10,
    pieceId: 1,
    artistId: 7,
    videoPlatform: 'youtube',
    videoId: 'aEkXet4WX_c',
    startTime: 0,
    endTime: 3000,
    characteristic: '느린 템포, 명상적이고 깊이 있는 해석 (1981년 녹음)',
    viewCount: 4000000,
    rating: 5.0,
  },
  // 차이콥스키 협주곡 1번 연주들
  {
    id: 11,
    pieceId: 14,
    artistId: 5,
    videoPlatform: 'youtube',
    videoId: 'BWerj8FcprM',
    startTime: 0,
    endTime: 2100,
    characteristic: '화려하고 극적인 연주, 압도적인 스케일',
    viewCount: 2800000,
    rating: 4.7,
  },
  {
    id: 12,
    pieceId: 14,
    artistId: 3,
    videoPlatform: 'youtube',
    videoId: 'q7HfhGau-1k',
    startTime: 0,
    endTime: 2100,
    characteristic: '격정적이고 자유로운 해석, 강렬한 에너지',
    viewCount: 1800000,
    rating: 4.9,
  },
];

// ============================================
// 헬퍼 함수들
// ============================================

export function getComposerById(id: number): Composer | undefined {
  return MOCK_COMPOSERS.find(c => c.id === id);
}

export function getPieceById(id: number): Piece | undefined {
  return MOCK_PIECES.find(p => p.id === id);
}

export function getArtistById(id: number): Artist | undefined {
  return MOCK_ARTISTS.find(a => a.id === id);
}

export function getPiecesByComposerId(composerId: number): Piece[] {
  return MOCK_PIECES.filter(p => p.composerId === composerId);
}

export function getMajorPiecesByComposerId(composerId: number): Piece[] {
  const majorPieceIds = MOCK_COMPOSER_MAJOR_PIECES
    .filter(cmp => cmp.composerId === composerId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(cmp => cmp.pieceId);
  
  return majorPieceIds
    .map(id => MOCK_PIECES.find(p => p.id === id))
    .filter((p): p is Piece => p !== undefined);
}

export function getPerformancesByPieceId(pieceId: number): Performance[] {
  return MOCK_PERFORMANCES.filter(p => p.pieceId === pieceId);
}

export function getPerformancesByArtistId(artistId: number): Performance[] {
  return MOCK_PERFORMANCES.filter(p => p.artistId === artistId);
}

export function getComposersByPeriod(period: string): Composer[] {
  return MOCK_COMPOSERS.filter(c => c.period === period);
}
