import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { clipClock, clipDurationMs, primaryCredit, sortComparisonSectors } from '@/lib/data/comparison';
import {
  useComparisonPieces,
  usePieceComparisonSectors,
  useSectorComparisonPerformances,
} from '@/lib/query/hooks/useComparisonPerformances';
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

/** 왼쪽 패널: 연주자가 가장 많은 작품의 첫 구간을 그대로 보여 준다. 숫자는 운영 데이터다 */
function BrandPanel() {
  const catalog = useComparisonPieces();
  const piece = catalog.data?.pages[0]?.[0];
  const sectorsQuery = usePieceComparisonSectors(piece?.pieceId);
  const sector = React.useMemo(() => sortComparisonSectors(sectorsQuery.data ?? [])[0], [sectorsQuery.data]);
  const performances = useSectorComparisonPerformances(sector?.id).data ?? [];
  const images = new Map((piece?.performers ?? []).map((performer) => [performer.artistId, performer.imageUrl]));
  const lines = performances
    .filter((performance) => performance.clipStatus === 'ready')
    .slice(0, 3)
    .map((performance) => {
      const credit = primaryCredit(performance);
      return {
        id: performance.id,
        name: credit?.artistName ?? '연주자 정보 없음',
        image: credit ? images.get(credit.artistId) ?? null : null,
        durationMs: clipDurationMs(performance),
      };
    });
  const longest = Math.max(1, ...lines.map((line) => line.durationMs));

  return (
    <View className="w-1/2 max-w-[720px] justify-between bg-surface-1 px-14 py-12">
      <View className="flex-row items-center gap-2.5">
        <BrandLogo size={28} />
        <Text className="text-body font-bold text-foreground">ClassicMap</Text>
      </View>

      <View>
        <Text className="text-[52px] font-extrabold leading-[56px] tracking-tight text-foreground">
          {'같은 구간,\n다른 연주.'}
        </Text>
        <Text variant="body" className="mt-4 max-w-[460px] text-foreground-muted">
          같은 악보인데 길이부터 달라요. 연주자를 바꿔 가며 같은 구간을 이어 들어 보세요.
        </Text>
        {lines.length > 0 && piece && sector ? (
          <View className="mt-8 max-w-[520px] rounded-2xl border border-border bg-surface-2 p-2.5">
            <Text variant="caption" numberOfLines={1} className="px-3 pb-1.5 pt-1">
              {`${piece.composerName} ${piece.pieceTitle} · ${sector.sectorName}`}
            </Text>
            {lines.map((line, index) => (
              <View
                key={line.id}
                className={cn('h-12 flex-row items-center gap-3 rounded-lg px-3', index === 0 && 'bg-surface-3')}>
                <EntityThumb name={line.name} image={line.image} shape="circle" size={32} />
                <Text
                  numberOfLines={1}
                  className={cn('w-36 text-body-sm font-semibold', index === 0 ? 'text-primary' : 'text-foreground')}>
                  {line.name}
                </Text>
                <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <View
                    className={cn('h-full rounded-full', index === 0 ? 'bg-primary' : 'bg-foreground-subtle')}
                    style={{ width: `${Math.max(6, (line.durationMs / longest) * 100)}%` }}
                  />
                </View>
                <Text variant="mono" className="w-11 text-right text-foreground-muted">
                  {clipClock(line.durationMs)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="caption" className="mt-3.5 text-foreground-subtle">
          영상은 YouTube 원본의 해당 구간이에요.
        </Text>
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
