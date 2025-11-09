// components/OnboardingModal.tsx
// 첫 로그인 시 보여줄 온보딩 화면

import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { View, ScrollView, Modal } from 'react-native';
import * as React from 'react';
import type { UserPreferences } from '@/lib/api/mock-db';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (preferences: Partial<UserPreferences>) => void;
}

const PERIODS = [
  { id: '바로크', name: '바로크', emoji: '🎻' },
  { id: '고전', name: '고전', emoji: '🎹' },
  { id: '낭만', name: '낭만', emoji: '🎼' },
  { id: '근현대', name: '근현대', emoji: '🎵' },
];

const GENRES = [
  { id: '피아노', name: '피아노', emoji: '🎹' },
  { id: '교향곡', name: '교향곡', emoji: '🎺' },
  { id: '실내악', name: '실내악', emoji: '🎻' },
  { id: '오페라', name: '오페라', emoji: '🎭' },
  { id: '협주곡', name: '협주곡', emoji: '🎼' },
];

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>([]);

  const togglePeriod = (id: string) => {
    setSelectedPeriods(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleComplete = () => {
    onComplete({
      favoritePeriods: selectedPeriods,
      favoriteGenres: selectedGenres,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView className="flex-1 bg-background">
        <View className="gap-8 p-6 pt-12">
          {/* Header */}
          <View className="gap-3 items-center">
            <Text className="text-5xl">🎵</Text>
            <Text className="text-3xl font-bold text-center">
              클래식 여정을 시작합니다!
            </Text>
            <Text className="text-center text-muted-foreground">
              좋아하는 시대와 장르를 선택하면{'\n'}맞춤 추천을 받을 수 있어요
            </Text>
          </View>

          {/* 시대 선택 */}
          <View className="gap-4">
            <Text className="text-xl font-bold">좋아하는 시대를 선택하세요</Text>
            <View className="flex-row flex-wrap gap-3">
              {PERIODS.map(period => (
                <Button
                  key={period.id}
                  variant={selectedPeriods.includes(period.id) ? 'default' : 'outline'}
                  onPress={() => togglePeriod(period.id)}
                  className="rounded-full"
                >
                  <Text className={selectedPeriods.includes(period.id) ? '' : 'text-foreground'}>
                    {period.emoji} {period.name}
                  </Text>
                </Button>
              ))}
            </View>
          </View>

          {/* 장르 선택 */}
          <View className="gap-4">
            <Text className="text-xl font-bold">좋아하는 장르를 선택하세요</Text>
            <View className="flex-row flex-wrap gap-3">
              {GENRES.map(genre => (
                <Button
                  key={genre.id}
                  variant={selectedGenres.includes(genre.id) ? 'default' : 'outline'}
                  onPress={() => toggleGenre(genre.id)}
                  className="rounded-full"
                >
                  <Text className={selectedGenres.includes(genre.id) ? '' : 'text-foreground'}>
                    {genre.emoji} {genre.name}
                  </Text>
                </Button>
              ))}
            </View>
          </View>

          {/* 완료 버튼 */}
          <View className="gap-3 mt-4">
            <Button 
              onPress={handleComplete}
              disabled={selectedPeriods.length === 0 && selectedGenres.length === 0}
              className="w-full"
            >
              <Text>시작하기</Text>
            </Button>
            <Button variant="ghost" onPress={() => onComplete({})}>
              <Text>나중에 설정하기</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
