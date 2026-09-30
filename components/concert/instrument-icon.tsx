import { Icon } from '@/components/ui/icon';
import { createClassicIcon } from '@/components/ui/icons';
import type { ConcertInstrumentKey } from '@/lib/data/concert-filters';
import {
  AudioLinesIcon,
  DramaIcon,
  type LucideIcon,
  MicVocalIcon,
  PianoIcon,
  SparklesIcon,
  UsersIcon,
  WindIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Circle, Path } from 'react-native-svg';

/** 현악 — lucide에 바이올린이 없어 몸통·f홀·목을 직접 긋는다 */
const StringsIcon = createClassicIcon('StringsIcon', () => (
  <>
    <Path d="M12 2.5v6.5" />
    <Circle cx={12} cy={2.8} r={0.9} />
    <Path d="M9.6 9.2c-1.9 0-2.9 1.4-2.4 2.9.3.9 1.1 1.2 1.1 2s-1.4 1.5-1.4 3.2c0 2.2 1.9 3.9 5.1 3.9s5.1-1.7 5.1-3.9c0-1.7-1.4-2.4-1.4-3.2s.8-1.1 1.1-2c.5-1.5-.5-2.9-2.4-2.9" />
    <Path d="M10.2 14.6v2.2M13.8 14.6v2.2" />
  </>
));

/** 실내악 — 크기가 다른 보면대 셋 대신 겹친 음표로 '여럿이 함께'를 보인다 */
const ChamberIcon = createClassicIcon('ChamberIcon', () => (
  <>
    <Path d="M8 18V7l10-2v11" />
    <Circle cx={6} cy={18} r={2} />
    <Circle cx={16} cy={16} r={2} />
    <Path d="M8 10.5l10-2" />
  </>
));

const LUCIDE: Partial<Record<ConcertInstrumentKey, LucideIcon>> = {
  piano: PianoIcon,
  winds: WindIcon,
  vocal: MicVocalIcon,
  choir: UsersIcon,
  orchestra: AudioLinesIcon,
  opera: DramaIcon,
  crossover: SparklesIcon,
};

interface InstrumentIconProps {
  code: ConcertInstrumentKey;
  size?: number;
  className?: string;
}

export function InstrumentIcon({ code, size = 20, className }: InstrumentIconProps) {
  if (code === 'strings') return <StringsIcon size={size} className={className} />;
  if (code === 'chamber') return <ChamberIcon size={size} className={className} />;
  const lucide = LUCIDE[code] ?? AudioLinesIcon;
  return <Icon as={lucide} size={size} className={className} />;
}
