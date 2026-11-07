import { HeroImage } from '@/components/hero/hero-image';
import { Icon } from '@/components/ui/icon';
import { Scrim } from '@/components/ui/scrim';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeroBannerProps {
  /** 초상·사진. 없으면 사진 없는 짧은 머리로 그린다 */
  image?: string | null;
  title: string;
  /** 이름 아래 한 줄 (시대·생몰년, 악기·국적 등) */
  meta?: readonly (string | null | undefined)[];
  wide: boolean;
  /** 좁은 화면에서 배너 위 왼쪽에 뜨는 뒤로 버튼 */
  onBack?: () => void;
}

/**
 * 작곡가·아티스트 화면 머리 (스포티파이 아티스트 화면 꼴). 초상을 화면 폭 배너로 깔고
 * 아래쪽을 어둡게 눌러 그 위 왼쪽 아래에 이름을 크게 쓴다. 본문 좌우 여백을 뚫고 가장자리까지 채운다.
 */
export function HeroBanner({ image, title, meta = [], wide, onBack }: HeroBannerProps) {
  const [width, setWidth] = React.useState(0);
  const insets = useSafeAreaInsets();
  const hasImage = Boolean(image);
  const height = wide ? (hasImage ? 380 : 240) : hasImage ? 340 : 230;
  const metaLine = meta.filter((part): part is string => Boolean(part)).join(' · ');

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className={cn('relative overflow-hidden bg-surface-2', wide ? '-mx-7' : '-mx-4')}
      style={{ height }}>
      {image ? <HeroImage uri={image} width={width} height={height} /> : null}
      {hasImage ? (
        <>
          <Scrim from="bottom" opacity={0.86} extent={72} />
          <Scrim from="top" opacity={0.3} extent={26} />
        </>
      ) : null}
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          className="absolute left-4 size-10 items-center justify-center rounded-full bg-black/40"
          style={{ top: insets.top + 10 }}>
          <Icon as={ArrowLeftIcon} size={20} className="text-white" />
        </Pressable>
      ) : null}
      <View className={cn('absolute inset-x-0 bottom-0', wide ? 'px-7 pb-7' : 'px-4 pb-5')}>
        <Text
          numberOfLines={2}
          className={cn(
            'font-black tracking-tight',
            hasImage ? 'text-white' : 'text-foreground',
            wide ? 'text-[84px] leading-[88px]' : 'text-[40px] leading-[44px]'
          )}>
          {title}
        </Text>
        {metaLine ? (
          <Text
            variant="bodySm"
            numberOfLines={1}
            className={cn('mt-2.5 font-medium', hasImage ? 'text-white/80' : 'text-foreground-muted')}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** 배너 아래 큰 재생 버튼 (스포티파이 머리 재생). 누르면 그 자리에서 바로 튼다 */
export function HeroPlayButton({
  label,
  onPress,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'size-14 items-center justify-center rounded-full bg-primary web:shadow-lg web:shadow-black/40 web:transition-transform web:duration-fast web:hover:scale-105 web:active:scale-95',
        busy && 'opacity-60'
      )}>
      <Icon as={PlayIcon} size={22} className="ml-0.5 fill-primary-foreground text-primary-foreground" />
    </Pressable>
  );
}
