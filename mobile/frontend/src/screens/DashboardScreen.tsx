import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Path, Line } from 'react-native-svg';
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
  const [isSyncing, setIsSyncing] = useState(false);

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
    setIsSyncing(true);
    await watchService.syncWatchData();
    setWatchStatus(watchService.getWatchStatus());
    setHealthSummary(watchService.getHealthSummary());
    setIsSyncing(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSync();
    setRefreshing(false);
  };

  // Đánh giá trạng thái sức khỏe & phối màu hài hòa theo chuẩn Design System
  const getHealthStatus = () => {
    const bpm = healthSummary.currentBpm;
    const spo2 = healthSummary.currentSpO2;
    const riskLevel = healthSummary.riskLevel;

    if (riskLevel === 'High' || (bpm > 0 && (bpm > 120 || bpm < 45)) || (spo2 > 0 && spo2 < 90)) {
      return {
        statusText: 'Nguy cơ',
        titleColor: '#DC2626',
        bg: '#FEF2F2',
        textColor: '#991B1B',
        needleAngle: -65, // Mũi kim quay về phía dải màu đỏ
      };
    }
    if (riskLevel === 'Medium' || (bpm > 0 && (bpm > 100 || bpm < 50)) || (spo2 > 0 && spo2 < 95)) {
      return {
        statusText: 'Chú ý',
        titleColor: '#D97706',
        bg: '#FFFBEB',
        textColor: '#92400E',
        needleAngle: -12, // Mũi kim quay về vùng vàng/cam ở giữa
      };
    }
    return {
      statusText: 'Tốt',
      titleColor: '#047857', // Màu xanh ngọc đậm sang trọng
      bg: '#F0FDF4',        // Nền xanh ngọc pastel trong trẻo (Tailwind Emerald 50)
      textColor: '#059669',    // Xanh ngọc trung tính hài hòa
      needleAngle: 48,        // Mũi kim quay về phía màu xanh lá bên phải
    };
  };

  const healthStatus = getHealthStatus();

  // Tính toán thông số biểu đồ tròn Activity Rings
  const stepsGoal = healthSummary.stepsGoal || 10000;
  const currentSteps = watchStatus.connected || healthSummary.steps > 0 ? healthSummary.steps : 0;
  const stepsRatio = Math.min(Math.max(currentSteps / stepsGoal, 0), 1);

  const caloGoal = 500;
  const currentCalo = watchStatus.connected || healthSummary.calories > 0 ? healthSummary.calories : 0;
  const caloRatio = Math.min(Math.max(currentCalo / caloGoal, 0), 1);

  // Vòng ngoài: Bước chân (R1 = 44, Chu vi ≈ 276.46)
  const r1 = 44;
  const c1 = 2 * Math.PI * r1;
  const offset1 = c1 * (1 - stepsRatio);

  // Vòng trong: Calo (R2 = 31, Chu vi ≈ 194.78)
  const r2 = 31;
  const c2 = 2 * Math.PI * r2;
  const offset2 = c2 * (1 - caloRatio);

  // Tính toán vị trí thanh trượt min-max cho Nhịp tim (Thang đo 40..140, an toàn 50..100)
  const hrVal = healthSummary.currentBpm > 0 ? healthSummary.currentBpm : 59;
  const hrMin = 40;
  const hrMax = 140;
  const hrPercent = Math.min(Math.max(((hrVal - hrMin) / (hrMax - hrMin)) * 100, 2), 98);

  // Tính toán vị trí thanh trượt min-max cho SpO2 (Thang đo 85..100, an toàn 95..100)
  const spo2Val = healthSummary.currentSpO2 > 0 ? healthSummary.currentSpO2 : 98;
  const spo2Min = 85;
  const spo2Max = 100;
  const spo2Percent = Math.min(Math.max(((spo2Val - spo2Min) / (spo2Max - spo2Min)) * 100, 2), 98);

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
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerGreeting}>Tổng quan hôm nay</Text>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => Alert.alert('Thông báo', 'Tất cả chỉ số nhịp tim và oxy máu đều trong ngưỡng an toàn.')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color="#0F172A" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* ================= COMPONENT 1: HOẠT ĐỘNG ================= */}
        <Text style={styles.sectionTitle}>Hoạt động</Text>
        <TouchableOpacity 
          style={[styles.activityCard, Shadows.sm]}
          onPress={() => navigation.navigate('Sport')}
          activeOpacity={0.85}
        >
          {/* Biểu đồ tròn Activity 2 vòng sắc nét, phối màu ấm áp */}
          <View style={styles.chartWrapper}>
            <Svg width={112} height={112} viewBox="0 0 112 112">
              <G rotation="-90" origin="56, 56">
                {/* Vòng ngoài - Nền Bước chân (vàng hổ phách nhạt) */}
                <Circle
                  cx="56"
                  cy="56"
                  r={r1}
                  stroke="#FEF3C7"
                  strokeWidth="8"
                  fill="none"
                />
                <Circle
                  cx="56"
                  cy="56"
                  r={r1}
                  stroke="#F59E0B"
                  strokeWidth="8"
                  strokeDasharray={c1}
                  strokeDashoffset={offset1}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Vòng trong - Nền Calo (hồng đỏ nhạt) */}
                <Circle
                  cx="56"
                  cy="56"
                  r={r2}
                  stroke="#FEE2E2"
                  strokeWidth="8"
                  fill="none"
                />
                <Circle
                  cx="56"
                  cy="56"
                  r={r2}
                  stroke={Colors.heartRate}
                  strokeWidth="8"
                  strokeDasharray={c2}
                  strokeDashoffset={offset2}
                  strokeLinecap="round"
                  fill="none"
                />
              </G>

              {/* Điểm mút xuất phát ở đỉnh (12h) */}
              <Circle cx="56" cy={56 - r1} r="4.5" fill="#F59E0B" />
              <Circle cx="56" cy={56 - r2} r="4.5" fill={Colors.heartRate} />
            </Svg>

            {/* Icon ở tâm biểu đồ tròn để tạo điểm nhấn hài hòa */}
            <View style={styles.chartCenterIcon}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
            </View>
          </View>

          {/* Chi tiết thông số Activity: Bước chân & Tiêu hao */}
          <View style={styles.activityDetails}>
            {/* Bước chân */}
            <View style={styles.activityStatRow}>
              <View style={[styles.statDotSquare, { backgroundColor: '#F59E0B' }]} />
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Bước chân</Text>
                <Text style={styles.statValue}>
                  {currentSteps.toLocaleString()} <Text style={styles.statGoal}>/ {stepsGoal.toLocaleString()}</Text>
                </Text>
              </View>
              <Text style={[styles.percentTextBold, { color: '#F59E0B' }]}>
                {Math.round(stepsRatio * 100)}%
              </Text>
            </View>

            {/* Calo */}
            <View style={styles.activityStatRow}>
              <View style={[styles.statDotSquare, { backgroundColor: Colors.heartRate }]} />
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Tiêu hao</Text>
                <Text style={styles.statValue}>
                  {currentCalo} <Text style={styles.statGoal}>/ {caloGoal} kcal</Text>
                </Text>
              </View>
              <Text style={[styles.percentTextBold, { color: Colors.heartRate }]}>
                {Math.round(caloRatio * 100)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= COMPONENT 2: CHỈ SỐ SỨC KHỎE ================= */}
        <Text style={styles.sectionTitle}>Chỉ số sức khỏe</Text>
        <View style={[styles.healthCard, Shadows.sm]}>
          {/* CỘT TRÁI: NHỊP TIM & SPO2 VỚI THANH ĐO NGƯỠNG AN TOÀN */}
          <View style={styles.healthLeftCol}>
            {/* Nhịp tim */}
            <TouchableOpacity 
              style={styles.vitalsRow}
              onPress={() => navigation.navigate('HeartRate')}
              activeOpacity={0.7}
            >
              <View style={styles.vitalsHeader}>
                <View style={[styles.vitalsIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="heart" size={16} color={Colors.heartRate} />
                </View>
                <Text style={styles.vitalsTitle}>Nhịp tim</Text>
              </View>

              <View style={styles.vitalsValRow}>
                <Text style={styles.vitalsValue}>
                  {healthSummary.currentBpm > 0 ? healthSummary.currentBpm : '--'}
                </Text>
                <Text style={styles.vitalsUnit}>BPM</Text>
              </View>

              {/* Thanh trượt hiển thị ngưỡng an toàn Nhịp tim */}
              <View style={styles.rangeBarContainer}>
                <View style={styles.rangeBarTrack}>
                  {/* Vùng an toàn 50 - 100 BPM */}
                  <View style={[styles.rangeBarSafeZone, { left: '10%', width: '50%' }]} />
                </View>
                {/* Nút chỉ vị trí hiện tại */}
                <View style={[styles.rangeBarKnob, { left: `${hrPercent}%` }]}>
                  <View style={styles.rangeBarKnobInner} />
                </View>
              </View>
              <Text style={styles.rangeBarText}>Ngưỡng an toàn 50–100</Text>
            </TouchableOpacity>

            <View style={styles.vitalsDivider} />

            {/* Oxy máu (SpO2) */}
            <TouchableOpacity 
              style={styles.vitalsRow}
              onPress={() => navigation.navigate('HeartRate')}
              activeOpacity={0.7}
            >
              <View style={styles.vitalsHeader}>
                <View style={[styles.vitalsIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons name="water" size={16} color={Colors.spo2} />
                </View>
                <Text style={styles.vitalsTitle}>Oxy máu (SpO₂)</Text>
              </View>

              <View style={styles.vitalsValRow}>
                <Text style={styles.vitalsValue}>
                  {healthSummary.currentSpO2 > 0 ? healthSummary.currentSpO2 : '--'}
                </Text>
                <Text style={styles.vitalsUnit}>%</Text>
              </View>

              {/* Thanh trượt hiển thị ngưỡng an toàn SpO2 */}
              <View style={styles.rangeBarContainer}>
                <View style={styles.rangeBarTrack}>
                  {/* Vùng an toàn 95 - 100% */}
                  <View style={[styles.rangeBarSafeZone, { left: '66.7%', width: '33.3%' }]} />
                </View>
                {/* Nút chỉ vị trí hiện tại */}
                <View style={[styles.rangeBarKnob, { left: `${spo2Percent}%` }]}>
                  <View style={styles.rangeBarKnobInner} />
                </View>
              </View>
              <Text style={styles.rangeBarText}>Ngưỡng an toàn 95–100</Text>
            </TouchableOpacity>
          </View>

          {/* ĐƯỜNG KẺ DỌC */}
          <View style={styles.verticalDivider} />

          {/* CỘT PHẢI: BIỂU ĐỒ SPEEDOMETER GAUGE - PHỐI MÀU PASTEL CHUẨN MỰC */}
          <View style={[styles.healthRightCol, { backgroundColor: healthStatus.bg }]}>
            <Text style={[styles.statusHeaderLabel, { color: healthStatus.textColor }]}>
              THỂ TRẠNG
            </Text>

            {/* Biểu đồ Speedometer Gauge 6 phân đoạn (Chuyển tiếp màu mượt mà, dịu mắt) */}
            <View style={styles.speedometerBox}>
              <Svg width={120} height={64} viewBox="0 0 120 64">
                {/* Đoạn 1: Đỏ mềm mại (San hô) */}
                <Path
                  d="M 22.0 56.0 A 38 38 0 0 1 26.4 38.2"
                  stroke="#F87171"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />
                {/* Đoạn 2: Cam ấm */}
                <Path
                  d="M 27.2 36.8 A 38 38 0 0 1 40.0 23.7"
                  stroke="#FB923C"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />
                {/* Đoạn 3: Hổ phách */}
                <Path
                  d="M 41.5 22.8 A 38 38 0 0 1 59.1 18.0"
                  stroke="#FBBF24"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />
                {/* Đoạn 4: Vàng dịu */}
                <Path
                  d="M 60.9 18.0 A 38 38 0 0 1 78.5 22.8"
                  stroke="#FACC15"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />
                {/* Đoạn 5: Xanh cốm nhạt */}
                <Path
                  d="M 80.0 23.7 A 38 38 0 0 1 92.8 36.8"
                  stroke="#A3E635"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />
                {/* Đoạn 6: Xanh ngọc Emerald */}
                <Path
                  d="M 93.6 38.2 A 38 38 0 0 1 98.0 56.0"
                  stroke="#34D399"
                  strokeWidth="11"
                  strokeLinecap="butt"
                  fill="none"
                />

                {/* Kim chỉ tốc độ (Needle phong cách tinh tế) */}
                <G rotation={healthStatus.needleAngle} origin="60, 56">
                  <Line
                    x1="60"
                    y1="56"
                    x2="60"
                    y2="16"
                    stroke="#0F172A"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <Circle cx="60" cy="56" r="4.5" fill="#0F172A" />
                  <Circle cx="60" cy="56" r="1.8" fill="#FFFFFF" />
                </G>
              </Svg>
            </View>

            {/* Tiêu đề trạng thái: Tốt / Chú ý / Nguy cơ */}
            <Text style={[styles.statusMainTitle, { color: healthStatus.titleColor }]}>
              {healthStatus.statusText}
            </Text>

            {/* Nút chuyển tiếp Xem chi tiết */}
            <TouchableOpacity 
              style={styles.detailLinkBtn}
              onPress={() => navigation.navigate('HeartRate')}
              activeOpacity={0.7}
            >
              <Text style={[styles.detailLinkText, { color: healthStatus.textColor }]}>
                Xem chi tiết →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= COMPONENT 3: TRUY CẬP NHANH ================= */}
        <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
        <View style={styles.quickAccessRow}>
          {/* Đồng bộ Cloud */}
          <TouchableOpacity 
            style={[styles.quickBtn, Shadows.sm]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            <View style={[styles.quickBtnIconBox, { backgroundColor: '#EFF6FF' }]}>
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialCommunityIcons name="sync" size={20} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.quickBtnLabel}>
              {isSyncing ? 'Đang đồng bộ' : 'Đồng bộ Cloud'}
            </Text>
          </TouchableOpacity>

          {/* Biểu đồ Thống kê */}
          <TouchableOpacity 
            style={[styles.quickBtn, Shadows.sm]}
            onPress={() => navigation.navigate('Statistics')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickBtnIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="chart-box-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.quickBtnLabel}>Thống kê</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.heartRate,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 10,
  },

  // ================= COMPONENT 1: HOẠT ĐỘNG =================
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  chartWrapper: {
    width: 112,
    height: 112,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: {
    flex: 1,
    gap: 16,
  },
  activityStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDotSquare: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  statGoal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  percentTextBold: {
    fontSize: 13,
    fontWeight: '900',
  },

  // ================= COMPONENT 2: CHỈ SỐ SỨC KHỎE =================
  healthCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 6,
  },
  healthLeftCol: {
    flex: 1.15,
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  vitalsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  vitalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vitalsIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  vitalsValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  vitalsValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  vitalsUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // Range Bar (Thanh trượt hiển thị ngưỡng an toàn)
  rangeBarContainer: {
    height: 14,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  rangeBarTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  rangeBarSafeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#BBF7D0',
    borderRadius: 2,
  },
  rangeBarKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  rangeBarKnobInner: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0F172A',
  },
  rangeBarText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  vitalsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },

  // Cột bên phải: Status & Speedometer Gauge (Căn giữa hoàn hảo)
  healthRightCol: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  speedometerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  statusMainTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  detailLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },

  // ================= COMPONENT 3: TRUY CẬP NHANH =================
  quickAccessRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  quickBtnIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
});
