import { View, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { StarIcon } from 'lucide-react-native';
import * as React from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ rating, onRatingChange, readonly = false, size = 32 }: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0);

  const getStarFill = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    const fullStars = Math.floor(currentRating);
    const hasHalfStar = currentRating % 1 >= 0.5;

    if (starIndex < fullStars) {
      return 'full';
    } else if (starIndex === fullStars && hasHalfStar) {
      return 'half';
    }
    return 'empty';
  };

  const handlePress = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onRatingChange) return;
    const newRating = starIndex + (isHalf ? 0.5 : 1);
    onRatingChange(newRating);
  };

  return (
    <View className="flex-row gap-1">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = getStarFill(index);

        return (
          <View key={index} className="relative">
            {/* Empty star background */}
            <Icon
              as={StarIcon}
              size={size}
              className="text-gray-300"
              fill="transparent"
              strokeWidth={2}
            />

            {/* Filled star overlay */}
            {fill !== 'empty' && (
              <View
                className="absolute top-0 left-0 overflow-hidden"
                style={{ width: fill === 'half' ? '50%' : '100%' }}
              >
                <Icon
                  as={StarIcon}
                  size={size}
                  className="text-amber-500"
                  fill="#f59e0b"
                  strokeWidth={2}
                />
              </View>
            )}

            {/* Clickable areas for half and full star */}
            {!readonly && onRatingChange && (
              <>
                {/* Left half */}
                <TouchableOpacity
                  onPress={() => handlePress(index, true)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                  }}
                  activeOpacity={0.7}
                />
                {/* Right half */}
                <TouchableOpacity
                  onPress={() => handlePress(index, false)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '50%',
                    height: '100%',
                  }}
                  activeOpacity={0.7}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}
