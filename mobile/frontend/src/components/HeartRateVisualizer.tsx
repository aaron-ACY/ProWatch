import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';

interface HeartRateVisualizerProps {
  bpm: number;
  isMeasuring: boolean;
  measurementProgress?: number;
  onToggleMeasure: () => void;
  statusText?: string;
  isConnected?: boolean;
}

export const HeartRateVisualizer: React.FC<HeartRateVisualizerProps> = ({
  bpm,
  isMeasuring,
  measurementProgress = 0,
  onToggleMeasure,
  statusText = 'Bình thường',
  isConnected = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim1 = useRef(new Animated.Value(1)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.7)).current;
  const rippleAnim2 = useRef(new Animated.Value(1)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.4)).current;

  // ECG scrolling waveform animation (0 to -340px continuously)
  const ecgScrollAnim = useRef(new Animated.Value(0)).current;

  // Laser sweep scanning bar across the ECG screen (0 to 320px)
  const sweepAnim = useRef(new Animated.Value(0)).current;

  // Heart pulse animation - chỉ đập mạnh và phát sóng lan tỏa khi đang đo
  useEffect(() => {
    if (!isMeasuring) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      rippleAnim1.stopAnimation();
      rippleAnim1.setValue(1);
      rippleOpacity1.stopAnimation();
      rippleOpacity1.setValue(0);
      rippleAnim2.stopAnimation();
      rippleAnim2.setValue(1);
      rippleOpacity2.stopAnimation();
      rippleOpacity2.setValue(0);
      return;
    }

    // Dynamic pulse duration based on BPM (faster BPM = faster pulse)
    const effectiveBpm = Math.max(bpm, 80);
    const cycleTime = Math.max(Math.round(60000 / effectiveBpm), 380);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: isMeasuring ? 1.18 : 1.12,
            duration: cycleTime * 0.22,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim1, {
            toValue: isMeasuring ? 1.55 : 1.45,
            duration: cycleTime * 0.45,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity1, {
            toValue: 0,
            duration: cycleTime * 0.45,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim2, {
            toValue: isMeasuring ? 1.8 : 1.65,
            duration: cycleTime * 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity2, {
            toValue: 0,
            duration: cycleTime * 0.6,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: cycleTime * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim1, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity1, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim2, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity2, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [bpm, isMeasuring]);

  const isMeasuringRef = useRef(isMeasuring);
  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  // Continuous ECG wave scrolling & laser scanner - runs non-stop during measurement
  useEffect(() => {
    if (!isMeasuring) {
      ecgScrollAnim.stopAnimation();
      ecgScrollAnim.setValue(0);
      sweepAnim.stopAnimation();
      sweepAnim.setValue(0);
      return;
    }

    let isCancelled = false;

    const runEcgScroll = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      ecgScrollAnim.setValue(0);
      Animated.timing(ecgScrollAnim, {
        toValue: -340,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runEcgScroll();
        }
      });
    };

    const runSweep = () => {
      if (isCancelled || !isMeasuringRef.current) return;
      sweepAnim.setValue(0);
      Animated.timing(sweepAnim, {
        toValue: 330,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isCancelled && isMeasuringRef.current) {
          runSweep();
        }
      });
    };

    runEcgScroll();
    runSweep();

    return () => {
      isCancelled = true;
      ecgScrollAnim.stopAnimation();
      ecgScrollAnim.setValue(0);
      sweepAnim.stopAnimation();
      sweepAnim.setValue(0);
    };
  }, [isMeasuring]);

  // Clean short badge text
  const cleanStatus = statusText.replace(/\s*\(.*\)/, '');

  const getMeasurementPhase = (prog: number) => {
    if (prog < 25) return 'Đang bắt tín hiệu PPG vi mao & định tuyến...';
    if (prog < 55) return 'Ghi nhận chu kỳ co bóp cơ tim & nhịp xoang...';
    if (prog < 85) return 'Phân tích khoảng cách đỉnh xung R-R...';
    return 'Hoàn tất tính toán chỉ số nhịp tim!';
  };

  return (
    <View style={[styles.card, Shadows.md]}>
      {/* Top Header Pill Row */}
      <View style={styles.headerRow}>
        <View style={styles.sensorPill}>
          <View style={[styles.sensorDot, { backgroundColor: isMeasuring ? Colors.warning : Colors.heartRate }]} />
          <Text style={styles.sensorText}>
            {isMeasuring ? 'Đang lấy mẫu PPG 100Hz' : 'PPG Trực tiếp'}
          </Text>
        </View>

        {/* Chỉ hiện badge khi đang đo hoặc khi có kết quả đo hợp lệ (lược bỏ tag 'Chưa kết nối') */}
        {isMeasuring ? (
          <View style={[styles.statusBadge, { backgroundColor: Colors.warningLight }]}>
            <MaterialCommunityIcons 
              name="progress-clock" 
              size={13} 
              color={Colors.warning} 
            />
            <Text style={[styles.statusBadgeText, { color: Colors.warning }]}>
              {`Đang đo: ${measurementProgress}%`}
            </Text>
          </View>
        ) : (cleanStatus && cleanStatus !== 'Chưa kết nối' && cleanStatus !== 'Chưa đo' && bpm > 0) ? (
          <View style={[styles.statusBadge, { backgroundColor: Colors.heartRateLight }]}>
            <MaterialCommunityIcons 
              name="shield-check" 
              size={13} 
              color={Colors.heartRate} 
            />
            <Text style={[styles.statusBadgeText, { color: Colors.heartRate }]}>
              {cleanStatus}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Heart Visualizer with Multi-layer Glow */}
      <View style={styles.heartCenterContainer}>
        {/* Outer Ripple 2 */}
        <Animated.View
          style={[
            styles.rippleRing,
            styles.rippleRingOuter,
            {
              transform: [{ scale: rippleAnim2 }],
              opacity: rippleOpacity2,
            },
          ]}
        />
        {/* Outer Ripple 1 */}
        <Animated.View
          style={[
            styles.rippleRing,
            styles.rippleRingInner,
            {
              transform: [{ scale: rippleAnim1 }],
              opacity: rippleOpacity1,
            },
          ]}
        />

        {/* Ambient Glow */}
        <View style={[styles.glowBase, isMeasuring && { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]} />

        {/* Core Heart Circle */}
        <Animated.View
          style={[
            styles.coreHeartCircle,
            isMeasuring && { backgroundColor: Colors.heartRate },
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <MaterialCommunityIcons 
            name={isMeasuring ? "heart-flash" : "heart-pulse"} 
            size={50} 
            color={Colors.white} 
          />
        </Animated.View>
      </View>

      {/* BPM Big Readout */}
      <View style={styles.bpmRow}>
        <Text style={styles.bpmNumber}>{isConnected && bpm > 0 ? bpm : '--'}</Text>
        <View style={styles.bpmMeta}>
          <Text style={styles.bpmUnit}>BPM</Text>
          <View style={[styles.bpmSubBadge, isMeasuring && { backgroundColor: '#FEF3C7' }]}>
            <Feather name="activity" size={10} color={isMeasuring ? Colors.warning : Colors.heartRate} />
            <Text style={[styles.bpmSubText, isMeasuring && { color: Colors.warning }]}>
              {isMeasuring ? 'Sampling' : isConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Guide phase text only during active measurement */}
      {isMeasuring && (
        <Text style={styles.bpmDescription}>
          {getMeasurementPhase(measurementProgress)}
        </Text>
      )}

      {/* Modern Medical ECG Waveform with Running Continuous Animation */}
      <View style={[styles.ecgCard, isMeasuring && styles.ecgCardMeasuring]}>
        {/* Repeating SVG Waveform shifted by animated scroll */}
        <Animated.View
          style={[
            styles.ecgAnimatedTrack,
            {
              transform: [{ translateX: ecgScrollAnim }],
            },
          ]}
        >
          <Svg height="70" width="1020" viewBox="0 0 1020 70">
            <Defs>
              {/* Wave stroke gradient */}
              <LinearGradient id="ecgStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={Colors.heartRate} stopOpacity="0.3" />
                <Stop offset="0.25" stopColor={Colors.heartRate} stopOpacity="0.85" />
                <Stop offset="0.5" stopColor="#FF6B6B" stopOpacity="1" />
                <Stop offset="0.75" stopColor={Colors.heartRate} stopOpacity="0.85" />
                <Stop offset="1" stopColor={Colors.heartRate} stopOpacity="0.3" />
              </LinearGradient>

              {/* Subtle area gradient under wave */}
              <LinearGradient id="ecgAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Colors.heartRate} stopOpacity="0.18" />
                <Stop offset="0.7" stopColor={Colors.heartRate} stopOpacity="0.04" />
                <Stop offset="1" stopColor={Colors.heartRate} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* ECG Background Grid Lines across full 1020px width */}
            <Line x1="0" y1="18" x2="1020" y2="18" stroke="#FEE2E2" strokeWidth="0.8" strokeDasharray="4,4" />
            <Line x1="0" y1="36" x2="1020" y2="36" stroke="#FEE2E2" strokeWidth="0.8" />
            <Line x1="0" y1="54" x2="1020" y2="54" stroke="#FEE2E2" strokeWidth="0.8" strokeDasharray="4,4" />

            {/* Area Fill across 3 cycles */}
            <Path
              d="M 0 36 L 25 36 L 35 34 L 45 37 L 55 36 L 75 36 L 85 36 L 93 42 L 102 10 L 112 62 L 122 24 L 132 42 L 140 36 L 165 36 L 175 34 L 185 38 L 195 36 L 215 36 L 225 36 L 233 42 L 242 10 L 252 62 L 262 24 L 272 42 L 280 36 L 315 36 L 325 34 L 340 36 L 365 36 L 375 34 L 385 37 L 395 36 L 415 36 L 425 36 L 433 42 L 442 10 L 452 62 L 462 24 L 472 42 L 480 36 L 505 36 L 515 34 L 525 38 L 535 36 L 555 36 L 565 36 L 573 42 L 582 10 L 592 62 L 602 24 L 612 42 L 620 36 L 655 36 L 665 34 L 680 36 L 705 36 L 715 34 L 725 37 L 735 36 L 755 36 L 765 36 L 773 42 L 782 10 L 792 62 L 802 24 L 812 42 L 820 36 L 845 36 L 855 34 L 865 38 L 875 36 L 895 36 L 905 36 L 913 42 L 922 10 L 932 62 L 942 24 L 952 42 L 960 36 L 995 36 L 1005 34 L 1020 36 L 1020 70 L 0 70 Z"
              fill="url(#ecgAreaGrad)"
            />

            {/* Wave Line Stroke across 3 cycles */}
            <Path
              d="M 0 36 L 25 36 L 35 34 L 45 37 L 55 36 L 75 36 L 85 36 L 93 42 L 102 10 L 112 62 L 122 24 L 132 42 L 140 36 L 165 36 L 175 34 L 185 38 L 195 36 L 215 36 L 225 36 L 233 42 L 242 10 L 252 62 L 262 24 L 272 42 L 280 36 L 315 36 L 325 34 L 340 36 L 365 36 L 375 34 L 385 37 L 395 36 L 415 36 L 425 36 L 433 42 L 442 10 L 452 62 L 462 24 L 472 42 L 480 36 L 505 36 L 515 34 L 525 38 L 535 36 L 555 36 L 565 36 L 573 42 L 582 10 L 592 62 L 602 24 L 612 42 L 620 36 L 655 36 L 665 34 L 680 36 L 705 36 L 715 34 L 725 37 L 735 36 L 755 36 L 765 36 L 773 42 L 782 10 L 792 62 L 802 24 L 812 42 L 820 36 L 845 36 L 855 34 L 865 38 L 875 36 L 895 36 L 905 36 L 913 42 L 922 10 L 932 62 L 942 24 L 952 42 L 960 36 L 995 36 L 1005 34 L 1020 36"
              fill="none"
              stroke="url(#ecgStrokeGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        {/* Laser Scanner Bar during active measurement */}
        {isMeasuring && (
          <Animated.View
            style={[
              styles.scannerBar,
              {
                transform: [{ translateX: sweepAnim }],
              },
            ]}
          >
            <View style={styles.scannerLine} />
            <View style={styles.scannerDot} />
          </Animated.View>
        )}
      </View>

      {/* Progress Bar during active measurement */}
      {isMeasuring && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${measurementProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity 
        style={[
          styles.actionButton,
          isMeasuring ? styles.actionButtonActive : styles.actionButtonDefault,
        ]} 
        onPress={onToggleMeasure}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons 
          name={isMeasuring ? "stop-circle" : "heart-flash"} 
          size={20} 
          color={Colors.white} 
        />
        <Text style={styles.actionButtonText}>
          {isMeasuring ? `Hủy phiên đo (${measurementProgress}%)` : 'Bắt đầu đo nhịp tim'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  sensorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sensorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heartCenterContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  rippleRingOuter: {
    width: 138,
    height: 138,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  rippleRingInner: {
    width: 116,
    height: 116,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  glowBase: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
  },
  coreHeartCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: Colors.heartRate,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.heartRate,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  bpmNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  bpmMeta: {
    marginLeft: 6,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  bpmUnit: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.heartRate,
    letterSpacing: 0.5,
  },
  bpmSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    gap: 3,
  },
  bpmSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.heartRate,
  },
  bpmDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.heartRate,
    marginBottom: 10,
    textAlign: 'center',
  },
  ecgCard: {
    width: '100%',
    height: 70,
    marginVertical: 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    position: 'relative',
  },
  ecgCardMeasuring: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
  },
  ecgAnimatedTrack: {
    width: 1020,
    height: 70,
  },
  scannerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLine: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
  },
  scannerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.heartRate,
    shadowColor: Colors.heartRate,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 2,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.heartRate,
    borderRadius: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  actionButtonDefault: {
    backgroundColor: Colors.heartRate,
    shadowColor: Colors.heartRate,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonActive: {
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
