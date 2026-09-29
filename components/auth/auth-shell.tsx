import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { clipClock, clipDurationMs, pickDailyPiece, primaryCredit, sortComparisonSectors } from '@/lib/data/comparison';
import {
  useComparisonPieces,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface AuthShellProps {
  children: React.ReactNode;
  /** 닫기(뒤로). 없으면 버튼을 그리지 않는다 */
  onClose?: () => void;
}

/**
 * 로그인·회원가입·비밀번호 화면의 틀 (3차 시안 Auth).
 * 데스크톱은 왼쪽에 이 앱이 무엇을 하는지 실제 비교 한 장을, 오른쪽에 400px 폼을 둔다.
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
 * 왼쪽 패널: 연주자가 가장 많은 작품의 첫 구간을 그대로 보여 준다. 숫자는 운영 데이터다.
 * 첫 연주의 영상 장면을 패널 전체에 깔고, 그 위에 같은 구간의 연주 길이를 크게 겹친다.
 */
function BrandPanel() {
  const catalog = useComparisonPieces();
  // 홈의 '오늘의 비교'와 같은 작품을 고른다
  const piece = React.useMemo(
    () => pickDailyPiece(catalog.data?.pages[0] ?? [], new Date()),
    [catalog.data]
  );
  const sectorsQuery = usePieceComparisonSectors(piece?.pieceId);
  const sector = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? [])[0], [sectorsQuery.data]);
  const performances = useSectorComparisonPerformances(sector?.id).data ?? [];
  const images = new Map((piece?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl]));
  const ready = performances.filter((performance) => performance.clipStatus === 'ready').slice(0, 3);
  const lines = ready.map((performance) => {
    const credit = primaryCredit(performance);
    return {
      id: performance.id,
      name: credit?.artistName ?? '연주자 정보 없음',
      image: credit ? credit.imageUrl ?? images.get(credit.artistId) ?? null : null,
      durationMs: clipDurationMs(performance),
    };
  });
  const longest = Math.max(1, ...lines.map((line) => line.durationMs));
  const videoId = ready[0]?.videoId ?? null;

  return (
    <View className="w-1/2 max-w-[760px] overflow-hidden bg-[#0B0A09]">
      {videoId ? <PanelBackdrop videoId={videoId} /> : null}

      <View className="flex-1 justify-between px-14 py-12">
        <View className="flex-row items-center gap-2.5">
          <BrandLogo size={28} />
          <Text className="text-body font-bold text-white">ClassicMap</Text>
        </View>

        <View>
          <Text className="text-[76px] font-extrabold leading-[78px] tracking-tighter text-white">
            {'같은 구간,\n다른 연주.'}
          </Text>
          <Text className="mt-5 max-w-[480px] text-body text-white/70">
            같은 악보인데 길이부터 달라요. 연주자를 바꿔 가며 같은 구간을 이어 들어 보세요.
          </Text>

          {lines.length > 0 && piece && sector ? (
            <View className="mt-10 max-w-[560px]">
              <Text className="mb-3 text-caption font-semibold uppercase tracking-widest text-white/55" numberOfLines={1}>
                {`${piece.composerName} · ${piece.pieceTitle} · ${sector.sectorName}`}
              </Text>
              <View className="gap-4">
                {lines.map((line, index) => (
                  <View key={line.id} className="flex-row items-center gap-3.5">
                    <EntityThumb name={line.name} image={line.image} shape="circle" size={36} />
                    <View className="min-w-0 flex-1 gap-1.5">
                      <View className="flex-row items-baseline justify-between gap-3">
                        <Text
                          numberOfLines={1}
                          className={cn('flex-1 text-body font-semibold', index === 0 ? 'text-primary' : 'text-white')}>
                          {line.name}
                        </Text>
                        <Text variant="mono" className="text-white/70">
                          {clipClock(line.durationMs)}
                        </Text>
                      </View>
                      <View className="h-1.5 overflow-hidden rounded-full bg-white/15">
                        <View
                          className={cn('h-full rounded-full', index === 0 ? 'bg-primary' : 'bg-white/60')}
                          style={{ width: `${Math.max(6, (line.durationMs / longest) * 100)}%` }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <Text className="mt-6 text-caption text-white/45">영상은 YouTube 원본의 해당 구간이에요.</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * 연주 장면을 패널 폭에 맞춰 위에 깔고 아래로 어둡게 녹인다. 세로로 꽉 채우면 16:9 장면의 좌우가
 * 잘려 연주자가 빠지기 쉬워서 장면은 온전히 보인다.
 * maxresdefault는 없는 영상이 많고 그때도 회색 대체 그림이 200으로 와서 onError로 못 거른다.
 * 항상 있는 hqdefault(4:3 안에 16:9, 위아래 12.5% 검은 띠)를 띠만 잘라 쓴다.
 */
function PanelBackdrop({ videoId }: { videoId: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View className="w-full overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
        <Image
          source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }}
          resizeMode="cover"
          style={{ position: 'absolute', left: 0, right: 0, top: '-16.7%', bottom: '-16.7%' }}
          accessibilityIgnoresInvertColors
        />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="auth-panel-fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0B0A09" stopOpacity="0.5" />
              <Stop offset="0.3" stopColor="#0B0A09" stopOpacity="0.1" />
              <Stop offset="0.75" stopColor="#0B0A09" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#0B0A09" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#auth-panel-fade)" />
        </Svg>
      </View>
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
