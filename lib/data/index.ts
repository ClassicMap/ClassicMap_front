// 중앙집중식 데이터 export

export * from './composers';
export * from './pieces';
export * from './artists';
export * from './periods';

export * from '../types/models';

// 모든 데이터를 한번에 가져올 수 있는 객체
import { COMPOSERS } from './composers';
import { PIECES, COMPOSER_MAJOR_PIECES } from './pieces';
import { ARTISTS, PERFORMANCES } from './artists';
import { PERIODS, ERA_COLORS } from './periods';

export const MockData = {
  composers: COMPOSERS,
  pieces: PIECES,
  composerMajorPieces: COMPOSER_MAJOR_PIECES,
  artists: ARTISTS,
  performances: PERFORMANCES,
  periods: PERIODS,
  eraColors: ERA_COLORS,
};
