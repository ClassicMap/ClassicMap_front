import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EntityThumb } from '@/components/ui/entity-thumb';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ArtistAPI, ComposerAPI } from '@/lib/api/client';
import { TasteAPI } from '@/lib/api/taste';
import {
  INSTRUMENT_OPTIONS,
  LEVEL_OPTIONS,
  shortPieceTitle,
  SOUND_OPTIONS,
} from '@/lib/data/taste-labels';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { TASTE_QUERY_KEYS } from '@/lib/hooks/useTaste';
import { useComparisonPieces } from '@/lib/query/hooks/useComparisonPerformances';
import type { OnboardingPiece, TasteAnswers } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export interface PersonPick {
  kind: 'artist' | 'composer';
  id: number;
  name: string;
  image: string | null;
}

export interface OnboardingResult {
  answers: TasteAnswers;
  people: PersonPick[];
}

interface TasteOnboardingProps {
  initial: TasteAnswers;
  /** 다 고르고 끝냄 */
  onFinish: (result: OnboardingResult) => Promise<void>;
  /** 닫기. 그때까지 고른 답은 남긴다 */
  onClose: (result: OnboardingResult) => Promise<void>;
}

const STEPS = 4;
const SUGGESTED_ARTISTS = 10;

/**
 * 첫 방문 취향 묻기 4장 (취향 추천 개편 보고서 C).
 * 어느 장이든 건너뛸 수 있고, 닫으면 그때까지 고른 답만 남긴다.
 */
export function TasteOnboarding({ initial, onFinish, onClose }: TasteOnboardingProps) {
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<TasteAnswers>(initial);
  const [people, setPeople] = React.useState<PersonPick[]>([]);
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const result = (): OnboardingResult => ({ answers, people });
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const go = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const last = step === STEPS - 1;
  const next = () => (last ? run(() => onFinish(result())) : go(step + 1));

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={
        wide ? 'min-h-full items-center px-12 py-14' : 'px-5 pb-10 pt-4 mt-safe'
      }>
      <View className="w-full max-w-[560px]">
        <View className="flex-row items-center gap-3">
          <View
            className="flex-1 flex-row gap-1.5"
            accessibilityLabel={`${STEPS}단계 중 ${step + 1}단계`}>
            {Array.from({ length: STEPS }, (_, index) => (
              <View
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index <= step ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </View>
          <Pressable
            onPress={() => run(() => onClose(result()))}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="나중에 할게요"
            hitSlop={8}
            className="size-10 items-center justify-center rounded-full bg-surface-2">
            <Icon as={XIcon} size={18} className="text-foreground" />
          </Pressable>
        </View>

        <View className="mt-8">
          {step === 0 ? <LevelStep answers={answers} onChange={setAnswers} /> : null}
          {step === 1 ? <SoundStep answers={answers} onChange={setAnswers} /> : null}
          {step === 2 ? <PieceStep answers={answers} onChange={setAnswers} /> : null}
          {step === 3 ? <PeopleStep people={people} onChange={setPeople} /> : null}
        </View>

        <View className="mt-10 flex-row items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" disabled={busy} onPress={() => go(step - 1)}>
              <Text className="text-foreground-muted">이전</Text>
            </Button>
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-2">
            <Button variant="ghost" disabled={busy} onPress={next}>
              <Text className="text-foreground-muted">건너뛰기</Text>
            </Button>
            <Button disabled={busy} onPress={next} className="rounded-full px-6">
              <Text>{busy ? '저장 중…' : last ? '시작하기' : '다음'}</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <View className="mb-6 gap-1.5">
      <Text className="text-[26px] font-bold leading-9 tracking-tight text-foreground">
        {title}
      </Text>
      <Text variant="bodySm" className="text-foreground-muted">
        {hint}
      </Text>
    </View>
  );
}

interface StepProps {
  answers: TasteAnswers;
  onChange: (answers: TasteAnswers) => void;
}

function LevelStep({ answers, onChange }: StepProps) {
  return (
    <View>
      <StepHeading
        title="클래식, 얼마나 들어요?"
        hint="답에 따라 처음 열어 드릴 곡과 구간이 달라져요."
      />
      <View className="gap-2">
        {LEVEL_OPTIONS.map((option) => {
          const selected = answers.listeningLevel === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() =>
                onChange({
                  ...answers,
                  listeningLevel: selected ? null : option.key,
                  instrument: option.key === 'player' && !selected ? answers.instrument : null,
                })
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={cn(
                'flex-row items-center justify-between rounded-xl border px-4 py-3.5',
                selected
                  ? 'border-primary bg-primary-muted'
                  : 'border-border bg-surface-1 web:hover:bg-surface-2'
              )}>
              <Text
                className={cn(
                  'text-body',
                  selected ? 'font-semibold text-foreground' : 'text-foreground'
                )}>
                {option.label}
              </Text>
              {selected ? <Icon as={CheckIcon} size={18} className="text-primary" /> : null}
            </Pressable>
          );
        })}
      </View>
      {answers.listeningLevel === 'player' ? (
        <View className="mt-6 gap-2.5">
          <Text variant="label" className="text-foreground-muted">
            어떤 악기를 연주해요?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {INSTRUMENT_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={answers.instrument === option.key}
                onPress={() =>
                  onChange({
                    ...answers,
                    instrument: answers.instrument === option.key ? null : option.key,
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SoundStep({ answers, onChange }: StepProps) {
  return (
    <View>
      <StepHeading
        title="어떤 소리에 끌려요?"
        hint="여러 개 골라도 돼요. 고른 소리마다 한 곡씩은 꼭 보여 드려요."
      />
      <View className="flex-row flex-wrap gap-2.5">
        {SOUND_OPTIONS.map((option) => {
          const selected = answers.sounds.includes(option.key);
          return (
            <Chip
              key={option.key}
              label={option.label}
              selected={selected}
              onPress={() =>
                onChange({
                  ...answers,
                  sounds: selected
                    ? answers.sounds.filter((sound) => sound !== option.key)
                    : [...answers.sounds, option.key],
                })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

function PieceStep({ answers, onChange }: StepProps) {
  const { layout } = useBreakpoint();
  const columns = layout === 'mobile' ? 2 : 3;
  const query = useQuery({
    queryKey: TASTE_QUERY_KEYS.onboardingPieces,
    queryFn: TasteAPI.getOnboardingPieces,
    staleTime: 30 * 60_000,
  });
  const toggle = (piece: OnboardingPiece) => {
    const selected = answers.seedPieceIds.includes(piece.pieceId);
    onChange({
      ...answers,
      seedPieceIds: selected
        ? answers.seedPieceIds.filter((id) => id !== piece.pieceId)
        : [...answers.seedPieceIds, piece.pieceId],
    });
  };

  return (
    <View>
      <StepHeading
        title="아는 곡이 있으면 골라 주세요"
        hint="하나도 없어도 괜찮아요. 고른 곡과 닮은 곡을 먼저 보여 드려요."
      />
      {query.isLoading ? (
        <View className="flex-row flex-wrap gap-2.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[68px] rounded-xl"
              style={{ width: `${100 / columns - 3}%` }}
            />
          ))}
        </View>
      ) : query.isError ? (
        <View className="items-start gap-2 rounded-xl bg-surface-2 p-4">
          <Text variant="bodySm" className="text-foreground-muted">
            곡 목록을 불러오지 못했어요. 이 장은 건너뛰어도 괜찮아요.
          </Text>
          <Pressable onPress={() => query.refetch()} accessibilityRole="button" hitSlop={8}>
            <Text variant="label" className="text-primary">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {(query.data ?? []).map((piece) => {
            const selected = answers.seedPieceIds.includes(piece.pieceId);
            return (
              <Pressable
                key={piece.pieceId}
                onPress={() => toggle(piece)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${piece.composerName} ${piece.pieceTitle}`}
                style={{ width: `${100 / columns - 2.2}%`, flexGrow: 1 }}
                className={cn(
                  'flex-row items-center gap-3 rounded-xl border p-3',
                  selected
                    ? 'border-primary bg-primary-muted'
                    : 'border-border bg-surface-1 web:hover:bg-surface-2'
                )}>
                <EntityThumb
                  name={piece.composerName}
                  image={piece.composerAvatarUrl}
                  shape="circle"
                  size={40}
                />
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-body-sm font-semibold leading-5 text-foreground">
                    {shortPieceTitle(piece.pieceTitle)}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {piece.composerName}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PeopleStep({
  people,
  onChange,
}: {
  people: PersonPick[];
  onChange: (people: PersonPick[]) => void;
}) {
  const [text, setText] = React.useState('');
  const q = useDebounce(text.trim(), 250);
  const catalog = useComparisonPieces();
  const onboardingPieces = useQuery({
    queryKey: TASTE_QUERY_KEYS.onboardingPieces,
    queryFn: TasteAPI.getOnboardingPieces,
    staleTime: 30 * 60_000,
  });
  const artistResults = useQuery({
    queryKey: ['search', 'artists', q, 8],
    queryFn: () => ArtistAPI.search({ q, limit: 8 }),
    enabled: q.length > 0,
    staleTime: 60_000,
  });
  const composerResults = useQuery({
    queryKey: ['search', 'composers', q, 5],
    queryFn: () => ComposerAPI.search({ q, limit: 5 }),
    enabled: q.length > 0,
    staleTime: 60_000,
  });

  // 비교 영상에 나오는 사진 있는 연주자와 '아는 곡' 작곡가를 먼저 권한다
  const suggestions = React.useMemo<PersonPick[]>(() => {
    const seen = new Set<string>();
    const list: PersonPick[] = [];
    const push = (person: PersonPick) => {
      const key = `${person.kind}:${person.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(person);
    };
    const artists = (catalog.data?.pages[0] ?? []).flatMap((piece) => piece.performers);
    for (const performer of artists) {
      if (list.length >= SUGGESTED_ARTISTS) break;
      if (performer.imageUrl) {
        push({
          kind: 'artist',
          id: performer.artistId,
          name: performer.artistName,
          image: performer.imageUrl,
        });
      }
    }
    for (const piece of onboardingPieces.data ?? []) {
      push({
        kind: 'composer',
        id: piece.composerId,
        name: piece.composerName,
        image: piece.composerAvatarUrl,
      });
    }
    return list;
  }, [catalog.data, onboardingPieces.data]);

  const results = React.useMemo<PersonPick[]>(
    () => [
      ...(composerResults.data ?? []).map((composer) => ({
        kind: 'composer' as const,
        id: composer.id,
        name: composer.name,
        image: composer.avatarUrl ?? null,
      })),
      ...(artistResults.data ?? []).map((artist) => ({
        kind: 'artist' as const,
        id: Number(artist.id),
        name: artist.name,
        image: artist.imageUrl ?? null,
      })),
    ],
    [artistResults.data, composerResults.data]
  );

  const isPicked = (person: PersonPick) =>
    people.some((item) => item.kind === person.kind && item.id === person.id);
  const toggle = (person: PersonPick) =>
    onChange(
      isPicked(person)
        ? people.filter((item) => !(item.kind === person.kind && item.id === person.id))
        : [...people, person]
    );
  const searching = q.length > 0;
  const shown = searching ? results : suggestions;

  return (
    <View>
      <StepHeading
        title="좋아하는 연주자나 작곡가가 있어요?"
        hint="고르면 레퍼토리에 담아 두고, 그 사람이 나오는 비교를 앞에 보여 드려요."
      />
      <View className="relative">
        <View className="absolute inset-y-0 left-3.5 z-10 justify-center" pointerEvents="none">
          <Icon as={SearchIcon} size={16} className="text-foreground-subtle" />
        </View>
        <Input
          nativeID="onboarding-people-search"
          value={text}
          onChangeText={setText}
          placeholder="이름으로 찾기"
          autoCorrect={false}
          className="h-12 rounded-full pl-10 md:text-body"
        />
      </View>

      {people.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {people.map((person) => (
            <Chip
              key={`${person.kind}:${person.id}`}
              label={person.name}
              selected
              onPress={() => toggle(person)}
              leading={
                <EntityThumb name={person.name} image={person.image} shape="circle" size={20} />
              }
            />
          ))}
        </View>
      ) : null}

      {searching && (artistResults.isLoading || composerResults.isLoading) ? (
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
      ) : searching && shown.length === 0 ? (
        <Text variant="bodySm" className="mt-6 text-foreground-muted">
          맞는 사람이 없어요. 다른 이름으로 찾아 보세요.
        </Text>
      ) : (
        (['artist', 'composer'] as const).map((kind) => {
          const group = shown.filter((person) => person.kind === kind);
          if (group.length === 0) return null;
          return (
            <View key={kind} className="mt-6">
              <Text variant="label" className="mb-2.5 text-foreground-muted">
                {kind === 'artist' ? (searching ? '연주자' : '이런 연주자는 어때요') : '작곡가'}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {group.map((person) => (
                  <Chip
                    key={`${person.kind}:${person.id}`}
                    label={person.name}
                    selected={isPicked(person)}
                    onPress={() => toggle(person)}
                    leading={
                      <EntityThumb
                        name={person.name}
                        image={person.image}
                        shape="circle"
                        size={20}
                      />
                    }
                  />
                ))}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
