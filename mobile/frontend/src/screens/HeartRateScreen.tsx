import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { HeartRateVisualizer } from '../components/HeartRateVisualizer';
import { SpO2Gauge } from '../components/SpO2Gauge';
import { Colors, Shadows } from '../theme/colors';
import { watchService } from '../services/watchService';
import { HeartRateReading, SpO2Reading, RootTabParamList } from '../types';

type MeasureTab = 'hr' | 'spo2';

export const HeartRateScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [activeTab, setActiveTab] = useState<MeasureTab>('hr');
  const [watchStatus, setWatchStatus] = useState(watchService.getWatchStatus());
  
  // Chỉ số hiển thị: nạp từ bản ghi Supabase gần nhất nếu đồng hồ chưa kết nối, hoặc số đo trực tiếp nếu đang kết nối
  const [currentBpm, setCurrentBpm] = useState<number>(() => {
    return watchService.getHealthSummary().currentBpm || 0;
  });

  const [currentSpO2, setCurrentSpO2] = useState<number>(() => {
    return watchService.getHealthSummary().currentSpO2 || 0;
  });

  // Trạng thái đo riêng biệt cho từng thông số
  const [isMeasuringHr, setIsMeasuringHr] = useState(false);
  const [isMeasuringSpO2, setIsMeasuringSpO2] = useState(false);
  const [progress, setProgress] = useState(0);

  // Lịch sử đo
  const [hrHistory, setHrHistory] = useState<HeartRateReading[]>(watchService.getHeartRateHistory());
  const [spo2History, setSpo2History] = useState<SpO2Reading[]>(watchService.getSpO2History());

  const refreshData = useCallback(() => {
    const st = watchService.getWatchStatus();
    setWatchStatus(st);
    watchService.syncWatchData().then(() => {
      const updatedSt = watchService.getWatchStatus();
      setWatchStatus(updatedSt);
      const summary = watchService.getHealthSummary();
      if (summary.currentBpm && summary.currentBpm > 0) setCurrentBpm(summary.currentBpm);
      if (summary.currentSpO2 && summary.currentSpO2 > 0) setCurrentSpO2(summary.currentSpO2);
      setHrHistory(watchService.getHeartRateHistory());
      setSpo2History(watchService.getSpO2History());
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    // Lắng nghe dữ liệu trực tiếp từ cảm biến
    const unsubscribe = watchService.subscribeToLiveUpdates((bpm, spo2) => {
      if (!isMeasuringHr && bpm > 0) setCurrentBpm(bpm);
      if (!isMeasuringSpO2 && spo2 > 0) setCurrentSpO2(spo2);
      setHrHistory(watchService.getHeartRateHistory());
      setSpo2History(watchService.getSpO2History());
    });

    const unsubStatus = watchService.onStatusChange((status) => {
      setWatchStatus(status);
      const summary = watchService.getHealthSummary();
      if (!isMeasuringHr && summary.currentBpm && summary.currentBpm > 0) {
        setCurrentBpm(summary.currentBpm);
      }
      if (!isMeasuringSpO2 && summary.currentSpO2 && summary.currentSpO2 > 0) {
        setCurrentSpO2(summary.currentSpO2);
      }
      if (!status.connected) {
        setIsMeasuringHr(false);
        setIsMeasuringSpO2(false);
        setProgress(0);
      }
      setHrHistory(watchService.getHeartRateHistory());
      setSpo2History(watchService.getSpO2History());
    });

    return () => {
      unsubscribe();
      unsubStatus();
    };
  }, [isMeasuringHr, isMeasuringSpO2]);

  // 1. Đo RIÊNG Nhịp tim (HR)
  const handleToggleMeasureHr = () => {
    if (!watchStatus.connected) {
      Alert.alert(
        "Chưa kết nối đồng hồ",
        watchStatus.connectionState === 'lost'
          ? "Đã mất kết nối với XIAO ESP32-S3! Vui lòng vào Cài đặt để kết nối lại."
          : "Đồng hồ chưa được kết nối! Vui lòng vào Cài đặt để dò tìm & kết nối Bluetooth.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Vào Cài đặt", onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    if (isMeasuringHr) {
      watchService.cancelMeasurement();
      setIsMeasuringHr(false);
      setProgress(0);
      return;
    }

    // Nếu đang đo SpO2 thì hủy trước
    if (isMeasuringSpO2) {
      watchService.cancelMeasurement();
      setIsMeasuringSpO2(false);
    }

    setIsMeasuringHr(true);
    setProgress(15);

    watchService.performManualMeasurement(
      'hr',
      (prog, intermediateVal) => {
        setProgress(prog);
        if (intermediateVal && intermediateVal > 0) {
          setCurrentBpm(intermediateVal);
        }
      },
      (finalVal) => {
        setIsMeasuringHr(false);
        setProgress(100);
        setCurrentBpm(finalVal);
        setHrHistory(watchService.getHeartRateHistory());
      },
      (errorMsg) => {
        setIsMeasuringHr(false);
        setProgress(0);
        Alert.alert("Chưa hoàn tất đo", errorMsg);
      }
    );
  };

  // 2. Đo RIÊNG SpO2
  const handleToggleMeasureSpO2 = () => {
    if (!watchStatus.connected) {
      Alert.alert(
        "Chưa kết nối đồng hồ",
        watchStatus.connectionState === 'lost'
          ? "Đã mất kết nối với XIAO ESP32-S3! Vui lòng vào Cài đặt để kết nối lại."
          : "Đồng hồ chưa được kết nối! Vui lòng vào Cài đặt để dò tìm & kết nối Bluetooth trước khi đo.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Vào Cài đặt", onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    if (isMeasuringSpO2) {
      watchService.cancelMeasurement();
      setIsMeasuringSpO2(false);
      setProgress(0);
      return;
    }

    // Nếu đang đo HR thì hủy trước
    if (isMeasuringHr) {
      watchService.cancelMeasurement();
      setIsMeasuringHr(false);
    }

    setIsMeasuringSpO2(true);
    setProgress(15);

    watchService.performManualMeasurement(
      'spo2',
      (prog, intermediateVal) => {
        setProgress(prog);
        if (intermediateVal && intermediateVal > 0) {
          setCurrentSpO2(intermediateVal);
        }
      },
      (finalVal) => {
        setIsMeasuringSpO2(false);
        setProgress(100);
        setCurrentSpO2(finalVal);
        setSpo2History(watchService.getSpO2History());
      },
      (errorMsg) => {
        setIsMeasuringSpO2(false);
        setProgress(0);
        Alert.alert("Chưa hoàn tất đo", errorMsg);
      }
    );
  };

  const custom = watchService.getCustomization();
  const hrLowThr = custom.hrAlertLow || 60;
  const hrHighThr = custom.hrAlertHigh || 100;
  const spo2LowThr = custom.spo2AlertLow || 95;

  const getBpmZone = (bpm: number) => {
    if (!bpm || bpm <= 0) return { name: 'Chưa đo', color: Colors.textMuted, bg: Colors.background };
    if (bpm < hrLowThr) return { name: 'Quá thấp', color: Colors.warning, bg: '#FEF3C7' };
    if (bpm <= hrHighThr) return { name: 'Bình thường', color: Colors.success, bg: '#D1FAE5' };
    return { name: 'Quá cao', color: Colors.heartRate, bg: '#FEE2E2' };
  };

  const currentZone = getBpmZone(currentBpm);

  // Thống kê HR từ lịch sử Supabase
  const hrBpms = hrHistory.map(h => h.bpm).filter(b => b > 0);
  const minBpm = hrBpms.length > 0 ? Math.min(...hrBpms) : (currentBpm > 0 ? currentBpm : 0);
  const maxBpm = hrBpms.length > 0 ? Math.max(...hrBpms) : (currentBpm > 0 ? currentBpm : 0);
  const avgBpm = hrBpms.length > 0 ? Math.round(hrBpms.reduce((a, b) => a + b, 0) / hrBpms.length) : (currentBpm > 0 ? currentBpm : 0);

  // Thống kê SpO2 từ lịch sử Supabase
  const spo2Pcts = spo2History.map(s => s.percentage).filter(p => p > 0);
  const minSpo2 = spo2Pcts.length > 0 ? Math.min(...spo2Pcts) : (currentSpO2 > 0 ? currentSpO2 : 0);
  const maxSpo2 = spo2Pcts.length > 0 ? Math.max(...spo2Pcts) : (currentSpO2 > 0 ? currentSpO2 : 0);
  const avgSpo2 = spo2Pcts.length > 0 ? Math.round(spo2Pcts.reduce((a, b) => a + b, 0) / spo2Pcts.length) : (currentSpO2 > 0 ? currentSpO2 : 0);

  return (
    <ScrollView 
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Title Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Theo dõi sức khỏe</Text>
          <Text style={styles.subtitle}>Đo Nhịp tim & Nồng độ oxy trong máu (SpO2)</Text>
        </View>
      </View>

      {/* Dual Live Quick Status Cards (Click to switch measurement tab) */}
      <View style={styles.quickCardsRow}>
        {/* Heart Rate Tab Button */}
        <TouchableOpacity 
          style={[
            styles.quickCard, 
            activeTab === 'hr' && styles.quickCardActiveHr,
            Shadows.sm
          ]}
          onPress={() => setActiveTab('hr')}
          activeOpacity={0.85}
        >
          <View style={styles.quickCardHeader}>
            <View style={[styles.quickCardIconBox, { backgroundColor: Colors.heartRateLight }]}>
              <MaterialCommunityIcons name="heart-pulse" size={18} color={Colors.heartRate} />
            </View>
          </View>
          <Text style={styles.quickCardLabel}>Nhịp tim (HR)</Text>
          <Text style={[styles.quickCardValue, { color: Colors.heartRate }]}>
            {currentBpm > 0 ? currentBpm : '--'}
            <Text style={styles.quickCardUnit}> BPM</Text>
          </Text>
          <Text style={styles.quickCardSub}>
            {watchStatus.connected ? currentZone.name : (currentBpm > 0 ? 'Lần đo gần nhất' : 'Chưa đo')}
          </Text>
        </TouchableOpacity>

        {/* SpO2 Tab Button */}
        <TouchableOpacity 
          style={[
            styles.quickCard, 
            activeTab === 'spo2' && styles.quickCardActiveSpo2,
            Shadows.sm
          ]}
          onPress={() => setActiveTab('spo2')}
          activeOpacity={0.85}
        >
          <View style={styles.quickCardHeader}>
            <View style={[styles.quickCardIconBox, { backgroundColor: Colors.spo2Light }]}>
              <MaterialCommunityIcons name="water-percent" size={18} color={Colors.spo2} />
            </View>
          </View>
          <Text style={styles.quickCardLabel}>Oxy máu (SpO2)</Text>
          <Text style={[styles.quickCardValue, { color: Colors.spo2 }]}>
            {currentSpO2 > 0 ? currentSpO2 : '--'}
            <Text style={styles.quickCardUnit}> %</Text>
          </Text>
          <Text style={styles.quickCardSub}>
            {watchStatus.connected 
              ? (currentSpO2 >= 95 ? 'Bình thường ✅' : currentSpO2 > 0 ? 'Quá thấp ⚠️' : 'Chưa đo') 
              : (currentSpO2 > 0 ? 'Lần đo gần nhất' : 'Chưa đo')}
          </Text>
        </TouchableOpacity>
      </View>


      {/* ============================================================== */}
      {/* SECTION 1: ĐO NHỊP TIM (HR)                                     */}
      {/* ============================================================== */}
      {activeTab === 'hr' && (
        <View>
          {/* Main Interactive Pulsing Visualizer */}
          <HeartRateVisualizer
            bpm={watchStatus.connected ? currentBpm : 0}
            isMeasuring={isMeasuringHr}
            measurementProgress={progress}
            onToggleMeasure={handleToggleMeasureHr}
            statusText={currentZone.name}
            isConnected={watchStatus.connected}
          />

          {/* Stats Breakdown Bar - Trio */}
          <View style={styles.statsContainer}>
            {/* Min */}
            <View style={[styles.statTile, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="arrow-down-right" size={13} color="#0284C7" />
                </View>
                <Text style={styles.statLabel}>Thấp nhất</Text>
              </View>
              <Text style={styles.statValue}>
                {watchStatus.connected && minBpm > 0 ? minBpm : '--'}{' '}
                <Text style={styles.statUnit}>BPM</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>

            {/* Avg */}
            <View style={[styles.statTile, styles.statTileActive, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={13} color={Colors.heartRate} />
                </View>
                <Text style={[styles.statLabel, { color: Colors.heartRate }]}>Trung bình</Text>
              </View>
              <Text style={[styles.statValue, { color: Colors.heartRate }]}>
                {watchStatus.connected && avgBpm > 0 ? avgBpm : '--'}{' '}
                <Text style={[styles.statUnit, { color: Colors.heartRate }]}>BPM</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>

            {/* Max */}
            <View style={[styles.statTile, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="arrow-up-right" size={13} color={Colors.warning} />
                </View>
                <Text style={styles.statLabel}>Cao nhất</Text>
              </View>
              <Text style={styles.statValue}>
                {watchStatus.connected && maxBpm > 0 ? maxBpm : '--'}{' '}
                <Text style={styles.statUnit}>BPM</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>
          </View>

          {/* Cardiovascular Health Insight */}
          <View style={[styles.insightCard, Shadows.sm]}>
            <View style={styles.insightIconBox}>
              <MaterialCommunityIcons name="heart-flash" size={22} color={Colors.primary} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Tiêu chuẩn nhịp tim sinh lý</Text>
              <Text style={styles.insightDesc}>
                {watchStatus.connected && currentBpm > 0
                  ? `Nhịp tim hiện tại: ${currentBpm} BPM (${currentZone.name}). Ngưỡng chuẩn y tế khi nghỉ ngơi: ${hrLowThr} - ${hrHighThr} BPM.`
                  : 'Bấm nút "Bắt đầu đo nhịp tim" ở trên và đặt ngón tay lên cảm biến MAX30105 của đồng hồ để nhận diện chỉ số.'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: ĐO SPO2 (OXY TRONG MÁU)                             */}
      {/* ============================================================== */}
      {activeTab === 'spo2' && (
        <View>
          {/* Main SpO2 Gauge Visualizer with Measure Button */}
          <SpO2Gauge
            percentage={watchStatus.connected ? currentSpO2 : 0}
            isMeasuring={isMeasuringSpO2}
            measurementProgress={progress}
            onToggleMeasure={handleToggleMeasureSpO2}
            showMeasureButton={true}
            isConnected={watchStatus.connected}
          />

          {/* Stats Breakdown Bar - SpO2 Trio */}
          <View style={styles.statsContainer}>
            {/* Min SpO2 */}
            <View style={[styles.statTile, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="arrow-down-right" size={13} color="#0284C7" />
                </View>
                <Text style={styles.statLabel}>Thấp nhất</Text>
              </View>
              <Text style={styles.statValue}>
                {watchStatus.connected && minSpo2 > 0 ? minSpo2 : '--'}{' '}
                <Text style={styles.statUnit}>%</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>

            {/* Avg SpO2 */}
            <View style={[styles.statTile, styles.statTileActiveSpo2, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: Colors.spo2Light }]}>
                  <MaterialCommunityIcons name="water-percent" size={13} color={Colors.spo2} />
                </View>
                <Text style={[styles.statLabel, { color: Colors.spo2 }]}>Trung bình</Text>
              </View>
              <Text style={[styles.statValue, { color: Colors.spo2 }]}>
                {watchStatus.connected && avgSpo2 > 0 ? avgSpo2 : '--'}{' '}
                <Text style={[styles.statUnit, { color: Colors.spo2 }]}>%</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>

            {/* Max SpO2 */}
            <View style={[styles.statTile, Shadows.sm]}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statIconBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Feather name="arrow-up-right" size={13} color={Colors.success} />
                </View>
                <Text style={styles.statLabel}>Cao nhất</Text>
              </View>
              <Text style={styles.statValue}>
                {watchStatus.connected && maxSpo2 > 0 ? maxSpo2 : '--'}{' '}
                <Text style={styles.statUnit}>%</Text>
              </Text>
              <Text style={styles.statSub}>Hôm nay</Text>
            </View>
          </View>

          {/* SpO2 Medical Standard Insight */}
          <View style={[styles.insightCard, Shadows.sm]}>
            <View style={[styles.insightIconBox, { backgroundColor: Colors.spo2Light }]}>
              <MaterialCommunityIcons name="shield-check" size={22} color={Colors.spo2} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Chỉ số SpO2 y tế tham chiếu</Text>
              <Text style={styles.insightDesc}>
                {`• 95% - 100%: Nồng độ oxy trong máu lý tưởng (Tối ưu).\n• 90% - 94%: Cần chú ý, cơ thể có dấu hiệu thiếu oxy nhẹ.\n• < 90%: Thiếu oxy nặng (Báo động), cần hỗ trợ y tế.`}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  quickCardActiveHr: {
    borderColor: Colors.heartRate,
    backgroundColor: '#FFF5F5',
  },
  quickCardActiveSpo2: {
    borderColor: Colors.spo2,
    backgroundColor: '#F0F9FF',
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickCardValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  quickCardUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statTileActive: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  statTileActiveSpo2: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  statTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
});
