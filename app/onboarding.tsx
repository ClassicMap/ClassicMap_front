import { type OnboardingResult, TasteOnboarding } from '@/components/onboarding/taste-onboarding';
import { EmptyState } from '@/components/ui/empty-state';
import { MyPageAPI } from '@/lib/api/client';
import { useTaste } from '@/lib/hooks/useTaste';
import { MY_PAGE_QUERY_KEYS } from '@/lib/query/hooks/useMyPage';
import type { OnboardingStatus } from '@/lib/types/models';
import { Alert } from '@/lib/utils/alert';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

function unique(ids: number[]): number[] {
  return [...new Set(ids)];
}

/** 취향 묻기. 가입 직후 홈이 한 번 열고, 설정의 '아는 곡부터 다시 고르기'로도 연다 */
export default function OnboardingScreen() {
  const router = useRouter();
  const taste = useTaste();
  const queryClient = useQueryClient();

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/home' as Href));

  const savePeople = async (people: OnboardingResult['people']) => {
    const artists = people.filter((person) => person.kind === 'artist').map((person) => person.id);
    const composers = people
      .filter((person) => person.kind === 'composer')
      .map((person) => person.id);
    if (artists.length + composers.length === 0) return;
    if (taste.signedIn) {
      // 이미 담긴 사람은 서버가 그대로 둔다. 하나가 실패해도 나머지는 담는다
      await Promise.allSettled([
        ...artists.map((id) => MyPageAPI.addFavoriteArtist(id)),
        ...composers.map((id) => MyPageAPI.addFavoriteComposer(id)),
      ]);
      void queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEYS.favorites });
      return;
    }
    await taste.updateGuest((current) => ({
      ...current,
      favoriteArtistIds: unique([...current.favoriteArtistIds, ...artists]),
      favoriteComposerIds: unique([...current.favoriteComposerIds, ...composers]),
    }));
  };

  const finish = async (result: OnboardingResult, status: OnboardingStatus) => {
    try {
      await savePeople(result.people);
      await taste.save(result.answers, { onboarding: status });
      leave();
    } catch {
      Alert.alert(
        '취향을 저장하지 못했어요',
        '연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 시도해 주세요.'
      );
    }
  };

  if (taste.failed) {
    return (
      <View className="flex-1 justify-center bg-background">
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="취향을 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도하거나 나중에 설정에서 골라 주세요."
          action={{ label: '다시 시도', onPress: taste.retry }}
        />
      </View>
    );
  }
  if (!taste.ready) return <View className="flex-1 bg-background" />;

  return (
    <TasteOnboarding
      initial={taste.answers}
      onFinish={(result) => finish(result, 'completed')}
      // 한 번 끝낸 사람이 다시 열었다 닫으면 끝낸 상태를 그대로 둔다
      onClose={(result) =>
        finish(result, taste.onboardingStatus === 'completed' ? 'completed' : 'skipped')
      }
    />
  );
}
