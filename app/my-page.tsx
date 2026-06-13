import {
  AutoCollections,
  EMPTY_FAVORITES,
  FavoriteSegmentList,
  InlineState,
  MyPageHeader,
  ProfileStats,
  ProfileTabs,
  ProfileVisibilitySettings,
  RatedConcertGrid,
  buildAutoCollections,
  buildProfileSummary,
  type ProfileTabKey,
  type RatingSortKey,
} from '@/components/my-page/profile-components';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  useMyFavorites,
  useMyRatings,
  useProfileVisibility,
  useUpdateProfileVisibility,
} from '@/lib/query/hooks/useMyPage';
import { Alert } from '@/lib/utils/alert';
import { useUser } from '@clerk/clerk-expo';
import { type Href, Redirect, Stack, useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UpdateProfileVisibilityInput } from '@/lib/api/client';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청에 실패했습니다.';
}

export default function MyPageScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { profile: authProfile, loading: authLoading, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = React.useState<ProfileTabKey>('ratings');
  const [ratingSort, setRatingSort] = React.useState<RatingSortKey>('recent');

  const queriesEnabled = isSignedIn && !authLoading;
  const ratingsQuery = useMyRatings(queriesEnabled);
  const favoritesQuery = useMyFavorites(queriesEnabled);
  const visibilityQuery = useProfileVisibility(queriesEnabled);
  const updateVisibility = useUpdateProfileVisibility();

  const ratings = ratingsQuery.data ?? [];
  const favorites = favoritesQuery.data ?? EMPTY_FAVORITES;
  const collections = React.useMemo(
    () => buildAutoCollections(ratings, favorites),
    [favorites, ratings]
  );
  const summary = React.useMemo(
    () => buildProfileSummary(ratings, favorites, collections),
    [collections, favorites, ratings]
  );

  const email = user?.emailAddresses[0]?.emailAddress;
  const displayName = visibilityQuery.data?.displayName || user?.fullName || email || '사용자';
  const avatarUrl = visibilityQuery.data?.avatarUrl || user?.imageUrl;
  const refreshing =
    ratingsQuery.isRefetching || favoritesQuery.isRefetching || visibilityQuery.isRefetching;

  const refetchAll = () => {
    ratingsQuery.refetch();
    favoritesQuery.refetch();
    visibilityQuery.refetch();
  };

  const openPublicProfile = () => {
    if (!authProfile?.id) return;
    router.push(`/users/${authProfile.id}` as Href);
  };

  const saveProfileVisibility = (input: UpdateProfileVisibilityInput) => {
    updateVisibility.mutate(input, {
      onSuccess: () => {
        Alert.alert('저장됨', '프로필 설정을 저장했습니다.');
      },
      onError: (error) => {
        Alert.alert('저장 실패', getErrorMessage(error));
      },
    });
  };

  if (!authLoading && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '마이페이지',
          headerLeft: () => (
            <Button variant="ghost" size="icon" onPress={() => router.back()} className="ml-2">
              <Icon as={ChevronLeftIcon} className="size-6" />
            </Button>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}>
        <View className="mx-auto w-full max-w-5xl gap-6 p-5 pb-12">
          <MyPageHeader
            displayName={displayName}
            subtitle={email}
            bio={visibilityQuery.data?.bio}
            avatarUrl={avatarUrl}
            onOpenPublicProfile={authProfile?.id ? openPublicProfile : undefined}
          />
          <ProfileStats summary={summary} />
          <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === 'ratings' ? (
            <TabFrame
              loading={ratingsQuery.isLoading}
              error={ratingsQuery.error}
              retry={() => ratingsQuery.refetch()}>
              <RatedConcertGrid
                ratings={ratings}
                sortKey={ratingSort}
                onSortChange={setRatingSort}
                onOpenConcert={(concertId) =>
                  router.push({ pathname: '/concert/[id]', params: { id: String(concertId) } })
                }
                emptyAction={() => router.push('/(tabs)/concerts')}
              />
            </TabFrame>
          ) : null}
          {activeTab === 'favorites' ? (
            <TabFrame
              loading={favoritesQuery.isLoading}
              error={favoritesQuery.error}
              retry={() => favoritesQuery.refetch()}>
              <FavoriteSegmentList
                favorites={favorites}
                onOpenConcert={(concertId) =>
                  router.push({ pathname: '/concert/[id]', params: { id: String(concertId) } })
                }
                onOpenArtist={(artistId) =>
                  router.push({ pathname: '/artist/[id]', params: { id: String(artistId) } })
                }
                onOpenComposer={(composerId) =>
                  router.push({ pathname: '/composer/[id]', params: { id: String(composerId) } })
                }
              />
            </TabFrame>
          ) : null}
          {activeTab === 'collections' ? <AutoCollections collections={collections} /> : null}
          {activeTab === 'profile' ? (
            <TabFrame
              loading={visibilityQuery.isLoading}
              error={visibilityQuery.error}
              retry={() => visibilityQuery.refetch()}>
              <ProfileVisibilitySettings
                profile={visibilityQuery.data}
                defaultDisplayName={user?.fullName || email || '사용자'}
                defaultAvatarUrl={user?.imageUrl}
                onSave={saveProfileVisibility}
                isSaving={updateVisibility.isPending}
                onOpenEditProfile={() => router.push('/edit-profile')}
                onOpenSettings={() => router.push('/settings')}
              />
            </TabFrame>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function TabFrame({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return <InlineState title="불러오는 중" loading />;
  }

  if (error) {
    return (
      <InlineState
        title="데이터를 불러오지 못했어."
        description={getErrorMessage(error)}
        actionLabel="다시 시도"
        onAction={retry}
      />
    );
  }

  return <>{children}</>;
}
