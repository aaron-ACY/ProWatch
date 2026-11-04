import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, Path, Circle, Text as SvgText, Line } from 'react-native-svg';
import { Colors, Shadows } from '../theme/colors';
import { watchService } from '../services/watchService';
import { SpO2Reading, HeartRateReading, RootTabParamList } from '../types';

type TimeframeTab = 'today' | 'week' | 'month';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  timestamp: string;
}

// Hàm sinh đường cong Bezier mượt mà đi qua các điểm đo thực tế
const buildSmoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x - 10} ${pts[0].y} L ${pts[0].x + 10} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  
  let d = `M ${pts[0].x} ${pts[0].y} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * 0.18;
    const cp1y = p1.y + (p2.y - p0.y) * 0.18;
    const cp2x = p2.x - (p3.x - p1.x) * 0.18;
    const cp2y = p2.y - (p3.y - p1.y) * 0.18;

    d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }
  return d;
};

export const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { width: windowWidth } = useWindowDimensions();
  const [timeframe, setTimeframe] = useState<TimeframeTab>('today');
  const [historyTab, setHistoryTab] = useState<'hr' | 'spo2'>('hr');
  const [spo2History, setSpo2History] = useState<SpO2Reading[]>(watchService.getSpO2History());
  const [hrHistory, setHrHistory] = useState<HeartRateReading[]>(watchService.getHeartRateHistory());
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Animation cho thanh trượt chọn khung thời gian (Ngày / Tuần / Tháng)
  const [capsuleWidth, setCapsuleWidth] = useState(0);
  const tfAnim = useRef(new Animated.Value(0)).current;

  const handleTimeframeChange = (tab: TimeframeTab, index: number) => {
    setTimeframe(tab);
    Animated.spring(tfAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  };

  // Animation cho thanh trượt chuyển tab Lịch sử đo (Nhịp tim / Oxy máu)
  const [historyPillsWidth, setHistoryPillsWidth] = useState(0);
  const historyAnim = useRef(new Animated.Value(0)).current;

  const handleHistoryTabChange = (tab: 'hr' | 'spo2', index: number) => {
    setHistoryTab(tab);
    Animated.spring(historyAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  };

  const chartCardWidth = Math.max(windowWidth - 32, 280);
  const chartDrawWidth = chartCardWidth - 36; // trừ padding trong thẻ

  // Tải dữ liệu từ WatchService & Supabase Cloud
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      await watchService.syncWatchData();
    } catch (e) {
      console.warn('Sync watch data failed', e);
    } finally {
      setSpo2History(watchService.getSpO2History());
      setHrHistory(watchService.getHeartRateHistory());
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  // Tự động đồng bộ mỗi khi người dùng mở tab Thống kê
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Lắng nghe cập nhật trực tiếp thời gian thực khi có kết quả đo mới
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

  // Kéo xuống để làm mới (Pull-to-refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Kiểm tra tài khoản hoàn toàn chưa có bất kỳ dữ liệu đo nào
  const hasNoDataEver = hrHistory.length === 0 && spo2History.length === 0;

  // Lọc dữ liệu theo timeframe (Ngày, Tuần, Tháng)
  const filterByTimeframe = <T extends { timestamp: string }>(records: T[]): T[] => {
    if (records.length === 0) return [];
    if (timeframe === 'today') {
      const todayList = records.filter(r => r.timestamp.includes('hôm nay') || !r.timestamp.includes('/'));
      return todayList;
    }
    if (timeframe === 'week') {
      return records.slice(0, 14);
    }
    return records.slice(0, 30);
  };

  const filteredHr = filterByTimeframe(hrHistory);
  const filteredSpo2 = filterByTimeframe(spo2History);

  // Thống kê Nhịp tim
  const hrBpms = filteredHr.map(h => h.bpm).filter(b => b > 0);
  const avgHr = hrBpms.length > 0 ? Math.round(hrBpms.reduce((a, b) => a + b, 0) / hrBpms.length) : 0;
  const minHr = hrBpms.length > 0 ? Math.min(...hrBpms) : 0;
  const maxHr = hrBpms.length > 0 ? Math.max(...hrBpms) : 0;
  const latestHrRecord = filteredHr[0];
  const latestHrVal = latestHrRecord ? latestHrRecord.bpm : 0;
  const latestHrTime = latestHrRecord ? latestHrRecord.timestamp.split(' ')[0] : '';

  // Thống kê Oxy máu (SpO2)
  const spo2Pcts = filteredSpo2.map(s => s.percentage).filter(p => p > 0);
  const avgSpo2 = spo2Pcts.length > 0 ? Math.round(spo2Pcts.reduce((a, b) => a + b, 0) / spo2Pcts.length) : 0;
  const minSpo2 = spo2Pcts.length > 0 ? Math.min(...spo2Pcts) : 0;
  const maxSpo2 = spo2Pcts.length > 0 ? Math.max(...spo2Pcts) : 0;
  const latestSpo2Record = filteredSpo2[0];
  const latestSpo2Val = latestSpo2Record ? latestSpo2Record.percentage : 0;
  const latestSpo2Time = latestSpo2Record ? latestSpo2Record.timestamp.split(' ')[0] : '';

  // Phụ đề theo khung thời gian
  const getSubTitleText = (
    val: number, 
    time: string, 
    unit: string
  ) => {
    const periodText = timeframe === 'today' ? 'hôm nay' : timeframe === 'week' ? 'tuần này' : 'tháng này';
    if (!val || val <= 0) {
      return `Trung bình ${periodText} · Chưa có bản ghi`;
    }
    const cleanTime = time.includes(' ') ? time.split(' ')[0] : time;
    return `Trung bình ${periodText} · mới nhất ${val}${unit === '%' ? '%' : ''} lúc ${cleanTime || '14:30'}`;
  };

  // Ánh xạ mảng dữ liệu đo thật sang tọa độ đồ thị (x, y)
  const mapPoints = (
    readings: { value: number; timestamp: string }[],
    isHr: boolean,
    chartW: number
  ): ChartPoint[] => {
    if (readings.length === 0) return [];
    const safeTop = 22;
    const safeBottom = 76;
    const minSafe = isHr ? 50 : 95;
    const maxSafe = isHr ? 150 : 100;
    const usableW = chartW - 36; // chừa 36px bên phải cho nhãn 150/100 và 50/95

    // Sắp xếp tăng dần theo thời gian (từ cũ tới mới)
    const sorted = [...readings].reverse();

    const pts = sorted.map((r, index) => {
      let x = 14;
      if (timeframe === 'today') {
        const match = r.timestamp.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          const h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const frac = Math.min(Math.max((h + m / 60) / 24, 0.05), 0.95);
          x = 10 + frac * (usableW - 20);
        } else {
          x = sorted.length === 1 ? usableW / 2 : 12 + (index / (sorted.length - 1)) * (usableW - 24);
        }
      } else {
        x = sorted.length === 1 ? usableW / 2 : 12 + (index / (sorted.length - 1)) * (usableW - 24);
      }

      const yRatio = (r.value - minSafe) / (maxSafe - minSafe);
      const y = safeBottom - yRatio * (safeBottom - safeTop);
      const clampedY = Math.max(14, Math.min(84, y));

      return { x, y: clampedY, value: r.value, timestamp: r.timestamp };
    });

    // Đảm bảo x luôn tăng dần từ trái sang phải
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].x <= pts[i - 1].x) {
        pts[i].x = pts[i - 1].x + 6;
      }
    }

    return pts;
  };

  const hrPoints = mapPoints(filteredHr.map(h => ({ value: h.bpm, timestamp: h.timestamp })), true, chartDrawWidth);
  const spo2Points = mapPoints(filteredSpo2.map(s => ({ value: s.percentage, timestamp: s.timestamp })), false, chartDrawWidth);

  // Nhãn trục thời gian X
  const timeLabels = timeframe === 'today'
    ? ['00:00', '06:00', '12:00', '18:00', '24:00']
    : timeframe === 'week'
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];

  return (
    <ScrollView 
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[Colors.primary]} 
          tintColor={Colors.primary} 
        />
      }
    >
      {/* 0. HERO ONBOARDING CHO TÀI KHOẢN MỚI CHƯA CÓ DATA */}
      {hasNoDataEver && (
        <View style={[styles.onboardCard, Shadows.sm]}>
          <View style={styles.onboardHeaderRow}>
            <View style={styles.onboardIconCircle}>
              <MaterialCommunityIcons name="heart-pulse" size={26} color="#E11D48" />
            </View>
            <View style={styles.onboardBadge}>
              <MaterialCommunityIcons name="star-four-points" size={12} color="#059669" />
              <Text style={styles.onboardBadgeText}>Lần đầu sử dụng</Text>
            </View>
          </View>

          <Text style={styles.onboardTitle}>Bắt đầu theo dõi sức khỏe của bạn</Text>
          <Text style={styles.onboardDesc}>
            Chưa có bản ghi đo nào từ đồng hồ. Hãy đeo đồng hồ thông minh và bắt đầu lần đo nhịp tim hoặc SpO₂ đầu tiên để xem phân tích biểu đồ trực quan tại đây.
          </Text>

          <View style={styles.onboardActionsRow}>
            <TouchableOpacity
              style={styles.onboardPrimaryBtn}
              onPress={() => navigation.navigate('HeartRate')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="heart-flash" size={18} color="#FFFFFF" />
              <Text style={styles.onboardPrimaryBtnText}>Bắt đầu đo ngay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.onboardSecondaryBtn}
              onPress={() => loadData(true)}
              activeOpacity={0.85}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="cloud-sync-outline" size={18} color={Colors.textPrimary} />
                  <Text style={styles.onboardSecondaryBtnText}>Đồng bộ Cloud</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 1. Timeframe Segmented Control (Ngày - Tuần - Tháng) với animation trượt */}
      <View 
        style={styles.timeframeCapsule}
        onLayout={(e) => setCapsuleWidth(e.nativeEvent.layout.width)}
      >
        {capsuleWidth > 0 && (
          <Animated.View
            style={[
              styles.tfSlidingPill,
              {
                width: (capsuleWidth - 6) / 3,
                transform: [{
                  translateX: tfAnim.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, (capsuleWidth - 6) / 3, ((capsuleWidth - 6) / 3) * 2],
                  }),
                }],
              },
              Shadows.sm,
            ]}
          />
        )}
        {(['today', 'week', 'month'] as TimeframeTab[]).map((tab, idx) => {
          const isActive = timeframe === tab;
          const label = tab === 'today' ? 'Ngày' : tab === 'week' ? 'Tuần' : 'Tháng';
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tfTab}
              onPress={() => handleTimeframeChange(tab, idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tfTabText, isActive && styles.tfTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ============================================================== */}
      {/* 2. CARD 1: NHỊP TIM                                           */}
      {/* ============================================================== */}
      <View style={[styles.metricCard, Shadows.sm]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.titleWithDot}>
              <View style={[styles.headerDot, { backgroundColor: '#E11D48' }]} />
              <Text style={styles.cardTitle}>Nhịp tim</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {getSubTitleText(latestHrVal, latestHrTime, 'BPM')}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.cardHeaderAvgVal}>{avgHr > 0 ? avgHr : '--'}</Text>
            <Text style={styles.cardHeaderUnit}>BPM</Text>
          </View>
        </View>

        {/* Chart View with Safe Zone Box & Real Measured Line */}
        <View style={styles.chartWrapper}>
          <Svg height="96" width={chartDrawWidth} viewBox={`0 0 ${chartDrawWidth} 96`}>
            {/* Vùng an toàn xanh nhạt (50 - 150 BPM) */}
            <Rect 
              x="0" 
              y="12" 
              width={chartDrawWidth - 36} 
              height="68" 
              rx="10" 
              fill="#ECFDF5" 
            />

            {/* Nhãn trục Y bên phải: 150 và 50 */}
            <SvgText 
              x={chartDrawWidth - 6} 
              y="24" 
              fill="#64748B" 
              fontSize="11" 
              fontWeight="600" 
              textAnchor="end"
            >
              150
            </SvgText>
            <SvgText 
              x={chartDrawWidth - 6} 
              y="80" 
              fill="#64748B" 
              fontSize="11" 
              fontWeight="600" 
              textAnchor="end"
            >
              50
            </SvgText>

            {hrPoints.length > 0 ? (
              <>
                {/* Đường line đo thực tế */}
                <Path
                  d={buildSmoothPath(hrPoints)}
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Điểm cực đại (Max peak) kèm nhãn số */}
                {(() => {
                  const maxPt = hrPoints.reduce((prev, curr) => curr.value > prev.value ? curr : prev, hrPoints[0]);
                  return (
                    <SvgText
                      x={maxPt.x}
                      y={Math.max(11, maxPt.y - 6)}
                      fill="#0F172A"
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {maxPt.value}
                    </SvgText>
                  );
                })()}

                {/* Điểm cực tiểu (Min valley) kèm nhãn số */}
                {(() => {
                  const minPt = hrPoints.reduce((prev, curr) => curr.value < prev.value ? curr : prev, hrPoints[0]);
                  return (
                    <SvgText
                      x={minPt.x}
                      y={Math.min(92, minPt.y + 14)}
                      fill="#0F172A"
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {minPt.value}
                    </SvgText>
                  );
                })()}

                {/* Điểm đo mới nhất (Chấm đỏ viền trắng) */}
                <Circle
                  cx={hrPoints[hrPoints.length - 1].x}
                  cy={hrPoints[hrPoints.length - 1].y}
                  r="5"
                  fill="#E11D48"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
              </>
            ) : null}
          </Svg>

          {/* Trục mốc thời gian X */}
          <View style={[styles.timeAxisRow, { width: chartDrawWidth - 36 }]}>
            {timeLabels.map((lbl, idx) => (
              <Text key={idx} style={styles.timeAxisLabel}>{lbl}</Text>
            ))}
          </View>
        </View>

        {/* 3 Thống kê đáy card */}
        <View style={styles.cardStatsRow}>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Thấp nhất</Text>
            <Text style={styles.cardStatVal}>
              {minHr > 0 ? minHr : '--'} <Text style={styles.cardStatUnit}>BPM</Text>
            </Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Cao nhất</Text>
            <Text style={styles.cardStatVal}>
              {maxHr > 0 ? maxHr : '--'} <Text style={styles.cardStatUnit}>BPM</Text>
            </Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Số lần đo</Text>
            <Text style={styles.cardStatVal}>{filteredHr.length}</Text>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 3. CARD 2: OXY MÁU (SPO2)                                     */}
      {/* ============================================================== */}
      <View style={[styles.metricCard, Shadows.sm]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.titleWithDot}>
              <View style={[styles.headerDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.cardTitle}>Oxy máu (SpO₂)</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {getSubTitleText(latestSpo2Val, latestSpo2Time, '%')}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.cardHeaderAvgVal}>{avgSpo2 > 0 ? avgSpo2 : '--'}</Text>
            <Text style={styles.cardHeaderUnit}>%</Text>
          </View>
        </View>

        {/* Chart View with Safe Zone Box & Real Measured Line */}
        <View style={styles.chartWrapper}>
          <Svg height="96" width={chartDrawWidth} viewBox={`0 0 ${chartDrawWidth} 96`}>
            {/* Vùng an toàn xanh nhạt (95 - 100%) */}
            <Rect 
              x="0" 
              y="12" 
              width={chartDrawWidth - 36} 
              height="68" 
              rx="10" 
              fill="#ECFDF5" 
            />

            {/* Nhãn trục Y bên phải: 100 và 95 */}
            <SvgText 
              x={chartDrawWidth - 6} 
              y="24" 
              fill="#64748B" 
              fontSize="11" 
              fontWeight="600" 
              textAnchor="end"
            >
              100
            </SvgText>
            <SvgText 
              x={chartDrawWidth - 6} 
              y="80" 
              fill="#64748B" 
              fontSize="11" 
              fontWeight="600" 
              textAnchor="end"
            >
              95
            </SvgText>

            {spo2Points.length > 0 ? (
              <>
                {/* Đường line xanh đo thực tế */}
                <Path
                  d={buildSmoothPath(spo2Points)}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Các chấm tròn trắng viền xanh dọc theo đường đo */}
                {spo2Points.map((pt, i) => (
                  <Circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.2"
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth="1.8"
                  />
                ))}

                {/* Điểm đo mới nhất (Chấm xanh đặc viền trắng) */}
                <Circle
                  cx={spo2Points[spo2Points.length - 1].x}
                  cy={spo2Points[spo2Points.length - 1].y}
                  r="5.5"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
              </>
            ) : null}
          </Svg>

          {/* Trục mốc thời gian X */}
          <View style={[styles.timeAxisRow, { width: chartDrawWidth - 36 }]}>
            {timeLabels.map((lbl, idx) => (
              <Text key={idx} style={styles.timeAxisLabel}>{lbl}</Text>
            ))}
          </View>
        </View>

        {/* 3 Thống kê đáy card */}
        <View style={styles.cardStatsRow}>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Thấp nhất</Text>
            <Text style={styles.cardStatVal}>
              {minSpo2 > 0 ? minSpo2 : '--'} <Text style={styles.cardStatUnit}>%</Text>
            </Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Cao nhất</Text>
            <Text style={styles.cardStatVal}>
              {maxSpo2 > 0 ? maxSpo2 : '--'} <Text style={styles.cardStatUnit}>%</Text>
            </Text>
          </View>
          <View style={styles.cardStatCol}>
            <Text style={styles.cardStatLabel}>Số lần đo</Text>
            <Text style={styles.cardStatVal}>{filteredSpo2.length}</Text>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 4. LỊCH SỬ ĐO GẦN ĐÂY (VỚI ANIMATION TRƯỢT TAB)                */}
      {/* ============================================================== */}
      <View style={styles.historySectionHeader}>
        <Text style={styles.historySectionTitle}>Lịch sử đo</Text>
        <View 
          style={styles.historyTabPills}
          onLayout={(e) => setHistoryPillsWidth(e.nativeEvent.layout.width)}
        >
          {historyPillsWidth > 0 && (
            <Animated.View
              style={[
                styles.historySlidingPill,
                {
                  width: (historyPillsWidth - 4) / 2,
                  transform: [{
                    translateX: historyAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, (historyPillsWidth - 4) / 2],
                    }),
                  }],
                },
                Shadows.sm,
              ]}
            />
          )}
          <TouchableOpacity
            style={styles.historyTabPill}
            onPress={() => handleHistoryTabChange('hr', 0)}
            activeOpacity={0.7}
          >
            <Text style={[styles.historyTabPillText, historyTab === 'hr' && styles.historyTabPillTextActive]}>
              Nhịp tim ({hrHistory.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyTabPill}
            onPress={() => handleHistoryTabChange('spo2', 1)}
            activeOpacity={0.7}
          >
            <Text style={[styles.historyTabPillText, historyTab === 'spo2' && styles.historyTabPillTextActive]}>
              Oxy máu ({spo2History.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.historyCard, Shadows.sm]}>
        {historyTab === 'hr' ? (
          hrHistory.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <View style={[styles.emptyHistoryIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="heart-plus-outline" size={30} color="#E11D48" />
              </View>
              <Text style={styles.emptyHistoryTitle}>Chưa có bản ghi nhịp tim nào</Text>
              <Text style={styles.emptyHistorySub}>
                Kết quả đo nhịp tim từ đồng hồ sẽ được lưu trữ và thống kê tự động tại đây.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: '#E11D48' }]}
                onPress={() => navigation.navigate('HeartRate')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="heart" size={15} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Đo nhịp tim ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            hrHistory.map((item, idx) => {
              const zone = item.bpm < 60 ? 'Nghỉ ngơi' : item.bpm <= 100 ? 'Bình thường' : 'Quá cao ⚠️';
              const zoneColor = item.bpm < 60 ? '#0284C7' : item.bpm <= 100 ? '#10B981' : Colors.heartRate;
              const zoneBg = item.bpm < 60 ? '#E0F2FE' : item.bpm <= 100 ? '#ECFDF5' : '#FEE2E2';
              return (
                <View 
                  key={item.id || idx} 
                  style={[styles.historyRow, idx === hrHistory.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.historyLeft}>
                    <View style={[styles.logIconBox, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialCommunityIcons name="heart" size={16} color={Colors.heartRate} />
                    </View>
                    <View>
                      <Text style={styles.historyMainVal}>{item.bpm} BPM</Text>
                      <Text style={styles.historyTimeVal}>{item.timestamp}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: zoneBg }]}>
                    <Text style={[styles.statusPillText, { color: zoneColor }]}>{zone}</Text>
                  </View>
                </View>
              );
            })
          )
        ) : (
          spo2History.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <View style={[styles.emptyHistoryIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="water-percent" size={30} color="#2563EB" />
              </View>
              <Text style={styles.emptyHistoryTitle}>Chưa có bản ghi Oxy máu (SpO₂)</Text>
              <Text style={styles.emptyHistorySub}>
                Kết quả đo nồng độ oxy trong máu sẽ xuất hiện tại đây sau khi hoàn tất đo.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => navigation.navigate('HeartRate')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="water" size={15} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Đo SpO₂ ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            spo2History.map((item, idx) => {
              const isOptimal = item.percentage >= 95;
              return (
                <View 
                  key={item.id || idx} 
                  style={[styles.historyRow, idx === spo2History.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.historyLeft}>
                    <View style={[styles.logIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialCommunityIcons name="water-percent" size={16} color="#2563EB" />
                    </View>
                    <View>
                      <Text style={styles.historyMainVal}>{item.percentage}%</Text>
                      <Text style={styles.historyTimeVal}>{item.timestamp}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: isOptimal ? '#ECFDF5' : '#FEF3C7' }]}>
                    <Text style={[styles.statusPillText, { color: isOptimal ? '#10B981' : '#D97706' }]}>
                      {item.percentage >= 97 ? 'Tối ưu' : item.percentage >= 95 ? 'Bình thường' : 'Quá thấp ⚠️'}
                    </Text>
                  </View>
                </View>
              );
            })
          )
        )}
      </View>

      <View style={{ height: 36 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // 0. Onboard Card cho tài khoản mới
  onboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  onboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  onboardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  onboardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  onboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  onboardDesc: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  onboardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  onboardPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    ...Shadows.sm,
  },
  onboardPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  onboardSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  onboardSecondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
  },

  // 1. Timeframe Segmented Capsule (Ngày - Tuần - Tháng)
  timeframeCapsule: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    position: 'relative',
  },
  tfSlidingPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: Colors.white,
    borderRadius: 11,
  },
  tfTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    zIndex: 1,
  },
  tfTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tfTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // 2 & 3. Metric Cards (Nhịp tim & SpO2)
  metricCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 2.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  cardHeaderAvgVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 36,
    letterSpacing: -1,
  },
  cardHeaderUnit: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: -2,
  },

  // Chart
  chartWrapper: {
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  timeAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 6,
  },
  timeAxisLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // 3 Bottom Stats in Card
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardStatCol: {
    flex: 1,
  },
  cardStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardStatVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardStatUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  // 4. History Log Section
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyTabPills: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
    position: 'relative',
  },
  historySlidingPill: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    backgroundColor: Colors.white,
    borderRadius: 8,
  },
  historyTabPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  historyTabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  historyTabPillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyHistoryBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHistorySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
    marginBottom: 14,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...Shadows.sm,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMainVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyTimeVal: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
