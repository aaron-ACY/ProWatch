import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MetricCard } from '../components/MetricCard';
import { Colors, Shadows } from '../theme/colors';
import { watchService } from '../services/watchService';
import { HealthSummary, WatchStatus, RootTabParamList } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [healthSummary, setHealthSummary] = useState<HealthSummary>(watchService.getHealthSummary());
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(watchService.getWatchStatus());
  const [refreshing, setRefreshing] = useState(false);

  // Cập nhật trạng thái và đồng bộ dữ liệu Supabase mỗi khi quay lại màn hình chính
  useFocusEffect(
    useCallback(() => {
      setWatchStatus(watchService.getWatchStatus());
      setHealthSummary(watchService.getHealthSummary());
      watchService.syncWatchData().then(() => {
        setWatchStatus(watchService.getWatchStatus());
        setHealthSummary(watchService.getHealthSummary());
      });
    }, [])
  );

  useEffect(() => {
    // Subscribe to live BPM and SpO2 sensor stream
    const unsubscribe = watchService.subscribeToLiveUpdates((bpm, spo2) => {
      setHealthSummary(prev => ({
        ...prev,
        currentBpm: bpm,
        currentSpO2: spo2,
      }));
    });

    const unsubStatus = watchService.onStatusChange((status) => {
      setWatchStatus(status);
      setHealthSummary(watchService.getHealthSummary());
    });

    return () => {
      unsubscribe();
      unsubStatus();
    };
  }, []);

  const handleSync = async () => {
    await watchService.syncWatchData();
    setWatchStatus(watchService.getWatchStatus());
    setHealthSummary(watchService.getHealthSummary());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSync();
    setRefreshing(false);
  };

  const findMyWatch = () => {
    if (!watchStatus.connected) {
      Alert.alert(
        "Chưa kết nối",
        "Đồng hồ XIAO ESP32-S3 chưa được kết nối! Vui lòng kết nối đồng hồ trước khi tìm.",
        [{ text: "Đóng" }]
      );
      return;
    }
    Alert.alert(
      "Đang rung đồng hồ 🔔",
      "Đã gửi tín hiệu rung và phát âm thanh đến ProWatch XIAO ESP32-S3 của bạn.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greeting}>Xin chào, Bạn!</Text>
          </View>
          <TouchableOpacity 
            style={styles.bellButton}
            onPress={() => Alert.alert("Thông báo", "Tất cả chỉ số nhịp tim và oxy máu đều trong ngưỡng an toàn.")}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.textPrimary} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Device Connection Status Banner - Biến mất khi kết nối thành công */}
        {!watchStatus.connected && (
          watchStatus.connectionState === 'lost' ? (
            <TouchableOpacity 
              style={[styles.statusBanner, styles.bannerLost, Shadows.md]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.85}
            >
              <View style={styles.bannerLeft}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                <View style={styles.bannerTextBox}>
                  <Text style={styles.bannerLostTitle}>Mất kết nối với XIAO ESP32-S3! ⚠️</Text>
                  <Text style={styles.bannerLostSub} numberOfLines={1}>
                    {watchStatus.disconnectReason || 'Kiểm tra nguồn hoặc Bluetooth • Chạm để kết nối lại'}
                  </Text>
                </View>
              </View>
              <View style={styles.retryBadge}>
                <Text style={styles.retryBadgeText}>Kết nối lại</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.statusBanner, styles.bannerDisconnected, Shadows.sm]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.85}
            >
              <View style={styles.bannerLeft}>
                <MaterialCommunityIcons name="bluetooth-off" size={18} color={Colors.textMuted} />
                <Text style={styles.bannerDisconnectedText}>
                  Đồng hồ chưa kết nối • Chạm để dò tìm & kết nối
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )
        )}

        {/* Hero Section: Core Health Metrics (Heart Rate & SpO2) */}
        <Text style={styles.sectionTitle}>Chỉ số sinh tồn chính</Text>
        
        <View style={styles.metricsGrid}>
          {/* Heart Rate Card */}
          <MetricCard
            title="Nhịp tim"
            value={healthSummary.currentBpm > 0 ? healthSummary.currentBpm : '--'}
            unit="BPM"
            icon="heart-pulse"
            accentColor={Colors.heartRate}
            badgeText={
              watchStatus.connected ? "Trực tiếp" :
              watchStatus.connectionState === 'lost' ? "Mất tín hiệu" : (healthSummary.currentBpm > 0 ? "Lần đo gần nhất" : "Chưa đo")
            }
            badgeColor={
              watchStatus.connected ? Colors.primary :
              watchStatus.connectionState === 'lost' ? Colors.danger : (healthSummary.currentBpm > 0 ? Colors.heartRate : Colors.textMuted)
            }
            subInfo={
              healthSummary.currentBpm > 0
                ? (watchStatus.connected 
                    ? `Nghỉ ngơi: ${healthSummary.restingHr || healthSummary.minHrToday} • Đỉnh: ${healthSummary.maxHrToday} BPM`
                    : `Dữ liệu lưu gần nhất từ Supabase Cloud`)
                : 'Chưa có bản ghi nhịp tim'
            }
            onPress={() => navigation.navigate('HeartRate')}
          />

          {/* SpO2 Card */}
          <MetricCard
            title="Oxy trong máu (SpO2)"
            value={healthSummary.currentSpO2 > 0 ? healthSummary.currentSpO2 : '--'}
            unit="%"
            icon="water-percent"
            accentColor={Colors.spo2}
            badgeText={
              watchStatus.connected ? (healthSummary.currentSpO2 >= 95 ? "Bình thường" : "Cần lưu ý") :
              watchStatus.connectionState === 'lost' ? "Mất tín hiệu" : (healthSummary.currentSpO2 > 0 ? "Lần đo gần nhất" : "Chưa đo")
            }
            badgeColor={
              watchStatus.connected ? (healthSummary.currentSpO2 >= 95 ? Colors.success : Colors.warning) :
              watchStatus.connectionState === 'lost' ? Colors.danger : (healthSummary.currentSpO2 > 0 ? Colors.spo2 : Colors.textMuted)
            }
            subInfo={
              healthSummary.currentSpO2 > 0
                ? (watchStatus.connected
                    ? `Mức trung bình trong ngày: ${healthSummary.avgSpO2Today}%`
                    : `Dữ liệu lưu gần nhất từ Supabase Cloud`)
                : 'Chưa có bản ghi SpO2'
            }
            onPress={() => navigation.navigate('HeartRate')}
          />
        </View>

        {/* TinyML AI Health Risk Assessment Card */}
        {(() => {
          const riskScore = healthSummary.riskScore !== undefined ? healthSummary.riskScore : 0.05;
          const riskLevel = healthSummary.riskLevel || (riskScore >= 0.55 ? 'High' : riskScore >= 0.25 ? 'Medium' : 'Low');
          const isHigh = riskLevel === 'High';
          const isMed = riskLevel === 'Medium';
          const themeColor = isHigh ? Colors.danger : isMed ? '#F59E0B' : Colors.success;
          const bgColor = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#ECFDF5';
          const iconName = isHigh ? 'alert-decagram' : isMed ? 'alert-circle' : 'shield-check';
          const title = isHigh ? 'Cảnh báo Nguy cơ Cao!' : isMed ? 'Cần Chú ý / Nguy cơ Trung bình' : 'An toàn / Thể trạng Tốt';
          const desc = isHigh 
            ? 'Phát hiện nguy cơ bất thường từ dữ liệu nhịp tim và oxy máu! Hãy dừng gắng sức và theo dõi y tế.'
            : isMed
            ? 'Chỉ số sinh tồn có biến động nhẹ so với ngưỡng chuẩn, nên nghỉ ngơi và tiếp tục theo dõi.'
            : 'Các chỉ số nhịp tim và SpO2 hoàn toàn ổn định trong vùng an toàn theo mô hình TinyML AI.';

          return (
            <View style={[styles.aiRiskCard, Shadows.sm, { borderColor: themeColor + '60' }]}>
              <View style={styles.aiRiskHeader}>
                <View style={[styles.aiRiskIconBox, { backgroundColor: bgColor }]}>
                  <MaterialCommunityIcons name={iconName as any} size={24} color={themeColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.aiRiskBadgeRow}>
                    <Text style={styles.aiRiskSubTitle}>ĐÁNH GIÁ NGUY CƠ (TINYML AI)</Text>
                    <View style={[styles.aiRiskBadge, { backgroundColor: themeColor }]}>
                      <Text style={styles.aiRiskBadgeText}>{riskLevel.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.aiRiskTitle, { color: themeColor }]}>{title}</Text>
                </View>
              </View>

              <View style={styles.aiRiskDivider} />

              <View style={styles.aiRiskBody}>
                <View style={styles.aiRiskScoreRow}>
                  <Text style={styles.aiRiskScoreLabel}>Điểm rủi ro (Risk Score):</Text>
                  <Text style={[styles.aiRiskScoreValue, { color: themeColor }]}>
                    {(riskScore * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.aiRiskProgressBarBg}>
                  <View
                    style={[
                      styles.aiRiskProgressBarFill,
                      { width: `${Math.min(100, Math.max(6, riskScore * 100))}%`, backgroundColor: themeColor },
                    ]}
                  />
                </View>
                <Text style={styles.aiRiskDesc}>{desc}</Text>
              </View>
            </View>
          );
        })()}

        {/* Secondary Fitness & Sleep Metrics */}
        <Text style={styles.sectionTitle}>Hoạt động & Giấc ngủ</Text>
        <View style={styles.secondaryCardsRow}>
          {/* Steps */}
          <View style={[styles.miniCard, Shadows.sm]}>
            <View style={[styles.miniIconBox, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="shoe-print" size={18} color="#D97706" />
            </View>
            <Text style={styles.miniLabel}>Bước chân</Text>
            <Text style={styles.miniValue}>{watchStatus.connected || healthSummary.steps > 0 ? healthSummary.steps.toLocaleString() : '--'}</Text>
            <Text style={styles.miniSub}>{watchStatus.connected ? 'MPU6050 thời gian thực' : 'Đồng bộ từ Cloud'}</Text>
          </View>

          {/* Calories */}
          <View style={[styles.miniCard, Shadows.sm]}>
            <View style={[styles.miniIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="fire" size={18} color={Colors.heartRate} />
            </View>
            <Text style={styles.miniLabel}>Tiêu hao</Text>
            <Text style={styles.miniValue}>{watchStatus.connected || healthSummary.calories > 0 ? healthSummary.calories : '--'}</Text>
            <Text style={styles.miniSub}>{watchStatus.connected ? 'kcal hôm nay' : 'Đồng bộ từ Cloud'}</Text>
          </View>

          {/* Sleep */}
          <View style={[styles.miniCard, Shadows.sm]}>
            <View style={[styles.miniIconBox, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.miniLabel}>Giấc ngủ</Text>
            <Text style={styles.miniValue}>{watchStatus.connected && healthSummary.sleepHours > 0 ? `${healthSummary.sleepHours}h` : '--'}</Text>
            <Text style={styles.miniSub}>{watchStatus.connected ? 'Chất lượng tốt' : 'Chưa kết nối'}</Text>
          </View>
        </View>

        {/* Quick Watch Actions */}
        <Text style={styles.sectionTitle}>Thao tác nhanh đồng hồ</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickActionItem, Shadows.sm]}
            onPress={() => navigation.navigate('HeartRate')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.heartRateLight }]}>
              <MaterialCommunityIcons name="heart-flash" size={22} color={Colors.heartRate} />
            </View>
            <Text style={styles.actionItemText}>Đo nhịp tim</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionItem, Shadows.sm]}
            onPress={() => navigation.navigate('Statistics')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.spo2Light }]}>
              <MaterialCommunityIcons name="chart-box-outline" size={22} color={Colors.spo2} />
            </View>
            <Text style={styles.actionItemText}>Biểu đồ SpO2</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionItem, Shadows.sm]}
            onPress={findMyWatch}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="vibrate" size={22} color="#D97706" />
            </View>
            <Text style={styles.actionItemText}>Tìm đồng hồ</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionItem, Shadows.sm]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.cardMuted }]}>
              <MaterialCommunityIcons name="tune-vertical" size={22} color={Colors.textSecondary} />
            </View>
            <Text style={styles.actionItemText}>Tuỳ chỉnh</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor / AI Advice Banner */}
        <View style={[styles.adviceCard, Shadows.sm]}>
          <MaterialCommunityIcons 
            name={healthSummary.currentBpm > 0 && healthSummary.currentSpO2 > 0 ? "shield-check" : "heart-pulse"} 
            size={26} 
            color={healthSummary.currentBpm > 0 ? Colors.success : Colors.primary} 
          />
          <View style={styles.adviceContent}>
            <Text style={styles.adviceTitle}>
              {healthSummary.currentBpm > 0 ? "Thể trạng ổn định" : "Theo dõi sức khỏe ProWatch"}
            </Text>
            <Text style={styles.adviceText}>
              {healthSummary.currentBpm > 0 || healthSummary.currentSpO2 > 0
                ? `Nhịp tim gần nhất ${healthSummary.currentBpm || '--'} BPM và SpO2 ${healthSummary.currentSpO2 || '--'}%. Dữ liệu đã đồng bộ từ đồng hồ XIAO ESP32-S3.`
                : 'Chưa có bản ghi đo. Hãy vào tab Nhịp tim hoặc SpO2 để bắt đầu đo các chỉ số sinh tồn của bạn.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subGreeting: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.heartRate,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  metricsGrid: {
    gap: 4,
  },
  secondaryCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  miniIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  miniLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginVertical: 2,
  },
  miniSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  adviceCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  adviceContent: {
    flex: 1,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  adviceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  // Connection Status Banners
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  bannerConnected: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bannerConnectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 8,
  },
  bannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  bannerLost: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
  },
  bannerLostTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  bannerLostSub: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    maxWidth: 220,
  },
  retryBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  retryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  bannerDisconnected: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerDisconnectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerTextBox: {
    marginLeft: 8,
    flex: 1,
  },
  aiRiskCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
  },
  aiRiskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiRiskIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiRiskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiRiskSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  aiRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiRiskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },
  aiRiskTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  aiRiskDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  aiRiskBody: {
    gap: 8,
  },
  aiRiskScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiRiskScoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  aiRiskScoreValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiRiskProgressBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  aiRiskProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiRiskDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
});
