import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { watchService } from '../services/watchService';

const STORAGE_KEYS = {
  HEALTH_NOTES: '@prowatch_basic_health_notes',
  HEALTH_AGE: '@prowatch_basic_health_age',
};

// =============================================================================
// BMI CLASSIFICATIONS (Matching Reference Screen Exact Breakdown)
// =============================================================================
interface BmiCategory {
  id: string;
  nameVi: string;
  nameEn: string;
  rangeVi: string;
  rangeEn: string;
  color: string;
  minBmi: number;
  maxBmi: number;
}

const BMI_CATEGORIES: BmiCategory[] = [
  {
    id: 'very_severely_underweight',
    nameVi: 'Gầy độ III (Rất nghiêm trọng)',
    nameEn: 'Very severely underweight',
    rangeVi: 'BMI < 16.0',
    rangeEn: 'BMI < 16.0',
    color: '#0284C7', // Dark Blue
    minBmi: 0,
    maxBmi: 15.99,
  },
  {
    id: 'severely_underweight',
    nameVi: 'Gầy độ II (Nghiêm trọng)',
    nameEn: 'Severely underweight',
    rangeVi: 'BMI 16.0 – 16.9',
    rangeEn: 'BMI 16.0 – 16.9',
    color: '#38BDF8', // Sky Blue
    minBmi: 16.0,
    maxBmi: 16.99,
  },
  {
    id: 'underweight',
    nameVi: 'Thiếu cân (Hơi gầy)',
    nameEn: 'Underweight',
    rangeVi: 'BMI 17.0 – 18.4',
    rangeEn: 'BMI 17.0 – 18.4',
    color: '#06B6D4', // Cyan
    minBmi: 17.0,
    maxBmi: 18.49,
  },
  {
    id: 'normal',
    nameVi: 'Bình thường (Thể trạng lý tưởng)',
    nameEn: 'Normal',
    rangeVi: 'BMI 18.5 – 24.9',
    rangeEn: 'BMI 18.5 – 24.9',
    color: '#22C55E', // Green
    minBmi: 18.5,
    maxBmi: 24.99,
  },
  {
    id: 'overweight',
    nameVi: 'Thừa cân (Tiền béo phì)',
    nameEn: 'Overweight',
    rangeVi: 'BMI 25.0 – 29.9',
    rangeEn: 'BMI 25.0 – 29.9',
    color: '#F59E0B', // Amber
    minBmi: 25.0,
    maxBmi: 29.99,
  },
  {
    id: 'obese',
    nameVi: 'Béo phì độ I',
    nameEn: 'Obese',
    rangeVi: 'BMI 30.0 – 34.9',
    rangeEn: 'BMI 30.0 – 34.9',
    color: '#F97316', // Orange
    minBmi: 30.0,
    maxBmi: 34.99,
  },
  {
    id: 'severely_obese',
    nameVi: 'Béo phì độ II & III',
    nameEn: 'Severely obese',
    rangeVi: 'BMI ≥ 35.0',
    rangeEn: 'BMI ≥ 35.0',
    color: '#EF4444', // Red
    minBmi: 35.0,
    maxBmi: 99.0,
  },
];

// =============================================================================
// HORIZONTAL RULER PICKER COMPONENT
// =============================================================================
interface RulerProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  stepWidth?: number; // pixels per unit
  onChange: (val: number) => void;
  onEditDirect?: () => void;
}

const HorizontalRulerPicker: React.FC<RulerProps> = ({
  label,
  value,
  unit,
  min,
  max,
  step = 0.1,
  stepWidth = 10,
  onChange,
  onEditDirect,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  const isUserScrolling = useRef(false);

  const halfWidth = containerWidth / 2;

  // Handle measurement of container
  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  // Scroll to position when value changes externally
  useEffect(() => {
    if (!isUserScrolling.current && containerWidth > 0) {
      const targetX = (value - min) * stepWidth;
      scrollViewRef.current?.scrollTo({ x: targetX, animated: false });
    }
  }, [containerWidth]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isUserScrolling.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    let computedVal = min + offsetX / stepWidth;
    computedVal = Math.max(min, Math.min(max, computedVal));
    const rounded = Math.round(computedVal * 10) / 10;
    if (rounded !== value) {
      onChange(rounded);
    }
  };

  const handleScrollBegin = () => {
    isUserScrolling.current = true;
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrolling.current = false;
    const offsetX = e.nativeEvent.contentOffset.x;
    let computedVal = min + offsetX / stepWidth;
    computedVal = Math.max(min, Math.min(max, computedVal));
    const rounded = Math.round(computedVal * 10) / 10;
    onChange(rounded);
  };

  // Fine-tune step buttons (- and +)
  const adjustValue = (delta: number) => {
    const newVal = Math.max(min, Math.min(max, Math.round((value + delta) * 10) / 10));
    onChange(newVal);
    isUserScrolling.current = false;
    const targetX = (newVal - min) * stepWidth;
    scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
  };

  // Generate tick marks
  const totalUnits = max - min;
  const ticks = useMemo(() => {
    const items: Array<{ unit: number; isMajor: boolean; isMedium: boolean; numberLabel?: number }> = [];
    for (let u = min; u <= max; u += 1) {
      const isMajor = u % 10 === 0;
      const isMedium = !isMajor && u % 5 === 0;
      items.push({
        unit: u,
        isMajor,
        isMedium,
        numberLabel: isMajor ? u : undefined,
      });
    }
    return items;
  }, [min, max]);

  return (
    <View style={styles.rulerCard} onLayout={handleLayout}>
      {/* Top Header of Card */}
      <View style={styles.rulerHeaderRow}>
        <Text style={styles.rulerLabel}>{label}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEditDirect}
          style={styles.rulerValueTouchable}
        >
          <Text style={styles.rulerBigValue}>{value.toFixed(1)}</Text>
          <Text style={styles.rulerUnitText}>{unit}</Text>
          <MaterialCommunityIcons name="pencil-outline" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Interactive Ruler Container */}
      <View style={styles.rulerTrackContainer}>
        {/* Step decrease button */}
        <TouchableOpacity
          style={styles.stepBtnLeft}
          onPress={() => adjustValue(-0.5)}
          activeOpacity={0.6}
        >
          <Feather name="minus" size={16} color="#6B7280" />
        </TouchableOpacity>

        {/* Center Red Indicator Needle */}
        <View style={styles.redNeedle} pointerEvents="none" />

        {/* Scrollable Ruler Scale */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBegin}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          contentContainerStyle={[
            styles.rulerScrollContent,
            { paddingHorizontal: Math.max(0, halfWidth) },
          ]}
        >
          {ticks.map((t) => (
            <View
              key={t.unit}
              style={[
                styles.tickWrapper,
                { width: stepWidth },
              ]}
            >
              <View
                style={[
                  styles.tickLine,
                  t.isMajor
                    ? styles.majorTick
                    : t.isMedium
                    ? styles.mediumTick
                    : styles.minorTick,
                ]}
              />
              {t.numberLabel !== undefined ? (
                <Text style={styles.tickNumberText}>{t.numberLabel}</Text>
              ) : (
                <View style={{ height: 18 }} />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Step increase button */}
        <TouchableOpacity
          style={styles.stepBtnRight}
          onPress={() => adjustValue(+0.5)}
          activeOpacity={0.6}
        >
          <Feather name="plus" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// MAIN SCREEN: BASIC HEALTH INFO SCREEN
// =============================================================================
export const BasicHealthInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, completeProfile } = useAuth();
  const { language, t } = useLanguage();

  // State
  const [weight, setWeight] = useState<number>(user?.weight || 75.6);
  const [height, setHeight] = useState<number>(user?.height || 185.6);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(
    (user?.gender?.toLowerCase() === 'female' || user?.gender?.toLowerCase() === 'nữ')
      ? 'Female'
      : 'Male'
  );
  const [age, setAge] = useState<number>(user?.age || 28);
  const [note, setNote] = useState<string>(user?.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Modals for editing
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [directEditModal, setDirectEditModal] = useState<'weight' | 'height' | null>(null);
  const [directInputValue, setDirectInputValue] = useState('');

  // Load saved notes and age from AsyncStorage on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [savedNote, savedAge] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HEALTH_NOTES),
          AsyncStorage.getItem(STORAGE_KEYS.HEALTH_AGE),
        ]);
        if (savedNote && !note) setNote(savedNote);
        if (savedAge && !user?.age) setAge(parseInt(savedAge, 10) || 28);
      } catch (err) {
        console.warn('Error reading basic health info cache:', err);
      }
    };
    loadCachedData();
  }, []);

  // Compute BMI dynamically: BMI = weight / (height/100)^2
  const bmi = useMemo(() => {
    if (!height || !weight || height <= 0) return 21.9;
    const hInMeters = height / 100;
    return parseFloat((weight / (hInMeters * hInMeters)).toFixed(1));
  }, [weight, height]);

  // Determine BMI category
  const activeBmiCategory = useMemo(() => {
    const found = BMI_CATEGORIES.find(
      (cat) => bmi >= cat.minBmi && bmi <= cat.maxBmi
    );
    return found || BMI_CATEGORIES[3]; // default Normal
  }, [bmi]);

  // Active category index (0 to 6)
  const activeCategoryIndex = useMemo(() => {
    const idx = BMI_CATEGORIES.findIndex((cat) => cat.id === activeBmiCategory.id);
    return idx >= 0 ? idx : 3;
  }, [activeBmiCategory]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save to AuthContext / Supabase
      const dob = user?.dateOfBirth || `01/01/${new Date().getFullYear() - age}`;
      await completeProfile({
        gender: gender === 'Male' ? 'male' : gender === 'Female' ? 'female' : 'other',
        dateOfBirth: dob,
        height: Math.round(height),
        weight: Math.round(weight * 10) / 10,
        notes: note,
        age,
      });

      // 2. Persist to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.HEALTH_NOTES, note),
        AsyncStorage.setItem(STORAGE_KEYS.HEALTH_AGE, String(age)),
      ]);

      // 3. Send profile to watch via BLE for TinyML on-device processing
      watchService.sendUserProfileToWatch(height, weight).catch(() => {});

      setSaveSuccessNotice(t('Đã lưu thông tin sức khỏe thành công!', 'Health info saved successfully!'));
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err: any) {
      Alert.alert(
        t('Lỗi', 'Error'),
        err?.message || t('Không thể lưu thông tin. Vui lòng thử lại.', 'Failed to save health info.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Direct edit prompt handler
  const openDirectEdit = (type: 'weight' | 'height') => {
    setDirectEditModal(type);
    setDirectInputValue(type === 'weight' ? String(weight) : String(height));
  };

  const submitDirectEdit = () => {
    const num = parseFloat(directInputValue.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      if (directEditModal === 'weight') {
        setWeight(Math.min(250, Math.max(30, Math.round(num * 10) / 10)));
      } else if (directEditModal === 'height') {
        setHeight(Math.min(250, Math.max(50, Math.round(num * 10) / 10)));
      }
    }
    setDirectEditModal(null);
  };

  // Formatted date string (matching Dec 22 · 10:54 AM)
  const formattedDateTime = useMemo(() => {
    const now = new Date();
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsVi = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    const m = language === 'vi' ? monthsVi[now.getMonth()] : monthsEn[now.getMonth()];
    const d = now.getDate();
    const hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return language === 'vi'
      ? `${d} ${m} · ${displayHours}:${mins} ${ampm}`
      : `${m} ${d} · ${displayHours}:${mins} ${ampm}`;
  }, [language]);

  return (
    <View style={styles.screenContainer}>
      {/* =================================================================== */}
      {/* 1. TOP HEADER & DATE DROPDOWN                                       */}
      {/* =================================================================== */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        {/* Centered Date Badge (Matching "Dec 22 · 10:54 AM ∨") */}
        <TouchableOpacity
          style={styles.dateBadge}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              t('Thời gian ghi nhận', 'Record Time'),
              t(`Dữ liệu được cập nhật vào ${formattedDateTime}`, `Data recorded at ${formattedDateTime}`)
            );
          }}
        >
          <Text style={styles.dateBadgeText}>{formattedDateTime}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#4B5563" />
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.saveButtonText}>{t('Lưu', 'Save')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Notification Banner */}
      {saveSuccessNotice && (
        <View style={styles.successNotice}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#15803D" style={{ marginRight: 6 }} />
          <Text style={styles.successNoticeText}>{saveSuccessNotice}</Text>
        </View>
      )}

      {/* =================================================================== */}
      {/* MAIN SCROLLABLE CONTENT                                             */}
      {/* =================================================================== */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: WEIGHT (75.6 kg with horizontal ruler) */}
        <HorizontalRulerPicker
          label={t('Cân nặng', 'Weight')}
          value={weight}
          unit="kg"
          min={40}
          max={160}
          stepWidth={10}
          onChange={setWeight}
          onEditDirect={() => openDirectEdit('weight')}
        />

        {/* CARD 2: HEIGHT (185.6 cm with horizontal ruler) */}
        <HorizontalRulerPicker
          label={t('Chiều cao', 'Height')}
          value={height}
          unit="cm"
          min={120}
          max={230}
          stepWidth={10}
          onChange={setHeight}
          onEditDirect={() => openDirectEdit('height')}
        />

        {/* CARD 3 & 4: GENDER & AGE ROW */}
        <View style={styles.dualCardRow}>
          {/* Gender Card */}
          <TouchableOpacity
            style={styles.halfCard}
            activeOpacity={0.7}
            onPress={() => setIsGenderModalOpen(true)}
          >
            <View style={styles.cardHeaderSmall}>
              <MaterialCommunityIcons name="human-male-female" size={18} color="#EF4444" />
              <Text style={styles.cardLabelSmall}>{t('Giới tính', 'Gender')}</Text>
            </View>
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardValueLarge}>
                {gender === 'Male'
                  ? t('Nam', 'Male')
                  : gender === 'Female'
                  ? t('Nữ', 'Female')
                  : t('Khác', 'Other')}
              </Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Age Card */}
          <TouchableOpacity
            style={styles.halfCard}
            activeOpacity={0.7}
            onPress={() => setIsAgeModalOpen(true)}
          >
            <View style={styles.cardHeaderSmall}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#EF4444" />
              <Text style={styles.cardLabelSmall}>{t('Tuổi', 'Age')}</Text>
            </View>
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardValueLarge}>{age}</Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* CARD 5: NOTE */}
        <View style={styles.noteCard}>
          <View style={styles.cardHeaderSmall}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#EF4444" />
            <Text style={styles.cardLabelSmall}>{t('Ghi chú', 'Note')}</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t('Nhập ghi chú sức khỏe tại đây...', 'Add your note here...')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* CARD 6: BMI & HEALTH STATUS CARD (Matching Reference Spectrum Bar & Breakdown) */}
        <View style={styles.bmiCard}>
          {/* Status Headline: e.g. "Normal (21.9)" */}
          <Text style={styles.bmiTitle}>
            {language === 'vi' ? activeBmiCategory.nameVi : activeBmiCategory.nameEn} ({bmi})
          </Text>

          {/* Segmented Color Spectrum Bar */}
          <View style={styles.spectrumBarWrapper}>
            <View style={styles.spectrumBarContainer}>
              {BMI_CATEGORIES.map((cat, idx) => (
                <View
                  key={cat.id}
                  style={[
                    styles.spectrumSegment,
                    { backgroundColor: cat.color },
                    idx === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                    idx === BMI_CATEGORIES.length - 1 && {
                      borderTopRightRadius: 6,
                      borderBottomRightRadius: 6,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Triangle indicator pointing up under the active segment */}
            <View style={styles.triangleTrack}>
              {BMI_CATEGORIES.map((cat, idx) => (
                <View key={cat.id} style={styles.triangleSlot}>
                  {idx === activeCategoryIndex && (
                    <View
                      style={[
                        styles.indicatorTriangle,
                        { borderBottomColor: cat.color },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Classification Breakdown Legend Table */}
          <View style={styles.legendContainer}>
            {BMI_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeBmiCategory.id;
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.legendRow,
                    isActive && styles.legendRowActive,
                  ]}
                >
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.legendLabel,
                        isActive && styles.legendTextActive,
                      ]}
                    >
                      {language === 'vi' ? cat.nameVi : cat.nameEn}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.legendValue,
                      isActive && styles.legendTextActive,
                    ]}
                  >
                    {language === 'vi' ? cat.rangeVi : cat.rangeEn}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =================================================================== */}
      {/* MODAL 1: GENDER SELECTOR                                            */}
      {/* =================================================================== */}
      <Modal
        visible={isGenderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGenderModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsGenderModalOpen(false)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>{t('Chọn Giới tính', 'Select Gender')}</Text>
            {(['Male', 'Female', 'Other'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.pickerOptionRow,
                  gender === g && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setGender(g);
                  setIsGenderModalOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    gender === g && styles.pickerOptionTextSelected,
                  ]}
                >
                  {g === 'Male'
                    ? t('Nam (Male)', 'Male')
                    : g === 'Female'
                    ? t('Nữ (Female)', 'Female')
                    : t('Khác (Other)', 'Other')}
                </Text>
                {gender === g && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 2: AGE STEPPER MODAL                                          */}
      {/* =================================================================== */}
      <Modal
        visible={isAgeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAgeModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsAgeModalOpen(false)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>{t('Chọn Độ tuổi', 'Select Age')}</Text>
            <View style={styles.ageStepperRow}>
              <TouchableOpacity
                style={styles.stepperCircleBtn}
                onPress={() => setAge((prev) => Math.max(10, prev - 1))}
              >
                <Feather name="minus" size={22} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.ageBigDisplay}>{age}</Text>
              <TouchableOpacity
                style={styles.stepperCircleBtn}
                onPress={() => setAge((prev) => Math.min(110, prev + 1))}
              >
                <Feather name="plus" size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setIsAgeModalOpen(false)}
            >
              <Text style={styles.modalConfirmBtnText}>{t('Xác nhận', 'Confirm')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL 3: DIRECT VALUE EDIT (KEYBOARD INPUT)                         */}
      {/* =================================================================== */}
      <Modal
        visible={directEditModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectEditModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDirectEditModal(null)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>
              {directEditModal === 'weight'
                ? t('Nhập cân nặng (kg)', 'Enter Weight (kg)')
                : t('Nhập chiều cao (cm)', 'Enter Height (cm)')}
            </Text>
            <TextInput
              style={styles.directInput}
              value={directInputValue}
              onChangeText={setDirectInputValue}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDirectEditModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>{t('Hủy', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={submitDirectEdit}
              >
                <Text style={styles.modalConfirmBtnText}>{t('Xác nhận', 'Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
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
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  dateBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  successNoticeText: {
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
  rulerHeaderRow: {
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
  rulerValueTouchable: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rulerBigValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  rulerUnitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  rulerTrackContainer: {
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
  rulerScrollContent: {
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  tickWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  tickNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Dual Cards Row
  dualCardRow: {
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
  spectrumBarWrapper: {
    marginBottom: 18,
  },
  spectrumBarContainer: {
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
  indicatorTriangle: {
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

  // Legend
  legendContainer: {
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
  legendLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  legendTextActive: {
    fontWeight: '700',
    color: '#111827',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.md,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  ageStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 20,
  },
  stepperCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageBigDisplay: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  modalConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalConfirmBtnText: {
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
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
});

