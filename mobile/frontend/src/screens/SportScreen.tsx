import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { watchService } from '../services/watchService';
import { HealthSummary, WatchStatus } from '../types';
import { useFocusEffect } from '@react-navigation/native';

interface SportMode {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
  calPerMin: number;
}

const SPORT_MODES: SportMode[] = [
  { id: 'run', name: 'Chạy bộ', icon: 'run-fast', color: '#EA580C', bgColor: '#FFEDD5', calPerMin: 9.8 },
  { id: 'walk', name: 'Đi bộ', icon: 'walk', color: '#16A34A', bgColor: '#DCFCE7', calPerMin: 4.5 },
  { id: 'cycle', name: 'Đạp xe', icon: 'bike', color: '#0284C7', bgColor: '#E0F2FE', calPerMin: 8.2 },
  { id: 'gym', name: 'Tập Gym', icon: 'dumbbell', color: '#9333EA', bgColor: '#F3E8FF', calPerMin: 6.8 },
  { id: 'badminton', name: 'Cầu lông', icon: 'badminton', color: '#D97706', bgColor: '#FEF3C7', calPerMin: 7.5 },
  { id: 'yoga', name: 'Yoga', icon: 'yoga', color: '#0D9488', bgColor: '#CCFBF1', calPerMin: 3.8 },
];

interface WorkoutSession {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  timeStr: string;
  calories: number;
  avgBpm: number;
}

export const SportScreen: React.FC = () => {
  const [healthSummary, setHealthSummary] = useState<HealthSummary>(watchService.getHealthSummary());
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(watchService.getWatchStatus());
  
  // Selected sport mode
  const [selectedSport, setSelectedSport] = useState<SportMode>(SPORT_MODES[0]);
  
  // Workout session state
  const [isWorkingOut, setIsWorkingOut] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [currentLiveBpm, setCurrentLiveBpm] = useState(watchService.getHealthSummary().currentBpm || 75);
  const [burnedCalories, setBurnedCalories] = useState(0);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);

  // Workout history list
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([
    { id: '1', title: 'Chạy bộ buổi sáng', icon: 'run-fast', color: '#EA580C', bg: '#FFEDD5', timeStr: 'Hôm nay • 06:30 • 35 phút', calories: 312, avgBpm: 142 },
    { id: '2', title: 'Đạp xe rèn luyện', icon: 'bike', color: '#0284C7', bg: '#E0F2FE', timeStr: 'Hôm qua • 17:15 • 42 phút', calories: 380, avgBpm: 135 },
    { id: '3', title: 'Đi bộ thư giãn', icon: 'walk', color: '#16A34A', bg: '#DCFCE7', timeStr: '2 ngày trước • 20:00 • 25 phút', calories: 120, avgBpm: 102 },
  ]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus effect to keep data fresh
  useFocusEffect(
    useCallback(() => {
      setWatchStatus(watchService.getWatchStatus());
      setHealthSummary(watchService.getHealthSummary());
    }, [])
  );

  // Subscribe to live BPM sensor feed
  useEffect(() => {
    const unsubStatus = watchService.onStatusChange((status) => {
      setWatchStatus(status);
    });

    const unsubSensors = watchService.subscribeToLiveUpdates((bpm) => {
      if (bpm > 0) {
        setCurrentLiveBpm(bpm);
      }
    });

    return () => {
      unsubStatus();
      unsubSensors();
    };
  }, []);

  // Timer runner for active workout session
  useEffect(() => {
    if (isWorkingOut && !isPaused) {
      timerRef.current = setInterval(() => {
        setWorkoutSeconds(prev => {
          const next = prev + 1;
          // Calculate burned calories based on sport multiplier and minutes
          setBurnedCalories(Math.round((next / 60) * selectedSport.calPerMin));
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isWorkingOut, isPaused, selectedSport]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hrs = Math.floor(mins / 60);
    const displayMins = mins % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Heart rate zone calculator
  const getHeartRateZone = (bpm: number) => {
    if (bpm < 100) return { name: 'Khởi động', color: '#0284C7', bg: '#E0F2FE' };
    if (bpm <= 125) return { name: 'Đốt mỡ', color: '#16A34A', bg: '#DCFCE7' };
    if (bpm <= 150) return { name: 'Cardio', color: '#EA580C', bg: '#FFEDD5' };
    return { name: 'Cường độ cao', color: '#DC2626', bg: '#FEE2E2' };
  };

  const handleStartWorkout = () => {
    setIsWorkingOut(true);
    setIsPaused(false);
    setWorkoutSeconds(0);
    setBurnedCalories(0);
  };

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleFinishWorkout = () => {
    setIsFinishModalVisible(true);
  };

  const confirmFinishWorkout = () => {
    const newSession = {
      id: Date.now().toString(),
      title: `${selectedSport.name} vừa xong`,
      icon: selectedSport.icon,
      color: selectedSport.color,
      bg: selectedSport.bgColor,
      timeStr: `Hôm nay • ${formatTimer(workoutSeconds)}`,
      calories: Math.max(1, burnedCalories),
      avgBpm: currentLiveBpm || 120,
    };
    setWorkoutHistory(prev => [newSession, ...prev]);
    setIsWorkingOut(false);
    setIsPaused(false);
    setWorkoutSeconds(0);
    setBurnedCalories(0);
    setIsFinishModalVisible(false);
  };

  const hrZone = getHeartRateZone(currentLiveBpm);
  const distanceKm = (healthSummary.steps * 0.00075).toFixed(1);
  const stepsGoalPercent = Math.min(100, Math.round((healthSummary.steps / (healthSummary.stepsGoal || 10000)) * 100));
  const calGoalPercent = Math.min(100, Math.round((healthSummary.calories / 600) * 100));

  // Phân loại hiển thị MPU6050 Activity (WALK / RUN / REST / SLEEP)
  const getActivityMeta = (act?: string) => {
    const code = (act || 'REST').toUpperCase().trim();
    switch (code) {
      case 'WALK':
        return {
          code: 'WALK',
          label: 'Đang đi bộ (WALK)',
          icon: 'walk' as const,
          color: '#16A34A',
          bg: '#DCFCE7',
          description: 'Cảm biến MPU6050 phát hiện bước chân nhịp đi bộ (< 2 steps/s)',
        };
      case 'RUN':
        return {
          code: 'RUN',
          label: 'Đang chạy bộ (RUN)',
          icon: 'run-fast' as const,
          color: '#EA580C',
          bg: '#FFEDD5',
          description: 'Cảm biến MPU6050 phát hiện nhịp chạy cường độ cao (≥ 2 steps/s)',
        };
      case 'SLEEP':
        return {
          code: 'SLEEP',
          label: 'Đang ngủ (SLEEP)',
          icon: 'power-sleep' as const,
          color: '#6366F1',
          bg: '#EEF2FF',
          description: 'Bất động liên tục > 5 phút & Nhịp tim nghỉ < 60 BPM',
        };
      case 'REST':
      default:
        return {
          code: code || 'REST',
          label: code === 'REST' ? 'Nghỉ ngơi / Đứng yên (REST)' : code,
          icon: 'human-male' as const,
          color: '#4B5563',
          bg: '#F3F4F6',
          description: 'Cơ thể đang ở trạng thái tĩnh, ít chuyển động',
        };
    }
  };

  const activityMeta = getActivityMeta(healthSummary.currentActivity);

  return (
    <View style={{ flex: 1 }}>
      {/* Workout Completion Modal (Popup kết thúc bài tập hoạt động 100% trên Web & Mobile) */}
      <Modal
        visible={isFinishModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFinishModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.finishModalCard, Shadows.lg]}>
            <View style={[styles.trophyIconBox, { backgroundColor: selectedSport.bgColor }]}>
              <MaterialCommunityIcons name="trophy" size={38} color={selectedSport.color} />
            </View>

            <Text style={styles.finishModalTitle}>Hoàn thành buổi tập! 🎉</Text>
            <Text style={styles.finishModalSub}>
              Bạn vừa hoàn thành bài tập <Text style={{ fontWeight: '700', color: selectedSport.color }}>{selectedSport.name}</Text>
            </Text>

            <View style={styles.summaryStatsBox}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatVal}>{formatTimer(workoutSeconds)}</Text>
                <Text style={styles.summaryStatLabel}>Thời gian</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatVal}>{Math.max(1, burnedCalories)} <Text style={{ fontSize: 11 }}>kcal</Text></Text>
                <Text style={styles.summaryStatLabel}>Calo tiêu hao</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatVal}>{watchStatus.connected ? currentLiveBpm : 125} <Text style={{ fontSize: 11 }}>BPM</Text></Text>
                <Text style={styles.summaryStatLabel}>Nhịp tim TB</Text>
              </View>
            </View>

            <View style={styles.finishBtnRow}>
              <TouchableOpacity
                style={styles.cancelFinishBtn}
                onPress={() => setIsFinishModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelFinishText}>Tiếp tục tập</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmFinishBtn, { backgroundColor: selectedSport.color }]}
                onPress={confirmFinishWorkout}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check-bold" size={16} color={Colors.white} />
                <Text style={styles.confirmFinishText}>Lưu & Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Thể thao & Luyện tập</Text>
            <Text style={styles.headerSubtitle}>Theo dõi bài tập & hiệu suất vận động</Text>
          </View>

          <View style={[
            styles.deviceBadge,
            watchStatus.connected ? styles.deviceBadgeConnected : styles.deviceBadgeDisconnected
          ]}>
            <View style={[
              styles.dot, 
              { backgroundColor: watchStatus.connected ? Colors.success : Colors.textMuted }
            ]} />
            <Text style={[
              styles.deviceBadgeText,
              { color: watchStatus.connected ? Colors.success : Colors.textMuted }
            ]}>
              {watchStatus.connected ? 'ESP32-S3' : 'Ngoại tuyến'}
            </Text>
          </View>
        </View>

        {/* Real-time MPU6050 Activity State Banner */}
        <View style={[styles.mpuBanner, Shadows.sm]}>
          <View style={[styles.mpuIconBox, { backgroundColor: activityMeta.bg }]}>
            <MaterialCommunityIcons name={activityMeta.icon} size={28} color={activityMeta.color} />
          </View>
          <View style={styles.mpuInfo}>
            <View style={styles.mpuTagRow}>
              <Text style={styles.mpuTagTitle}>TRẠNG THÁI MPU6050 (BLE)</Text>
              <View style={[styles.mpuLiveDot, { backgroundColor: watchStatus.connected ? activityMeta.color : Colors.textMuted }]} />
              <Text style={[styles.mpuLiveText, { color: watchStatus.connected ? activityMeta.color : Colors.textMuted }]}>
                {watchStatus.connected ? 'THỜI GIAN THỰC' : 'CHỜ KẾT NỐI'}
              </Text>
            </View>
            <Text style={[styles.mpuStateLabel, { color: activityMeta.color }]}>
              {activityMeta.label}
            </Text>
            <Text style={styles.mpuDesc}>{activityMeta.description}</Text>
          </View>
        </View>

        {/* 2. Today's Activity Summary Cards */}
        <View style={styles.activitySummaryGrid}>
          {/* Steps Card */}
          <View style={[styles.activityCard, Shadows.sm]}>
            <View style={[styles.activityIconBox, { backgroundColor: '#FFEDD5' }]}>
              <MaterialCommunityIcons name="foot-print" size={20} color="#EA580C" />
            </View>
            <Text style={styles.activityValue}>{healthSummary.steps.toLocaleString()}</Text>
            <Text style={styles.activityLabel}>Bước chân</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stepsGoalPercent}%`, backgroundColor: '#EA580C' }]} />
            </View>
            <Text style={styles.progressSub}>{stepsGoalPercent}% mục tiêu (10k)</Text>
          </View>

          {/* Calories Card */}
          <View style={[styles.activityCard, Shadows.sm]}>
            <View style={[styles.activityIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="fire" size={20} color="#DC2626" />
            </View>
            <Text style={styles.activityValue}>{healthSummary.calories}</Text>
            <Text style={styles.activityLabel}>Calo tiêu hao</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${calGoalPercent}%`, backgroundColor: '#DC2626' }]} />
            </View>
            <Text style={styles.progressSub}>{calGoalPercent}% mục tiêu (600 kcal)</Text>
          </View>

          {/* Distance Card */}
          <View style={[styles.activityCard, Shadows.sm]}>
            <View style={[styles.activityIconBox, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color="#0284C7" />
            </View>
            <Text style={styles.activityValue}>{distanceKm} <Text style={styles.unitText}>km</Text></Text>
            <Text style={styles.activityLabel}>Quãng đường</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '70%', backgroundColor: '#0284C7' }]} />
            </View>
            <Text style={styles.progressSub}>Ước tính theo bước chân</Text>
          </View>
        </View>

        {/* 3. Live Workout Tracking Panel */}
        <Text style={styles.sectionTitle}>Chế độ luyện tập trực tiếp</Text>
        
        {isWorkingOut ? (
          /* LIVE WORKOUT ACTIVE PANEL */
          <View style={[styles.liveWorkoutCard, Shadows.md]}>
            <View style={styles.liveHeader}>
              <View style={[styles.sportTag, { backgroundColor: selectedSport.bgColor }]}>
                <MaterialCommunityIcons name={selectedSport.icon} size={18} color={selectedSport.color} />
                <Text style={[styles.sportTagName, { color: selectedSport.color }]}>{selectedSport.name}</Text>
              </View>
              <View style={[styles.liveStatusBadge, isPaused ? styles.pausedBadge : styles.activeBadge]}>
                <View style={[styles.dot, { backgroundColor: isPaused ? '#D97706' : '#16A34A' }]} />
                <Text style={[styles.liveStatusText, { color: isPaused ? '#D97706' : '#16A34A' }]}>
                  {isPaused ? 'Đang tạm dừng' : 'Đang ghi nhận'}
                </Text>
              </View>
            </View>

            {/* Large Workout Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTimer(workoutSeconds)}</Text>
              <Text style={styles.timerSubText}>Thời gian tập luyện</Text>
            </View>

            {/* Real-time Heart Rate & Calories Metrics */}
            <View style={styles.liveMetricsRow}>
              <View style={styles.liveMetricBox}>
                <View style={styles.liveMetricIconRow}>
                  <MaterialCommunityIcons name="heart-pulse" size={18} color={Colors.heartRate} />
                  <Text style={styles.liveMetricLabel}>Nhịp tim</Text>
                </View>
                <Text style={styles.liveMetricValue}>
                  {watchStatus.connected ? currentLiveBpm : '--'} <Text style={styles.liveMetricUnit}>BPM</Text>
                </Text>
                <View style={[styles.zoneBadge, { backgroundColor: hrZone.bg }]}>
                  <Text style={[styles.zoneText, { color: hrZone.color }]}>{hrZone.name}</Text>
                </View>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.liveMetricBox}>
                <View style={styles.liveMetricIconRow}>
                  <MaterialCommunityIcons name="fire" size={18} color="#EA580C" />
                  <Text style={styles.liveMetricLabel}>Đã đốt cháy</Text>
                </View>
                <Text style={styles.liveMetricValue}>
                  {burnedCalories} <Text style={styles.liveMetricUnit}>kcal</Text>
                </Text>
                <Text style={styles.liveEstimateRate}>~{selectedSport.calPerMin} kcal/phút</Text>
              </View>
            </View>

            {/* Controls: Pause / Finish */}
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                style={[styles.pauseBtn, isPaused && styles.resumeBtn]} 
                onPress={handleTogglePause}
                activeOpacity={0.8}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={18} color={isPaused ? Colors.white : Colors.textPrimary} />
                <Text style={[styles.pauseBtnText, isPaused && { color: Colors.white }]}>
                  {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.finishBtn} 
                onPress={handleFinishWorkout}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={18} color={Colors.white} />
                <Text style={styles.finishBtnText}>Kết thúc</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* SPORT SELECTION & START PANEL */
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.selectPrompt}>Chọn môn thể thao chuẩn bị tập:</Text>
            <View style={styles.sportGrid}>
              {SPORT_MODES.map((sport) => {
                const isSelected = selectedSport.id === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportBtn,
                      isSelected && { borderColor: sport.color, backgroundColor: sport.bgColor }
                    ]}
                    onPress={() => setSelectedSport(sport)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sportIconCircle, { backgroundColor: isSelected ? Colors.white : sport.bgColor }]}>
                      <MaterialCommunityIcons name={sport.icon} size={22} color={sport.color} />
                    </View>
                    <Text style={[styles.sportBtnName, isSelected && { color: sport.color, fontWeight: '700' }]}>
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Start Action Button */}
            <TouchableOpacity 
              style={[styles.startWorkoutBtn, { backgroundColor: selectedSport.color }]}
              onPress={handleStartWorkout}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={22} color={Colors.white} />
              <Text style={styles.startWorkoutBtnText}>Bắt đầu bài tập {selectedSport.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Workout History Section */}
        <Text style={styles.sectionTitle}>Lịch sử buổi tập gần đây</Text>
        <View style={[styles.card, Shadows.sm]}>
          {workoutHistory.map((session, index) => (
            <React.Fragment key={session.id}>
              <View style={styles.historyRow}>
                <View style={[styles.historyIcon, { backgroundColor: session.bg }]}>
                  <MaterialCommunityIcons name={session.icon} size={20} color={session.color} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>{session.title}</Text>
                  <Text style={styles.historySub}>{session.timeStr}</Text>
                </View>
                <View style={styles.historyMetrics}>
                  <Text style={styles.historyCal}>{session.calories} kcal</Text>
                  <Text style={styles.historyHeart}>{session.avgBpm} BPM TB</Text>
                </View>
              </View>
              {index < workoutHistory.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* 5. Recovery & Fitness Insights Card */}
        <Text style={styles.sectionTitle}>Thể trạng & Khả năng phục hồi</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.recoveryRow}>
            <View style={styles.recoveryItem}>
              <Text style={styles.recoveryLabel}>Thời gian hồi phục</Text>
              <Text style={[styles.recoveryValue, { color: Colors.primary }]}>14 giờ</Text>
              <Text style={styles.recoverySub}>Sẵn sàng vận động tốt</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.recoveryItem}>
              <Text style={styles.recoveryLabel}>VO2 Max ước tính</Text>
              <Text style={[styles.recoveryValue, { color: Colors.success }]}>44.5</Text>
              <Text style={styles.recoverySub}>ml/kg/min (Khá tốt)</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#D97706" />
            <Text style={styles.tipText}>
              Duy trì nhịp tim ở vùng <Text style={{ fontWeight: '700', color: '#16A34A' }}>Đốt mỡ (110 - 125 BPM)</Text> giúp tối ưu đốt cháy calo và tăng cường độ bền tim mạch.
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
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
    padding: 16,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  deviceBadgeConnected: {
    backgroundColor: '#DCFCE7',
  },
  deviceBadgeDisconnected: {
    backgroundColor: Colors.cardMuted,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // MPU6050 Live Banner
  mpuBanner: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mpuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mpuInfo: {
    flex: 1,
  },
  mpuTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mpuTagTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  mpuLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 6,
  },
  mpuLiveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mpuStateLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  mpuDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },

  // Activity Summary Grid
  activitySummaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  activityCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  activityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activityLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSub: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },

  // Sport Selection
  selectPrompt: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  sportBtn: {
    width: '31%',
    backgroundColor: Colors.cardMuted,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sportBtnName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  startWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startWorkoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // Live Workout Panel Active
  liveWorkoutCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#EA580C',
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  sportTagName: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 14,
  },
  timerText: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  liveMetricsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  liveMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  liveMetricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  liveMetricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  liveMetricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  liveMetricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 12,
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveEstimateRate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardMuted,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  resumeBtn: {
    backgroundColor: '#16A34A',
  },
  pauseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },

  // History List
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  historyMetrics: {
    alignItems: 'flex-end',
  },
  historyCal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyHeart: {
    fontSize: 11,
    color: Colors.heartRate,
    fontWeight: '600',
    marginTop: 2,
  },

  // Recovery Insights
  recoveryRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginBottom: 12,
  },
  recoveryItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  recoveryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  recoveryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  recoverySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },

  // Completion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  finishModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  trophyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  finishModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  finishModalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 19,
  },
  summaryStatsBox: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Colors.cardMuted,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  finishBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelFinishBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFinishText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  confirmFinishBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  confirmFinishText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
