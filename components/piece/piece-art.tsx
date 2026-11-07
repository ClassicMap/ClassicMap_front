import { EntityThumb } from '@/components/ui/entity-thumb';
import { FallbackArt } from '@/components/ui/fallback-art';
import { OptimizedImage } from '@/components/optimized-image';
import { Scrim } from '@/components/ui/scrim';
import type { ComparisonPiecePerformer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Image, View } from 'react-native';

interface PieceArtProps {
  /** 대표 연주 영상(YouTube id). 썸네일 가운데를 정사각으로 잘라 음반 표지로 쓴다 */
  coverVideoId?: string | null;
  /** 표지가 없을 때 쓸 그림(작곡가 초상) */
  fallbackImage?: string | null;
  /** 그림이 아예 없을 때 첫 글자를 딸 이름 */
  fallbackName: string;
  /** 표지 왼쪽 아래에 겹쳐 둘 연주자 얼굴. 비우면 얼굴 없이 표지만 */
  performers?: readonly ComparisonPiecePerformer[];
  size: number;
  radius?: number;
  className?: string;
}

/** hqdefault 는 480×360 에 16:9 화면을 위아래 검은 띠로 담는다. 화면 가운데 270×270 이 음반 표지 자리다 */
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 360;
const COVER_SIDE = 270;
const COVER_LEFT = (THUMB_WIDTH - COVER_SIDE) / 2;
const COVER_TOP = (THUMB_HEIGHT - COVER_SIDE) / 2;
/** 얼굴을 겹쳐 둘 만큼 큰 자리. 목록 줄 같은 작은 자리에는 표지만 */
const FACES_MIN_SIZE = 100;
const MAX_FACES = 4;

function coverThumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * 작품 그림 (스포티파이 앨범 카드). 대표 연주의 음반 표지를 크게 두고, 이 곡을 연주한 사람들을
 * 작은 동그란 얼굴로 왼쪽 아래에 겹쳐 둔다. 대표 연주 영상 대부분이 음반 표지를 띄운 공식 음원이라
 * 썸네일 가운데를 자르면 표지가 되고, 실황 영상이면 무대 가운데가 나온다.
 */
export function PieceArt({
  coverVideoId,
  fallbackImage,
  fallbackName,
  performers = [],
  size,
  radius,
  className,
}: PieceArtProps) {
  const corner = radius ?? Math.max(4, Math.round(size * 0.04));
  const [coverFailed, setCoverFailed] = React.useState(false);
  React.useEffect(() => setCoverFailed(false), [coverVideoId]);
  const scale = size / COVER_SIDE;
  const faces = size >= FACES_MIN_SIZE ? performers.slice(0, MAX_FACES) : [];
  const face = Math.max(20, Math.min(30, Math.round(size * 0.15)));
  const fallback = <FallbackArt name={fallbackName} shape="square" size={size} />;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('overflow-hidden bg-surface-3', className)}
      style={{ width: size, height: size, borderRadius: corner }}>
      {coverVideoId && !coverFailed ? (
        <Image
          source={{ uri: coverThumbUrl(coverVideoId) }}
          onError={() => setCoverFailed(true)}
          resizeMode="cover"
          style={{
            position: 'absolute',
            width: THUMB_WIDTH * scale,
            height: THUMB_HEIGHT * scale,
            left: -COVER_LEFT * scale,
            top: -COVER_TOP * scale,
          }}
        />
      ) : fallbackImage ? (
        <OptimizedImage uri={fallbackImage} fallbackComponent={fallback} resizeMode="cover" style={{ width: size, height: size }} />
      ) : (
        fallback
      )}
      {faces.length > 0 ? (
        <>
          <Scrim from="bottom" opacity={0.55} extent={38} />
          <View className="absolute flex-row" style={{ left: Math.round(size * 0.05), bottom: Math.round(size * 0.05) }}>
            {faces.map((performer, index) => (
              <View
                key={performer.artistId}
                className="rounded-full border-2 border-black/60"
                style={{ marginLeft: index === 0 ? 0 : -Math.round(face * 0.32) }}>
                <EntityThumb name={performer.artistName} image={performer.imageUrl} shape="circle" size={face} />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
