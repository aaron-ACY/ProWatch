import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export const ProfileSetupScreen: React.FC = () => {
  const { user, completeProfile, isLoading } = useAuth();

  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const dobInputRef = useRef<TextInput>(null);
  const heightInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-mask Date of Birth: DD/MM/YYYY
  const handleDobChange = (text: string) => {
    // Chỉ lấy chữ số, tối đa 8 số (DDMMYYYY)
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    setDob(formatted);
    if (errorMessage) setErrorMessage('');
  };

  // Format Height: chỉ cho phép số nguyên (cm), tối đa 3 chữ số (50 - 250)
  const handleHeightChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setHeight(digits);
    if (errorMessage) setErrorMessage('');
  };

  // Format Weight: cho phép số thập phân tối đa 1 chữ số sau dấu chấm (kg)
  const handleWeightChange = (text: string) => {
    let cleaned = text.replace(/,/g, '.');
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned.includes('.')) {
      const [intPart, decPart] = cleaned.split('.');
      cleaned = `${intPart.slice(0, 3)}.${decPart.slice(0, 1)}`;
    } else {
      cleaned = cleaned.slice(0, 3);
    }
    setWeight(cleaned);
    if (errorMessage) setErrorMessage('');
  };

  // Tính toán chỉ số BMI thời gian thực
  const numHeight = parseFloat(height);
  const numWeight = parseFloat(weight);
  let bmiValue: number | null = null;
  let bmiCategory = '';
  let bmiColor = Colors.primary;

  if (numHeight >= 50 && numHeight <= 250 && numWeight >= 20 && numWeight <= 300) {
    const heightInMeters = numHeight / 100;
    bmiValue = parseFloat((numWeight / (heightInMeters * heightInMeters)).toFixed(1));
    if (bmiValue < 18.5) {
      bmiCategory = 'Hơi gầy (Thiếu cân)';
      bmiColor = '#F59E0B'; // Amber
    } else if (bmiValue <= 24.9) {
      bmiCategory = 'Thể trạng Cân đối (Lý tưởng)';
      bmiColor = Colors.success;
    } else if (bmiValue <= 29.9) {
      bmiCategory = 'Hơi thừa cân (Tiền béo phì)';
      bmiColor = '#F97316'; // Orange
    } else {
      bmiCategory = 'Thừa cân (Cần tăng vận động)';
      bmiColor = Colors.danger;
    }
  }

  // Kiểm tra validation ngày sinh chi tiết
  const validateDob = (dateStr: string): string | null => {
    const parts = dateStr.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) {
      return 'Vui lòng nhập ngày sinh theo định dạng DD/MM/YYYY (ví dụ: 15/05/1998)';
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return 'Ngày sinh không hợp lệ';
    }
    if (month < 1 || month > 12) {
      return 'Tháng sinh không hợp lệ (từ 01 đến 12)';
    }
    if (day < 1 || day > 31) {
      return 'Ngày sinh không hợp lệ (từ 01 đến 31)';
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      return `Tháng ${month}/${year} chỉ có tối đa ${daysInMonth} ngày`;
    }
    const currentYear = new Date().getFullYear();
    if (year < 1920 || year > currentYear) {
      return `Năm sinh phải từ năm 1920 đến ${currentYear}`;
    }
    if (currentYear - year < 6) {
      return 'Độ tuổi người dùng phải từ 6 tuổi trở lên';
    }
    return null;
  };

  const handleComplete = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    // 1. Kiểm tra ngày sinh
    if (!dob.trim()) {
      setErrorMessage('Vui lòng nhập ngày tháng năm sinh');
      return;
    }
    const dobError = validateDob(dob.trim());
    if (dobError) {
      setErrorMessage(dobError);
      return;
    }

    // 2. Kiểm tra chiều cao
    if (!height.trim() || isNaN(numHeight)) {
      setErrorMessage('Vui lòng nhập chiều cao của bạn');
      return;
    }
    if (numHeight < 50 || numHeight > 250) {
      setErrorMessage('Chiều cao hợp lệ từ 50 cm đến 250 cm');
      return;
    }

    // 3. Kiểm tra cân nặng
    if (!weight.trim() || isNaN(numWeight)) {
      setErrorMessage('Vui lòng nhập cân nặng của bạn');
      return;
    }
    if (numWeight < 20 || numWeight > 300) {
      setErrorMessage('Cân nặng hợp lệ từ 20 kg đến 300 kg');
      return;
    }

    const res = await completeProfile({
      gender,
      dateOfBirth: dob.trim(),
      height: numHeight,
      weight: numWeight,
    });

    if (!res.success && res.message) {
      setErrorMessage(res.message);
    }
  };

  const FormWrapper = (Platform.OS === 'web' ? View : Pressable) as any;
  const formWrapperProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <FormWrapper {...formWrapperProps}>
          {/* Brand & Step Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Bước cuối cùng</Text>
              </View>
            </View>
            <Text style={styles.title}>Thiết lập hồ sơ sức khỏe</Text>
            <Text style={styles.subtitle}>
              Chào <Text style={styles.userName}>{user?.name || 'bạn'}</Text>! ProWatch cần các thông tin cơ bản để tính toán chính xác nhịp tim mục tiêu, lượng calo đốt cháy và chỉ số thể trạng BMI.
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadows.md]}>
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* 1. Giới tính */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Giới tính sinh học</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    gender === 'male' && styles.genderOptionActive,
                  ]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.65}
                >
                  <Ionicons
                    name="male"
                    size={20}
                    color={gender === 'male' ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'male' && styles.genderTextActive,
                    ]}
                  >
                    Nam
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    gender === 'female' && styles.genderOptionActive,
                  ]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.65}
                >
                  <Ionicons
                    name="female"
                    size={20}
                    color={gender === 'female' ? Colors.white : '#EC4899'}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'female' && styles.genderTextActive,
                    ]}
                  >
                    Nữ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    gender === 'other' && styles.genderOptionActive,
                  ]}
                  onPress={() => setGender('other')}
                  activeOpacity={0.65}
                >
                  <Ionicons
                    name="transgender"
                    size={20}
                    color={gender === 'other' ? Colors.white : Colors.spo2}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'other' && styles.genderTextActive,
                    ]}
                  >
                    Khác
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Ngày sinh với Auto-mask DD/MM/YYYY */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Ngày tháng năm sinh</Text>
                <Text style={styles.fieldHint}>DD/MM/YYYY</Text>
              </View>
              <Pressable
                style={[
                  styles.inputContainer,
                  focusedField === 'dob' && styles.inputContainerFocused,
                ]}
                onPress={() => dobInputRef.current?.focus()}
              >
                <Feather
                  name="calendar"
                  size={19}
                  color={focusedField === 'dob' ? Colors.primary : Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={dobInputRef}
                  style={styles.textInput}
                  placeholder="Ví dụ: 15/05/1998"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={dob}
                  underlineColorAndroid="transparent"
                  selectionColor={Colors.primary}
                  cursorColor={Colors.primary}
                  onFocus={() => setFocusedField('dob')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={handleDobChange}
                />
                {dob.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setDob('')}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </Pressable>
              <Text style={styles.helperText}>Tự động thêm dấu gạch chéo (/) khi nhập số.</Text>
            </View>

            {/* 3. Chiều cao & Cân nặng trên 1 hàng */}
            <View style={styles.measureRow}>
              {/* Chiều cao */}
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Chiều cao</Text>
                </View>
                <Pressable
                  style={[
                    styles.inputContainer,
                    focusedField === 'height' && styles.inputContainerFocused,
                  ]}
                  onPress={() => heightInputRef.current?.focus()}
                >
                  <MaterialCommunityIcons
                    name="human-male-height"
                    size={20}
                    color={focusedField === 'height' ? Colors.primary : Colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={heightInputRef}
                    style={styles.textInput}
                    placeholder="170"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={height}
                    underlineColorAndroid="transparent"
                    selectionColor={Colors.primary}
                    onFocus={() => {
                      setFocusedField('height');
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 180);
                    }}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={handleHeightChange}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>cm</Text>
                  </View>
                </Pressable>
                <Text style={styles.helperText}>50 - 250 cm</Text>
              </View>

              {/* Cân nặng */}
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Cân nặng</Text>
                </View>
                <Pressable
                  style={[
                    styles.inputContainer,
                    focusedField === 'weight' && styles.inputContainerFocused,
                  ]}
                  onPress={() => weightInputRef.current?.focus()}
                >
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={20}
                    color={focusedField === 'weight' ? Colors.primary : Colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={weightInputRef}
                    style={styles.textInput}
                    placeholder="65.0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    value={weight}
                    underlineColorAndroid="transparent"
                    selectionColor={Colors.primary}
                    cursorColor={Colors.primary}
                    onFocus={() => {
                      setFocusedField('weight');
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 180);
                    }}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={handleWeightChange}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>kg</Text>
                  </View>
                </Pressable>
                <Text style={styles.helperText}>20 - 300 kg</Text>
              </View>
            </View>

            {/* Thông tin BMI ước tính tự động */}
            {bmiValue !== null && (
              <View style={[styles.bmiBox, { borderColor: bmiColor, backgroundColor: bmiColor + '10' }]}>
                <View style={styles.bmiHeader}>
                  <View style={styles.bmiTitleRow}>
                    <MaterialCommunityIcons name="heart-pulse" size={18} color={bmiColor} />
                    <Text style={styles.bmiTitle}>Chỉ số BMI ước tính:</Text>
                  </View>
                  <Text style={[styles.bmiScore, { color: bmiColor }]}>{bmiValue}</Text>
                </View>
                <Text style={[styles.bmiStatus, { color: bmiColor }]}>
                  {bmiCategory}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleComplete}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitBtnText}>Hoàn tất & Khám phá ProWatch</Text>
                  <Feather name="arrow-right" size={18} color={Colors.white} style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="shield-lock-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.footerText}>
              Dữ liệu sinh trắc học của bạn được lưu trữ bảo mật trên Supabase.
            </Text>
          </View>
        </FormWrapper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  userName: {
    fontWeight: '700',
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger + '12',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginLeft: 8,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 5,
    marginLeft: 2,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
  },
  genderOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  genderTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          borderStyle: 'none',
        } as any)
      : {}),
  },
  unitBadge: {
    backgroundColor: Colors.border + '60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  bmiBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bmiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  bmiScore: {
    fontSize: 18,
    fontWeight: '800',
  },
  bmiStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 24,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
    textAlign: 'center',
  },
});
