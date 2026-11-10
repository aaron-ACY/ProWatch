import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '../theme/colors';
import { HealthSummary, WatchStatus } from '../types';
import { watchService } from '../services/watchService';
import { useLanguage } from '../context/LanguageContext';

interface HomeWidgetsSectionProps {
  healthSummary: HealthSummary;
  watchStatus: WatchStatus;
  onNavigateHeartRate?: () => void;
  onNavigateSport?: () => void;
  showPinButtons?: boolean;
}

export const HomeWidgetsSection: React.FC<HomeWidgetsSectionProps> = ({
  healthSummary,
  watchStatus,
  onNavigateHeartRate,
  onNavigateSport,
  showPinButtons = true,
}) => {
  const { t } = useLanguage();
  const [pinningType, setPinningType] = useState<'vitals' | 'fitness' | null>(null);

  // 1. Tính toán trạng thái cho Widget 1 (Heart Rate, SpO2 & Status)
  const bpm = healthSummary.currentBpm || 0;
  const spo2 = healthSummary.currentSpO2 || 0;
  const riskLevel = healthSummary.riskLevel;

  const getVitalsCondition = () => {
    if (bpm <= 0 && spo2 <= 0 && !riskLevel) {
      return {
        label: t('Chưa có dữ liệu', 'No Data'),
        subLabel: t('Đeo đồng hồ để đo', 'Wear watch to measure'),
        badgeBg: 'rgba(148, 163, 184, 0.22)',
        badgeBorder: 'rgba(148, 163, 184, 0.4)',
        badgeColor: '#CBD5E1',
        dotColor: '#94A3B8',
        icon: 'minus-circle-outline',
      };
    }
    if (
      riskLevel === 'High' ||
      (bpm > 0 && (bpm > 120 || bpm < 45)) ||
      (spo2 > 0 && spo2 < 90)
    ) {
      return {
        label: t('Nguy cơ cao', 'At Risk'),
        subLabel: t('Cần nghỉ ngơi & kiểm tra', 'Rest & check vitals'),
        badgeBg: 'rgba(239, 68, 68, 0.22)',
        badgeBorder: 'rgba(248, 113, 113, 0.5)',
        badgeColor: '#FCA5A5',
        dotColor: '#EF4444',
        icon: 'alert-octagon',
      };
    }
    if (
      riskLevel === 'Medium' ||
      (bpm > 0 && (bpm > 100 || bpm < 50)) ||
      (spo2 > 0 && spo2 < 95)
    ) {
      return {
        label: t('Cần chú ý', 'Caution'),
        subLabel: t('Dao động nhẹ ngoài ngưỡng', 'Slightly out of range'),
        badgeBg: 'rgba(245, 158, 11, 0.22)',
        badgeBorder: 'rgba(251, 191, 36, 0.5)',
        badgeColor: '#FDE68A',
        dotColor: '#F59E0B',
        icon: 'alert-circle-outline',
      };
    }
    return {
      label: t('Bình thường (Tốt)', 'Optimal (Good)'),
      subLabel: t('Nhịp tim & Oxy máu ổn định', 'HR & SpO₂ in safe zone'),
      badgeBg: 'rgba(16, 185, 129, 0.22)',
      badgeBorder: 'rgba(52, 211, 153, 0.5)',
      badgeColor: '#6EE7B7',
      dotColor: '#10B981',
      icon: 'shield-check',
    };
  };

  const condition = getVitalsCondition();

  // 2. Tính toán thông số cho Widget 2 (Fitness: Steps, Calories, Distance, Activity)
  const stepsGoal = healthSummary.stepsGoal || 10000;
  const steps = watchStatus.connected || healthSummary.steps > 0 ? healthSummary.steps : 0;
  const stepsPct = Math.min(100, Math.round((steps / stepsGoal) * 100));

  const caloGoal = 500;
  const calories = watchStatus.connected || healthSummary.calories > 0 ? healthSummary.calories : 0;
  const caloPct = Math.min(100, Math.round((calories / caloGoal) * 100));

  const distanceKm = ((steps * 0.72) / 1000).toFixed(2);

  const getActivityDisplay = (act?: string) => {
    const raw = (act || '').toUpperCase();
    if (raw.includes('RUN') || raw.includes('CHẠY')) {
      return { label: t('Đang chạy bộ', 'Running'), icon: 'run-fast', color: '#F97316' };
    }
    if (raw.includes('WALK') || raw.includes('ĐI BỘ')) {
      return { label: t('Đang đi bộ', 'Walking'), icon: 'walk', color: '#10B981' };
    }
    if (raw.includes('SLEEP') || raw.includes('NGỦ')) {
      return { label: t('Đang ngủ', 'Sleeping'), icon: 'sleep', color: '#818CF8' };
    }
    return {
      label: steps > 0 ? t('Vận động hằng ngày', 'Daily Active') : t('Nghỉ ngơi', 'Resting'),
      icon: steps > 0 ? 'shoe-print' : 'sofa-single-outline',
      color: '#F59E0B',
    };
  };

  const activityInfo = getActivityDisplay(healthSummary.currentActivity);

  // Vòng tròn nhỏ trong Fitness Widget (R1 = 24, R2 = 16)
  const rOuter = 24;
  const cOuter = 2 * Math.PI * rOuter;
  const offOuter = cOuter * (1 - Math.min(steps / stepsGoal, 1));

  const rInner = 16;
  const cInner = 2 * Math.PI * rInner;
  const offInner = cInner * (1 - Math.min(calories / caloGoal, 1));

  const handlePinWidget = async (type: 'vitals' | 'fitness') => {
    setPinningType(type);
    try {
      await watchService.syncAndroidHomeWidgets();
      const res = await watchService.requestPinWidget(type);
      if (!res.supported) {
        Alert.alert(
          t('Thêm Widget ra màn hình chính', 'Add Home Screen Widget'),
          Platform.OS === 'android'
            ? t(
                'Đã cập nhật dữ liệu mới nhất cho Widget! Bạn có thể nhấn giữ vào khoảng trống trên Màn hình chính điện thoại → chọn "Tiện ích (Widgets)" → tìm "ProWatch Health" để kéo 2 Widget ra màn hình.',
                'Widget data synced! Long-press your Android Home Screen → select "Widgets" → choose "ProWatch Health" to place the widget.'
              )
            : t(
                'Widget đang hiển thị trực tiếp ngay trên bảng điều khiển ứng dụng. Tính năng ghim ra màn hình chính hỗ trợ trên thiết bị Android.',
                'Widgets are active right here in the app. Home screen pinning is supported on Android devices.'
              )
        );
      }
    } finally {
      setPinningType(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* ===================================================================== */}
      {/* WIDGET 1: HEART RATE, SPO2 & STATUS                                   */}
      {/* ===================================================================== */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onNavigateHeartRate}
        style={[styles.widgetContainer, Shadows.md]}
      >
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.widgetGradient}
        >
          {/* Top Header */}
          <View style={styles.widgetHeaderRow}>
            <View style={styles.widgetBrandRow}>
              <View style={[styles.widgetIconBadge, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={16} color="#FB7185" />
              </View>
              <Text style={styles.widgetBrandText}>
                {t('WIDGET SỨC KHỎE • TIM MẠCH & OXY', 'VITALS WIDGET • HR, SPO₂ & STATUS')}
              </Text>
            </View>

            {showPinButtons && (
              <TouchableOpacity
                style={styles.pinBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePinWidget('vitals');
                }}
                disabled={pinningType === 'vitals'}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="widgets-outline" size={13} color="#93C5FD" />
                <Text style={styles.pinBtnText}>
                  {t('Ghim màn hình', 'Pin Widget')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3-Column Metrics: Heart Rate | SpO2 | Status */}
          <View style={styles.vitalsGrid}>
            {/* Col 1: Heart Rate */}
            <View style={styles.vitalMetricBox}>
              <View style={styles.vitalMetricLabelRow}>
                <MaterialCommunityIcons name="heart" size={13} color="#FB7185" />
                <Text style={styles.vitalMetricLabel}>{t('Nhịp tim', 'Heart Rate')}</Text>
              </View>
              <View style={styles.vitalNumberRow}>
                <Text style={styles.vitalBigNumber}>{bpm > 0 ? bpm : '--'}</Text>
                <Text style={styles.vitalUnitText}>BPM</Text>
              </View>
              <Text style={styles.vitalRangeHint}>
                {bpm > 0
                  ? bpm < 50
                    ? t('Thấp (<50)', 'Low (<50)')
                    : bpm > 100
                      ? t('Cao (>100)', 'High (>100)')
                      : t('An toàn (50-100)', 'Normal (50-100)')
                  : t('Chưa đo', 'No reading')}
              </Text>
            </View>

            <View style={styles.vitalVerticalSep} />

            {/* Col 2: SpO2 */}
            <View style={styles.vitalMetricBox}>
              <View style={styles.vitalMetricLabelRow}>
                <MaterialCommunityIcons name="water" size={14} color="#38BDF8" />
                <Text style={styles.vitalMetricLabel}>SpO₂</Text>
              </View>
              <View style={styles.vitalNumberRow}>
                <Text style={[styles.vitalBigNumber, { color: '#38BDF8' }]}>
                  {spo2 > 0 ? spo2 : '--'}
                </Text>
                <Text style={styles.vitalUnitText}>%</Text>
              </View>
              <Text style={styles.vitalRangeHint}>
                {spo2 > 0
                  ? spo2 >= 95
                    ? t('Tối ưu (95-100%)', 'Optimal (95-100%)')
                    : t('Thấp (<95%)', 'Low (<95%)')
                  : t('Chưa đo', 'No reading')}
              </Text>
            </View>

            <View style={styles.vitalVerticalSep} />

            {/* Col 3: Status */}
            <View style={[styles.vitalMetricBox, { flex: 1.15 }]}>
              <View style={styles.vitalMetricLabelRow}>
                <View style={[styles.liveDot, { backgroundColor: condition.dotColor }]} />
                <Text style={styles.vitalMetricLabel}>{t('Trạng thái', 'Status')}</Text>
              </View>

              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: condition.badgeBg,
                    borderColor: condition.badgeBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={condition.icon as any}
                  size={14}
                  color={condition.badgeColor}
                />
                <Text
                  style={[styles.statusChipText, { color: condition.badgeColor }]}
                  numberOfLines={1}
                >
                  {condition.label}
                </Text>
              </View>

              <Text style={styles.vitalRangeHint} numberOfLines={1}>
                {condition.subLabel}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* ===================================================================== */}
      {/* WIDGET 2: FITNESS (STEPS, CALORIES, DISTANCE & ACTIVITY)              */}
      {/* ===================================================================== */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onNavigateSport}
        style={[styles.widgetContainer, Shadows.md]}
      >
        <LinearGradient
          colors={['#18181B', '#27272A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.widgetGradient}
        >
          {/* Top Header */}
          <View style={styles.widgetHeaderRow}>
            <View style={styles.widgetBrandRow}>
              <View style={[styles.widgetIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <MaterialCommunityIcons name="run-fast" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.widgetBrandText}>
                {t('WIDGET FITNESS • VẬN ĐỘNG & CALO', 'FITNESS WIDGET • STEPS & CALORIES')}
              </Text>
            </View>

            {showPinButtons && (
              <TouchableOpacity
                style={[styles.pinBtn, { borderColor: 'rgba(251, 191, 36, 0.35)', backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePinWidget('fitness');
                }}
                disabled={pinningType === 'fitness'}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="widgets-outline" size={13} color="#FDE68A" />
                <Text style={[styles.pinBtnText, { color: '#FDE68A' }]}>
                  {t('Ghim màn hình', 'Pin Widget')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Body: Mini Activity Rings + Steps/Calories/Distance */}
          <View style={styles.fitnessBodyRow}>
            {/* Mini Dual Ring */}
            <View style={styles.miniRingBox}>
              <Svg width={60} height={60} viewBox="0 0 60 60">
                <G rotation="-90" origin="30, 30">
                  <Circle
                    cx="30"
                    cy="30"
                    r={rOuter}
                    stroke="rgba(245, 158, 11, 0.2)"
                    strokeWidth="5.5"
                    fill="none"
                  />
                  <Circle
                    cx="30"
                    cy="30"
                    r={rOuter}
                    stroke="#F59E0B"
                    strokeWidth="5.5"
                    strokeDasharray={cOuter}
                    strokeDashoffset={offOuter}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Circle
                    cx="30"
                    cy="30"
                    r={rInner}
                    stroke="rgba(244, 63, 94, 0.2)"
                    strokeWidth="5.5"
                    fill="none"
                  />
                  <Circle
                    cx="30"
                    cy="30"
                    r={rInner}
                    stroke="#FB7185"
                    strokeWidth="5.5"
                    strokeDasharray={cInner}
                    strokeDashoffset={offInner}
                    strokeLinecap="round"
                    fill="none"
                  />
                </G>
              </Svg>
              <View style={styles.miniRingCenter}>
                <Text style={styles.miniRingPctText}>{stepsPct}%</Text>
              </View>
            </View>

            {/* Right Metrics */}
            <View style={styles.fitnessStatsCol}>
              {/* Steps Row with Bar */}
              <View style={styles.fitnessMetricLine}>
                <View style={styles.fitnessMetricTop}>
                  <View style={styles.fitnessMetricTitleGroup}>
                    <MaterialCommunityIcons name="shoe-print" size={13} color="#FBBF24" />
                    <Text style={styles.fitnessMetricTitle}>{t('Bước chân', 'Steps')}</Text>
                  </View>
                  <Text style={styles.fitnessMetricVal}>
                    {steps.toLocaleString()}{' '}
                    <Text style={styles.fitnessMetricGoal}>/ {stepsGoal.toLocaleString()}</Text>
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${stepsPct}%`, backgroundColor: '#F59E0B' },
                    ]}
                  />
                </View>
              </View>

              {/* Calories & Distance Row */}
              <View style={styles.fitnessBottomMetaRow}>
                <View style={styles.fitnessMiniPill}>
                  <MaterialCommunityIcons name="fire" size={14} color="#FB7185" />
                  <Text style={styles.fitnessMiniPillVal}>{calories}</Text>
                  <Text style={styles.fitnessMiniPillUnit}>kcal ({caloPct}%)</Text>
                </View>

                <View style={styles.fitnessMiniPill}>
                  <MaterialCommunityIcons name="map-marker-distance" size={14} color="#38BDF8" />
                  <Text style={styles.fitnessMiniPillVal}>{distanceKm}</Text>
                  <Text style={styles.fitnessMiniPillUnit}>km</Text>
                </View>

                <View style={[styles.fitnessMiniPill, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
                  <MaterialCommunityIcons
                    name={activityInfo.icon as any}
                    size={13}
                    color={activityInfo.color}
                  />
                  <Text
                    style={[styles.fitnessMiniPillUnit, { color: '#E2E8F0', fontWeight: '700' }]}
                    numberOfLines={1}
                  >
                    {activityInfo.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    marginBottom: 8,
  },
  widgetContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  widgetGradient: {
    padding: 15,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  widgetIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetBrandText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
  },
  pinBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#93C5FD',
  },

  // Widget 1: Vitals Grid
  vitalsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  vitalMetricBox: {
    flex: 1,
  },
  vitalVerticalSep: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 10,
  },
  vitalMetricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  vitalMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  vitalNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  vitalBigNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  vitalUnitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  vitalRangeHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 2,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  // Widget 2: Fitness
  fitnessBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  miniRingBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRingPctText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
  },
  fitnessStatsCol: {
    flex: 1,
    gap: 9,
  },
  fitnessMetricLine: {
    gap: 5,
  },
  fitnessMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fitnessMetricTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fitnessMetricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  fitnessMetricVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  fitnessMetricGoal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fitnessBottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  fitnessMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fitnessMiniPillVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fitnessMiniPillUnit: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

