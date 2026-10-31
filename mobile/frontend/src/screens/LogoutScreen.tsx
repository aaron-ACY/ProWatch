import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types';

interface LogoutScreenProps {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Logout'>;
}

export const LogoutScreen: React.FC<LogoutScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleConfirmLogout = () => {
    logout();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Row */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          <Text style={styles.backBtnText}>Quay lại Cài đặt</Text>
        </TouchableOpacity>

        {/* Header Icon & Title */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconHalo} />
            <View style={styles.iconCircle}>
              <Feather name="log-out" size={36} color={Colors.danger} />
            </View>
          </View>
          <Text style={styles.title}>Đăng xuất tài khoản</Text>
          <Text style={styles.subtitle}>
            Bạn đang chuẩn bị đăng xuất khỏi ứng dụng ProWatch Health.
          </Text>
        </View>

        {/* Current Account Card */}
        <View style={[styles.card, Shadows.md]}>
          <Text style={styles.cardHeaderTitle}>Tài khoản hiện tại</Text>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Người dùng ProWatch'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'user@prowatch.com'}</Text>
              <View style={styles.devicePill}>
                <Ionicons name="watch-outline" size={13} color={Colors.primary} />
                <Text style={styles.devicePillText}>Đồng bộ với ProWatch S4</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Information & Safety Notice */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>Thông tin lưu trữ</Text>

          <View style={styles.noticeItem}>
            <View style={[styles.noticeIconBox, { backgroundColor: '#D1FAE5' }]}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
            </View>
            <View style={styles.noticeTextGroup}>
              <Text style={styles.noticeTitle}>Dữ liệu sức khỏe an toàn</Text>
              <Text style={styles.noticeDesc}>
                Các bản ghi nhịp tim, SpO2 và bước chân hôm nay đã được sao lưu đầy đủ.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.noticeItem}>
            <View style={[styles.noticeIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="bluetooth-connect" size={18} color={Colors.primary} />
            </View>
            <View style={styles.noticeTextGroup}>
              <Text style={styles.noticeTitle}>Ngắt phiên đồng bộ</Text>
              <Text style={styles.noticeDesc}>
                Đồng hồ sẽ tạm dừng gửi thông số trực tiếp cho đến khi bạn đăng nhập lại.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={[styles.confirmLogoutBtn, Shadows.md]}
            onPress={handleConfirmLogout}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={18} color={Colors.white} />
            <Text style={styles.confirmLogoutText}>Xác nhận đăng xuất ngay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Hủy & Giữ đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconHalo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FECDD3',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  devicePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noticeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noticeTextGroup: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  noticeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  actionsGroup: {
    marginTop: 10,
    gap: 10,
  },
  confirmLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
  },
  confirmLogoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
