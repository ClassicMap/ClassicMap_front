import {
  AutoCollections,
  FavoriteSegmentList,
  InlineState,
  MyPageHeader,
  ProfileStats,
  ProfileTabs,
  RatedConcertGrid,
  type ProfileTabKey,
  type RatingSortKey,
} from '@/components/my-page/profile-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePublicProfile } from '@/lib/query/hooks/useMyPage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeftIcon, EyeOffIcon } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청에 실패했습니다.';
}

function parseUserId(id: string | string[] | undefined): number | undefined {
  const rawId = Array.isArray(id) ? id[0] : id;
  if (!rawId) return undefined;

  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = parseUserId(id);
  const publicProfile = usePublicProfile(userId);
  const [activeTab, setActiveTab] = React.useState<ProfileTabKey>('ratings');
  const [ratingSort, setRatingSort] = React.useState<RatingSortKey>('recent');

  const profile = publicProfile.data;
  const displayName = profile?.displayName || (userId ? `사용자 #${userId}` : '사용자');
  const ratings = profile?.ratings;
  const favorites = profile?.favorites;
  const collections = profile?.collections;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '공개 프로필',
          headerLeft: () => (
            <Button variant="ghost" size="icon" onPress={() => router.back()} className="ml-2">
              <Icon as={ChevronLeftIcon} className="size-6" />
            </Button>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        refreshControl={
          <RefreshControl
            refreshing={publicProfile.isRefetching}
            onRefresh={() => publicProfile.refetch()}
          />
        }>
        <View className="mx-auto w-full max-w-5xl gap-6 p-5 pb-12">
          {publicProfile.isLoading ? <InlineState title="불러오는 중" loading /> : null}
          {publicProfile.error ? (
            <InlineState
              title="프로필을 불러오지 못했어."
              description={getErrorMessage(publicProfile.error)}
              actionLabel="다시 시도"
              onAction={() => publicProfile.refetch()}
            />
          ) : null}
          {!publicProfile.isLoading && !publicProfile.error && !profile ? (
            <InlineState title="프로필을 찾을 수 없어." />
          ) : null}
          {profile ? (
            <>
              <MyPageHeader
                displayName={displayName}
                bio={profile.bio}
                avatarUrl={profile.avatarUrl || undefined}
              />
              {profile.summary ? (
                <ProfileStats summary={profile.summary} />
              ) : (
                <PrivateState title="요약이 비공개야." />
              )}
              <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
              {activeTab === 'ratings' ? (
                ratings ? (
                  <RatedConcertGrid
                    ratings={ratings}
                    sortKey={ratingSort}
                    onSortChange={setRatingSort}
                    onOpenConcert={(concertId) =>
                      router.push({ pathname: '/concert/[id]', params: { id: String(concertId) } })
                    }
                  />
                ) : (
                  <PrivateState title="평가 목록이 비공개야." />
                )
              ) : null}
              {activeTab === 'favorites' ? (
                favorites ? (
                  <FavoriteSegmentList
                    favorites={favorites}
                    onOpenConcert={(concertId) =>
                      router.push({ pathname: '/concert/[id]', params: { id: String(concertId) } })
                    }
                    onOpenArtist={(artistId) =>
                      router.push({ pathname: '/artist/[id]', params: { id: String(artistId) } })
                    }
                    onOpenComposer={(composerId) =>
                      router.push({
                        pathname: '/composer/[id]',
                        params: { id: String(composerId) },
                      })
                    }
                  />
                ) : (
                  <PrivateState title="보고싶어요가 비공개야." />
                )
              ) : null}
              {activeTab === 'collections' ? (
                collections ? (
                  <AutoCollections collections={collections} />
                ) : (
                  <PrivateState title="컬렉션이 비공개야." />
                )
              ) : null}
              {activeTab === 'profile' ? (
                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle>프로필</CardTitle>
                  </CardHeader>
                  <CardContent className="gap-2">
                    <Text className="text-lg font-semibold">{displayName}</Text>
                    <Text className="leading-6 text-muted-foreground">
                      {profile.bio || '소개가 아직 없어.'}
                    </Text>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function PrivateState({ title }: { title: string }) {
  return (
    <View className="items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8">
      <Icon as={EyeOffIcon} className="size-5 text-muted-foreground" />
      <Text className="font-semibold">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">비공개</Text>
    </View>
  );
}
