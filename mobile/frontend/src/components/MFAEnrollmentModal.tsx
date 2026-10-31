import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Shadows } from '../theme/colors';
import { mfaService, TotpEnrollmentData } from '../services/mfaService';
import { OTPInput } from './OTPInput';
import { cleanAndFormatQrSvg } from '../utils/qrHelper';

interface MFAEnrollmentModalProps {
  visible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const MFAEnrollmentModal: React.FC<MFAEnrollmentModalProps> = ({
  visible,
  onSuccess,
  onClose,
}) => {
  const [enrollData, setEnrollData] = useState<TotpEnrollmentData | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setVerifyCode('');
      setErrorMessage('');
      setIsCopied(false);
      setIsLoadingSetup(true);

      mfaService.startEnrollTotp('ProWatch Health')
        .then((res) => {
          setIsLoadingSetup(false);
          if (res.success && res.data) {
            setEnrollData(res.data);
          } else {
            setErrorMessage(res.message || 'Không thể tạo mã xác thực 2FA.');
          }
        })
        .catch((err) => {
          setIsLoadingSetup(false);
          setErrorMessage(err.message || 'Lỗi kết nối Supabase Auth');
        });
    } else {
      setEnrollData(null);
    }
  }, [visible]);

  const handleCopySecret = async () => {
    if (!enrollData?.secret) return;
    await Clipboard.setStringAsync(enrollData.secret);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenAuthenticator = async () => {
    if (!enrollData?.uri) return;
    try {
      const canOpen = await Linking.canOpenURL(enrollData.uri);
      if (canOpen) {
        await Linking.openURL(enrollData.uri);
      } else {
        await Linking.openURL(enrollData.uri);
      }
    } catch {
      await Clipboard.setStringAsync(enrollData.secret);
      Alert.alert(
        'Đã sao chép khóa bí mật',
        'Thiết bị chưa nhận diện ứng dụng Authenticator. Hãy mở Google / Microsoft Authenticator và chọn "Nhập khóa thiết lập" rồi dán mã vừa copy.'
      );
    }
  };

  const handleVerifyEnrollment = async (overrideCode?: string) => {
    if (!enrollData) return;
    setErrorMessage('');

    const targetCode = (overrideCode || verifyCode).trim().replace(/\s+/g, '');
    if (targetCode.length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ mã 6 số từ ứng dụng Authenticator.');
      return;
    }

    setIsVerifying(true);
    const res = await mfaService.verifyTotp(enrollData.factorId, targetCode);
    setIsVerifying(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMessage(res.message || 'Mã xác thực không hợp lệ. Vui lòng thử lại.');
    }
  };

  const handleCancel = async () => {
    if (enrollData?.factorId) {
      try {
        await mfaService.unenroll(enrollData.factorId);
      } catch (e) {}
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, Shadows.lg]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconBadge}>
              <MaterialCommunityIcons name="shield-check" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Kích hoạt Xác thực 2 bước</Text>
              <Text style={styles.modalSub}>Bảo vệ tài khoản qua Google / Microsoft Authenticator</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isLoadingSetup ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Đang tạo mã bảo mật Supabase 2FA...</Text>
              </View>
            ) : errorMessage && !enrollData ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={40} color={Colors.danger} />
                <Text style={styles.errorTextLarge}>{errorMessage}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
                  <Text style={styles.retryBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : enrollData ? (
              <>
                {/* Step 1: Add to Authenticator */}
                <View style={styles.stepBox}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepTitle}>Liên kết với ứng dụng Authenticator</Text>
                </View>
                <Text style={styles.stepDesc}>
                  Chọn cách thuận tiện nhất cho bạn dưới đây:
                </Text>

                {/* Option A: 1-Tap Open Authenticator app */}
                <TouchableOpacity
                  style={styles.directAppBtn}
                  onPress={handleOpenAuthenticator}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.directAppBtnText}>Mở trực tiếp Authenticator (1 chạm)</Text>
                  <Feather name="arrow-right" size={16} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {/* Option B: Scan QR code */}
                <View style={styles.qrSection}>
                  <Text style={styles.qrSectionLabel}>Hoặc quét mã QR bằng thiết bị khác:</Text>
                  <View style={styles.qrContainer}>
                    {enrollData.qrCodeSvg ? (
                      <View style={styles.qrWhiteBox}>
                        <SvgXml
                          xml={cleanAndFormatQrSvg(enrollData.qrCodeSvg)}
                          width={210}
                          height={210}
                        />
                      </View>
                    ) : (
                      <Text style={styles.qrFallbackText}>Không tải được mã QR</Text>
                    )}
                  </View>
                </View>

                {/* Option C: Secret Key manual copy */}
                <View style={styles.secretBox}>
                  <Text style={styles.secretLabel}>Hoặc nhập khóa bí mật thủ công:</Text>
                  <View style={styles.secretRow}>
                    <Text style={styles.secretText} numberOfLines={1} ellipsizeMode="middle">
                      {enrollData.secret}
                    </Text>
                    <TouchableOpacity
                      style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                      onPress={handleCopySecret}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isCopied ? 'check' : 'copy'}
                        size={15}
                        color={isCopied ? Colors.white : Colors.primary}
                      />
                      <Text
                        style={[
                          styles.copyBtnText,
                          isCopied && { color: Colors.white, fontWeight: '700' },
                        ]}
                      >
                        {isCopied ? 'Đã sao chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Step 2: Confirm with 6-digit code */}
                <View style={[styles.stepBox, { marginTop: 24 }]}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepTitle}>Nhập mã 6 chữ số để xác nhận</Text>
                </View>
                <Text style={styles.stepDesc}>
                  Nhập mã OTP đang hiển thị trên Authenticator (thay đổi mỗi 30 giây):
                </Text>

                {!!errorMessage && (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Centered 6-digit OTP Box */}
                <View style={styles.otpInputWrapper}>
                  <OTPInput
                    value={verifyCode}
                    onChange={(val) => {
                      setVerifyCode(val);
                      if (val.length === 6) setErrorMessage('');
                    }}
                    onComplete={(completedVal) => {
                      setVerifyCode(completedVal);
                      handleVerifyEnrollment(completedVal);
                    }}
                    disabled={isVerifying}
                    autoFocus={false}
                  />
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (verifyCode.length < 6 || isVerifying) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleVerifyEnrollment()}
                  disabled={verifyCode.length < 6 || isVerifying}
                  activeOpacity={0.8}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <View style={styles.btnRow}>
                      <MaterialCommunityIcons name="shield-lock" size={18} color={Colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Xác nhận & Kích hoạt 2FA</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isVerifying}>
                  <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    maxHeight: 560,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorTextLarge: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  retryBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  directAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  directAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  qrSection: {
    marginVertical: 6,
    alignItems: 'center',
  },
  qrSectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWhiteBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  qrFallbackText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  secretBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  secretLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secretText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyBtnSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginLeft: 6,
    flex: 1,
  },
  otpInputWrapper: {
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
