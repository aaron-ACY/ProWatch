import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  Image,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ Email.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    const res = await login(email, password);
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
          {/* App Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoRipple} />
              <View style={styles.logoCircle}>
                <Image
                  source={require('../../assets/app-logo.png')}
                  style={{ width: 58, height: 58, borderRadius: 14 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.brandTitle}>ProWatch Health</Text>
            <Text style={styles.brandSubtitle}>Hệ sinh thái theo dõi sức khỏe & đồng hồ thông minh</Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, Shadows.lg]}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSubtitle}>Đăng nhập để theo dõi chỉ số sức khỏe của bạn.</Text>

            {/* Error Banner */}
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập địa chỉ email của bạn"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onFocus={() => {
                    // Tự động cuộn trang lên để bàn phím không che ô nhập mật khẩu
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 180);
                  }}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => Alert.alert('Quên mật khẩu', 'Vui lòng liên hệ quản trị viên qua email hỗ trợ để đặt lại mật khẩu.')}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, Shadows.md]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Đăng nhập</Text>
                  <Feather name="arrow-right" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Switch to Register */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.switchAuthLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FormWrapper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 80,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoRipple: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(238, 91, 93, 0.15)',
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#1A0000',
    borderWidth: 1.5,
    borderColor: 'rgba(238, 91, 93, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadows.md,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          borderStyle: 'none',
          userSelect: 'text',
          cursor: 'text',
          pointerEvents: 'auto',
        } as any)
      : {}),
  },
  eyeBtn: {
    padding: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchAuthText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  switchAuthLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
