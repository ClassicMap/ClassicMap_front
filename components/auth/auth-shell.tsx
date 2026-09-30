import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { CompareIcon, EraIcon, RepertoireIcon, TicketIcon } from '@/components/ui/icons';
import { getEraColor } from '@/lib/design/era-palette';
import { useRecommendedComposers } from '@/lib/query/hooks/useComposers';
import type { Composer } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

interface AuthShellProps {
  children: React.ReactNode;
  /** 닫기(뒤로). 없으면 버튼을 그리지 않는다 */
  onClose?: () => void;
}

/**
 * 로그인·회원가입·비밀번호 화면의 틀 (3차 시안 Auth).
 * 데스크톱은 왼쪽에 이 앱이 무엇을 하는지(클래식 로드맵)를, 오른쪽에 400px 폼을 둔다.
 */
export function AuthShell({ children, onClose }: AuthShellProps) {
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';

  const form = (
    <View className="w-full max-w-[400px]">
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          className={cn('mb-4 size-11 items-center justify-center rounded-full', wide ? 'self-end bg-surface-2' : '-ml-2.5')}>
          <Icon as={XIcon} size={20} className="text-foreground" />
        </Pressable>
      ) : null}
      {!wide ? <BrandMark size={40} /> : null}
      {children}
    </View>
  );

  if (!wide) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="px-6 pb-10 pt-4 mt-safe">
        {form}
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 flex-row bg-background">
      <BrandPanel />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="min-h-full items-center justify-center px-12 py-12">
        {form}
      </ScrollView>
    </View>
  );
}

function BrandMark({ size }: { size: number }) {
  return <BrandLogo size={size} className="mb-5" />;
}

/**
 * 왼쪽 패널: 이 앱이 클래식을 따라가는 지도라는 걸 보여 준다.
 * 추천 작곡가를 태어난 해 자리에 올린 노선도 한 줄과, 그 길에서 할 수 있는 네 가지를 둔다.
 */
function BrandPanel() {
  return (
    <View className="w-1/2 max-w-[760px] overflow-hidden bg-[#0B0A09]">
      <View className="flex-1 justify-between px-14 py-12">
        <View className="flex-row items-center gap-2.5">
          <BrandLogo size={28} />
          <Text className="text-body font-bold text-white">ClassicMap</Text>
        </View>

        <RoadmapLine />

        <View>
          <Text className="text-[76px] font-extrabold leading-[80px] tracking-tighter text-white">
            {'클래식\n로드맵.'}
          </Text>
          <Text className="mt-5 max-w-[500px] text-body text-white/70">
            어디서부터 들을지 막막할 때, 시대를 따라 작곡가를 만나고 좋아하는 연주와 공연까지 이어 가요.
          </Text>
          <View className="mt-9 max-w-[560px] flex-row flex-wrap gap-x-8 gap-y-5">
            {ROADMAP_FEATURES.map((feature) => (
              <View key={feature.title} className="w-[240px] flex-row gap-3">
                <View className="size-9 items-center justify-center rounded-md bg-white/10">
                  {feature.icon}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-sm font-semibold text-white">{feature.title}</Text>
                  <Text className="mt-0.5 text-caption text-white/55">{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const FEATURE_ICON_CLASS = 'text-white/85';

const ROADMAP_FEATURES = [
  {
    title: '타임라인',
    description: '400년 작곡가 흐름을 한눈에',
    icon: <EraIcon size={18} className={FEATURE_ICON_CLASS} />,
  },
  {
    title: '연주 비교',
    description: '같은 구간을 연주자별로',
    icon: <CompareIcon size={18} className={FEATURE_ICON_CLASS} />,
  },
  {
    title: '공연',
    description: '전국 클래식 공연 일정',
    icon: <TicketIcon size={18} className={FEATURE_ICON_CLASS} />,
  },
  {
    title: '레퍼토리',
    description: '담아 두고 어느 기기에서든',
    icon: <RepertoireIcon size={18} className={FEATURE_ICON_CLASS} />,
  },
] as const;

const ROAD_FROM = 1660;
const ROAD_TO = 1930;
const ROAD_ERAS = [
  { period: '바로크', label: '바로크', from: ROAD_FROM, to: 1750 },
  { period: '고전주의', label: '고전', from: 1750, to: 1820 },
  { period: '낭만주의', label: '낭만', from: 1820, to: 1890 },
  { period: '근현대', label: '근현대', from: 1890, to: ROAD_TO },
] as const;
const STATION_AVATAR = 52;
const MAX_STATIONS = 8;

interface Station {
  id: number;
  name: string;
  year: number;
  image: string;
  x: number;
}

/** 추천 순으로 훑으며 서로 너무 붙지 않는 작곡가만 역으로 고른다. 위아래를 번갈아 달아 이웃 역 사이를 넓힌다 */
function pickStations(composers: readonly Composer[], width: number): Station[] {
  const minGap = STATION_AVATAR * 0.95;
  const picked: Station[] = [];
  for (const composer of composers) {
    if (picked.length >= MAX_STATIONS) break;
    const year = composer.birthYear;
    if (!composer.avatarUrl || !year || year < ROAD_FROM + 10 || year > ROAD_TO - 12) continue;
    const x = ((year - ROAD_FROM) / (ROAD_TO - ROAD_FROM)) * width;
    if (picked.some((station) => Math.abs(station.x - x) < minGap)) continue;
    picked.push({ id: composer.id, name: composer.name, year, image: composer.avatarUrl, x });
  }
  return picked.sort((a, b) => a.x - b.x);
}

function RoadmapLine() {
  const composers = useRecommendedComposers(40);
  const [width, setWidth] = React.useState(0);
  const stations = React.useMemo(
    () => (width > 0 ? pickStations(composers.data ?? [], width) : []),
    [composers.data, width]
  );
  const lineY = STATION_AVATAR + 40;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: lineY * 2 }}
      className="my-8">
      {ROAD_ERAS.map((era) => {
        const left = ((era.from - ROAD_FROM) / (ROAD_TO - ROAD_FROM)) * width;
        const right = ((era.to - ROAD_FROM) / (ROAD_TO - ROAD_FROM)) * width;
        const color = getEraColor(era.period);
        return (
          <View key={era.period} style={{ position: 'absolute', left, width: right - left, top: lineY - 3 }}>
            <View style={{ height: 6, backgroundColor: color?.base ?? '#FFFFFF', opacity: 0.85 }} />
            <Text className="mt-2 text-caption font-semibold" style={{ color: color?.onDark ?? '#FFFFFF' }}>
              {era.label}
            </Text>
          </View>
        );
      })}
      {stations.map((station, index) => {
        const above = index % 2 === 0;
        const stem = 18;
        return (
          <View
            key={station.id}
            className="items-center"
            style={{
              position: 'absolute',
              left: station.x - 40,
              width: 80,
              top: above ? lineY - stem - STATION_AVATAR - 34 : lineY + 22,
            }}>
            {above ? <StationLabel station={station} /> : null}
            <View className="rounded-full border-2 border-white/80">
              <EntityThumb name={station.name} image={station.image} shape="circle" size={STATION_AVATAR} />
            </View>
            {!above ? <StationLabel station={station} /> : null}
          </View>
        );
      })}
      {stations.map((station, index) => {
        const above = index % 2 === 0;
        return (
          <View
            key={`stop-${station.id}`}
            style={{
              position: 'absolute',
              left: station.x - 5,
              top: lineY - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#0B0A09',
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}>
            <View
              style={{
                position: 'absolute',
                left: 2,
                width: 2,
                height: 16,
                top: above ? -18 : 8,
                backgroundColor: 'rgba(255,255,255,0.5)',
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function StationLabel({ station }: { station: Station }) {
  return (
    <View className="my-1.5 items-center">
      <Text numberOfLines={1} className="text-caption font-semibold text-white">
        {station.name}
      </Text>
      <Text variant="mono" className="text-[11px] text-white/50">
        {station.year}
      </Text>
    </View>
  );
}

/** 인증 폼 입력칸·주 버튼 크기. 엄지로 누르기 편하게 48px */
export const AUTH_INPUT_CLASS = 'h-12 rounded-lg px-3.5 sm:h-12 md:text-body';
export const AUTH_BUTTON_CLASS = 'h-12 w-full rounded-full sm:h-12';

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <View className="mb-6">
      <Text className="text-[28px] font-bold leading-9 tracking-tight text-foreground">{title}</Text>
      {description ? (
        <Text variant="bodySm" className="mt-1.5 text-foreground-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text variant="caption" className="text-foreground-subtle">
        {label}
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" className="text-caption text-destructive">
      {message}
    </Text>
  );
}
