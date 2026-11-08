import { getHeroImageCandidates } from '@/lib/utils/image';
import * as React from 'react';

export type HeroImageLayout = 'cover' | 'side';

/**
 * 배너 그림 (웹).
 * - cover: 화면 폭으로 깔고 위쪽(얼굴)을 맞춘다. 세로가 긴 작곡가 초상용.
 * - side: 정사각 사진은 폭으로 자르면 머리카락만 남아서, 같은 사진을 흐리게 뒤에 깔고
 *   오른쪽에 높이에 맞춰 통째로 세운다(애플 뮤직 아티스트 화면). 연주자 사진용.
 * 큰 그림이 실패하면 다음 후보(원래 크기)로 넘어가고, 다 받으면 짧게 나타난다.
 */
export function HeroImage({
  uri,
  height,
  layout = 'cover',
  focalPoint = '50% 22%',
}: {
  uri: string;
  width: number;
  height: number;
  layout?: HeroImageLayout;
  /** cover 에서 얼굴이 오게 할 CSS object-position. 배너 전용 사진은 서버가 준다 */
  focalPoint?: string;
}) {
  const candidates = React.useMemo(() => getHeroImageCandidates(uri), [uri]);
  const [attempt, setAttempt] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const ref = React.useRef<HTMLImageElement | null>(null);
  const src = candidates[attempt];
  React.useLayoutEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);
  if (!src) return null;
  const common = {
    alt: '',
    'aria-hidden': true,
    draggable: false,
    className: 'cm-img-fade',
  } as const;
  const onError = () => {
    setLoaded(false);
    setAttempt((current) => current + 1);
  };

  if (layout === 'side') {
    return (
      <>
        <img
          {...common}
          src={src}
          style={{
            position: 'absolute',
            inset: -60,
            width: 'calc(100% + 120px)',
            height: 'calc(100% + 120px)',
            objectFit: 'cover',
            filter: 'blur(48px) saturate(1.1) brightness(0.5)',
            opacity: loaded ? 1 : 0,
          }}
        />
        <img
          {...common}
          ref={ref}
          src={src}
          onLoad={() => setLoaded(true)}
          onError={onError}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: height,
            height,
            objectFit: 'cover',
            objectPosition: '50% 30%',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 38%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 38%)',
            opacity: loaded ? 1 : 0,
          }}
        />
      </>
    );
  }

  return (
    <img
      {...common}
      ref={ref}
      src={src}
      onLoad={() => setLoaded(true)}
      onError={onError}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: focalPoint,
        opacity: loaded ? 1 : 0,
      }}
    />
  );
}
