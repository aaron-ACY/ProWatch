import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { OTPInput } from './OTPInput';

interface MFAChallengeModalProps {
  visible: boolean;
  onVerify: (code: string) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

export const MFAChallengeModal: React.FC<MFAChallengeModalProps> = ({
  visible,
  onVerify,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setCode('');
      setErrorMessage('');
    }
  }, [visible]);

  const handleSubmit = async (overrideCode?: string) => {
    Keyboard.dismiss();
    setErrorMessage('');

    const targetCode = (overrideCode || code).trim().replace(/\s+/g, '');
    if (targetCode.length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ mã xác thực 6 chữ số.');
      return;
    }

    setIsLoading(true);
    const result = await onVerify(targetCode);
    setIsLoading(false);

    if (!result.success && result.message) {
      setErrorMessage(result.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, Shadows.lg]}>
          {/* Header Shield Icon */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-key" size={36} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Xác thực 2 bước (2FA)</Text>
          <Text style={styles.subtitle}>
            Tài khoản của bạn được bảo vệ 2 lớp. Mở ứng dụng <Text style={styles.boldText}>Authenticator</Text> và nhập mã 6 số bên dưới:
          </Text>

          {/* Error Message */}
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Centered 6-Digit Code OTP Input */}
          <View style={styles.inputContainer}>
            <OTPInput
              value={code}
              onChange={(text) => {
                setCode(text);
                if (text.length === 6) {
                  setErrorMessage('');
                }
              }}
              onComplete={(completedVal) => {
                setCode(completedVal);
                handleSubmit(completedVal);
              }}
              disabled={isLoading}
              autoFocus={true}
            />
          </View>

          <Text style={styles.hintText}>
            ⏱️ Mã OTP thay đổi mỗi 30 giây trên điện thoại
          </Text>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.verifyBtn, (code.length < 6 || isLoading) && styles.verifyBtnDisabled]}
            onPress={() => handleSubmit()}
            disabled={code.length < 6 || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="check-circle" size={18} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.verifyBtnText}>Xác thực & Đăng nhập</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Quay lại / Đăng xuất</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  verifyBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
