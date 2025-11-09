import { Piece, ComposerMajorPiece } from '../types/models';

// 곡 목 데이터
export const PIECES: Piece[] = [
  // 바흐 (composer_id: 1)
  { id: 1, composerId: 1, title: '마태 수난곡', description: '바흐의 대표적인 종교 음악 작품', opusNumber: 'BWV 244', compositionYear: 1727 },
  { id: 2, composerId: 1, title: '브란덴부르크 협주곡', description: '6곡으로 이루어진 협주곡 모음', opusNumber: 'BWV 1046-1051', compositionYear: 1721 },
  { id: 3, composerId: 1, title: '골드베르크 변주곡', description: '30개의 변주로 이루어진 피아노 작품', opusNumber: 'BWV 988', compositionYear: 1741 },
  { id: 4, composerId: 1, title: '평균율 클라비어곡집', description: '24개 장조와 단조의 전주곡과 푸가', opusNumber: 'BWV 846-869', compositionYear: 1722 },
  { id: 5, composerId: 1, title: '무반주 첼로 모음곡', description: '첼로 독주를 위한 6개의 모음곡', opusNumber: 'BWV 1007-1012', compositionYear: 1720 },
  { id: 6, composerId: 1, title: '토카타와 푸가 D단조', description: '바흐의 가장 유명한 오르간 작품', opusNumber: 'BWV 565', compositionYear: 1704 },

  // 모차르트 (composer_id: 2)
  { id: 7, composerId: 2, title: '피가로의 결혼', description: '모차르트의 대표 오페라', opusNumber: 'K. 492', compositionYear: 1786 },
  { id: 8, composerId: 2, title: '돈 조반니', description: '드라마 지오코소 오페라', opusNumber: 'K. 527', compositionYear: 1787 },
  { id: 9, composerId: 2, title: '교향곡 40번', description: '모차르트의 대표적인 교향곡', opusNumber: 'K. 550', compositionYear: 1788 },
  { id: 10, composerId: 2, title: '마술피리', description: '독일어 징슈필 오페라', opusNumber: 'K. 620', compositionYear: 1791 },
  { id: 11, composerId: 2, title: '피아노 협주곡 21번', description: '서정적이고 아름다운 협주곡', opusNumber: 'K. 467', compositionYear: 1785 },
  { id: 12, composerId: 2, title: '레퀴엠', description: '모차르트가 완성하지 못한 진혼곡', opusNumber: 'K. 626', compositionYear: 1791 },

  // 베토벤 (composer_id: 3)
  { id: 13, composerId: 3, title: '교향곡 9번 "합창"', description: '환희의 송가가 포함된 교향곡', opusNumber: 'Op. 125', compositionYear: 1824 },
  { id: 14, composerId: 3, title: '교향곡 5번 "운명"', description: '유명한 "운명의 동기"로 시작', opusNumber: 'Op. 67', compositionYear: 1808 },
  { id: 15, composerId: 3, title: '피아노 소나타 "열정"', description: '격정적이고 극적인 소나타', opusNumber: 'Op. 57', compositionYear: 1806 },
  { id: 16, composerId: 3, title: '피아노 소나타 "월광"', description: '베토벤의 가장 유명한 소나타', opusNumber: 'Op. 27 No. 2', compositionYear: 1801 },
  { id: 17, composerId: 3, title: '현악 사중주 후기 작품', description: '베토벤 후기의 심오한 작품', opusNumber: 'Op. 127-135', compositionYear: 1825 },

  // 쇼팽 (composer_id: 4)
  { id: 18, composerId: 4, title: '발라드 1번', description: '쇼팽의 첫 번째 발라드', opusNumber: 'Op. 23', compositionYear: 1835 },
  { id: 19, composerId: 4, title: '녹턴 작품 9-2', description: '쇼팽의 가장 유명한 녹턴', opusNumber: 'Op. 9 No. 2', compositionYear: 1832 },
  { id: 20, composerId: 4, title: '에튀드 작품 10, 25', description: '쇼팽의 혁명적인 연습곡', opusNumber: 'Op. 10, Op. 25', compositionYear: 1833 },
  { id: 21, composerId: 4, title: '피아노 협주곡 1번', description: '쇼팽의 대표 협주곡', opusNumber: 'Op. 11', compositionYear: 1830 },
  { id: 22, composerId: 4, title: '폴로네즈 "영웅"', description: '폴란드 민족 무곡', opusNumber: 'Op. 53', compositionYear: 1842 },

  // 차이콥스키 (composer_id: 5)
  { id: 23, composerId: 5, title: '백조의 호수', description: '차이콥스키의 첫 발레 작품', opusNumber: 'Op. 20', compositionYear: 1876 },
  { id: 24, composerId: 5, title: '호두까기 인형', description: '크리스마스 발레의 대명사', opusNumber: 'Op. 71', compositionYear: 1892 },
  { id: 25, composerId: 5, title: '교향곡 6번 "비창"', description: '차이콥스키의 마지막 교향곡', opusNumber: 'Op. 74', compositionYear: 1893 },
  { id: 26, composerId: 5, title: '피아노 협주곡 1번', description: '화려하고 웅장한 협주곡', opusNumber: 'Op. 23', compositionYear: 1875 },
  { id: 27, composerId: 5, title: '1812 서곡', description: '나폴레옹 전쟁 승리 기념곡', opusNumber: 'Op. 49', compositionYear: 1880 },

  // 드뷔시 (composer_id: 6)
  { id: 28, composerId: 6, title: '목신의 오후 전주곡', description: '인상주의 음악의 시작', compositionYear: 1894 },
  { id: 29, composerId: 6, title: '달빛', description: '베르가마스크 모음곡 중 3악장', compositionYear: 1905 },
  { id: 30, composerId: 6, title: '바다', description: '3개의 교향적 스케치', compositionYear: 1905 },
  { id: 31, composerId: 6, title: '전주곡집', description: '24곡의 피아노 전주곡', compositionYear: 1910 },
  { id: 32, composerId: 6, title: '어린이 차지', description: '피아노를 위한 모음곡', compositionYear: 1908 },

  // 라흐마니노프 (composer_id: 7)
  { id: 33, composerId: 7, title: '피아노 협주곡 2번', description: '라흐마니노프의 대표 협주곡', opusNumber: 'Op. 18', compositionYear: 1901 },
  { id: 34, composerId: 7, title: '피아노 협주곡 3번', description: '피아노 협주곡 중 가장 어려운 곡', opusNumber: 'Op. 30', compositionYear: 1909 },
  { id: 35, composerId: 7, title: '파가니니 주제에 의한 랩소디', description: '파가니니 카프리스 변주곡', opusNumber: 'Op. 43', compositionYear: 1934 },
  { id: 36, composerId: 7, title: '교향곡 2번', description: '서정적이고 웅장한 교향곡', opusNumber: 'Op. 27', compositionYear: 1907 },
  { id: 37, composerId: 7, title: '전주곡 Op.3-2', description: '종의 전주곡', opusNumber: 'Op. 3 No. 2', compositionYear: 1892 },
];

// 작곡가 주요 곡 연결
export const COMPOSER_MAJOR_PIECES: ComposerMajorPiece[] = [
  // 바흐
  { id: 1, composerId: 1, pieceId: 1, displayOrder: 1 },
  { id: 2, composerId: 1, pieceId: 2, displayOrder: 2 },
  { id: 3, composerId: 1, pieceId: 3, displayOrder: 3 },
  { id: 4, composerId: 1, pieceId: 4, displayOrder: 4 },
  { id: 5, composerId: 1, pieceId: 5, displayOrder: 5 },
  
  // 모차르트
  { id: 6, composerId: 2, pieceId: 7, displayOrder: 1 },
  { id: 7, composerId: 2, pieceId: 8, displayOrder: 2 },
  { id: 8, composerId: 2, pieceId: 10, displayOrder: 3 },
  { id: 9, composerId: 2, pieceId: 9, displayOrder: 4 },
  { id: 10, composerId: 2, pieceId: 11, displayOrder: 5 },
  
  // 베토벤
  { id: 11, composerId: 3, pieceId: 13, displayOrder: 1 },
  { id: 12, composerId: 3, pieceId: 14, displayOrder: 2 },
  { id: 13, composerId: 3, pieceId: 15, displayOrder: 3 },
  { id: 14, composerId: 3, pieceId: 16, displayOrder: 4 },
  { id: 15, composerId: 3, pieceId: 17, displayOrder: 5 },
  
  // 쇼팽
  { id: 16, composerId: 4, pieceId: 18, displayOrder: 1 },
  { id: 17, composerId: 4, pieceId: 19, displayOrder: 2 },
  { id: 18, composerId: 4, pieceId: 20, displayOrder: 3 },
  { id: 19, composerId: 4, pieceId: 21, displayOrder: 4 },
  { id: 20, composerId: 4, pieceId: 22, displayOrder: 5 },
  
  // 차이콥스키
  { id: 21, composerId: 5, pieceId: 23, displayOrder: 1 },
  { id: 22, composerId: 5, pieceId: 24, displayOrder: 2 },
  { id: 23, composerId: 5, pieceId: 25, displayOrder: 3 },
  { id: 24, composerId: 5, pieceId: 26, displayOrder: 4 },
  { id: 25, composerId: 5, pieceId: 27, displayOrder: 5 },
  
  // 드뷔시
  { id: 26, composerId: 6, pieceId: 28, displayOrder: 1 },
  { id: 27, composerId: 6, pieceId: 29, displayOrder: 2 },
  { id: 28, composerId: 6, pieceId: 30, displayOrder: 3 },
  { id: 29, composerId: 6, pieceId: 31, displayOrder: 4 },
  { id: 30, composerId: 6, pieceId: 32, displayOrder: 5 },
  
  // 라흐마니노프
  { id: 31, composerId: 7, pieceId: 33, displayOrder: 1 },
  { id: 32, composerId: 7, pieceId: 34, displayOrder: 2 },
  { id: 33, composerId: 7, pieceId: 35, displayOrder: 3 },
  { id: 34, composerId: 7, pieceId: 36, displayOrder: 4 },
  { id: 35, composerId: 7, pieceId: 37, displayOrder: 5 },
];

// 유틸리티 함수들
export const getPieceById = (id: number): Piece | undefined => {
  return PIECES.find((p) => p.id === id);
};

export const getPiecesByComposer = (composerId: number): Piece[] => {
  return PIECES.filter((p) => p.composerId === composerId);
};

export const getMajorPiecesByComposer = (composerId: number): Piece[] => {
  const majorPieceIds = COMPOSER_MAJOR_PIECES
    .filter((cmp) => cmp.composerId === composerId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((cmp) => cmp.pieceId);
  
  return majorPieceIds
    .map((id) => PIECES.find((p) => p.id === id))
    .filter((p): p is Piece => p !== undefined);
};
