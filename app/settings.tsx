import { ProfileAvatar } from '@/features/profile/components/profile-parts';
import { Button } from '@/components/ui/button';
import { Chip, ChipDot } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { ProfileVisibility, UpdateProfileVisibilityInput } from '@/lib/api/client';
import { INSTRUMENT_OPTIONS, LEVEL_OPTIONS, PREFERENCE_ERAS, SOUND_OPTIONS } from '@/lib/data/taste-labels';
import { getEraForeground } from '@/lib/design/era-palette';
import type { TasteAnswers } from '@/lib/types/models';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/lib/hooks/useAuth';
import { TasteAPI } from '@/lib/api/taste';
import { TASTE_QUERY_KEYS, useTaste } from '@/lib/hooks/useTaste';
import { useProfileVisibility, useUpdateProfileVisibility } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/utils/alert';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { type Href, Redirect, useRouter } from 'expo-router';
import { ArrowLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { LOCALES, type Locale, msg, t, useLocale } from '@/lib/i18n';
import { type LayoutChangeEvent, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

type SectionKey = 'profile' | 'visibility' | 'taste' | 'display' | 'account' | 'info';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'profile', label: msg('프로필') },
  { key: 'visibility', label: msg('공개 범위') },
  { key: 'taste', label: msg('취향') },
  { key: 'display', label: msg('화면') },
  { key: 'account', label: msg('계정') },
  { key: 'info', label: msg('정보') },
];

type VisibilityKey = 'summaryPublic' | 'ratingsPublic' | 'favoritesPublic' | 'collectionsPublic';

const VISIBILITY_ROWS: { key: VisibilityKey; title: string; description: string }[] = [
  { key: 'summaryPublic', title: msg('활동 요약'), description: msg('평가 수 · 평균 별점 · 레퍼토리 수') },
  { key: 'ratingsPublic', title: msg('평가한 공연'), description: msg('별점과 공연 목록') },
  { key: 'favoritesPublic', title: msg('레퍼토리'), description: msg('담아 둔 작곡가·연주자·작품·공연') },
  { key: 'collectionsPublic', title: msg('컬렉션'), description: msg('별점 5점 공연처럼 자동으로 묶인 목록') },
];

const THEMES: { key: 'system' | 'light' | 'dark'; label: string }[] = [
  { key: 'system', label: msg('시스템') },
  { key: 'light', label: msg('라이트') },
  { key: 'dark', label: msg('다크') },
];

const BIO_MAX = 80;

/** 설정 (3차 시안): 프로필 · 공개 범위 · 취향 · 화면 · 계정 · 정보 */
export default function SettingsScreen() {
  useLocale();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerkAuth();
  const { isSignedIn, loading } = useAuth();
  const { layout } = useBreakpoint();
  const wide = layout === 'desktop' || layout === 'wide';
  const scrollRef = React.useRef<ScrollView>(null);
  const offsets = React.useRef<Partial<Record<SectionKey, number>>>({});
  const [active, setActive] = React.useState<SectionKey>('profile');

  const visibilityQuery = useProfileVisibility(isSignedIn && !loading);

  if (!loading && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const track = (key: SectionKey) => (event: LayoutChangeEvent) => {
    offsets.current[key] = event.nativeEvent.layout.y;
  };
  const jump = (key: SectionKey) => {
    setActive(key);
    scrollRef.current?.scrollTo({ y: Math.max(0, (offsets.current[key] ?? 0) - 12), animated: true });
  };

  const confirmSignOut = () =>
    Alert.alert(t('로그아웃할까요?'), t('레퍼토리와 별점은 계정에 남아 있어요.'), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('로그아웃'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/home' as Href);
        },
      },
    ]);

  const version = Constants.expoConfig?.version;

  return (
    <View className="flex-1 bg-background web:bg-surface-1">
      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName={cn('pb-24', wide ? 'px-7 pt-3' : 'px-4')}>
        {wide ? (
          <Text variant="display">{t('설정')}</Text>
        ) : (
          <View className="mt-12 flex-row items-center gap-3">
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.push('/my-page' as Href))}
              accessibilityLabel={t('뒤로')}
              className="size-11 items-center justify-center rounded-full bg-surface-2">
              <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
            </Pressable>
            <Text variant="title2">{t('설정')}</Text>
          </View>
        )}

        <View className={cn('mt-6', wide && 'flex-row gap-10')}>
          {wide ? (
            <View className="w-[200px] gap-0.5" accessibilityRole="tablist">
              {SECTIONS.map((section) => (
                <Pressable
                  key={section.key}
                  onPress={() => jump(section.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active === section.key }}
                  className={cn(
                    'h-9 justify-center rounded-md px-3 web:hover:bg-surface-2',
                    active === section.key && 'bg-surface-2'
                  )}>
                  <Text
                    className={cn(
                      'text-label font-semibold',
                      active === section.key ? 'text-foreground' : 'text-foreground-muted'
                    )}>
                    {t(section.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="min-w-0 max-w-[700px] flex-1 gap-5">
            <View onLayout={track('profile')}>
              <Group title={t('프로필')} description={t('공개 프로필과 마이페이지에 보이는 정보예요.')}>
                {visibilityQuery.isLoading ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : (
                  <ProfileForm
                    profile={visibilityQuery.data}
                    defaultName={user?.fullName || user?.emailAddresses[0]?.emailAddress || t('사용자')}
                    defaultAvatar={user?.imageUrl}
                  />
                )}
              </Group>
            </View>

            <View onLayout={track('visibility')}>
              <Group title={t('공개 범위')} description={t('공개 프로필은 누구나 볼 수 있어요. 괜찮은 것만 켜 두세요.')}>
                {visibilityQuery.isLoading ? (
                  <Skeleton className="h-40 w-full rounded-lg" />
                ) : visibilityQuery.isError ? (
                  <RetryLine message={t('공개 범위를 불러오지 못했어요.')} onRetry={() => visibilityQuery.refetch()} />
                ) : (
                  <VisibilityToggles profile={visibilityQuery.data} />
                )}
              </Group>
            </View>

            <View onLayout={track('taste')}>
              <Group title={t('취향')} description={t('홈의 오늘의 비교와 추천 셸프가 고른 답 쪽으로 기울어요.')}>
                <TastePreferences />
              </Group>
            </View>

            <View onLayout={track('display')}>
              <Group title={t('화면')} description={t('시스템을 고르면 기기 설정을 따라가요.')}>
                <ThemeSelector />
              </Group>
              <Group title={t('언어')} description={t('처음에는 기기 언어를 따라가요. 여기서 고르면 그 언어로 고정돼요.')}>
                <LanguageSelector />
              </Group>
            </View>

            <View onLayout={track('account')}>
              <Group title={t('계정')}>
                <LinkRow label={t('계정 이름')} value={user?.fullName ?? undefined} onPress={() => router.push('/edit-profile' as Href)} />
                {user?.passwordEnabled ? (
                  <LinkRow label={t('비밀번호 변경')} onPress={() => router.push('/change-password' as Href)} />
                ) : null}
                <LinkRow label={t('로그아웃')} onPress={confirmSignOut} chevron={false} />
                <LinkRow
                  label={t('계정 삭제')}
                  value={t('평가·레퍼토리가 모두 지워져요')}
                  destructive
                  onPress={() => router.push('/delete-account' as Href)}
                />
              </Group>
            </View>

            <View onLayout={track('info')}>
              <Group title={t('정보')}>
                <LinkRow label={t('도움말')} onPress={() => router.push('/help' as Href)} />
                <LinkRow label={t('이용약관')} onPress={() => router.push('/terms-of-service' as Href)} />
                <LinkRow label={t('개인정보 처리방침')} onPress={() => router.push('/privacy-policy' as Href)} />
                {version ? <LinkRow label={t('버전')} value={version} chevron={false} mono /> : null}
              </Group>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  useLocale();
  return (
    <View className="gap-4 rounded-xl border border-border px-5 py-5 web:px-6">
      <View className="gap-1">
        <Text variant="title3">{title}</Text>
        {description ? (
          <Text variant="bodySm" className="text-foreground-muted">
            {description}
          </Text>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
}

function RetryLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  useLocale();
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
      <Text variant="bodySm" className="flex-1 text-foreground-muted">{message}</Text>
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
        <Text variant="label" className="text-primary">
          {t('다시 시도')}
        </Text>
      </Pressable>
    </View>
  );
}

function ProfileForm({
  profile,
  defaultName,
  defaultAvatar,
}: {
  profile?: ProfileVisibility;
  defaultName: string;
  defaultAvatar?: string;
}) {
  const { locale } = useLocale();
  const update = useUpdateProfileVisibility();
  const initial = React.useMemo(
    () => ({
      displayName: profile?.displayName || defaultName,
      bio: profile?.bio || '',
      avatarUrl: profile?.avatarUrl || '',
    }),
    [defaultName, profile, locale]
  );
  const [draft, setDraft] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const previousInitial = React.useRef(initial);
  // 서버 값이 바뀌어도(공개 범위 토글 저장 등) 입력 중인 내용은 지우지 않는다
  React.useEffect(() => {
    const before = previousInitial.current;
    previousInitial.current = initial;
    setDraft((current) =>
      current.displayName === before.displayName && current.bio === before.bio && current.avatarUrl === before.avatarUrl
        ? initial
        : current
    );
  }, [initial]);

  const dirty =
    draft.displayName !== initial.displayName || draft.bio !== initial.bio || draft.avatarUrl !== initial.avatarUrl;

  const save = () => {
    const avatarUrl = draft.avatarUrl.trim();
    if (!draft.displayName.trim()) {
      setError(t('표시 이름을 입력해 주세요.'));
      return;
    }
    if (avatarUrl && !/^https:\/\//.test(avatarUrl)) {
      setError(t('사진 주소는 https:// 로 시작해야 해요.'));
      return;
    }
    setError(null);
    update.mutate(
      // 빈 문자열을 보내야 기존 사진 주소가 지워진다 (undefined는 JSON에서 빠져 그대로 남는다)
      { displayName: draft.displayName.trim(), bio: draft.bio.trim(), avatarUrl },
      {
        onError: () =>
          setError(t('저장하지 못했어요. 연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 저장해 주세요.')),
      }
    );
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <ProfileAvatar name={draft.displayName || defaultName} uri={draft.avatarUrl || defaultAvatar} size={64} />
        <View className="flex-1 gap-1.5">
          <Label htmlFor="avatarUrl">{t('프로필 사진 주소')}</Label>
          <Input
            id="avatarUrl"
            value={draft.avatarUrl}
            onChangeText={(avatarUrl) => setDraft((current) => ({ ...current, avatarUrl }))}
            placeholder={t('https:// 로 시작하는 이미지 주소')}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text variant="caption" className="text-foreground-subtle">
            {t('비워 두면 로그인 계정의 사진을 써요.')}
          </Text>
        </View>
      </View>
      <View className="gap-1.5">
        <Label htmlFor="displayName">{t('표시 이름')}</Label>
        <Input
          id="displayName"
          value={draft.displayName}
          onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          maxLength={40}
        />
      </View>
      <View className="gap-1.5">
        <Label htmlFor="bio">{t('한 줄 소개')}</Label>
        <Input
          id="bio"
          value={draft.bio}
          onChangeText={(bio) => setDraft((current) => ({ ...current, bio }))}
          maxLength={BIO_MAX}
          placeholder={t('예: 라흐마니노프 협주곡을 연주자별로 모으고 있어요')}
        />
        <Text variant="caption" className="self-end tabular-nums text-foreground-subtle">
          {`${draft.bio.length} / ${BIO_MAX}`}
        </Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="text-caption text-destructive">
          {error}
        </Text>
      ) : update.isSuccess && !dirty ? (
        <Text variant="caption" className="text-success">
          {t('저장했어요.')}
        </Text>
      ) : null}
      <View className="flex-row justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-full" disabled={!dirty || update.isPending} onPress={() => setDraft(initial)}>
          <Text>{t('되돌리기')}</Text>
        </Button>
        <Button size="sm" className="rounded-full px-5" disabled={!dirty || update.isPending} onPress={save}>
          <Text>{update.isPending ? t('저장 중…') : t('저장')}</Text>
        </Button>
      </View>
    </View>
  );
}

/** 공개 범위는 켜고 끄는 즉시 저장한다. 실패하면 되돌리고 알린다 */
function VisibilityToggles({ profile }: { profile?: ProfileVisibility }) {
  useLocale();
  const update = useUpdateProfileVisibility();
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme === 'dark' ? 'dark' : 'light'];
  const [values, setValues] = React.useState<Record<VisibilityKey, boolean>>({
    summaryPublic: profile?.summaryPublic ?? true,
    ratingsPublic: profile?.ratingsPublic ?? false,
    favoritesPublic: profile?.favoritesPublic ?? false,
    collectionsPublic: profile?.collectionsPublic ?? false,
  });

  const toggle = (key: VisibilityKey, next: boolean) => {
    const previous = values[key];
    setValues((current) => ({ ...current, [key]: next }));
    const input: UpdateProfileVisibilityInput = { [key]: next };
    update.mutate(input, {
      onError: () => {
        setValues((current) => ({ ...current, [key]: previous }));
        Alert.alert(t('공개 범위를 바꾸지 못했어요'), t('연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 눌러 주세요.'));
      },
    });
  };

  return (
    <View>
      {VISIBILITY_ROWS.map((row, index) => (
        <View key={row.key} className={cn('flex-row items-center gap-4 py-3', index > 0 && 'border-t border-border')}>
          <View className="min-w-0 flex-1">
            <Text className="text-body-sm font-semibold text-foreground">{t(row.title)}</Text>
            <Text variant="caption" className="mt-0.5">
              {t(row.description)}
            </Text>
          </View>
          <Switch
            value={values[row.key]}
            onValueChange={(next) => toggle(row.key, next)}
            accessibilityLabel={t('{title} 공개', { title: t(row.title) })}
            trackColor={{ false: colors.surface3, true: colors.primary }}
            thumbColor={values[row.key] ? colors.primaryForeground : colors.foregroundMuted}
            // 웹(RNW)은 켜진 손잡이 색을 activeThumbColor로만 받는다. 없으면 기본 청록이 나온다
            {...(Platform.OS === 'web' ? ({ activeThumbColor: colors.primaryForeground } as object) : null)}
          />
        </View>
      ))}
    </View>
  );
}

function TastePreferences() {
  useLocale();
  const router = useRouter();
  const taste = useTaste();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { answers } = taste;

  const save = (next: TasteAnswers) => {
    taste.save(next).catch(() => {
      Alert.alert(t('취향을 저장하지 못했어요'), t('연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 골라 주세요.'));
    });
  };
  const toggle = <T extends string>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  if (taste.failed) return <RetryLine message={t('취향을 불러오지 못했어요.')} onRetry={taste.retry} />;
  if (!taste.loaded) return <Skeleton className="h-40 w-full rounded-lg" />;

  const answered = taste.onboardingStatus === 'completed';

  return (
    <View className="gap-5">
      {/* 취향 묻기를 끝내지 않았으면(건너뛴 사람 포함) 여기서 바로 시작하게 한다 */}
      {!answered ? (
        <View className="gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <View className="gap-1">
            <Text className="text-body-sm font-semibold text-foreground">{t('아직 취향을 알려 주지 않았어요')}</Text>
            <Text variant="caption">
              {t('질문 네 개, 30초면 끝나요. 아는 곡과 좋아하는 연주자까지 고르면 홈 추천이 그쪽으로 맞춰져요.')}
            </Text>
          </View>
          <Button size="sm" className="self-start" onPress={() => router.push('/onboarding' as Href)}>
            <Text>{t('취향 알려 주기')}</Text>
          </Button>
        </View>
      ) : null}

      <View className="gap-2.5">
        <Text variant="label" className="text-foreground-muted">
          {t('클래식을 얼마나 들어요')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LEVEL_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={t(option.short)}
              selected={answers.listeningLevel === option.key}
              onPress={() =>
                save({
                  ...answers,
                  listeningLevel: answers.listeningLevel === option.key ? null : option.key,
                  instrument: option.key === 'player' ? answers.instrument : null,
                })
              }
            />
          ))}
        </View>
        {answers.listeningLevel === 'player' ? (
          <View className="flex-row flex-wrap gap-2">
            {INSTRUMENT_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={t(option.label)}
                selected={answers.instrument === option.key}
                onPress={() =>
                  save({ ...answers, instrument: answers.instrument === option.key ? null : option.key })
                }
              />
            ))}
          </View>
        ) : null}
      </View>

      <View className="gap-2.5">
        <Text variant="label" className="text-foreground-muted">
          {t('끌리는 소리')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SOUND_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={t(option.label)}
              selected={answers.sounds.includes(option.key)}
              onPress={() => save({ ...answers, sounds: toggle(answers.sounds, option.key) })}
            />
          ))}
        </View>
      </View>

      <View className="gap-2.5">
        <Text variant="label" className="text-foreground-muted">
          {t('좋아하는 시대')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PREFERENCE_ERAS.map((era) => {
            const color = getEraForeground(era, scheme);
            return (
              <Chip
                key={era}
                label={t(era)}
                selected={answers.favoritePeriods.includes(era)}
                onPress={() => save({ ...answers, favoritePeriods: toggle(answers.favoritePeriods, era) })}
                leading={color ? <ChipDot color={color} /> : undefined}
              />
            );
          })}
        </View>
      </View>

      {answered ? (
        <Pressable onPress={() => router.push('/onboarding' as Href)} accessibilityRole="button" className="self-start">
          <Text variant="label" className="text-primary">
            {t('아는 곡부터 다시 고르기')}
          </Text>
        </Pressable>
      ) : null}

      <ListeningHistory />
    </View>
  );
}

/** 들은 기록: 추천을 고치는 데 쓸지 켜고 끄고, 모아 둔 것을 지운다 */
function ListeningHistory() {
  useLocale();
  const taste = useTaste();
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme === 'dark' ? 'dark' : 'light'];
  const [clearing, setClearing] = React.useState(false);

  const toggle = (next: boolean) => {
    taste.save(taste.answers, { historyEnabled: next }).catch(() => {
      Alert.alert(t('기록 설정을 바꾸지 못했어요'), t('연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 눌러 주세요.'));
    });
  };
  const clear = () =>
    Alert.alert(t('들은 기록을 지울까요?'), t('열어 본 곡, 끝까지 들은 곡, 관심 없음으로 뺀 곡이 모두 지워져요.'), [
      { text: t('취소'), style: 'cancel' },
      {
        text: t('지우기'),
        style: 'destructive',
        onPress: () => {
          setClearing(true);
          TasteAPI.deleteEvents()
            .then(() => {
              void queryClient.invalidateQueries({ queryKey: TASTE_QUERY_KEYS.myRecommendations });
              Alert.alert(t('들은 기록을 지웠어요'), t('홈 추천이 고른 답만으로 다시 골라져요.'));
            })
            .catch(() => Alert.alert(t('기록을 지우지 못했어요'), t('연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 시도해 주세요.')))
            .finally(() => setClearing(false));
        },
      },
    ]);

  return (
    <View className="gap-1 border-t border-border pt-4">
      <View className="flex-row items-center gap-4">
        <View className="min-w-0 flex-1">
          <Text className="text-body-sm font-semibold text-foreground">{t('들은 기록으로 추천 고치기')}</Text>
          <Text variant="caption" className="mt-0.5">
            {t('열어 본 곡, 끝까지 들은 곡, 금방 넘긴 곡을 추천에 써요. 끄면 관심 없음만 기억해요.')}
          </Text>
        </View>
        <Switch
          value={taste.historyEnabled}
          onValueChange={toggle}
          accessibilityLabel={t('들은 기록으로 추천 고치기')}
          trackColor={{ false: colors.surface3, true: colors.primary }}
          thumbColor={taste.historyEnabled ? colors.primaryForeground : colors.foregroundMuted}
          {...(Platform.OS === 'web' ? ({ activeThumbColor: colors.primaryForeground } as object) : null)}
        />
      </View>
      <Pressable onPress={clear} disabled={clearing} accessibilityRole="button" className="mt-2 self-start" hitSlop={6}>
        <Text variant="label" className="text-destructive">
          {clearing ? t('지우는 중…') : t('들은 기록 지우기')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * 웹은 dark 클래스로 테마를 바꾸는데, NativeWind에 'system'을 주면 클래스를 떼어 버려
 * 시스템이 다크여도 라이트 색이 나온다. 웹에서는 지금 시스템 값으로 풀어서 넘긴다.
 */
function resolveThemeChoice(choice: 'system' | 'light' | 'dark'): 'system' | 'light' | 'dark' {
  if (choice !== 'system' || Platform.OS !== 'web' || typeof window === 'undefined') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeSelector() {
  useLocale();
  const { setColorScheme } = useColorScheme();
  // 테마 선택은 저장해 두지 않아서 화면을 열 때마다 시스템에서 시작한다
  const [choice, setChoice] = React.useState<'system' | 'light' | 'dark'>('system');

  return (
    <View className="flex-row self-start rounded-full bg-surface-2 p-[3px]" accessibilityRole="radiogroup">
      {THEMES.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            setChoice(item.key);
            setColorScheme(resolveThemeChoice(item.key));
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: choice === item.key }}
          className={cn('h-8 min-w-[84px] items-center justify-center rounded-full px-4', choice === item.key && 'bg-surface-3')}>
          <Text className={cn('text-label font-semibold', choice === item.key ? 'text-foreground' : 'text-foreground-muted')}>
            {t(item.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** 언어 이름은 그 언어로 쓴다(영어판에서도 「한국어」). */
const LANGUAGE_NAMES: Record<Locale, string> = { ko: '한국어', en: 'English' };

function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <View className="flex-row self-start rounded-full bg-surface-2 p-[3px]" accessibilityRole="radiogroup">
      {LOCALES.map((key) => (
        <Pressable
          key={key}
          onPress={() => setLocale(key)}
          accessibilityRole="radio"
          accessibilityState={{ checked: locale === key }}
          className={cn('h-8 min-w-[84px] items-center justify-center rounded-full px-4', locale === key && 'bg-surface-3')}>
          <Text className={cn('text-label font-semibold', locale === key ? 'text-foreground' : 'text-foreground-muted')}>
            {LANGUAGE_NAMES[key]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function LinkRow({
  label,
  value,
  onPress,
  chevron = true,
  destructive = false,
  mono = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  mono?: boolean;
}) {
  useLocale();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="-mx-2 min-h-12 flex-row items-center gap-3 rounded-md px-2 web:hover:bg-surface-2">
      <Text className={cn('text-body-sm', destructive ? 'text-destructive' : 'text-foreground')}>{label}</Text>
      {value ? (
        <Text
          variant={mono ? 'mono' : 'caption'}
          numberOfLines={1}
          className="ml-auto shrink text-right text-foreground-muted">
          {value}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      {chevron ? <Icon as={ChevronRightIcon} size={16} className="text-foreground-faint" /> : null}
    </Pressable>
  );
}
