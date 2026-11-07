import { OptimizedImage } from '@/components/optimized-image';
import { FallbackArt } from '@/components/ui/fallback-art';
import type { ComparisonPiecePerformer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

interface PieceMosaicProps {
  /** 이 작품을 연주한 사람들. 사진 있는 사람만 칸에 쓴다 */
  performers: readonly ComparisonPiecePerformer[];
  /** 연주자 사진이 하나도 없을 때 쓸 그림(작곡가 초상) */
  fallbackImage?: string | null;
  /** 그림이 아예 없을 때 첫 글자를 딸 이름 */
  fallbackName: string;
  size: number;
  radius?: number;
  className?: string;
}

/** 작은 자리(목록 줄)에서는 네 칸이 너무 잘아 대표 한 장만 쓴다 */
const MOSAIC_MIN_SIZE = 64;

/**
 * 작품 그림. 같은 곡을 연주자마다 비교하는 서비스라, 스포티파이 플레이리스트 모자이크처럼
 * 이 곡을 연주한 사람들 사진을 2×2 로 붙인다. 3명이면 왼쪽 한 칸 + 오른쪽 두 칸, 2명이면 반반.
 * 사진이 없으면 작곡가 초상, 그것도 없으면 이름 첫 글자.
 */
export function PieceMosaic({ performers, fallbackImage, fallbackName, size, radius, className }: PieceMosaicProps) {
  const corner = radius ?? Math.max(4, Math.round(size * 0.04));
  const photos = React.useMemo(
    () => performers.filter((performer) => Boolean(performer.imageUrl)).slice(0, 4),
    [performers]
  );
  const frame = { width: size, height: size, borderRadius: corner };

  if (photos.length === 0 || size < MOSAIC_MIN_SIZE) {
    const single = photos[0]?.imageUrl ?? fallbackImage;
    const name = photos[0]?.artistName ?? fallbackName;
    const fallback = <FallbackArt name={name} shape="square" size={size} />;
    return (
      <View accessibilityElementsHidden className={cn('overflow-hidden bg-surface-3', className)} style={frame}>
        {single ? (
          <OptimizedImage uri={single} fallbackComponent={fallback} resizeMode="cover" style={{ width: size, height: size }} />
        ) : (
          fallback
        )}
      </View>
    );
  }

  const half = size / 2;
  const tile = (performer: ComparisonPiecePerformer, width: number, height: number) => (
    <OptimizedImage
      key={performer.artistId}
      uri={performer.imageUrl}
      fallbackComponent={<FallbackArt name={performer.artistName} shape="square" size={Math.max(width, height)} />}
      resizeMode="cover"
      style={{ width, height }}
    />
  );

  return (
    <View accessibilityElementsHidden className={cn('flex-row overflow-hidden bg-surface-3', className)} style={frame}>
      {photos.length === 1 ? (
        tile(photos[0], size, size)
      ) : photos.length === 2 ? (
        <>
          {tile(photos[0], half, size)}
          {tile(photos[1], half, size)}
        </>
      ) : photos.length === 3 ? (
        <>
          {tile(photos[0], half, size)}
          <View>
            {tile(photos[1], half, half)}
            {tile(photos[2], half, half)}
          </View>
        </>
      ) : (
        <>
          <View>
            {tile(photos[0], half, half)}
            {tile(photos[2], half, half)}
          </View>
          <View>
            {tile(photos[1], half, half)}
            {tile(photos[3], half, half)}
          </View>
        </>
      )}
    </View>
  );
}
