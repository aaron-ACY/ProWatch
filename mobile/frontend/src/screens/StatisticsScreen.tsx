import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatChart } from '../components/StatChart';
import { Colors, Shadows } from '../theme/colors';
import { watchService } from '../services/watchService';
import { SpO2Reading, HeartRateReading, RootTabParamList } from '../types';

type MetricTab = 'spo2' | 'hr';
type TimeframeTab = 'today' | 'week' | 'month';

export const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [activeMetric, setActiveMetric] = useState<MetricTab>('spo2');
  const [timeframe, setTimeframe] = useState<TimeframeTab>('today');
  const [spo2History, setSpo2History] = useState<SpO2Reading[]>(watchService.getSpO2History());
  const [hrHistory, setHrHistory] = useState<HeartRateReading[]>(watchService.getHeartRateHistory());

  useFocusEffect(
    useCallback(() => {
      watchService.syncWatchData().then(() => {
        setSpo2History(watchService.getSpO2History());
        setHrHistory(watchService.getHeartRateHistory());
      });
    }, [])
  );

  useEffect(() => {
    const unsub = watchService.subscribeToLiveUpdates(() => {
      setSpo2History(watchService.getSpO2History());
      setHrHistory(watchService.getHeartRateHistory());
    });

    const unsubStatus = watchService.onStatusChange(() => {
      setSpo2History(watchService.getSpO2History());
      setHrHistory(watchService.getHeartRateHistory());
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const isHr = activeMetric === 'hr';
  const activeColor = isHr ? Colors.heartRate : Colors.spo2;
  const unit = isHr ? 'BPM' : '%';

  // Lọc dữ liệu theo timeframe
  const filterByTimeframe = <T extends { timestamp: string }>(records: T[]): T[] => {
    if (timeframe === 'today') {
      return records.filter(r => r.timestamp.includes('hôm nay') || !r.timestamp.includes('/'));
    }
    if (timeframe === 'week') {
      return records.slice(0, 14);
    }
    return records.slice(0, 30);
  };

  const filteredHr = filterByTimeframe(hrHistory);
  const filteredSpo2 = filterByTimeframe(spo2History);

  // Dữ liệu biểu đồ từ lịch sử đo thật (KHÔNG sinh fake data)
  const chartData = isHr
    ? filteredHr.slice(0, 10).reverse().map(h => ({
        label: h.timestamp.includes(' ') ? h.timestamp.split(' ')[0] : h.timestamp,
        value: h.bpm,
      }))
    : filteredSpo2.slice(0, 10).reverse().map(s => ({
        label: s.timestamp.includes(' ') ? s.timestamp.split(' ')[0] : s.timestamp,
        value: s.percentage,
      }));

  // Thống kê số học chính xác từ dữ liệu thật
  const hrBpms = filteredHr.map(h => h.bpm).filter(b => b > 0);
  const spo2Pcts = filteredSpo2.map(s => s.percentage).filter(p => p > 0);

  const avgVal = isHr
    ? (hrBpms.length > 0 ? Math.round(hrBpms.reduce((a, b) => a + b, 0) / hrBpms.length) : 0)
    : (spo2Pcts.length > 0 ? Math.round(spo2Pcts.reduce((a, b) => a + b, 0) / spo2Pcts.length) : 0);

  const minVal = isHr
    ? (hrBpms.length > 0 ? Math.min(...hrBpms) : 0)
    : (spo2Pcts.length > 0 ? Math.min(...spo2Pcts) : 0);

  const maxVal = isHr
    ? (hrBpms.length > 0 ? Math.max(...hrBpms) : 0)
    : (spo2Pcts.length > 0 ? Math.max(...spo2Pcts) : 0);

  // Tỷ lệ đạt chuẩn
  const optimalCount = isHr
    ? hrBpms.filter(b => b >= 60 && b <= 100).length
    : spo2Pcts.filter(p => p >= 95).length;
  const totalCount = isHr ? hrBpms.length : spo2Pcts.length;
  const standardPct = totalCount > 0 ? Math.round((optimalCount / totalCount) * 100) : 0;

  return (
    <ScrollView 
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Thống kê sức khỏe</Text>
          <Text style={styles.subtitle}>Phân tích & tổng hợp lịch sử đo từ đồng hồ</Text>
        </View>
        <TouchableOpacity 
          style={styles.goMeasureBtn}
          onPress={() => navigation.navigate('HeartRate')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus-circle" size={16} color={Colors.white} />
          <Text style={styles.goMeasureText}>Đo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Selector Pills */}
      <View style={styles.tabSelector}>
        <TouchableOpacity 
          style={[styles.tabButton, !isHr && styles.activeTabButtonSpo2]}
          onPress={() => setActiveMetric('spo2')}
        >
          <MaterialCommunityIcons 
            name="water-percent" 
            size={18} 
            color={!isHr ? Colors.white : Colors.spo2} 
          />
          <Text style={[styles.tabText, !isHr && styles.activeTabText]}>
            Thống kê Oxy máu (SpO2)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, isHr && styles.activeTabButtonHr]}
          onPress={() => setActiveMetric('hr')}
        >
          <MaterialCommunityIcons 
            name="heart-pulse" 
            size={18} 
            color={isHr ? Colors.white : Colors.heartRate} 
          />
          <Text style={[styles.tabText, isHr && styles.activeTabText]}>
            Thống kê Nhịp tim (HR)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Stat 4-Grid Cards */}
      <View style={styles.statsGrid}>
        {/* Trung bình */}
        <View style={[styles.statBox, Shadows.sm]}>
          <Text style={styles.statLabel}>Trung bình</Text>
          <Text style={[styles.statBig, { color: activeColor }]}>
            {avgVal > 0 ? avgVal : '--'} <Text style={styles.statSubUnit}>{unit}</Text>
          </Text>
          <Text style={styles.statNote}>Giá trị trung bình mẫu</Text>
        </View>

        {/* Cao nhất */}
        <View style={[styles.statBox, Shadows.sm]}>
          <Text style={styles.statLabel}>Cao nhất</Text>
          <Text style={[styles.statBig, { color: Colors.textPrimary }]}>
            {maxVal > 0 ? maxVal : '--'} <Text style={styles.statSubUnit}>{unit}</Text>
          </Text>
          <Text style={styles.statNote}>Đỉnh điểm đã ghi nhận</Text>
        </View>

        {/* Thấp nhất */}
        <View style={[styles.statBox, Shadows.sm]}>
          <Text style={styles.statLabel}>Thấp nhất</Text>
          <Text style={[styles.statBig, { color: Colors.textPrimary }]}>
            {minVal > 0 ? minVal : '--'} <Text style={styles.statSubUnit}>{unit}</Text>
          </Text>
          <Text style={styles.statNote}>Mức đáy đã ghi nhận</Text>
        </View>

        {/* Đạt chuẩn y tế */}
        <View style={[styles.statBox, Shadows.sm]}>
          <Text style={styles.statLabel}>Đạt chuẩn y tế</Text>
          <Text style={[styles.statBig, { color: standardPct >= 80 ? Colors.success : Colors.warning }]}>
            {totalCount > 0 ? `${standardPct}%` : '--'}
          </Text>
          <Text style={styles.statNote}>
            {isHr ? 'Khoảng 60 - 100 BPM' : 'Ngưỡng ≥ 95%'}
          </Text>
        </View>
      </View>

      {/* Chart Section */}
      <View style={[styles.chartCard, Shadows.sm]}>
        {/* Timeframe switch */}
        <View style={styles.timeframeRow}>
          <Text style={styles.chartTitle}>Biểu đồ xu hướng {!isHr ? 'SpO2' : 'Nhịp tim'}</Text>
          <View style={styles.timeframeButtons}>
            {(['today', 'week', 'month'] as TimeframeTab[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                style={[styles.tfBtn, timeframe === tf && styles.activeTfBtn]}
                onPress={() => setTimeframe(tf)}
              >
                <Text style={[styles.tfText, timeframe === tf && styles.activeTfText]}>
                  {tf === 'today' ? 'Hôm nay' : tf === 'week' ? '7 Ngày' : '30 Ngày'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Chart View */}
        {chartData.length === 0 ? (
          <View style={styles.emptyChartBox}>
            <MaterialCommunityIcons 
              name={isHr ? "heart-pulse" : "water-percent"} 
              size={36} 
              color={Colors.textMuted} 
            />
            <Text style={styles.emptyChartTitle}>Chưa có dữ liệu đo để vẽ biểu đồ</Text>
            <Text style={styles.emptyChartSub}>
              Vui lòng chuyển sang tab "Tim" và nhấn nút đo để ghi nhận dữ liệu thật.
            </Text>
            <TouchableOpacity 
              style={[styles.emptyChartAction, { backgroundColor: activeColor }]}
              onPress={() => navigation.navigate('HeartRate')}
            >
              <Text style={styles.emptyChartActionText}>Chuyển sang đo ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <StatChart
            data={chartData}
            color={activeColor}
            unit={unit}
            minVal={isHr ? Math.max(minVal - 10, 40) : 85}
            maxVal={isHr ? Math.max(maxVal + 10, 120) : 100}
            avgVal={avgVal}
          />
        )}
      </View>

      {/* History Log Section */}
      <View style={styles.historyHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Lịch sử các lần đo {!isHr ? 'SpO2' : 'Nhịp tim'}</Text>
          <Text style={styles.sectionSub}>Bản ghi lưu trữ trên thiết bị & máy chủ</Text>
        </View>
        <View style={styles.historyPill}>
          <Text style={styles.historyCount}>{!isHr ? filteredSpo2.length : filteredHr.length} lượt đo</Text>
        </View>
      </View>

      <View style={[styles.card, Shadows.sm]}>
        {!isHr ? (
          filteredSpo2.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <MaterialCommunityIcons name="water-percent" size={32} color={Colors.textMuted} />
              <Text style={{ marginTop: 8, fontSize: 13, color: Colors.textSecondary, textAlign: 'center' }}>
                Chưa có lượt đo SpO2 nào trong khoảng thời gian này.
              </Text>
            </View>
          ) : (
            filteredSpo2.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <View style={[styles.logIconBox, { backgroundColor: Colors.spo2Light }]}>
                    <MaterialCommunityIcons name="water-percent" size={16} color={Colors.spo2} />
                  </View>
                  <View>
                    <Text style={styles.historyMainVal}>{item.percentage}%</Text>
                    <Text style={styles.historyTimeVal}>{item.timestamp}</Text>
                  </View>
                </View>

                <View style={[
                  styles.statusPill, 
                  { backgroundColor: item.percentage >= 95 ? Colors.successLight : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusPillText, 
                    { color: item.percentage >= 95 ? Colors.success : Colors.warning }
                  ]}>
                    {item.percentage >= 97 ? 'Tối ưu' : item.percentage >= 95 ? 'Bình thường' : 'Quá thấp ⚠️'}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : (
          filteredHr.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <MaterialCommunityIcons name="heart-pulse" size={32} color={Colors.textMuted} />
              <Text style={{ marginTop: 8, fontSize: 13, color: Colors.textSecondary, textAlign: 'center' }}>
                Chưa có lượt đo nhịp tim nào trong khoảng thời gian này.
              </Text>
            </View>
          ) : (
            filteredHr.map((item) => {
              const zone = item.bpm < 60 ? 'Nghỉ ngơi' : item.bpm <= 100 ? 'Bình thường' : 'Quá cao ⚠️';
              const zoneColor = item.bpm < 60 ? '#0284C7' : item.bpm <= 100 ? Colors.success : Colors.heartRate;
              const zoneBg = item.bpm < 60 ? '#E0F2FE' : item.bpm <= 100 ? Colors.successLight : '#FEE2E2';
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.logIconBox, { backgroundColor: Colors.heartRateLight }]}>
                      <MaterialCommunityIcons name="heart" size={16} color={Colors.heartRate} />
                    </View>
                    <View>
                      <Text style={styles.historyMainVal}>{item.bpm} BPM</Text>
                      <Text style={styles.historyTimeVal}>{item.timestamp} • {item.activity || 'Đo chủ động'}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: zoneBg }]}>
                    <Text style={[styles.statusPillText, { color: zoneColor }]}>
                      {zone}
                    </Text>
                  </View>
                </View>
              );
            })
          )
        )}
      </View>

      <View style={{ height: 30 }} />
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
    marginBottom: 14,
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
  goMeasureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  goMeasureText: {
    color: Colors.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  activeTabButtonSpo2: {
    backgroundColor: Colors.spo2,
    ...Shadows.sm,
  },
  activeTabButtonHr: {
    backgroundColor: Colors.heartRate,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  statBig: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statSubUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statNote: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  timeframeButtons: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
  },
  tfBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTfBtn: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tfText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTfText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyChartBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptyChartSub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  emptyChartAction: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyChartActionText: {
    color: Colors.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  historyPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  historyCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyMainVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  historyTimeVal: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
