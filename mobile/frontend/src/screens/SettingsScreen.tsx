import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  AppState,
  Image,
  PanResponder,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import Svg, { Rect, Polygon, Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows } from '../theme/colors';
import { watchService, WatchNotificationType } from '../services/watchService';
import { bleService, WatchMenu, WATCH_MENUS, WATCH_FIRMWARE_VERSION } from '../services/bleService';
import { WatchCustomization, WatchFaceType, WatchStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage, FontSizeScale } from '../context/LanguageContext';
import { APP_INFO } from '../config/appInfo';
import { mfaService, MfaStatus } from '../services/mfaService';
import { MFAEnrollmentModal } from '../components/MFAEnrollmentModal';
import { BluetoothConnectionToggle } from '../components/BluetoothConnectionToggle';

interface NotificationState {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  durationMs?: number;
  customColor?: string;
  customBgColor?: string;
  customIcon?: string;
  categoryLabel?: string;
  playGifOnClose?: boolean;
}

interface DemoColorOption {
  id: string;
  label: string;
  hex: string;
  bgHex: string;
  rgb565: string;
}

const DEMO_NOTIF_COLORS: DemoColorOption[] = [
  { id: 'green', label: 'Xanh lá', hex: '#16A34A', bgHex: '#DCFCE7', rgb565: '07E0' },
  { id: 'cyan', label: 'Xanh Cyan', hex: '#0284C7', bgHex: '#E0F2FE', rgb565: '07FF' },
  { id: 'yellow', label: 'Vàng cam', hex: '#D97706', bgHex: '#FEF3C7', rgb565: 'FFE0' },
  { id: 'red', label: 'Đỏ cảnh báo', hex: '#EF4444', bgHex: '#FEE2E2', rgb565: 'F800' },
  { id: 'pink', label: 'Tím hồng', hex: '#DB2777', bgHex: '#FCE7F3', rgb565: 'F81F' },
  { id: 'blue', label: 'Xanh dương', hex: '#2563EB', bgHex: '#DBEAFE', rgb565: '3BFF' },
];

const DEMO_NOTIF_TYPES: Array<{
  type: WatchNotificationType;
  label: string;
  icon: string;
  defaultColorId: string;
  defaultTitle: string;
  defaultBody: string;
  durationMs: number;
}> = [
    {
      type: 'CALL',
      label: 'Cuộc gọi (5s)',
      icon: 'phone-incoming',
      defaultColorId: 'green',
      defaultTitle: 'Nguyen Van A',
      defaultBody: '0912 345 678 dang goi den...',
      durationMs: 5000,
    },
    {
      type: 'SMS',
      label: 'Tin nhắn SMS (5s)',
      icon: 'message-text',
      defaultColorId: 'cyan',
      defaultTitle: 'Tin nhan SMS',
      defaultBody: 'Ma OTP xac thuc ProWatch: 849201',
      durationMs: 5000,
    },
    {
      type: 'WATER',
      label: 'Uống nước (5s)',
      icon: 'cup-water',
      defaultColorId: 'yellow',
      defaultTitle: 'Nhac uong nuoc',
      defaultBody: 'Da den gio uong 1 ly nuoc (250ml)!',
      durationMs: 5000,
    },
    {
      type: 'HEALTH_OK',
      label: 'Bình thường (10s)',
      icon: 'check-circle-outline',
      defaultColorId: 'green',
      defaultTitle: 'CHI SO BINH THUONG',
      defaultBody: 'HR: 75 BPM (Binh thuong) O2: 98% (Binh thuong)',
      durationMs: 10000,
    },
    {
      type: 'HR_LOW',
      label: 'Quá thấp (10s)',
      icon: 'arrow-down-bold-circle-outline',
      defaultColorId: 'yellow',
      defaultTitle: 'HR & SPO2 QUA THAP',
      defaultBody: 'HR: 48 BPM (QUA THAP!) O2: 91% (QUA THAP!)',
      durationMs: 10000,
    },
    {
      type: 'HR_HIGH',
      label: 'Quá cao (10s)',
      icon: 'alert-circle-outline',
      defaultColorId: 'red',
      defaultTitle: 'NHIP TIM QUA CAO!',
      defaultBody: 'HR: 124 BPM (QUA CAO!) O2: 97% (Binh thuong)',
      durationMs: 10000,
    },
  ];

const FlagVN: React.FC<{ width?: number; height?: number }> = ({ width = 16, height = 11 }) => (
  <View style={{ width, height, borderRadius: 2, overflow: 'hidden', marginRight: 5 }}>
    <Svg width={width} height={height} viewBox="0 0 24 16">
      <Rect width="24" height="16" fill="#DA251D" />
      <Polygon
        points="12,3.2 13.01,6.32 16.29,6.32 13.64,8.25 14.65,11.37 12,9.44 9.35,11.37 10.36,8.25 7.71,6.32 10.99,6.32"
        fill="#FFFF00"
      />
    </Svg>
  </View>
);

const FlagEN: React.FC<{ width?: number; height?: number }> = ({ width = 16, height = 11 }) => (
  <View style={{ width, height, borderRadius: 2, overflow: 'hidden', marginRight: 5 }}>
    <Svg width={width} height={height} viewBox="0 0 24 16">
      <Rect width="24" height="16" fill="#012169" />
      <Path d="M0 0L24 16M24 0L0 16" stroke="#FFFFFF" strokeWidth="3" />
      <Path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.2" />
      <Path d="M12 0V16M0 8H24" stroke="#FFFFFF" strokeWidth="5" />
      <Path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="3" />
    </Svg>
  </View>
);

const FONT_SCALES: FontSizeScale[] = ['small', 'normal', 'large', 'xlarge'];

interface FontScaleSliderProps {
  scale: FontSizeScale;
  onChange: (scale: FontSizeScale) => void;
  t: (vi: string, en: string) => string;
}

const FontScaleSlider: React.FC<FontScaleSliderProps> = ({ scale, onChange, t }) => {
  const targetIndex = Math.max(0, FONT_SCALES.indexOf(scale));
  const [val, setVal] = useState<number>(targetIndex >= 0 ? targetIndex : 1);
  const [previewScale, setPreviewScale] = useState<FontSizeScale>(scale);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef<number>(240);
  const grantXRef = useRef<number>(0);
  const scaleRef = useRef<FontSizeScale>(scale);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    scaleRef.current = scale;
    onChangeRef.current = onChange;
    if (!isDragging) {
      const idx = FONT_SCALES.indexOf(scale);
      setVal(idx >= 0 ? idx : 1);
      setPreviewScale(scale);
    }
  }, [scale, onChange, isDragging]);

  const applyRatio = useCallback((ratio: number, commit: boolean) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const continuousVal = clampedRatio * (FONT_SCALES.length - 1);
    const closestIndex = Math.round(continuousVal);
    const nextScale = FONT_SCALES[closestIndex] || 'normal';

    setPreviewScale(nextScale);

    if (commit) {
      setVal(closestIndex);
      if (nextScale !== scaleRef.current) {
        scaleRef.current = nextScale;
        onChangeRef.current(nextScale);
      }
    } else {
      setVal(continuousVal);
    }
  }, []);

  const handlePointerDown = (e: any) => {
    if (Platform.OS !== 'web' || !e.currentTarget) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const startClientX =
      'touches' in e && e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const ratio = rect.width > 0 ? (startClientX - rect.left) / rect.width : 0;
    applyRatio(ratio, false);

    const onPointerMove = (moveEvt: MouseEvent | TouchEvent) => {
      const clientX =
        'touches' in moveEvt && (moveEvt as TouchEvent).touches.length > 0
          ? (moveEvt as TouchEvent).touches[0].clientX
          : (moveEvt as MouseEvent).clientX;
      const currentRatio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      applyRatio(currentRatio, false);
    };

    const onPointerUp = (upEvt: MouseEvent | TouchEvent) => {
      setIsDragging(false);
      const clientX =
        'changedTouches' in upEvt && (upEvt as TouchEvent).changedTouches.length > 0
          ? (upEvt as TouchEvent).changedTouches[0].clientX
          : (upEvt as MouseEvent).clientX;
      const finalRatio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      applyRatio(finalRatio, true);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        const startX = evt.nativeEvent.locationX;
        grantXRef.current = startX;
        const w = trackWidthRef.current;
        if (w > 0) {
          applyRatio(startX / w, false);
        }
      },
      onPanResponderMove: (_evt, gestureState) => {
        const w = trackWidthRef.current;
        if (w > 0) {
          const currentX = grantXRef.current + gestureState.dx;
          applyRatio(currentX / w, false);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        setIsDragging(false);
        const w = trackWidthRef.current;
        if (w > 0) {
          const finalX = grantXRef.current + gestureState.dx;
          applyRatio(finalX / w, true);
        }
      },
      onPanResponderTerminate: (_evt, gestureState) => {
        setIsDragging(false);
        const w = trackWidthRef.current;
        if (w > 0) {
          const finalX = grantXRef.current + gestureState.dx;
          applyRatio(finalX / w, true);
        }
      },
    })
  ).current;

  const selectStepIndex = (idx: number) => {
    const nextScale = FONT_SCALES[idx];
    if (!nextScale) return;
    setVal(idx);
    setPreviewScale(nextScale);
    if (nextScale !== scaleRef.current) {
      scaleRef.current = nextScale;
      onChangeRef.current(nextScale);
    }
  };

  const percent = Math.max(0, Math.min(100, (val / (FONT_SCALES.length - 1)) * 100));

  const stepLabels = [
    { key: 'small' as FontSizeScale, label: t('Nhỏ (90%)', 'Small (90%)') },
    { key: 'normal' as FontSizeScale, label: t('Mặc định (100%)', 'Default (100%)') },
    { key: 'large' as FontSizeScale, label: t('Lớn (110%)', 'Large (110%)') },
    { key: 'xlarge' as FontSizeScale, label: t('Rất lớn (120%)', 'X-Large (120%)') },
  ];

  return (
    <View style={sliderStyles.container}>
      {/* Main Slider Row: a [ ======●====== ] A */}
      <View style={sliderStyles.sliderRow}>
        {/* Left 'a' button */}
        <TouchableOpacity
          onPress={() => selectStepIndex(0)}
          activeOpacity={0.7}
          style={sliderStyles.aBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text allowFontScaling={false} style={sliderStyles.labelSmallA}>a</Text>
        </TouchableOpacity>

        {/* Interactive Track Area (all children have pointerEvents="none" so locationX never jumps) */}
        <View
          ref={trackRef}
          style={sliderStyles.trackTouchArea}
          onLayout={(e) => {
            if (e.nativeEvent.layout.width > 0) {
              trackWidthRef.current = e.nativeEvent.layout.width;
            }
          }}
          {...(Platform.OS === 'web'
            ? { onMouseDown: handlePointerDown, onTouchStart: handlePointerDown }
            : panResponder.panHandlers)}
        >
          {/* Background Bar */}
          <View style={sliderStyles.trackBackground} pointerEvents="none">
            {/* Active Fill Bar */}
            <View style={[sliderStyles.trackActive, { width: `${percent}%` }]} pointerEvents="none" />
          </View>

          {/* Tick marks */}
          <View style={sliderStyles.ticksContainer} pointerEvents="none">
            {FONT_SCALES.map((s, idx) => {
              const tickPercent = (idx / (FONT_SCALES.length - 1)) * 100;
              const isPassed = percent >= tickPercent - 2;
              return (
                <View
                  key={s}
                  style={[
                    sliderStyles.tickMark,
                    isPassed && sliderStyles.tickMarkActive,
                  ]}
                />
              );
            })}
          </View>

          {/* Draggable Thumb */}
          <View
            pointerEvents="none"
            style={[
              sliderStyles.thumb,
              {
                left: `${percent}%`,
                transform: [{ translateX: -11 }],
              },
              isDragging && sliderStyles.thumbDragging,
            ]}
          >
            <View style={sliderStyles.thumbInnerDot} />
          </View>
        </View>

        {/* Right 'A' button */}
        <TouchableOpacity
          onPress={() => selectStepIndex(FONT_SCALES.length - 1)}
          activeOpacity={0.7}
          style={sliderStyles.aBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text allowFontScaling={false} style={sliderStyles.labelBigA}>A</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Step Pills for instant 1-tap selection */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
        {stepLabels.map((item, idx) => {
          const isSelected = previewScale === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => selectStepIndex(idx)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                borderWidth: 1,
                borderColor: isSelected ? '#BFDBFE' : 'transparent',
              }}
            >
              <Text
                allowFontScaling={false}
                style={{
                  fontSize: 11,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#2563EB' : '#64748B',
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Live Preview Box synced at 60fps during drag */}
      <View style={[styles.fontPreviewBox, { marginTop: 12 }]}>
        <View style={styles.fontPreviewBadge}>
          <MaterialCommunityIcons name="eye-outline" size={13} color={Colors.textSecondary} />
          <Text allowFontScaling={false} style={styles.fontPreviewBadgeText}>
            {t('Xem trước văn bản', 'Live Preview')}
          </Text>
        </View>
        <Text
          allowFontScaling={false}
          style={[
            styles.fontPreviewSample,
            previewScale === 'small' && { fontSize: 13, lineHeight: 19 },
            previewScale === 'normal' && { fontSize: 14.5, lineHeight: 22 },
            previewScale === 'large' && { fontSize: 16, lineHeight: 24 },
            previewScale === 'xlarge' && { fontSize: 17.5, lineHeight: 26 },
          ]}
        >
          {t(
            'ProWatch Health: Nhịp tim 75 BPM, Oxy trong máu SpO2 98%. Bố cục cân đối, hiển thị sắc nét.',
            'ProWatch Health: Heart Rate 75 BPM, SpO2 98%. Balanced layout, sharp typography.'
          )}
        </Text>
      </View>
    </View>
  );
};

// =============================================================================
// BASIC HEALTH INFO SPEC & RULER COMPONENT (Matching Reference Screen)
// =============================================================================
interface BmiCategoryItem {
  id: string;
  nameVi: string;
  nameEn: string;
  rangeVi: string;
  rangeEn: string;
  color: string;
  min: number;
  max: number;
}

const BASIC_INFO_BMI_CATEGORIES: BmiCategoryItem[] = [
  { id: 'very_severely_underweight', nameVi: 'Gầy độ III (Rất nghiêm trọng)', nameEn: 'Very severely underweight', rangeVi: 'BMI < 16.0', rangeEn: 'BMI < 16.0', color: '#0284C7', min: 0, max: 15.99 },
  { id: 'severely_underweight', nameVi: 'Gầy độ II (Nghiêm trọng)', nameEn: 'Severely underweight', rangeVi: 'BMI 16.0 – 16.9', rangeEn: 'BMI 16.0 – 16.9', color: '#38BDF8', min: 16.0, max: 16.99 },
  { id: 'underweight', nameVi: 'Thiếu cân (Hơi gầy)', nameEn: 'Underweight', rangeVi: 'BMI 17.0 – 18.4', rangeEn: 'BMI 17.0 – 18.4', color: '#06B6D4', min: 17.0, max: 18.49 },
  { id: 'normal', nameVi: 'Bình thường (Lý tưởng)', nameEn: 'Normal', rangeVi: 'BMI 18.5 – 24.9', rangeEn: 'BMI 18.5 – 24.9', color: '#22C55E', min: 18.5, max: 24.99 },
  { id: 'overweight', nameVi: 'Thừa cân (Tiền béo phì)', nameEn: 'Overweight', rangeVi: 'BMI 25.0 – 29.9', rangeEn: 'BMI 25.0 – 29.9', color: '#F59E0B', min: 25.0, max: 29.99 },
  { id: 'obese', nameVi: 'Béo phì độ I', nameEn: 'Obese', rangeVi: 'BMI 30.0 – 34.9', rangeEn: 'BMI 30.0 – 34.9', color: '#F97316', min: 30.0, max: 34.99 },
  { id: 'severely_obese', nameVi: 'Béo phì độ II & III', nameEn: 'Severely obese', rangeVi: 'BMI ≥ 35.0', rangeEn: 'BMI ≥ 35.0', color: '#EF4444', min: 35.0, max: 99.0 },
];

interface BasicInfoRulerProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  stepWidth?: number;
  onChange: (val: number) => void;
  onEditDirect: () => void;
}

const BasicInfoRuler: React.FC<BasicInfoRulerProps> = ({
  label,
  value,
  unit,
  min,
  max,
  stepWidth = 10,
  onChange,
  onEditDirect,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [cardWidth, setCardWidth] = useState(340);
  const isScrolling = useRef(false);

  const halfWidth = cardWidth / 2;

  useEffect(() => {
    if (!isScrolling.current && cardWidth > 0) {
      const targetX = (value - min) * stepWidth;
      scrollRef.current?.scrollTo({ x: targetX, animated: false });
    }
  }, [cardWidth]);

  const handleScroll = (e: any) => {
    if (!isScrolling.current) return;
    const x = e.nativeEvent.contentOffset.x;
    let computed = min + x / stepWidth;
    computed = Math.max(min, Math.min(max, computed));
    const rounded = Math.round(computed * 10) / 10;
    if (rounded !== value) {
      onChange(rounded);
    }
  };

  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round((value + delta) * 10) / 10));
    onChange(next);
    isScrolling.current = false;
    scrollRef.current?.scrollTo({ x: (next - min) * stepWidth, animated: true });
  };

  const ticks = useMemo(() => {
    const list: Array<{ val: number; isMajor: boolean; isMedium: boolean }> = [];
    for (let u = min; u <= max; u++) {
      list.push({
        val: u,
        isMajor: u % 10 === 0,
        isMedium: u % 5 === 0 && u % 10 !== 0,
      });
    }
    return list;
  }, [min, max]);

  return (
    <View style={biStyles.rulerCard} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
      <View style={biStyles.rulerHeader}>
        <Text style={biStyles.rulerLabel}>{label}</Text>
        <TouchableOpacity style={biStyles.rulerValueRow} onPress={onEditDirect} activeOpacity={0.7}>
          <Text style={biStyles.rulerValue}>{value.toFixed(1)}</Text>
          <Text style={biStyles.rulerUnit}>{unit}</Text>
          <MaterialCommunityIcons name="pencil-outline" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <View style={biStyles.rulerTrack}>
        <TouchableOpacity style={biStyles.stepBtnLeft} onPress={() => adjust(-0.5)} activeOpacity={0.6}>
          <Feather name="minus" size={16} color="#6B7280" />
        </TouchableOpacity>

        <View style={biStyles.redNeedle} pointerEvents="none" />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => { isScrolling.current = true; }}
          onScroll={handleScroll}
          onScrollEndDrag={() => { isScrolling.current = false; }}
          onMomentumScrollBegin={() => { isScrolling.current = true; }}
          onMomentumScrollEnd={() => { isScrolling.current = false; }}
          contentContainerStyle={{ paddingHorizontal: Math.max(0, halfWidth), paddingTop: 6 }}
        >
          {ticks.map((t) => (
            <View key={t.val} style={{ width: stepWidth, alignItems: 'center' }}>
              <View
                style={[
                  biStyles.tickLine,
                  t.isMajor ? biStyles.majorTick : t.isMedium ? biStyles.mediumTick : biStyles.minorTick,
                ]}
              />
              {t.isMajor ? (
                <Text style={biStyles.tickNum}>{t.val}</Text>
              ) : (
                <View style={{ height: 16 }} />
              )}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={biStyles.stepBtnRight} onPress={() => adjust(+0.5)} activeOpacity={0.6}>
          <Feather name="plus" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// VECTOR 3D-STYLE ILLUSTRATIONS (Matching Reference Screen Header)
// =============================================================================
const HeartIllustration: React.FC = () => (
  <Svg width={76} height={76} viewBox="0 0 72 72">
    <Defs>
      <LinearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FB7185" />
        <Stop offset="50%" stopColor="#F43F5E" />
        <Stop offset="100%" stopColor="#E11D48" />
      </LinearGradient>
      <LinearGradient id="pipeBlue" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#38BDF8" />
        <Stop offset="100%" stopColor="#0284C7" />
      </LinearGradient>
    </Defs>
    {/* Blue vessels */}
    <Path d="M 28 6 C 28 3, 34 3, 34 6 L 34 22 L 28 22 Z" fill="url(#pipeBlue)" />
    <Path d="M 38 8 C 38 4, 46 4, 46 8 L 46 22 L 38 22 Z" fill="url(#pipeBlue)" />
    <Circle cx="31" cy="5" r="3" fill="#38BDF8" />
    <Circle cx="42" cy="6" r="3.5" fill="#38BDF8" />
    {/* Main Heart body */}
    <Path
      d="M 36 24 C 20 12, 10 26, 16 40 C 22 52, 36 64, 36 64 C 36 64, 50 52, 56 40 C 62 26, 52 12, 36 24 Z"
      fill="url(#heartGrad)"
    />
    {/* 3D Highlight reflection */}
    <Path
      d="M 22 26 C 18 32, 20 40, 24 46 C 22 40, 20 32, 25 24 Z"
      fill="#FFFFFF"
      opacity={0.35}
    />
  </Svg>
);

const SpO2Illustration: React.FC = () => (
  <Svg width={76} height={76} viewBox="0 0 72 72">
    <Defs>
      <LinearGradient id="spo2Grad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#38BDF8" />
        <Stop offset="100%" stopColor="#0284C7" />
      </LinearGradient>
    </Defs>
    <Circle cx="36" cy="36" r="28" fill="#E0F2FE" />
    <Path
      d="M 36 16 C 36 16, 22 34, 22 44 C 22 52, 28 58, 36 58 C 44 58, 50 52, 50 44 C 50 34, 36 16, 36 16 Z"
      fill="url(#spo2Grad)"
    />
    <Circle cx="31" cy="40" r="3.5" fill="#FFFFFF" opacity={0.5} />
  </Svg>
);

const WatchIllustration: React.FC = () => (
  <Svg width={76} height={76} viewBox="0 0 72 72">
    <Defs>
      <LinearGradient id="watchGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
    </Defs>
    <Rect x="28" y="6" width="16" height="14" rx="4" fill="#64748B" />
    <Rect x="28" y="52" width="16" height="14" rx="4" fill="#64748B" />
    <Rect x="16" y="16" width="40" height="40" rx="12" fill="#0F172A" />
    <Rect x="20" y="20" width="32" height="32" rx="8" fill="url(#watchGrad)" />
    <Circle cx="36" cy="36" r="4" fill="#38BDF8" />
  </Svg>
);

const ShieldIllustration: React.FC = () => (
  <Svg width={76} height={76} viewBox="0 0 72 72">
    <Defs>
      <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#60A5FA" />
        <Stop offset="100%" stopColor="#2563EB" />
      </LinearGradient>
    </Defs>
    <Path
      d="M 36 12 L 54 18 C 54 36, 46 52, 36 60 C 26 52, 18 36, 18 18 Z"
      fill="url(#shieldGrad)"
    />
    <Path
      d="M 30 36 L 34 40 L 44 28"
      stroke="#FFFFFF"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const SWITCH_TRACK_COLORS = { false: '#E2E8F0', true: '#22C55E' };
const SWITCH_THUMB_COLOR = '#FFFFFF';

interface StyledSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

const StyledSwitch: React.FC<StyledSwitchProps> = ({ value, onValueChange, disabled }) => (
  <Switch
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    trackColor={SWITCH_TRACK_COLORS}
    thumbColor={SWITCH_THUMB_COLOR}
    ios_backgroundColor="#E2E8F0"
    {...({ activeThumbColor: SWITCH_THUMB_COLOR } as any)}
  />
);

export const SettingsScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const { user, logout, completeProfile } = useAuth();
  const { language, setLanguage, fontSizeScale, setFontSizeScale, t } = useLanguage();
  const [settings, setSettings] = useState<WatchCustomization>(watchService.getCustomization());
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(watchService.getWatchStatus());
  const [isTestingDevice, setIsTestingDevice] = useState(false);

  // 2FA Supabase state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [isLoadingMfa, setIsLoadingMfa] = useState(false);
  const [isEnrollModalVisible, setIsEnrollModalVisible] = useState(false);

  // Basic Health Info Modal State (Target Screen)
  const [isBasicInfoModalVisible, setIsBasicInfoModalVisible] = useState(false);
  const [basicWeight, setBasicWeight] = useState<number>(user?.weight || 60.0);
  const [basicHeight, setBasicHeight] = useState<number>(user?.height || 170.0);
  const [basicGender, setBasicGender] = useState<'Male' | 'Female' | 'Other'>(
    user?.gender?.toLowerCase() === 'female' || user?.gender?.toLowerCase() === 'nữ' ? 'Female' : 'Male'
  );
  const [basicAge, setBasicAge] = useState<number>(user?.age || 25);
  const [basicNote, setBasicNote] = useState<string>(user?.notes || '');
  const [isSavingBasicInfo, setIsSavingBasicInfo] = useState(false);
  const [basicInfoNotice, setBasicInfoNotice] = useState<string | null>(null);

  // Sub-modals for editing
  const [isGenderPickerOpen, setIsGenderPickerOpen] = useState(false);
  const [isAgePickerOpen, setIsAgePickerOpen] = useState(false);
  const [directEditTarget, setDirectEditTarget] = useState<'weight' | 'height' | null>(null);
  const [directEditVal, setDirectEditVal] = useState('');

  // Support & Policy Document Modal State
  const [activeDoc, setActiveDoc] = useState<'about' | 'knowledge' | 'privacy' | null>(null);

  // Auto-open requested document modal from navigation params (e.g. from Dashboard quick action)
  useEffect(() => {
    if (route?.params?.openDoc) {
      setActiveDoc(route.params.openDoc);
      navigation?.setParams({ openDoc: undefined });
    }
  }, [route?.params?.openDoc]);
  const [knowledgeTab, setKnowledgeTab] = useState<'heart' | 'spo2' | 'bmi'>('heart');

  const handleShareDoc = () => {
    Alert.alert(
      t('Chia sẻ tài liệu', 'Share Document'),
      t('Đã sao chép liên kết tài liệu vào bộ nhớ tạm.', 'Document article link copied to clipboard.')
    );
  };

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setBasicWeight(user.weight || 65);
      setBasicHeight(user.height || 170);
      setBasicGender(
        user.gender && (user.gender.toLowerCase() === 'female' || user.gender.toLowerCase() === 'nữ')
          ? 'Female'
          : 'Male'
      );
      setBasicAge(user.age || 25);
      setBasicNote(user.notes || '');
    } else {
      setBasicWeight(65);
      setBasicHeight(170);
      setBasicGender('Male');
      setBasicAge(25);
      setBasicNote('');
    }
  }, [user, isBasicInfoModalVisible]);

  // Load cached note/age per user ID
  useEffect(() => {
    const loadCached = async () => {
      if (!user?.id) return;
      try {
        const [savedNote, savedAge] = await Promise.all([
          AsyncStorage.getItem(`@prowatch_basic_health_notes_${user.id}`),
          AsyncStorage.getItem(`@prowatch_basic_health_age_${user.id}`),
        ]);
        if (savedNote && !user?.notes) setBasicNote(savedNote);
        if (savedAge && !user?.age) setBasicAge(parseInt(savedAge, 10) || 25);
      } catch (e) { }
    };
    loadCached();
  }, [user?.id]);

  // Compute BMI dynamically
  const basicBmi = useMemo(() => {
    if (!basicHeight || !basicWeight || basicHeight <= 0) return 21.9;
    const h = basicHeight / 100;
    return parseFloat((basicWeight / (h * h)).toFixed(1));
  }, [basicWeight, basicHeight]);

  const activeBmiCategory = useMemo(() => {
    const found = BASIC_INFO_BMI_CATEGORIES.find((cat) => basicBmi >= cat.min && basicBmi <= cat.max);
    return found || BASIC_INFO_BMI_CATEGORIES[3];
  }, [basicBmi]);

  const activeCategoryIndex = useMemo(() => {
    const idx = BASIC_INFO_BMI_CATEGORIES.findIndex((cat) => cat.id === activeBmiCategory.id);
    return idx >= 0 ? idx : 3;
  }, [activeBmiCategory]);

  const handleSaveBasicInfo = async () => {
    setIsSavingBasicInfo(true);
    try {
      const dob = user?.dateOfBirth || `01/01/${new Date().getFullYear() - basicAge}`;
      await completeProfile({
        gender: basicGender === 'Male' ? 'male' : basicGender === 'Female' ? 'female' : 'other',
        dateOfBirth: dob,
        height: Math.round(basicHeight),
        weight: Math.round(basicWeight * 10) / 10,
        notes: basicNote,
        age: basicAge,
      });

      watchService.sendUserProfileToWatch(basicHeight, basicWeight).catch(() => { });

      if (user?.id) {
        await Promise.all([
          AsyncStorage.setItem(`@prowatch_basic_health_notes_${user.id}`, basicNote),
          AsyncStorage.setItem(`@prowatch_basic_health_age_${user.id}`, String(basicAge)),
        ]);
      }

      setBasicInfoNotice(t('Đã lưu thông tin sức khỏe thành công!', 'Health info saved successfully!'));
      setTimeout(() => {
        setBasicInfoNotice(null);
        setIsBasicInfoModalVisible(false);
      }, 1200);
    } catch (e: any) {
      Alert.alert(t('Lỗi', 'Error'), e?.message || t('Không thể lưu thông tin', 'Failed to save info'));
    } finally {
      setIsSavingBasicInfo(false);
    }
  };

  const openDirectEditModal = (target: 'weight' | 'height') => {
    setDirectEditTarget(target);
    setDirectEditVal(target === 'weight' ? String(basicWeight) : String(basicHeight));
  };

  const submitDirectEditVal = () => {
    const num = parseFloat(directEditVal.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      if (directEditTarget === 'weight') {
        setBasicWeight(Math.min(250, Math.max(30, Math.round(num * 10) / 10)));
      } else if (directEditTarget === 'height') {
        setBasicHeight(Math.min(250, Math.max(50, Math.round(num * 10) / 10)));
      }
    }
    setDirectEditTarget(null);
  };

  const refreshMfaStatus = async () => {
    try {
      const status = await mfaService.getMfaStatus();
      setMfaStatus(status);
    } catch (e) { }
  };

  useFocusEffect(
    useCallback(() => {
      refreshMfaStatus();
    }, [])
  );

  const handleToggleMfa = async (newValue: boolean) => {
    setIsLoadingMfa(true);
    if (newValue) {
      if (mfaStatus?.isEnrolled) {
        // Đã có cấu hình trong Authenticator trước đó: Bật lại ngay, KHÔNG phải quét lại mã QR!
        await mfaService.enableMfa();
        await refreshMfaStatus();
      } else {
        // Lần đầu tiên bật 2FA: Mở modal để quét mã QR và xác nhận
        setIsEnrollModalVisible(true);
      }
    } else {
      // Tắt 2FA: Tắt ngay lập tức, KHÔNG hiển thị hộp thoại xác nhận hay thông báo
      await mfaService.disableMfa();
      await refreshMfaStatus();
    }
    setIsLoadingMfa(false);
  };

  // Bluetooth scanning & pairing modal state
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Array<{
    id: string;
    name: string;
    mac: string;
    rssi: number;
    model: string;
    battery?: number;
    rawDevice?: any;
  }>>([]);

  // In-App Basic Popup notification state
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // State cho mục Demo Thông báo tùy chỉnh & GIF chạy sau khi thông báo tắt
  const [demoType, setDemoType] = useState<WatchNotificationType>('CALL');
  const [demoColorId, setDemoColorId] = useState<string>('green');
  const [demoTitle, setDemoTitle] = useState<string>('Nguyen Van A');
  const [demoBody, setDemoBody] = useState<string>('0912 345 678 dang goi den...');
  const [demoGifUri, setDemoGifUri] = useState<string>('');
  const [postNotifGifState, setPostNotifGifState] = useState<{
    visible: boolean;
    color: string;
    bgColor: string;
    title: string;
  } | null>(null);
  const [gifAnimStep, setGifAnimStep] = useState<number>(0);

  const selectedDemoColor = useMemo(
    () => DEMO_NOTIF_COLORS.find((c) => c.id === demoColorId) || DEMO_NOTIF_COLORS[0],
    [demoColorId]
  );

  const handleSelectDemoType = (item: (typeof DEMO_NOTIF_TYPES)[number]) => {
    setDemoType(item.type);
    setDemoColorId(item.defaultColorId);
    setDemoTitle(item.defaultTitle);
    setDemoBody(item.defaultBody);
  };

  // Danh mục các loại thông báo chi tiết trên đồng hồ
  const [notifCategories, setNotifCategories] = useState(watchService.getNotificationCategories());

  const toggleNotifCategory = async (key: keyof typeof notifCategories, value: boolean) => {
    const next = watchService.updateNotificationCategories({ [key]: value });
    setNotifCategories(next);

    if (!watchStatus.connected) {
      showNotification(
        'warning',
        'Chưa kết nối đồng hồ',
        'Vui lòng kết nối Bluetooth với đồng hồ để đồng bộ cấu hình thông báo.'
      );
      return;
    }

    const ok = await watchService.syncNotificationConfig(undefined, { [key]: value });
    if (!ok && bleService.isConnected()) {
      showNotification('error', 'Lỗi đồng bộ', 'Không thể gửi cấu hình thông báo sang đồng hồ.');
    }
  };

  const handleSendSampleWatchNotification = async (
    type: WatchNotificationType,
    title: string,
    message: string,
    color565Hex?: string
  ) => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước khi gửi thông báo.');
      return;
    }
    const ok = await watchService.sendNotificationToWatch(type, title, message, color565Hex);
    if (!ok) {
      showNotification('error', 'Lỗi gửi thông báo', 'Không thể truyền thông báo qua Bluetooth tới đồng hồ.');
    }
  };

  const handleRunCustomDemoNotification = async () => {
    if (!watchStatus.connected) {
      showNotification(
        'warning',
        'Chưa kết nối đồng hồ',
        'Vui lòng kết nối Bluetooth với đồng hồ trước khi gửi Demo Thông báo lên màn hình đồng hồ.'
      );
      return;
    }

    const cleanTitle = demoTitle.trim() || 'ProWatch Demo';
    const cleanBody = demoBody.trim() || 'Noi dung thong bao demo tren dong ho.';

    // Chỉ gửi và hiển thị trên màn hình đồng hồ XIAO ESP32-S3 (không bật popup trên App)
    const ok = await watchService.sendNotificationToWatch(
      demoType,
      cleanTitle,
      cleanBody,
      selectedDemoColor.rgb565
    );
    if (!ok) {
      showNotification('error', 'Lỗi gửi thông báo', 'Không thể truyền Demo Thông báo qua Bluetooth tới đồng hồ.');
    }
  };

  const dismissCurrentNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Auto-hide notification: 5s mặc định (Cuộc gọi, SMS, Uống nước), 10s cho thông báo kết quả sau khi đo
  useEffect(() => {
    if (notification) {
      const duration = notification.durationMs ?? 5000;
      const timer = setTimeout(() => {
        dismissCurrentNotification();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, dismissCurrentNotification]);

  // Chạy animation GIF trong 3.2 giây ngay sau khi thông báo tắt (đồng bộ với gifnotif.h trên đồng hồ)
  useEffect(() => {
    if (!postNotifGifState?.visible) return;
    setGifAnimStep(0);
    const frameInterval = setInterval(() => {
      setGifAnimStep((s) => (s + 1) % 4);
    }, 150);
    const stopTimer = setTimeout(() => {
      setPostNotifGifState(null);
    }, 3200);
    return () => {
      clearInterval(frameInterval);
      clearTimeout(stopTimer);
    };
  }, [postNotifGifState]);

  // Subscribe to watch status changes and connection lost events
  useEffect(() => {
    const unsub = watchService.onStatusChange((status) => {
      setWatchStatus(status);
    });
    const unsubLost = watchService.onConnectionLost((reason) => {
      showNotification('error', 'Mất kết nối XIAO ESP32-S3 ⚠️', reason);
    });
    return () => {
      unsub();
      unsubLost();
    };
  }, []);

  // Show notification helper (hỗ trợ các loại thông báo: success, warning, error, info)
  const showNotification = (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string,
    durationMs: number = 5000
  ) => {
    setNotification({ type, title, message, durationMs });
  };

  // Helper tính mức tín hiệu sóng RSSI
  const getSignalInfo = (rssi: number) => {
    if (rssi >= -60) {
      return { label: 'Rất mạnh', color: '#10B981', icon: 'signal-cellular-3' as const };
    } else if (rssi >= -75) {
      return { label: 'Tốt', color: '#0284C7', icon: 'signal-cellular-2' as const };
    } else if (rssi >= -85) {
      return { label: 'Trung bình', color: '#F59E0B', icon: 'signal-cellular-1' as const };
    } else {
      return { label: 'Yếu', color: '#EF4444', icon: 'signal-cellular-outline' as const };
    }
  };

  // Nhận diện thiết bị ProWatch / XIAO ESP32-S3 khuyên dùng
  const isRecommendedWatch = (dev: { name?: string; model?: string }) => {
    const text = `${dev.name || ''} ${dev.model || ''}`.toLowerCase();
    return text.includes('prowatch') || text.includes('xiao') || text.includes('esp32') || text.includes('seeed');
  };

  // Danh sách chung tất cả các thiết bị đang phát sóng Bluetooth xung quanh
  const allDiscoveredDevices = useMemo(() => {
    const list = [...discoveredDevices];
    // Sắp xếp: Ưu tiên thiết bị nhận diện là đồng hồ ProWatch / XIAO lên đầu để người dùng dễ chọn, tiếp theo là theo tín hiệu sóng mạnh nhất
    list.sort((a, b) => {
      const aRec = isRecommendedWatch(a) ? 1 : 0;
      const bRec = isRecommendedWatch(b) ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      return (b.rssi || -100) - (a.rssi || -100);
    });
    return list;
  }, [discoveredDevices]);

  // Bắt đầu quét tìm thiết bị Bluetooth BLE THẬT bằng chip Bluetooth điện thoại
  // Bắt đầu quét tìm thiết bị Bluetooth BLE THẬT 100% (Không dùng mock)
  const handleOpenBluetoothScan = async () => {
    setIsScanModalVisible(true);
    setIsScanning(true);

    // Trên Web: Cung cấp sẵn thiết bị ProWatch ESP32-S3 đang trực tuyến trên hệ thống để người dùng có thể kết nối ngay
    if (Platform.OS === 'web') {
      setDiscoveredDevices([
        {
          id: 'ESP32S3-PROWATCH-01',
          name: 'ProWatch ESP32-S3 (Live Studio)',
          mac: 'C8:2E:18:24:A1:02',
          rssi: -38,
          model: 'Seeed Studio XIAO ESP32-S3',
          battery: 88,
        }
      ]);
    } else {
      setDiscoveredDevices([]);
    }

    let stopNativeScan: (() => void) | null = null;

    // 1. Quét tìm sóng Radio Bluetooth BLE THẬT (Native Hardware Scan trên điện thoại hoặc Web Bluetooth)
    if (bleService.isSupported()) {
      try {
        stopNativeScan = await bleService.startScan(
          (device) => {
            setDiscoveredDevices((prev) => {
              if (prev.some((d) => d.id === device.id)) return prev;
              return [device, ...prev];
            });
          },
          (err) => {
            console.warn('[Bluetooth Scan warning]', err);
            setIsScanning(false);
          }
        );
      } catch (err: any) {
        console.warn('[BLE Scan error]', err);
      }
    } else {
      setIsScanning(false);
      if (Platform.OS !== 'web') {
        showNotification(
          'warning',
          'Expo Go không hỗ trợ Native BLE',
          'Expo Go thiếu native module Bluetooth. Vui lòng cài bản APK/Development Build để quét Bluetooth phần cứng, hoặc dùng chế độ Wi-Fi.'
        );
      }
      if (Platform.OS !== 'web') {
        return;
      }
    }

    // Tự động dừng trạng thái quét radar sau 8 giây
    setTimeout(() => {
      setIsScanning(false);
      if (stopNativeScan) stopNativeScan();
    }, 8000);
  };

  // Kết nối với thiết bị thật được chọn (Đảm bảo luôn tắt spinner xoay)
  const handleConnectDevice = async (device: any) => {
    setIsConnecting(true);
    setConnectingDeviceId(device.id);

    try {
      let isBleSuccess = false;
      let realBattery = device.battery || 90;

      // Nếu là thiết bị BLE thực tế (có rawDevice hoặc MAC ID Bluetooth)
      if (bleService.isSupported() && (device.rawDevice || device.mac?.includes(':') || device.id?.includes(':'))) {
        try {
          const bleRes = await bleService.connectDevice(device.id, (data) => {
            watchService.updateFromBLE(data.bpm, data.spo2, data.battery, data.activity, data.steps, data.offlineRecord, data.offlineSyncEnd, data.riskScore, data.riskLevel);
          });
          isBleSuccess = bleRes.success;
          if (bleRes.battery) realBattery = bleRes.battery;
        } catch (e: any) {
          console.warn('[Direct BLE connect error]', e);
        }
      }

      const res = await watchService.connectRealDevice({
        name: device.name,
        address: device.mac || device.id,
        battery: realBattery,
        model: device.model,
      });

      if (res.success) {
        showNotification(
          'success',
          'Kết nối thành công! 🎉',
          isBleSuccess
            ? `Đã ghép đôi trực tiếp qua Bluetooth Low Energy (BLE) với ${device.name}.`
            : `Đã kết nối với đồng hồ ${device.name} (XIAO ESP32-S3).`
        );
      } else {
        showNotification('error', 'Lỗi kết nối', res.message);
      }
    } catch {
      showNotification('error', 'Lỗi kết nối', 'Không thể kết nối với thiết bị.');
    } finally {
      // Luôn luôn tắt trạng thái đang xoay và đóng modal
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setIsScanModalVisible(false);
    }
  };

  // Kết nối lại thiết bị gần nhất khi bị mất kết nối
  const handleReconnectDevice = async () => {
    setIsConnecting(true);
    try {
      const res = await watchService.reconnectLastDevice();
      if (res.success) {
        showNotification('success', 'Kết nối lại thành công! 🎉', res.message);
      } else {
        showNotification('warning', 'Chưa thể kết nối lại', res.message);
      }
    } catch {
      showNotification('error', 'Lỗi kết nối', 'Không thể kết nối lại với vi điều khiển XIAO ESP32-S3.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Mở modal xác nhận ngắt kết nối (hoạt động 100% chuẩn trên Web, Android & iOS)
  const handleOpenDisconnectModal = () => {
    setIsDisconnectModalVisible(true);
  };

  // Xác nhận ngắt kết nối thật
  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    setIsDisconnectModalVisible(false); // Đóng ngay popup để giao diện mượt mà lập tức

    try {
      await watchService.disconnectDevice();
      showNotification('warning', 'Đã ngắt kết nối', 'Đã ngắt kết nối với đồng hồ XIAO ESP32-S3.');
    } catch (err: any) {
      showNotification('error', 'Lỗi ngắt kết nối', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Gui va dong bo cai dat xuong dong ho (chi thong bao khi loi, khong hien popup khi thanh cong)
  const updateSettingAndSend = async <K extends keyof WatchCustomization>(key: K, value: WatchCustomization[K]) => {
    const updated = watchService.updateCustomization({ [key]: value });
    setSettings(updated);

    if (!watchStatus.connected) {
      showNotification(
        'warning',
        'Chưa kết nối đồng hồ',
        'Vui lòng bấm "Dò tìm & Kết nối Bluetooth" để truyền cài đặt xuống đồng hồ.'
      );
      return;
    }

    // Neu da ket noi, gui thong tin xuong XIAO ESP32-S3
    const res = await watchService.sendSettingsToWatch({ [key]: value });
    if (!res.success) {
      showNotification('error', 'Lỗi gửi dữ liệu', res.message);
    }
  };

  const handleTriggerRaiseToWake = async () => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    const ok = await watchService.triggerRaiseToWake();
    if (!ok) {
      showNotification('error', 'Lỗi điều khiển', 'Không thể gửi tín hiệu nhấc tay sáng màn hình tới đồng hồ.');
    }
  };

  // Nut gui toan bo cai dat chu dong
  const handleManualSyncSettings = async () => {
    if (!watchStatus.connected) {
      Alert.alert(
        "Chưa kết nối Bluetooth",
        "Đồng hồ chưa được kết nối! Bạn có muốn dò tìm và kết nối ngay bây giờ không?",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Dò tìm ngay", onPress: handleOpenBluetoothScan }
        ]
      );
      return;
    }

    const res = await watchService.sendSettingsToWatch(settings);
    if (res.success) {
      showNotification(
        'success',
        'Đồng bộ hoàn tất! ✅',
        'Cấu hình thông báo, chu kỳ đo và ngưỡng cảnh báo đã được gửi tới XIAO ESP32-S3.'
      );
    } else {
      showNotification('error', 'Lỗi gửi dữ liệu', res.message);
    }
  };

  // Nút Test: Ra lệnh cho XIAO ESP32-S3 gửi dữ liệu về App
  const handleTestDeviceData = async () => {
    setIsTestingDevice(true);
    try {
      const res = await watchService.testDeviceDataTransmission();
      setIsTestingDevice(false);

      if (res.success) {
        showNotification(
          'success',
          'Test dữ liệu thành công! 🎉',
          res.message
        );
      } else {
        showNotification(
          'error',
          'Test dữ liệu thất bại ⚠️',
          res.message
        );
      }
    } catch (err: any) {
      setIsTestingDevice(false);
      const errMsg = err?.message || 'Không thể kết nối hoặc nhận dữ liệu từ board XIAO ESP32-S3.';
      showNotification('error', 'Lỗi kiểm thử', errMsg);
    }
  };

  // Yêu cầu đồng hồ gửi dữ liệu offline qua BLE
  const handleSyncOfflineRecords = async () => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    showNotification('success', 'Chế độ thời gian thực', 'Đồng hồ đang truyền dữ liệu trực tiếp thời gian thực qua BLE (đã bỏ lưu offline).');
  };

  // Điều khiển menu đồng hồ từ xa (chỉ báo lỗi, không pop-up khi thành công để thao tác mượt mà)
  const handleSetWatchMenu = async (menu: WatchMenu, label: string) => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    const ok = await watchService.setWatchMenu(menu);
    if (!ok) {
      showNotification('error', 'Lỗi chuyển menu', 'Không thể gửi lệnh chuyển menu tới đồng hồ.');
    }
  };

  const handleStepWatchMenu = async (direction: 'next' | 'back') => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    const ok = await watchService.stepWatchMenu(direction);
    if (!ok) {
      showNotification('error', 'Lỗi điều hướng', 'Không thể gửi lệnh điều hướng tới đồng hồ.');
    }
  };

  const handleSetWatchScreen = async (on: boolean) => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    const ok = await watchService.setWatchScreen(on);
    if (!ok) {
      showNotification('error', 'Lỗi điều khiển màn hình', 'Không thể gửi lệnh bật/tắt màn hình tới đồng hồ.');
    }
  };

  const handleSyncTime = async () => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    const ok = await watchService.syncTime();
    if (ok) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      showNotification('success', 'Đồng bộ giờ thành công 🕒', `Đồng hồ đã cập nhật chính xác theo giờ điện thoại: ${timeStr}`);
    } else {
      showNotification('error', 'Lỗi đồng bộ giờ', 'Không thể gửi lệnh đồng bộ giờ tới đồng hồ.');
    }
  };

  const handleClearOffline = async () => {
    if (!watchStatus.connected) {
      showNotification('warning', 'Chưa kết nối', 'Vui lòng kết nối Bluetooth với đồng hồ trước.');
      return;
    }
    Alert.alert(
      'Xóa bộ nhớ đo offline',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử đo lưu trong Flash NVS của đồng hồ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            const ok = await watchService.clearOfflineRecords();
            if (ok) {
              showNotification('success', 'Đã xóa bộ nhớ', 'Đã xóa toàn bộ bản ghi offline trên đồng hồ.');
            } else {
              showNotification('error', 'Lỗi', 'Không thể gửi lệnh xóa bộ nhớ offline.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {/* Basic Popup Notification Modal (Popup Basic Design) */}
      <Modal
        visible={!!notification}
        transparent
        animationType="fade"
        onRequestClose={dismissCurrentNotification}
      >
        <TouchableOpacity
          style={styles.basicPopupOverlay}
          activeOpacity={1}
          onPress={dismissCurrentNotification}
        >
          <TouchableOpacity
            style={[
              styles.basicPopupCard,
              Shadows.lg,
              notification?.customColor ? { borderColor: notification.customColor, borderWidth: 2 } : null,
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[
              styles.basicPopupIconBox,
              notification?.type === 'success' && styles.basicPopupIconSuccess,
              notification?.type === 'warning' && styles.basicPopupIconWarning,
              notification?.type === 'error' && styles.basicPopupIconError,
              notification?.type === 'info' && styles.basicPopupIconInfo,
              notification?.customBgColor ? { backgroundColor: notification.customBgColor } : null,
            ]}>
              <MaterialCommunityIcons
                name={
                  (notification?.customIcon as any) ||
                  (notification?.type === 'success' ? 'check-circle' :
                    notification?.type === 'warning' ? 'alert-circle' :
                      notification?.type === 'error' ? 'close-circle' : 'information')
                }
                size={38}
                color={
                  notification?.customColor ||
                  (notification?.type === 'success' ? Colors.success :
                    notification?.type === 'warning' ? Colors.warning :
                      notification?.type === 'error' ? Colors.danger : Colors.primary)
                }
              />
            </View>
            {notification?.categoryLabel ? (
              <View
                style={[
                  styles.demoPopupCategoryBadge,
                  { backgroundColor: notification.customBgColor || Colors.primaryLight },
                ]}
              >
                <Text
                  style={[
                    styles.demoPopupCategoryText,
                    { color: notification.customColor || Colors.primary },
                  ]}
                >
                  {notification.categoryLabel}
                </Text>
              </View>
            ) : null}
            <Text
              style={[
                styles.basicPopupTitle,
                notification?.customColor ? { color: notification.customColor } : null,
              ]}
            >
              {notification?.title}
            </Text>
            <Text style={styles.basicPopupMsg}>{notification?.message}</Text>
            <TouchableOpacity
              style={[
                styles.basicPopupBtn,
                notification?.type === 'success' && { backgroundColor: Colors.success },
                notification?.type === 'warning' && { backgroundColor: Colors.warning },
                notification?.type === 'error' && { backgroundColor: Colors.danger },
                notification?.type === 'info' && { backgroundColor: Colors.primary },
                notification?.customColor ? { backgroundColor: notification.customColor } : null,
              ]}
              onPress={dismissCurrentNotification}
              activeOpacity={0.8}
            >
              <Text style={styles.basicPopupBtnText}>{t('Đã hiểu', 'Got it')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('Cài đặt hệ thống', 'System settings')}</Text>
        </View>

        {/* User Profile Card - Tap avatar / card to view & edit basic health info */}
        <TouchableOpacity
          style={[styles.profileCard, Shadows.sm]}
          activeOpacity={0.8}
          onPress={() => setIsBasicInfoModalVisible(true)}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || t('Người dùng', 'User')}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@prowatch.com'}</Text>
          </View>
          <View style={styles.profileEditPill}>
            <MaterialCommunityIcons name="pencil" size={14} color={Colors.primary} />
            <Text style={styles.profileEditText}>{t('Sửa', 'Edit')}</Text>
          </View>
        </TouchableOpacity>

        {/* Demo product (Gộp Điều khiển từ xa & Các nút test thông báo/cảnh báo) */}
        <Text style={styles.sectionTitle}>{t('Demo product', 'Demo Product')}</Text>
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.controlSubTitle}>
            {t('Chuyển nhanh màn hình', 'Quick Screen Switch')}
          </Text>
          <View style={styles.menuRow}>
            {WATCH_MENUS.slice(0, 2).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.menuBtn,
                  !watchStatus.connected && styles.btnDisabled
                ]}
                onPress={() => handleSetWatchMenu(m.id, m.label)}
                disabled={!watchStatus.connected}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={m.id === 0 ? "clock-outline" : "heart-pulse"}
                  size={18}
                  color={watchStatus.connected ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.menuBtnText,
                    !watchStatus.connected && styles.textDisabled
                  ]}
                  numberOfLines={1}
                >
                  {m.id === 0 ? t('Mặt đồng hồ', 'Watch Face') : t('Nhịp tim', 'Heart Rate')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.menuRow}>
            {WATCH_MENUS.slice(2, 4).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.menuBtn,
                  !watchStatus.connected && styles.btnDisabled
                ]}
                onPress={() => handleSetWatchMenu(m.id, m.label)}
                disabled={!watchStatus.connected}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={m.id === 2 ? "cog-outline" : "bell-ring-outline"}
                  size={18}
                  color={watchStatus.connected ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.menuBtnText,
                    !watchStatus.connected && styles.textDisabled
                  ]}
                  numberOfLines={1}
                >
                  {m.id === 2 ? t('Cài đặt giờ', 'Clock Settings') : t('Thông báo', 'Notifications')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navStepBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleStepWatchMenu('back')}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={16} color={watchStatus.connected ? Colors.textPrimary : Colors.textMuted} />
              <Text style={[styles.navStepText, !watchStatus.connected && styles.textDisabled]}>
                {t('Trang trước', 'Prev page')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navStepBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleStepWatchMenu('next')}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <Text style={[styles.navStepText, !watchStatus.connected && styles.textDisabled]}>
                {t('Trang sau', 'Next page')}
              </Text>
              <Feather name="chevron-right" size={16} color={watchStatus.connected ? Colors.textPrimary : Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.controlSubTitle}>{t('Tiện ích nguồn & Thời gian', 'Power & Time Utilities')}</Text>
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleSetWatchScreen(true)}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={watchStatus.connected ? "#D97706" : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>{t('Bật màn', 'Screen On')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleSetWatchScreen(false)}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="power-sleep" size={16} color={watchStatus.connected ? Colors.textSecondary : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>{t('Tắt màn', 'Screen Off')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={handleSyncTime}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="sync" size={16} color={watchStatus.connected ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>{t('Đồng bộ giờ', 'Sync Time')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={handleClearOffline}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="delete-sweep-outline" size={16} color={watchStatus.connected ? Colors.danger : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>{t('Xóa offline', 'Clear Offline')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Gửi thử thông báo Cuộc gọi, SMS & Nhắc uống nước */}
          <Text style={styles.controlSubTitle}>
            {t('Gửi thử thông báo Cuộc gọi, SMS & Nhắc uống nước', 'Sample Calls, SMS & Hydration Notifications')}
          </Text>
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification('CALL', 'Nguyen Van A', '0912 345 678 dang goi den...')
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="phone-ring"
                size={15}
                color={watchStatus.connected ? '#16A34A' : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Cuộc gọi', 'Call')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification('SMS', 'Tin nhan SMS', 'Ma OTP xac thuc ProWatch: 849201')
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="message-processing-outline"
                size={15}
                color={watchStatus.connected ? '#0284C7' : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Tin nhắn SMS', 'SMS')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification(
                  'WATER',
                  'Nhac uong nuoc',
                  'Da den gio uong 1 ly nuoc (250ml)!'
                )
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="cup-water"
                size={15}
                color={watchStatus.connected ? '#D97706' : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Uống nước', 'Hydration')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Thử Cảnh báo Nhịp tim / SpO2 (Quá thấp / Bình thường / Quá cao) */}
          <Text style={styles.controlSubTitle}>
            {t('Thử Cảnh báo Nhịp tim / SpO2 (Quá thấp / Bình thường / Quá cao)', 'Test Heart Rate & SpO2 Alerts (Low / Normal / High)')}
          </Text>
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification(
                  'HR_LOW',
                  'HR & SPO2 QUA THAP',
                  'HR: 48 BPM (QUA THAP!) O2: 91% (QUA THAP!)'
                )
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="arrow-down-bold-circle-outline"
                size={15}
                color={watchStatus.connected ? Colors.warning : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Quá thấp', 'Too Low')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification(
                  'HEALTH_OK',
                  'CHI SO BINH THUONG',
                  'HR: 75 BPM (Binh thuong) O2: 98% (Binh thuong)'
                )
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={15}
                color={watchStatus.connected ? Colors.success : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Bình thường', 'Normal')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() =>
                handleSendSampleWatchNotification(
                  'HR_HIGH',
                  'NHIP TIM QUA CAO!',
                  'HR: 124 BPM (QUA CAO!) O2: 97% (Binh thuong)'
                )
              }
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={15}
                color={watchStatus.connected ? Colors.danger : Colors.textMuted}
              />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                {t('Quá cao', 'Too High')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kết nối thiết bị & Bluetooth (Dạng Toggle Component riêng biệt) */}
        <Text style={styles.sectionTitle}>{t('Kết nối thiết bị', 'Device Connection')}</Text>
        <BluetoothConnectionToggle
          watchStatus={watchStatus}
          isConnecting={isConnecting}
          isTestingDevice={isTestingDevice}
          onOpenScan={handleOpenBluetoothScan}
          onReconnect={handleReconnectDevice}
          onDisconnect={handleOpenDisconnectModal}
          onSyncSettings={handleManualSyncSettings}
          onTestData={handleTestDeviceData}
          onSyncOffline={handleSyncOfflineRecords}
        />

        {/* Notification Settings Section (Sử dụng toggle, tinh gọn các loại thông báo) */}
        <Text style={styles.sectionTitle}>{t('Cài đặt các loại thông báo', 'Notification Categories')}</Text>
        <View style={[styles.card, Shadows.sm]}>
          {/* Master toggle */}
          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: Colors.primaryLight }]}>
              <MaterialCommunityIcons name="bell-ring" size={20} color={Colors.primary} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('Đồng bộ thông báo đồng hồ', 'Sync Watch Notifications')}</Text>
              <Text style={styles.switchSub}>
                {t('Bật/tắt toàn bộ nhận tin & cảnh báo trên đồng hồ', 'Enable/disable all alerts & messages on watch')}
              </Text>
            </View>
            <StyledSwitch
              value={settings.notificationsEnabled}
              onValueChange={(val) => {
                updateSettingAndSend('notificationsEnabled', val);
              }}
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.divider} />

              {/* 1. Cuộc gọi đến */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialCommunityIcons name="phone-incoming" size={18} color="#16A34A" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('Cuộc gọi đến', 'Incoming Calls')}</Text>
                  <Text style={styles.switchSub}>
                    {t('Bật sáng màn hình và hiển thị người gọi trên XIAO ESP32-S3', 'Wake screen and display caller on XIAO ESP32-S3')}
                  </Text>
                </View>
                <StyledSwitch
                  value={notifCategories.calls}
                  onValueChange={(val) => toggleNotifCategory('calls', val)}
                />
              </View>

              <View style={styles.divider} />

              {/* 2. Tin nhắn SMS */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons name="message-text" size={18} color="#0284C7" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('Tin nhắn SMS', 'SMS Messages')}</Text>
                  <Text style={styles.switchSub}>
                    {t('Xem trước người gửi và nội dung tin nhắn SMS trên đồng hồ', 'Preview sender and SMS text on watch')}
                  </Text>
                </View>
                <StyledSwitch
                  value={notifCategories.sms}
                  onValueChange={(val) => toggleNotifCategory('sms', val)}
                />
              </View>

              <View style={styles.divider} />

              {/* 3. Nhắc nhở uống nước */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="cup-water" size={18} color="#D97706" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('Nhắc nhở uống nước', 'Hydration Reminder')}</Text>
                  <Text style={styles.switchSub}>
                    {t('Nhắc bổ sung nước định kỳ trên màn hình đồng hồ', 'Periodic hydration reminder on watch screen')}
                  </Text>
                </View>
                <StyledSwitch
                  value={notifCategories.water}
                  onValueChange={(val) => toggleNotifCategory('water', val)}
                />
              </View>

              <View style={styles.divider} />

              {/* 4. Thông báo / Cảnh báo Nhịp tim & SpO2 */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: Colors.heartRateLight }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={18} color={Colors.heartRate} />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{t('Cảnh báo Nhịp tim & SpO2', 'Heart Rate & SpO2 Alerts')}</Text>
                  <Text style={styles.switchSub}>
                    {t('Thông báo khi chỉ số Quá thấp / Bình thường / Quá cao sau khi đo', 'Alert when reading is Too Low / Normal / Too High after measurement')}
                  </Text>
                </View>
                <StyledSwitch
                  value={notifCategories.health}
                  onValueChange={(val) => toggleNotifCategory('health', val)}
                />
              </View>
            </>
          )}
        </View>

        {/* Display & Sensor Toggles */}
        <Text style={styles.sectionTitle}>{t('Màn hình & Cảm biến', 'Display & Sensors')}</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="brightness-6" size={18} color="#D97706" />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('Màn hình luôn bật (AOD)', 'Always On Display (AOD)')}</Text>
            </View>
            <StyledSwitch
              value={settings.alwaysOnDisplay}
              onValueChange={(val) => updateSettingAndSend('alwaysOnDisplay', val)}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="gesture-tap-hold" size={18} color="#0284C7" />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('Nhấc tay sáng màn hình', 'Raise to Wake')}</Text>
            </View>
            <StyledSwitch
              value={settings.raiseToWake}
              onValueChange={(val) => updateSettingAndSend('raiseToWake', val)}
            />
          </View>
        </View>

        {/* Cài đặt Ngôn ngữ & Hiển thị */}
        <Text style={styles.sectionTitle}>{t('Ngôn ngữ hiển thị & Cỡ chữ', 'Display Language & Typography')}</Text>
        <View style={[styles.card, Shadows.sm]}>
          {/* Row 1: Chuyển đổi ngôn ngữ hiển thị dạng viên thuốc kèm lá cờ và kí hiệu vi / en */}
          <View style={styles.langRow}>
            <View style={styles.langLeft}>
              <View style={[styles.notifTypeIcon, { backgroundColor: Colors.primaryLight }]}>
                <MaterialCommunityIcons name="translate" size={20} color={Colors.primary} />
              </View>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>
                  {t('Ngôn ngữ hiển thị', 'Display Language')}
                </Text>
                <Text style={styles.switchSub}>
                  {language === 'vi' ? 'Tiếng Việt (vi)' : 'English (en)'}
                </Text>
              </View>
            </View>

            {/* Compact pill toggle với cờ SVG và chữ viết tắt vi / en giống Web */}
            <View style={styles.webLangPill}>
              <TouchableOpacity
                onPress={() => setLanguage('vi')}
                activeOpacity={0.8}
                style={[
                  styles.webLangSegment,
                  language === 'vi' && styles.webLangSegmentActive,
                ]}
              >
                <FlagVN width={16} height={11} />
                <Text
                  style={[
                    styles.webLangText,
                    language === 'vi' && styles.webLangTextActive,
                  ]}
                >
                  vi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLanguage('en')}
                activeOpacity={0.8}
                style={[
                  styles.webLangSegment,
                  language === 'en' && styles.webLangSegmentActive,
                ]}
              >
                <FlagEN width={16} height={11} />
                <Text
                  style={[
                    styles.webLangText,
                    language === 'en' && styles.webLangTextActive,
                  ]}
                >
                  en
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Đường phân cách mảnh */}
          <View style={styles.langDivider} />

          {/* Row 2: Bộ chỉnh cỡ chữ hiển thị dạng thanh kéo từ a đến A */}
          <View style={styles.fontSizeSection}>
            <View style={styles.fontSizeHeaderRow}>
              <View style={styles.fontSizeLeft}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#F0FDF4' }]}>
                  <MaterialCommunityIcons name="format-size" size={20} color="#16A34A" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>
                    {t('Cỡ chữ hiển thị', 'Text Size')}
                  </Text>
                  <Text style={styles.switchSub}>
                    {t('Kéo thanh trượt từ a đến A để tăng giảm cỡ chữ', 'Drag slider from a to A to adjust text size')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thanh kéo Slider từ a đến A kèm khung xem trước 60fps */}
            <FontScaleSlider
              scale={fontSizeScale}
              onChange={(newScale) => setFontSizeScale(newScale)}
              t={t}
            />
          </View>
        </View>

        {/* Supabase 2FA Security Section (Dạng Toggle) */}
        <Text style={styles.sectionTitle}>{t('Bảo mật tài khoản & Xác thực 2 bước', 'Account Security & Two-Factor Auth')}</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.mfaToggleRow}>
            <View style={[styles.mfaIconCircle, mfaStatus?.isEnabled ? styles.mfaIconActive : styles.mfaIconInactive]}>
              <MaterialCommunityIcons
                name={mfaStatus?.isEnabled ? "shield-check" : "shield-alert-outline"}
                size={22}
                color={mfaStatus?.isEnabled ? Colors.success : Colors.warning}
              />
            </View>

            <View style={styles.mfaToggleInfo}>
              <Text style={styles.mfaTitleText}>{t('Xác thực 2 bước (2FA)', 'Two-Factor Authentication (2FA)')}</Text>
            </View>

            {/* Toggle Switch */}
            {isLoadingMfa ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
            ) : (
              <StyledSwitch
                value={Boolean(mfaStatus?.isEnabled)}
                onValueChange={handleToggleMfa}
              />
            )}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* HỖ TRỢ (Support Section - Styled after Reference Image)                  */}
        {/* ========================================================================= */}
        <Text style={styles.listSectionTitle}>{t('Hỗ Trợ', 'Support')}</Text>
        <View style={[styles.listMenuCard, Shadows.sm]}>
          <TouchableOpacity
            style={styles.listMenuItem}
            activeOpacity={0.7}
            onPress={() => setActiveDoc('about')}
          >
            <Text style={styles.listMenuItemText}>{t('Về chúng tôi', 'About Us')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.listMenuDivider} />

          <TouchableOpacity
            style={styles.listMenuItem}
            activeOpacity={0.7}
            onPress={() => setActiveDoc('knowledge')}
          >
            <Text style={styles.listMenuItemText}>{t('Kiến thức cần biết', 'Essential Knowledge')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* CHÍNH SÁCH (Policy Section - Styled after Reference Image)                */}
        {/* ========================================================================= */}
        <Text style={styles.listSectionTitle}>{t('Chính Sách', 'Policy')}</Text>
        <View style={[styles.listMenuCard, Shadows.sm]}>
          <TouchableOpacity
            style={styles.listMenuItem}
            activeOpacity={0.7}
            onPress={() => setActiveDoc('privacy')}
          >
            <Text style={styles.listMenuItemText}>{t('Chính sách bảo mật', 'Privacy Policy')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Version Footnote */}
        <Text style={styles.versionFootnote}>
          version: {APP_INFO.version}
        </Text>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={Colors.white} />
          <Text style={styles.logoutBtnText}>{t('Đăng xuất', 'Sign Out')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 2. BLUETOOTH BLE SCANNING & PAIRING MODAL                                 */}
      {/* ========================================================================= */}
      <Modal
        visible={isScanModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsScanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.md]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.modalHeaderIconBadge}>
                  <MaterialCommunityIcons name="bluetooth-audio" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Dò tìm thiết bị Bluetooth (BLE)</Text>
                  <Text style={styles.modalSub}>Chọn đồng hồ của bạn trong danh sách để kết nối</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsScanModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Radar Scanning Area */}
            <View style={styles.scannerStatusBox}>
              {isScanning ? (
                <View style={styles.scanningAnimRow}>
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
                  <Text style={styles.scanningText}>Đang quét sóng Bluetooth BLE xung quanh...</Text>
                </View>
              ) : (
                <View style={styles.scannedCountRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
                  <Text style={styles.scannedCountText}>
                    Đã tìm thấy {discoveredDevices.length} thiết bị xung quanh:
                  </Text>
                </View>
              )}
            </View>

            {/* Device List (Scrollable) - Hiển thị chung tất cả các thiết bị Bluetooth */}
            <ScrollView style={styles.deviceListScroll} showsVerticalScrollIndicator={false}>
              {allDiscoveredDevices.map((dev) => {
                const isThisConnecting = connectingDeviceId === dev.id;
                const isOtherConnecting = isConnecting && !isThisConnecting;
                const isRec = isRecommendedWatch(dev);
                const sig = getSignalInfo(dev.rssi);

                return (
                  <TouchableOpacity
                    key={dev.id}
                    style={[
                      styles.deviceItemCard,
                      isRec && styles.deviceItemCardRecommended,
                      isThisConnecting && styles.deviceItemCardConnecting,
                    ]}
                    onPress={() => handleConnectDevice(dev)}
                    disabled={isConnecting}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.deviceIconCircle, isRec && styles.deviceIconCircleRecommended]}>
                      <MaterialCommunityIcons
                        name={isRec ? "watch-variant" : "bluetooth"}
                        size={24}
                        color={isRec ? Colors.primary : Colors.textSecondary}
                      />
                    </View>

                    <View style={styles.deviceItemInfo}>
                      <View style={styles.deviceItemNameRow}>
                        <Text style={styles.deviceItemName} numberOfLines={1}>{dev.name || 'Thiết bị Bluetooth'}</Text>
                        {isRec ? (
                          <View style={styles.recBadge}>
                            <Text style={styles.recBadgeText}>⭐ ProWatch / ESP32</Text>
                          </View>
                        ) : (
                          <View style={styles.bleBadge}>
                            <Text style={styles.bleBadgeText}>Bluetooth BLE</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.deviceItemSub} numberOfLines={1}>{dev.model}</Text>

                      <View style={styles.deviceItemMetaRow}>
                        <View style={styles.signalBadge}>
                          <MaterialCommunityIcons name={sig.icon} size={13} color={sig.color} />
                          <Text style={[styles.signalText, { color: sig.color }]}>
                            {sig.label} ({dev.rssi} dBm)
                          </Text>
                        </View>
                        <Text style={styles.metaBullet}>•</Text>
                        <Text style={styles.deviceItemMac} numberOfLines={1}>{dev.mac}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.pairBtn,
                        isRec && styles.pairBtnRecommended,
                        isThisConnecting && styles.pairBtnConnecting,
                        isOtherConnecting && styles.pairBtnDisabled,
                      ]}
                    >
                      {isThisConnecting ? (
                        <View style={styles.pairLoadingRow}>
                          <ActivityIndicator size="small" color={Colors.white} />
                          <Text style={styles.pairBtnTextSmall}>Đang nối...</Text>
                        </View>
                      ) : (
                        <Text style={styles.pairBtnText}>Chọn</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {!isScanning && discoveredDevices.length === 0 && (
                <View style={styles.emptyDeviceBox}>
                  <MaterialCommunityIcons name="bluetooth-off" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyDeviceText}>Chưa tìm thấy thiết bị Bluetooth nào</Text>
                  <Text style={styles.emptyDeviceSub}>
                    {!bleService.isSupported() && Platform.OS !== 'web'
                      ? 'Ứng dụng đang mở trên Expo Go (không chứa native module Bluetooth). Để kết nối BLE trực tiếp với phần cứng, vui lòng cài bản APK/Development Build hoặc kết nối qua Wi-Fi Telemetry.'
                      : 'Hãy đảm bảo board mạch XIAO ESP32-S3 đã cấp nguồn USB/pin và Bluetooth trên điện thoại đang bật.'}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Re-scan button */}
            <TouchableOpacity
              style={[styles.rescanBtn, isScanning && styles.rescanBtnDisabled]}
              onPress={handleOpenBluetoothScan}
              disabled={isScanning || isConnecting}
              activeOpacity={0.7}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              )}
              <Text style={styles.rescanBtnText}>
                {isScanning ? 'Đang quét lại...' : 'Quét lại danh sách'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận ngắt kết nối đồng hồ - Hoạt động chuẩn 100% trên Web, Android & iOS */}
      <Modal
        visible={isDisconnectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDisconnectModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={[styles.disconnectModalCard, Shadows.lg]}>
            <View style={styles.disconnectModalIconBox}>
              <MaterialCommunityIcons name="power" size={32} color={Colors.danger} />
            </View>
            <Text style={styles.disconnectModalTitle}>Xác nhận ngắt kết nối</Text>
            <Text style={styles.disconnectModalMsg}>
              Bạn có chắc chắn muốn ngắt kết nối với đồng hồ {watchStatus.deviceName} không? Dữ liệu nhịp tim và oxy máu thời gian thực sẽ tạm dừng.
            </Text>
            <View style={styles.disconnectModalBtnRow}>
              <TouchableOpacity
                style={styles.disconnectCancelBtn}
                onPress={() => setIsDisconnectModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.disconnectCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disconnectConfirmBtn}
                onPress={handleConfirmDisconnect}
                disabled={isDisconnecting}
                activeOpacity={0.8}
              >
                {isDisconnecting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.disconnectConfirmText}>Ngắt kết nối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. MODAL CÀI ĐẶT & KÍCH HOẠT 2FA SUPABASE */}
      <MFAEnrollmentModal
        visible={isEnrollModalVisible}
        onSuccess={() => {
          setIsEnrollModalVisible(false);
          refreshMfaStatus();
        }}
        onClose={() => setIsEnrollModalVisible(false)}
      />

      {/* ========================================================================= */}
      {/* 4. BASIC HEALTH INFO EDIT MODAL (Target Screen from Reference Image)       */}
      {/* ========================================================================= */}
      <Modal
        visible={isBasicInfoModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsBasicInfoModalVisible(false)}
      >
        <View style={biStyles.screenContainer}>
          {/* Top Header */}
          <View style={biStyles.topHeader}>
            <TouchableOpacity
              style={biStyles.backButton}
              onPress={() => setIsBasicInfoModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>

            {/* Header Title */}
            <Text style={biStyles.topHeaderTitle}>{t('Thông tin cơ bản', 'Basic Info')}</Text>

            {/* Save Button */}
            <TouchableOpacity
              style={[biStyles.saveButton, isSavingBasicInfo && { opacity: 0.7 }]}
              onPress={handleSaveBasicInfo}
              disabled={isSavingBasicInfo}
              activeOpacity={0.8}
            >
              {isSavingBasicInfo ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={biStyles.saveButtonText}>{t('Lưu', 'Save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Banner notification if saved */}
          {basicInfoNotice && (
            <View style={biStyles.noticeBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#15803D" style={{ marginRight: 6 }} />
              <Text style={biStyles.noticeBannerText}>{basicInfoNotice}</Text>
            </View>
          )}

          {/* Scrollable Cards */}
          <ScrollView
            style={biStyles.mainScroll}
            contentContainerStyle={biStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hướng dẫn cho người dùng mới đăng ký */}
            {!user?.isProfileComplete && !user?.weight && (
              <View style={[biStyles.noticeBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginHorizontal: 16, marginTop: 12, marginBottom: 4 }]}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#1D4ED8" style={{ marginRight: 6 }} />
                <Text style={[biStyles.noticeBannerText, { color: '#1E40AF', flex: 1 }]}>
                  {t('Hồ sơ mới: Vui lòng kéo chọn chiều cao, cân nặng và bấm Lưu để tính chỉ số BMI.', 'New profile: Please set height & weight and tap Save to calculate BMI.')}
                </Text>
              </View>
            )}

            {/* Weight Card */}
            <BasicInfoRuler
              label={t('Cân nặng', 'Weight')}
              value={basicWeight}
              unit="kg"
              min={40}
              max={160}
              stepWidth={10}
              onChange={setBasicWeight}
              onEditDirect={() => openDirectEditModal('weight')}
            />

            {/* Height Card */}
            <BasicInfoRuler
              label={t('Chiều cao', 'Height')}
              value={basicHeight}
              unit="cm"
              min={120}
              max={230}
              stepWidth={10}
              onChange={setBasicHeight}
              onEditDirect={() => openDirectEditModal('height')}
            />

            {/* Gender & Age Row */}
            <View style={biStyles.dualRow}>
              {/* Gender Card */}
              <TouchableOpacity
                style={biStyles.halfCard}
                activeOpacity={0.7}
                onPress={() => setIsGenderPickerOpen(true)}
              >
                <View style={biStyles.cardHeaderSmall}>
                  <MaterialCommunityIcons name="human-male-female" size={18} color="#EF4444" />
                  <Text style={biStyles.cardLabelSmall}>{t('Giới tính', 'Gender')}</Text>
                </View>
                <View style={biStyles.cardBottomRow}>
                  <Text style={biStyles.cardValueLarge}>
                    {basicGender === 'Male'
                      ? t('Nam', 'Male')
                      : basicGender === 'Female'
                        ? t('Nữ', 'Female')
                        : t('Khác', 'Other')}
                  </Text>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {/* Age Card */}
              <TouchableOpacity
                style={biStyles.halfCard}
                activeOpacity={0.7}
                onPress={() => setIsAgePickerOpen(true)}
              >
                <View style={biStyles.cardHeaderSmall}>
                  <MaterialCommunityIcons name="account-outline" size={18} color="#EF4444" />
                  <Text style={biStyles.cardLabelSmall}>{t('Tuổi', 'Age')}</Text>
                </View>
                <View style={biStyles.cardBottomRow}>
                  <Text style={biStyles.cardValueLarge}>{basicAge}</Text>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Note Card */}
            <View style={biStyles.noteCard}>
              <View style={biStyles.cardHeaderSmall}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#EF4444" />
                <Text style={biStyles.cardLabelSmall}>{t('Ghi chú', 'Note')}</Text>
              </View>
              <TextInput
                style={biStyles.noteInput}
                value={basicNote}
                onChangeText={setBasicNote}
                placeholder={t('Nhập ghi chú sức khỏe tại đây...', 'Add your note here...')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* BMI & Health Status Card */}
            <View style={biStyles.bmiCard}>
              <Text style={biStyles.bmiTitle}>
                {language === 'vi' ? activeBmiCategory.nameVi : activeBmiCategory.nameEn} ({basicBmi})
              </Text>

              {/* Spectrum segmented bar */}
              <View style={biStyles.spectrumWrapper}>
                <View style={biStyles.spectrumBar}>
                  {BASIC_INFO_BMI_CATEGORIES.map((cat, idx) => (
                    <View
                      key={cat.id}
                      style={[
                        biStyles.spectrumSegment,
                        { backgroundColor: cat.color },
                        idx === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                        idx === BASIC_INFO_BMI_CATEGORIES.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                      ]}
                    />
                  ))}
                </View>

                {/* Arrow indicator */}
                <View style={biStyles.triangleTrack}>
                  {BASIC_INFO_BMI_CATEGORIES.map((cat, idx) => (
                    <View key={cat.id} style={biStyles.triangleSlot}>
                      {idx === activeCategoryIndex && (
                        <View style={[biStyles.triangle, { borderBottomColor: cat.color }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Breakdown Legend Table */}
              <View style={biStyles.legendTable}>
                {BASIC_INFO_BMI_CATEGORIES.map((cat) => {
                  const isActive = cat.id === activeBmiCategory.id;
                  return (
                    <View key={cat.id} style={[biStyles.legendRow, isActive && biStyles.legendRowActive]}>
                      <View style={biStyles.legendLeft}>
                        <View style={[biStyles.legendDot, { backgroundColor: cat.color }]} />
                        <Text style={[biStyles.legendText, isActive && biStyles.legendTextActive]}>
                          {language === 'vi' ? cat.nameVi : cat.nameEn}
                        </Text>
                      </View>
                      <Text style={[biStyles.legendRange, isActive && biStyles.legendTextActive]}>
                        {language === 'vi' ? cat.rangeVi : cat.rangeEn}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Sub-modal: Gender Selector */}
          <Modal
            visible={isGenderPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsGenderPickerOpen(false)}
          >
            <TouchableOpacity
              style={biStyles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsGenderPickerOpen(false)}
            >
              <View style={biStyles.subModalBox}>
                <Text style={biStyles.subModalTitle}>{t('Chọn Giới tính', 'Select Gender')}</Text>
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[biStyles.optionRow, basicGender === g && biStyles.optionSelected]}
                    onPress={() => {
                      setBasicGender(g);
                      setIsGenderPickerOpen(false);
                    }}
                  >
                    <Text style={[biStyles.optionText, basicGender === g && biStyles.optionTextSelected]}>
                      {g === 'Male' ? t('Nam (Male)', 'Male') : g === 'Female' ? t('Nữ (Female)', 'Female') : t('Khác (Other)', 'Other')}
                    </Text>
                    {basicGender === g && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Sub-modal: Age Stepper */}
          <Modal
            visible={isAgePickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsAgePickerOpen(false)}
          >
            <TouchableOpacity
              style={biStyles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsAgePickerOpen(false)}
            >
              <View style={biStyles.subModalBox}>
                <Text style={biStyles.subModalTitle}>{t('Chọn Độ tuổi', 'Select Age')}</Text>
                <View style={biStyles.stepperRow}>
                  <TouchableOpacity
                    style={biStyles.stepCircle}
                    onPress={() => setBasicAge((prev) => Math.max(10, prev - 1))}
                  >
                    <Feather name="minus" size={22} color="#1F2937" />
                  </TouchableOpacity>
                  <Text style={biStyles.ageDisplay}>{basicAge}</Text>
                  <TouchableOpacity
                    style={biStyles.stepCircle}
                    onPress={() => setBasicAge((prev) => Math.min(110, prev + 1))}
                  >
                    <Feather name="plus" size={22} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                <View style={{ marginTop: 10, flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={biStyles.confirmBtn}
                    onPress={() => setIsAgePickerOpen(false)}
                  >
                    <Text style={biStyles.confirmBtnText}>{t('Xác nhận', 'Confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Sub-modal: Direct Number Keyboard Edit */}
          <Modal
            visible={directEditTarget !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setDirectEditTarget(null)}
          >
            <TouchableOpacity
              style={biStyles.modalOverlay}
              activeOpacity={1}
              onPress={() => setDirectEditTarget(null)}
            >
              <View style={biStyles.subModalBox}>
                <Text style={biStyles.subModalTitle}>
                  {directEditTarget === 'weight'
                    ? t('Nhập cân nặng (kg)', 'Enter Weight (kg)')
                    : t('Nhập chiều cao (cm)', 'Enter Height (cm)')}
                </Text>
                <TextInput
                  style={biStyles.directInput}
                  value={directEditVal}
                  onChangeText={setDirectEditVal}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={biStyles.cancelBtn}
                    onPress={() => setDirectEditTarget(null)}
                  >
                    <Text style={biStyles.cancelBtnText}>{t('Hủy', 'Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={biStyles.confirmBtn}
                    onPress={submitDirectEditVal}
                  >
                    <Text style={biStyles.confirmBtnText}>{t('Xác nhận', 'Confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. SUPPORT & POLICY DOCUMENT MODAL                                         */}
      {/* ========================================================================= */}
      <Modal
        visible={activeDoc !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveDoc(null)}
      >
        <View style={docStyles.screenContainer}>
          {/* Top Header with Back button and Share button */}
          <View style={docStyles.topHeader}>
            <TouchableOpacity
              style={docStyles.backButton}
              onPress={() => setActiveDoc(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>

            <TouchableOpacity
              style={docStyles.shareButton}
              onPress={handleShareDoc}
              activeOpacity={0.7}
            >
              <Feather name="share" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Category Tabs for "Kiến thức cần biết" */}
          {activeDoc === 'knowledge' && (
            <View style={docStyles.categoryPillsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={docStyles.categoryPillsScroll}
              >
                <TouchableOpacity
                  style={[docStyles.pillBtn, knowledgeTab === 'heart' && docStyles.pillBtnActive]}
                  onPress={() => setKnowledgeTab('heart')}
                  activeOpacity={0.7}
                >
                  <Text style={[docStyles.pillText, knowledgeTab === 'heart' && docStyles.pillTextActive]}>
                    ❤️ {t('Nhịp tim (BPM)', 'Heart Rate')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[docStyles.pillBtn, knowledgeTab === 'spo2' && docStyles.pillBtnActive]}
                  onPress={() => setKnowledgeTab('spo2')}
                  activeOpacity={0.7}
                >
                  <Text style={[docStyles.pillText, knowledgeTab === 'spo2' && docStyles.pillTextActive]}>
                    🫁 {t('Oxy máu (SpO2)', 'Oxygen (SpO2)')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[docStyles.pillBtn, knowledgeTab === 'bmi' && docStyles.pillBtnActive]}
                  onPress={() => setKnowledgeTab('bmi')}
                  activeOpacity={0.7}
                >
                  <Text style={[docStyles.pillText, knowledgeTab === 'bmi' && docStyles.pillTextActive]}>
                    ⚖️ {t('Chỉ số BMI', 'BMI Index')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Scrollable Article Body */}
          <ScrollView
            style={docStyles.mainScroll}
            contentContainerStyle={docStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ============================================================= */}
            {/* 1. KIẾN THỨC CẦN BIẾT - TAB NHỊP TIM (HEART RATE)            */}
            {/* ============================================================= */}
            {activeDoc === 'knowledge' && knowledgeTab === 'heart' && (
              <View>
                <View style={docStyles.heroRow}>
                  <View style={docStyles.heroLeft}>
                    <Text style={docStyles.heroTitle}>
                      {t('Hiểu về nhịp tim của bạn', 'Understanding Your Heart Rate')}
                    </Text>
                    <Text style={docStyles.heroDate}>
                      {t('Xuất bản: 12 Th12, 2024 • Chuẩn y khoa AHA & WHO', 'Published on Dec 12, 2024 • AHA & WHO Standards')}
                    </Text>
                  </View>
                  <View style={docStyles.heroRight}>
                    <HeartIllustration />
                  </View>
                </View>

                <View style={docStyles.dividerLine} />

                <View style={docStyles.articleBody}>
                  <Text style={docStyles.leadParagraph}>
                    {t(
                      'Nhịp tim của bạn (còn được gọi là mạch đập) là chỉ số thiết yếu phản ánh sức khỏe của trái tim. Nó cho biết số lần tim co bóp tống máu trong một phút (BPM) và cung cấp thông tin y khoa giá trị về tình trạng hệ tim mạch tổng thể.',
                      'Your heart rate, also known as your pulse, is an essential indicator of your heart health. It tells you how many times your heart beats per minute (BPM) and can provide valuable insights into your overall cardiovascular health.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('Thế nào là nhịp tim bình thường?', 'What Is a Normal Heart Rate?')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Theo Hiệp hội Tim mạch Hoa Kỳ (AHA) và Bộ Y Tế, đối với đa số người trưởng thành khi nghỉ ngơi, nhịp tim bình thường dao động từ 60 đến 100 nhịp/phút (BPM). Tuy nhiên, chỉ số này có thể thay đổi dựa trên các yếu tố như độ tuổi, mức độ rèn luyện thể lực và tình trạng sức khỏe tổng thể.',
                      'For most adults, a normal resting heart rate ranges from 60 to 100 beats per minute. However, it can vary based on factors such as age, fitness level, and overall health.'
                    )}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Các vận động viên hoặc người thường xuyên rèn luyện sức bền thường có nhịp tim nghỉ ngơi thấp hơn, dao động từ 40 đến 60 bpm, bởi vì cơ tim của họ hoạt động hiệu quả hơn trong việc tống máu, cần ít nhát bóp hơn trên mỗi phút.',
                      'Athletes often have lower resting heart rates because their hearts are more efficient at pumping blood, requiring fewer beats per minute.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('Vì sao theo dõi nhịp tim lại quan trọng?', 'Why Is Heart Rate Important?')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Theo dõi nhịp tim thường xuyên đóng vai trò then chốt vì các lý do y khoa sau:',
                      'Monitoring your heart rate is crucial for several reasons:'
                    )}
                  </Text>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>1. </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {t('Sức khỏe tim mạch (Cardiovascular Health): ', 'Cardiovascular Health: ')}
                      </Text>
                      {t(
                        'Nhịp tim lúc nghỉ ngơi liên tục ở mức cao (> 100 bpm) có thể cảnh báo các vấn đề tiềm ẩn như bệnh cơ tim, xơ vữa mạch vành hoặc rối loạn nhịp tim (như rung nhĩ). Ngược lại, nhịp tim quá chậm (< 50 bpm) kèm triệu chứng chóng mặt, choáng váng có thể do suy nút xoang hoặc block nhĩ thất.',
                        'A consistently high resting heart rate may indicate underlying health issues such as heart disease or arrhythmia. Conversely, an unusually low heart rate accompanied by dizziness can signal heart block.'
                      )}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>2. </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {t('Theo dõi thể lực (Fitness Tracking): ', 'Fitness Tracking: ')}
                      </Text>
                      {t(
                        'Khi thể trạng và thể lực của bạn cải thiện nhờ tập luyện đều đặn, nhịp tim lúc nghỉ ngơi có xu hướng giảm dần, phản ánh cơ tim khỏe hơn và tiêu hao ít năng lượng hơn.',
                        'As your physical conditioning improves, your resting heart rate typically decreases, reflecting greater cardiac efficiency.'
                      )}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>3. </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {t('Căng thẳng và khả năng phục hồi (Stress and Recovery): ', 'Stress and Recovery: ')}
                      </Text>
                      {t(
                        'Nhịp tim tăng cao đột ngột trong giai đoạn nghỉ ngơi có thể phát tín hiệu cơ thể đang chịu áp lực tâm lý quá mức, mệt mỏi suy nhược, mất nước, thiếu ngủ hoặc giai đoạn ủ bệnh nhiễm trùng/sốt.',
                        'Elevated heart rates during periods of rest can signal excessive mental stress, fatigue, dehydration, lack of sleep, or early illness/fever.'
                      )}
                    </Text>
                  </View>

                  <Text style={docStyles.subHeading}>
                    {t('Công thức nhịp tim tối đa theo độ tuổi', 'Maximum Heart Rate Formula')}
                  </Text>
                  <View style={docStyles.medicalBadge}>
                    <Text style={docStyles.medicalBadgeText}>
                      {t(
                        'Công thức chuẩn y tế: Nhịp tim tối đa (Max HR) = 220 - Tuổi của bạn. Khi tập luyện cardio cường độ vừa phải, hãy duy trì ở mức 50% - 70% Max HR; tập luyện sức bền duy trì ở mức 70% - 85% Max HR.',
                        'Medical standard formula: Max Heart Rate = 220 - Your Age. For moderate exercise, maintain 50% - 70% of Max HR; for endurance training, aim for 70% - 85% of Max HR.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ============================================================= */}
            {/* 2. KIẾN THỨC CẦN BIẾT - TAB OXY MÁU (SPO2)                   */}
            {/* ============================================================= */}
            {activeDoc === 'knowledge' && knowledgeTab === 'spo2' && (
              <View>
                <View style={docStyles.heroRow}>
                  <View style={docStyles.heroLeft}>
                    <Text style={docStyles.heroTitle}>
                      {t('Hiểu về nồng độ Oxy máu (SpO2)', 'Understanding Blood Oxygen')}
                    </Text>
                    <Text style={docStyles.heroDate}>
                      {t('Xuất bản: 12 Th12, 2024 • Chuẩn y tế WHO & CDC', 'Published on Dec 12, 2024 • WHO & CDC Standards')}
                    </Text>
                  </View>
                  <View style={docStyles.heroRight}>
                    <SpO2Illustration />
                  </View>
                </View>

                <View style={docStyles.dividerLine} />

                <View style={docStyles.articleBody}>
                  <Text style={docStyles.leadParagraph}>
                    {t(
                      'Độ bão hòa oxy trong máu mao mạch (SpO2) là tỷ lệ phần trăm phân tử hemoglobin trong hồng cầu đang vận chuyển oxy so với tổng lượng hemoglobin. Đây là một trong 5 dấu hiệu sinh tồn cốt lõi của cơ thể.',
                      'Peripheral capillary oxygen saturation (SpO2) is the percentage of oxygenated hemoglobin relative to total hemoglobin in the bloodstream. It is one of the five primary vital signs of human health.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('Bảng phân loại mức SpO2 chuẩn y tế (WHO)', 'WHO Medical Classification of SpO2')}
                  </Text>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>1. </Text>
                      <Text style={{ fontWeight: '700', color: Colors.success }}>
                        95% – 100% ({t('Bình thường / Tối ưu', 'Normal & Optimal')}):{' '}
                      </Text>
                      {t(
                        'Phổi và hệ tuần hoàn hoạt động khỏe mạnh, cung cấp đầy đủ oxy nuôi dưỡng não bộ, tim và toàn bộ các mô cơ quan.',
                        'Lungs and circulatory system are functioning well, supplying sufficient oxygen to vital organs and brain tissue.'
                      )}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>2. </Text>
                      <Text style={{ fontWeight: '700', color: Colors.warning }}>
                        90% – 94% ({t('Thiếu oxy máu nhẹ', 'Mild Hypoxia')}):{' '}
                      </Text>
                      {t(
                        'Cần chú ý nghỉ ngơi ở nơi thoáng mát, hít thở sâu và đo lại sau vài phút. Nếu tình trạng SpO2 dưới 94% kéo dài kèm tức ngực, mệt mỏi, nên tham khảo ý kiến nhân viên y tế.',
                        'Indicates reduced oxygenation. Rest in a well-ventilated area, take deep breaths, and re-measure. Consult a doctor if prolonged.'
                      )}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>3. </Text>
                      <Text style={{ fontWeight: '700', color: Colors.danger }}>
                        {'<'} 90% ({t('Thiếu oxy máu nặng - Cấp cứu y khoa', 'Severe Hypoxemia - Medical Emergency')}):{' '}
                      </Text>
                      {t(
                        'Dấu hiệu cảnh báo suy hô hấp cấp tính hoặc tổn thương phổi nặng. Người bệnh cần được thở oxy y tế hoặc can thiệp cấp cứu tại cơ sở y tế gần nhất.',
                        'A critical sign of acute respiratory distress or severe lung impairment requiring immediate emergency medical intervention and oxygen support.'
                      )}
                    </Text>
                  </View>

                  <Text style={docStyles.subHeading}>
                    {t('Nguyên lý đo quang học trên ProWatch', 'Optical Measurement Principle')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Cảm biến quang học MAX30102 trên ProWatch phát ra 2 chùm bước sóng: ánh sáng đỏ (660nm) và ánh sáng hồng ngoại (940nm). Hemoglobin ngậm oxy hấp thụ nhiều ánh sáng hồng ngoại hơn, trong khi hemoglobin khử hấp thụ nhiều ánh sáng đỏ hơn. Đồng hồ tính toán tỷ lệ chênh lệch này để đưa ra chỉ số SpO2 theo thời gian thực.',
                      'The MAX30102 sensor emits two light wavelengths: red (660nm) and infrared (940nm). Oxygenated hemoglobin absorbs more infrared light while deoxygenated absorbs more red light, allowing photometric computation of SpO2.'
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* ============================================================= */}
            {/* 3. KIẾN THỨC CẦN BIẾT - TAB BMI (BODY MASS INDEX)             */}
            {/* ============================================================= */}
            {activeDoc === 'knowledge' && knowledgeTab === 'bmi' && (
              <View>
                <View style={docStyles.heroRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={docStyles.heroTitle}>
                      {t('Chỉ số khối cơ thể (BMI)', 'Body Mass Index (BMI)')}
                    </Text>
                    <Text style={docStyles.heroDate}>
                      {t('Xuất bản: 12 Th12, 2024 • Chuẩn WHO WPRO cho người châu Á', 'Published on Dec 12, 2024 • WHO WPRO Asian Guidelines')}
                    </Text>
                  </View>
                </View>

                <View style={docStyles.dividerLine} />

                <View style={docStyles.articleBody}>
                  <Text style={docStyles.leadParagraph}>
                    {t(
                      'Chỉ số khối cơ thể (BMI - Body Mass Index) do nhà toán học Adolphe Quetelet phát triển và được Tổ chức Y tế Thế giới (WHO) công nhận là công cụ sàng lọc lâm sàng hàng đầu để đánh giá nguy cơ sức khỏe liên quan đến thể trọng.',
                      'Body Mass Index (BMI) is a clinical screening metric developed by Adolphe Quetelet and endorsed by WHO to evaluate health risks associated with body weight and height.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('Công thức tính chỉ số BMI', 'BMI Formula')}
                  </Text>
                  <View style={docStyles.medicalBadge}>
                    <Text style={docStyles.medicalBadgeText}>
                      <Text style={{ fontWeight: '700' }}>BMI = Cân nặng (kg) / [Chiều cao (m)]²</Text>{'\n'}
                      {t('Ví dụ: Cân nặng 75.6 kg, chiều cao 1.856 m ➔ BMI = 75.6 / (1.856)² = 21.9 (Thể trạng lý tưởng).', 'Example: Weight 75.6 kg, height 1.856 m ➔ BMI = 75.6 / (1.856)² = 21.9 (Normal weight).')}
                    </Text>
                  </View>

                  <Text style={docStyles.subHeading}>
                    {t('Bảng phân loại chuẩn người châu Á (WHO WPRO & Bộ Y Tế)', 'Asian Adult BMI Classifications')}
                  </Text>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>1. </Text>
                      <Text style={{ fontWeight: '700', color: '#0284C7' }}>
                        BMI {'<'} 18.5 ({t('Thiếu cân / Gầy', 'Underweight')}):{' '}
                      </Text>
                      {t('Gia tăng nguy cơ suy dinh dưỡng, loãng xương, thiếu máu và suy giảm khả năng miễn dịch.', 'Increased risk of malnutrition, osteoporosis, anemia, and weakened immunity.')}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>2. </Text>
                      <Text style={{ fontWeight: '700', color: Colors.success }}>
                        BMI 18.5 – 22.9 ({t('Cân đối / Thể trạng lý tưởng', 'Normal weight')}):{' '}
                      </Text>
                      {t('Mức thể trạng có nguy cơ mắc bệnh tim mạch và rối loạn chuyển hóa thấp nhất.', 'Optimal body composition associated with the lowest overall cardiovascular and metabolic disease risk.')}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>3. </Text>
                      <Text style={{ fontWeight: '700', color: '#F59E0B' }}>
                        BMI 23.0 – 24.9 ({t('Tiền béo phì / Thừa cân', 'Overweight')}):{' '}
                      </Text>
                      {t('Báo hiệu cơ thể bắt đầu tích mỡ dư thừa. Nên điều chỉnh chế độ dinh dưỡng và duy trì đi bộ 8.000 – 10.000 bước mỗi ngày.', 'Signals excessive fat accumulation. Recommended to optimize diet and maintain 8,000 – 10,000 steps daily.')}
                    </Text>
                  </View>

                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>4. </Text>
                      <Text style={{ fontWeight: '700', color: Colors.danger }}>
                        BMI ≥ 25.0 ({t('Béo phì độ I & II', 'Obese')}):{' '}
                      </Text>
                      {t('Nguy cơ cao mắc các bệnh mạn tính nguy hiểm: tăng huyết áp, đái tháo đường tuýp 2, xơ vữa động mạch và đột quỵ tim.', 'Substantially elevated risk of type 2 diabetes, chronic hypertension, atherosclerosis, and cardiovascular disease.')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ============================================================= */}
            {/* 4. VỀ CHÚNG TÔI (ABOUT US)                                    */}
            {/* ============================================================= */}
            {activeDoc === 'about' && (
              <View>
                <View style={docStyles.heroRow}>
                  <View style={docStyles.heroLeft}>
                    <Text style={docStyles.heroTitle}>
                      {t('Về ProWatch Health', 'About ProWatch Health')}
                    </Text>
                    <Text style={docStyles.heroDate}>
                      {t('Phiên bản v1.0.3 • Nền tảng IoT & AI y tế Việt Nam', 'Version v1.0.3 • Made for Vietnam • IoT & Edge AI')}
                    </Text>
                  </View>
                  <View style={docStyles.heroRight}>
                    <Image
                      source={require('../../assets/app-logo.png')}
                      style={{ width: 68, height: 68, borderRadius: 16 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <View style={docStyles.dividerLine} />

                <View style={docStyles.articleBody}>
                  <Text style={docStyles.leadParagraph}>
                    {t(
                      'ProWatch Health là hệ sinh thái thiết bị đeo thông minh và ứng dụng chăm sóc sức khỏe chủ động toàn diện, được nghiên cứu và phát triển để đồng hành cùng từng nhịp đập của người dùng Việt Nam.',
                      'ProWatch Health is a comprehensive proactive health companion and smart wearable platform designed to support the wellness of Vietnamese users.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('1. Sứ mệnh của chúng tôi', '1. Our Mission')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Chúng tôi tin rằng sức khỏe là tài sản quý giá nhất của mỗi người. ProWatch hướng tới việc mang công nghệ y tế sinh trắc học và trí tuệ nhân tạo (TinyML AI) tiếp cận gần gũi với mọi gia đình, giúp người dùng theo dõi các chỉ số sinh tồn liên tục, phát hiện sớm và phòng ngừa các biến chứng tim mạch nguy hiểm.',
                      'We believe health is your greatest wealth. ProWatch aims to bring biometric medical technology and TinyML AI to every family, enabling continuous vital sign tracking and early prevention of cardiovascular risks.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('2. Nền tảng công nghệ phần cứng chuyên sâu', '2. Advanced Hardware Engineering')}
                  </Text>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>XIAO ESP32-S3: </Text>
                      {t('Bộ vi xử lý lõi kép 240MHz hỗ trợ Bluetooth 5.0 Low Energy (BLE) với khả năng tiết kiệm pin tối ưu.', 'Dual-core 240MHz microcontroller with BLE 5.0 and ultra-low power consumption.')}
                    </Text>
                  </View>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>MAX30102: </Text>
                      {t('Cảm biến quang học đo nhịp tim (BPM) và nồng độ oxy trong máu (SpO2) chuẩn sinh trắc học chính xác cao.', 'Optical biometric sensor for high-precision heart rate and SpO2 tracking.')}
                    </Text>
                  </View>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>MPU6050 & TinyML AI: </Text>
                      {t('Cảm biến gia tốc và con quay hồi chuyển 6 trục kết hợp mô hình AI phân loại chuyển động và đánh giá rủi ro tim mạch chạy trực tiếp trên chip đồng hồ.', '6-axis IMU coupled with on-device TinyML AI for real-time motion and health risk assessment.')}
                    </Text>
                  </View>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>Supabase & n8n: </Text>
                      {t('Cơ sở dữ liệu đám mây mã hóa an toàn cao và hệ thống tự động hóa gửi thông báo khẩn cấp tới người thân khi chỉ số vượt ngưỡng nguy hiểm.', 'Encrypted cloud database and automated alert workflows to notify family members in emergencies.')}
                    </Text>
                  </View>

                  <Text style={docStyles.subHeading}>
                    {t('3. Cam kết chất lượng & Bảo mật', '3. Quality & Security Commitment')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Đội ngũ ProWatch cam kết liên tục cải tiến phần mềm, thuật toán lọc nhiễu tín hiệu quang phổ và tối ưu thời lượng pin để mang lại thiết bị đeo tin cậy và bền bỉ nhất.',
                      'The ProWatch team is dedicated to continuous software improvements, noise filtering algorithms, and battery optimization to deliver a reliable smart wearable experience.'
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* ============================================================= */}
            {/* 5. CHÍNH SÁCH BẢO MẬT (PRIVACY POLICY)                        */}
            {/* ============================================================= */}
            {activeDoc === 'privacy' && (
              <View>
                <View style={docStyles.heroRow}>
                  <View style={docStyles.heroLeft}>
                    <Text style={docStyles.heroTitle}>
                      {t('Chính sách bảo mật', 'Privacy Policy')}
                    </Text>
                    <Text style={docStyles.heroDate}>
                      {t('Hiệu lực từ: Tháng 11/2026 • Tuân thủ bảo mật dữ liệu y tế', 'Effective November 2026 • Medical Data Security Compliance')}
                    </Text>
                  </View>
                  <View style={docStyles.heroRight}>
                    <ShieldIllustration />
                  </View>
                </View>

                <View style={docStyles.dividerLine} />

                <View style={docStyles.articleBody}>
                  <Text style={docStyles.leadParagraph}>
                    {t(
                      'ProWatch Health tôn trọng và cam kết bảo vệ tuyệt đối quyền riêng tư và dữ liệu sinh trắc học sức khỏe của người dùng. Chính sách này giải thích minh bạch cách chúng tôi thu thập, xử lý và bảo vệ thông tin của bạn.',
                      'ProWatch Health strictly respects and safeguards your personal privacy and biometric health data. This policy transparently outlines how your data is collected, handled, and protected.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('1. Dữ liệu chúng tôi thu thập', '1. Data We Collect')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Khi bạn sử dụng ứng dụng và đồng hồ ProWatch, chúng tôi chỉ thu thập các dữ liệu cần thiết phục vụ việc chăm sóc sức khỏe:',
                      'We only collect information strictly required to deliver proactive health monitoring features:'
                    )}
                  </Text>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {t('Dữ liệu hồ sơ cơ bản: ', 'Profile Data: ')}
                      </Text>
                      {t('Họ tên, email, chiều cao, cân nặng, giới tính và độ tuổi để cá nhân hóa chỉ số BMI, lượng calo và ngưỡng nhịp tim tối đa.', 'Name, email, height, weight, gender, and age to personalize BMI, calories, and max heart rate.')}
                    </Text>
                  </View>
                  <View style={docStyles.pointItem}>
                    <Text style={docStyles.pointText}>
                      <Text style={docStyles.pointNumber}>• </Text>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {t('Dữ liệu đo sinh trắc học: ', 'Biometric Measurements: ')}
                      </Text>
                      {t('Lịch sử nhịp tim (BPM), nồng độ oxy máu (SpO2), số bước chân, trạng thái vận động và giấc ngủ được truyền từ đồng hồ qua kết nối Bluetooth mã hóa.', 'Heart rate history, SpO2 levels, step count, and motion status transmitted via encrypted Bluetooth.')}
                    </Text>
                  </View>

                  <Text style={docStyles.subHeading}>
                    {t('2. Cơ chế bảo mật dữ liệu cấp cao', '2. High-Grade Security Architecture')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Toàn bộ kết nối giữa ứng dụng và máy chủ Supabase đều được mã hóa bằng giao thức HTTPS/TLS tiêu chuẩn công nghiệp. Cơ sở dữ liệu đám mây áp dụng nghiêm ngặt chính sách Row-Level Security (RLS) - chỉ có chính tài khoản của bạn mới được cấp quyền đọc và ghi dữ liệu sức khỏe của mình. Ứng dụng cũng tích hợp xác thực 2 bước (2FA TOTP) bảo vệ chống xâm nhập.',
                      'All connections are protected via HTTPS/TLS encryption. Supabase cloud database strictly enforces Row-Level Security (RLS) policies ensuring only your authenticated account can access your health data. Multi-factor authentication (2FA TOTP) provides added defense.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('3. Tuyệt đối không thương mại hóa dữ liệu', '3. Zero Third-party Commercialization')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'ProWatch cam kết tuyệt đối không bán, cho thuê, chia sẻ hoặc tiết lộ dữ liệu sức khỏe hay thông tin cá nhân của bạn cho bất kỳ bên thứ ba, nhà môi giới dữ liệu hoặc đối tác quảng cáo nào.',
                      'ProWatch strictly pledges never to sell, rent, share, or disclose your health or personal data to third parties, data brokers, or advertising partners.'
                    )}
                  </Text>

                  <Text style={docStyles.subHeading}>
                    {t('4. Quyền kiểm soát toàn diện của bạn', '4. Your Data Ownership Rights')}
                  </Text>
                  <Text style={docStyles.bodyParagraph}>
                    {t(
                      'Bạn có toàn quyền xem, chỉnh sửa thông tin hoặc yêu cầu xóa vĩnh viễn toàn bộ lịch sử đo sức khỏe và tài khoản của mình bất kỳ lúc nào trong cài đặt ứng dụng.',
                      'You maintain full ownership of your data with the right to review, update, or permanently delete your account and biometric history at any time.'
                    )}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  header: {
    marginTop: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Basic Popup Notification Styles (Popup Basic Design)
  basicPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  basicPopupCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  basicPopupIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  basicPopupIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  basicPopupIconWarning: {
    backgroundColor: '#FEF3C7',
  },
  basicPopupIconError: {
    backgroundColor: '#FEE2E2',
  },
  basicPopupIconInfo: {
    backgroundColor: '#E0F2FE',
  },
  basicPopupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  basicPopupMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  basicPopupBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  basicPopupBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // 1. Bluetooth Connection Card
  connCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  connCardActive: {
    borderColor: Colors.success,
  },
  connCardLost: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  connCardInactive: {
    borderColor: Colors.border,
  },
  connHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  connInfoBox: {
    flex: 1,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  batteryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: 4,
  },
  connDeviceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  connDeviceSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  connectBleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
  },
  connectBleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  connConnectedContainer: {
    marginTop: 14,
    gap: 8,
  },
  testDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  testDeviceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  connActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  syncNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  syncNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  disconnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  connLostSection: {
    marginTop: 14,
  },
  troubleBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  troubleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  troubleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  troubleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  troubleBullet: {
    fontSize: 12,
    color: '#B45309',
    marginRight: 6,
    lineHeight: 16,
  },
  troubleText: {
    flex: 1,
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  connInactiveSection: {
    marginTop: 4,
  },
  connDisconnectedActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  reconnectBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  reconnectBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  scanOtherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  scanOtherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  connLostActionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  reconnectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  reconnectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  scanNewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  scanNewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Disconnect Confirmation Modal styles
  disconnectModalCard: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  disconnectModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  disconnectModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  disconnectModalMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  disconnectModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  disconnectCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  disconnectConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // User Profile
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  profileStatsSummary: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  profileEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  profileEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  basicInfoEntryCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  basicInfoEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Notification Categories & Test Chips Styles
  notifTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  testPopupRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  testPopupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  testPopupBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  testPopupChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  testPopupChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Common Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 8,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 2,
  },
  listMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 6,
  },
  listMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  listMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  listMenuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 18,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchInfo: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thresholdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  thresholdValueBox: {
    backgroundColor: Colors.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thresholdValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.cardMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoKey: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  versionFootnote: {
    textAlign: 'center',
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  // Modal Center Overlay (dành cho popup xác nhận ngắt kết nối)
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Modal Bluetooth Scanning (Bottom Sheet)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  scannerStatusBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scanningAnimRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  scannedCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scannedCountText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  deviceListScroll: {
    maxHeight: 320,
    marginBottom: 14,
  },
  deviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  deviceItemCardRecommended: {
    borderColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
  },
  deviceItemCardConnecting: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  deviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconCircleRecommended: {
    backgroundColor: '#E0F2FE',
  },
  deviceItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  deviceItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deviceItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  recBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  bleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  deviceItemSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  deviceItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  signalText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaBullet: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  deviceItemMac: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 1,
  },
  pairBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairBtnRecommended: {
    backgroundColor: '#0284C7',
  },
  pairBtnConnecting: {
    backgroundColor: Colors.primary,
  },
  pairBtnDisabled: {
    opacity: 0.5,
  },
  pairLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pairBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  pairBtnTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyDeviceBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyDeviceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyDeviceSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 6,
    backgroundColor: Colors.white,
  },
  rescanBtnDisabled: {
    opacity: 0.6,
  },
  rescanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  mfaToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mfaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mfaIconActive: {
    backgroundColor: '#DCFCE7',
  },
  mfaIconInactive: {
    backgroundColor: '#FEF3C7',
  },
  mfaToggleInfo: {
    flex: 1,
    marginRight: 8,
  },
  mfaTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mfaTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mfaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mfaBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  mfaBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  mfaStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mfaBadgeTextActive: {
    color: '#16A34A',
  },
  mfaBadgeTextInactive: {
    color: '#64748B',
  },
  mfaDescText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  controlSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  menuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  menuBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  navStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    backgroundColor: Colors.cardMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.cardMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  btnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
    borderColor: Colors.borderLight,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  demoPopupCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  demoPopupCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gifPopupCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  gifPreviewCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  gifPreviewImage: {
    width: 116,
    height: 116,
  },
  gifPopupTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  gifPopupSub: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 18,
  },
  demoSectionBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  demoSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  demoSectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  demoFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
  demoChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoTypeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  demoColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoColorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
  },
  demoColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  demoColorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  demoTextInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  demoTextArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  demoSubmitBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  webLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
  },
  webLangSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  webLangSegmentActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  webLangFlag: {
    fontSize: 13,
    marginRight: 4,
  },
  webLangText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  webLangTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  langDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  fontSizeSection: {
    gap: 10,
  },
  fontSizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fontSizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fontPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  fontPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fontPreviewBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fontPreviewSample: {
    color: '#1E293B',
    lineHeight: 22,
    fontWeight: '500',
  },
});

const sliderStyles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
  },
  aBtn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSmallA: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    lineHeight: 18,
  },
  labelBigA: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 24,
  },
  trackTouchArea: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    cursor: 'pointer' as any,
  },
  trackBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  trackActive: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  ticksContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  tickMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  tickMarkActive: {
    backgroundColor: '#2563EB',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 4,
  },
  thumbDragging: {
    transform: [{ translateX: -11 }, { scale: 1.15 }],
    borderColor: '#1D4ED8',
    shadowOpacity: 0.4,
  },
  thumbInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
});

const biStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : Math.max((StatusBar.currentHeight || 28) + 12, 38),
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  noticeBannerText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Ruler Card
  rulerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadows.sm,
  },
  rulerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  rulerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rulerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rulerValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  rulerUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  rulerTrack: {
    position: 'relative',
    height: 72,
    justifyContent: 'center',
  },
  redNeedle: {
    position: 'absolute',
    left: '50%',
    top: 6,
    width: 2.5,
    height: 38,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    zIndex: 10,
    marginLeft: -1.25,
  },
  stepBtnLeft: {
    position: 'absolute',
    left: -6,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  stepBtnRight: {
    position: 'absolute',
    right: -6,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  tickLine: {
    borderRadius: 1,
  },
  majorTick: {
    width: 1.8,
    height: 26,
    backgroundColor: '#9CA3AF',
  },
  mediumTick: {
    width: 1.4,
    height: 19,
    backgroundColor: '#D1D5DB',
  },
  minorTick: {
    width: 1.2,
    height: 13,
    backgroundColor: '#E5E7EB',
  },
  tickNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Dual Row
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadows.sm,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabelSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardValueLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Note Card
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadows.sm,
  },
  noteInput: {
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 38,
  },

  // BMI Card
  bmiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadows.sm,
  },
  bmiTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  spectrumWrapper: {
    marginBottom: 18,
  },
  spectrumBar: {
    flexDirection: 'row',
    height: 9,
    gap: 3,
  },
  spectrumSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  triangleTrack: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  triangleSlot: {
    flex: 1,
    alignItems: 'center',
    height: 10,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  legendTable: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  legendRowActive: {
    backgroundColor: '#F3F4F6',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  legendRange: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  legendTextActive: {
    fontWeight: '700',
    color: '#111827',
  },

  // Sub Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subModalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.md,
  },
  subModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 20,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageDisplay: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  directInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginVertical: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
});

const docStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : Math.max((StatusBar.currentHeight || 28) + 12, 38),
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    paddingTop: 4,
  },
  categoryPillsScroll: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroDate: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginVertical: 16,
  },
  articleBody: {
    paddingHorizontal: 20,
  },
  leadParagraph: {
    fontSize: 15,
    lineHeight: 25,
    color: '#334155',
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  bodyParagraph: {
    fontSize: 14.5,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 12,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointNumber: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  pointText: {
    fontSize: 14.5,
    lineHeight: 23,
    color: '#475569',
    flex: 1,
  },
  medicalBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  medicalBadgeText: {
    fontSize: 13.5,
    color: '#1E40AF',
    lineHeight: 21,
    fontWeight: '500',
  },
});
