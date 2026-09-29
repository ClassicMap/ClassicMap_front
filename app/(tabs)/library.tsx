import { RepertoireList } from '@/components/library/repertoire-list';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getFavoriteCount } from '@/lib/data/library';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyFavorites } from '@/lib/query/hooks/useMyPage';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { AlertCircleIcon, BookmarkIcon, LogInIcon } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTabHeaderInset, useTabScrollInsets } from '@/components/navigation/tab-chrome';

export default function LibraryScreen() {
  const headerInset = useTabHeaderInset();
  const scrollInsets = useTabScrollInsets();
  const router = useRouter();
  const { isSignedIn, loading } = useAuth();
  const { layout } = useBreakpoint();
  const isWide = layout === 'desktop' || layout === 'wide';
  const favorites = useMyFavorites(isSignedIn && !loading);

  const container = cn('px-4 pb-16', isWide && 'mx-auto w-full max-w-[880px] px-6');

  if (!loading && !isSignedIn) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: headerInset }}>
        <EmptyState
          icon={LogInIcon}
          title="로그인하면 레퍼토리를 모을 수 있어요"
          description="작곡가·연주자·작품·공연에서 레퍼토리에 담기를 누르면 여기에 모여요."
          action={{ label: '로그인', onPress: () => router.push('/(auth)/sign-in') }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      {...scrollInsets}
      className="flex-1 bg-background"
      contentContainerClassName={container}
      refreshControl={
        <RefreshControl refreshing={favorites.isRefetching} onRefresh={() => favorites.refetch()} />
      }>
      <Text variant="title1" className="mt-4">
        레퍼토리
      </Text>

      {favorites.isLoading || loading ? (
        <SkeletonList rows={6} className="mt-4" />
      ) : favorites.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          tone="error"
          title="레퍼토리를 불러오지 못했어요"
          description="연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: () => favorites.refetch() }}
        />
      ) : !favorites.data || getFavoriteCount(favorites.data) === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="아직 레퍼토리가 비어 있어요"
          description="작곡가·연주자·작품·공연에서 레퍼토리에 담기를 누르면 여기에 모여요."
          action={{ label: '비교할 수 있는 작품 보기', onPress: () => router.push('/compare') }}
        />
      ) : (
        <View className="mt-4">
          <RepertoireList favorites={favorites.data} editable />
        </View>
      )}
    </ScrollView>
  );
}
