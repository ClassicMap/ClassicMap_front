import React from 'react';
import { Modal, View, TouchableOpacity, Linking, ScrollView, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { XIcon, ExternalLinkIcon } from 'lucide-react-native';
import { Alert } from '@/lib/utils/alert';

interface TicketVendor {
  id: number;
  concertId: number;
  vendorName?: string;
  vendorUrl: string;
  displayOrder: number;
}

interface TicketVendorsModalProps {
  visible: boolean;
  vendors: TicketVendor[];
  onClose: () => void;
}

export function TicketVendorsModal({ visible, vendors, onClose }: TicketVendorsModalProps) {
  const slideAnim = React.useRef(new Animated.Value(500)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleOpenVendor = (vendorUrl: string) => {
    Linking.openURL(vendorUrl).catch(() => {
      Alert.alert('오류', '예매 페이지를 열 수 없습니다.');
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          className="bg-background rounded-t-3xl p-6"
          style={{
            maxHeight: '80%',
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold">예매하기</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon as={XIcon} size={24} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Vendors List */}
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {vendors.length === 0 ? (
              <Card className="p-6">
                <Text className="text-center text-muted-foreground">
                  예매 링크가 없습니다.
                </Text>
              </Card>
            ) : (
              <View className="gap-3">
                {vendors.map((vendor) => (
                  <Card key={vendor.id} className="p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-4">
                        <Text className="text-lg font-semibold mb-1">
                          {vendor.vendorName || '예매처'}
                        </Text>
                        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                          {vendor.vendorUrl}
                        </Text>
                      </View>
                      <Button
                        onPress={() => handleOpenVendor(vendor.vendorUrl)}
                        size="sm"
                      >
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm">예매하기</Text>
                          <Icon as={ExternalLinkIcon} size={16} className="text-primary-foreground" />
                        </View>
                      </Button>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <Button
            variant="outline"
            size="lg"
            onPress={onClose}
            className="mt-4"
          >
            <Text>닫기</Text>
          </Button>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
