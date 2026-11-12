import { FullscreenOverlay } from '@/features/compare/components/fullscreen-overlay';
import type { MobileFullscreenProps } from '@/features/compare/components/mobile-fullscreen';
import { Icon } from '@/components/ui/icon';
import { t, useLocale } from '@/lib/i18n';
import { comparePlayer, useComparePlayer, usePlayerOverlay } from '@/lib/player/compare-player-store';
import { MaximizeIcon } from 'lucide-react-native';
import * as React from 'react';
import { createPortal } from 'react-dom';

export type { MobileFullscreenProps };

function isTouchScreen(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

/**
 * 좁은 화면(모바일 웹) 비교의 전체 화면. 영상 오른쪽 위 단추로 들어가고, 넓은 화면과 같은 조작부
 * (지금 연주 이름·연주자 칩·재생·위치·나가기)를 쓴다. 전체 화면에서 연주자를 바꿔도 같은 영상이라
 * 풀리지 않는다. 영상 기본 조작부의 전체 화면은 영상만 띄워 연주자를 못 바꾸므로 쓰지 않는다
 */
export function MobileFullscreen({ performances, active, sectorName, activeId, imageOf, onPick }: MobileFullscreenProps) {
  useLocale();
  const overlay = usePlayerOverlay();
  const fullscreen = useComparePlayer((state) => state.fullscreen);
  const playing = useComparePlayer((state) => state.playing);
  const [touch] = React.useState(isTouchScreen);

  // 이 화면을 떠나면 전체 화면(화면 덮기)도 풀어 다른 화면이 가려지지 않게 한다
  React.useEffect(
    () => () => {
      if (comparePlayer.getState().fullscreen) comparePlayer.exitFullscreen();
    },
    []
  );

  if (!overlay || !active) return null;
  if (fullscreen) {
    return createPortal(
      <FullscreenOverlay
        performances={performances}
        active={active}
        sectorName={sectorName}
        activeId={activeId}
        imageOf={imageOf}
        onPick={onPick}
        onTogglePlay={() => comparePlayer.togglePlay()}
        playing={playing}
        onExit={() => comparePlayer.exitFullscreen()}
        touch={touch}
      />,
      overlay
    );
  }
  return createPortal(
    <button
      type="button"
      aria-label={t('전체 화면')}
      title={t('전체 화면')}
      onClick={() => comparePlayer.requestFullscreen()}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 36,
        height: 36,
        borderRadius: 999,
        border: 'none',
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}>
      <Icon as={MaximizeIcon} size={16} className="text-white" />
    </button>,
    overlay
  );
}
