import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  NativeModules,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export interface PresetAvatarItem {
  id: string;
  uri: string;
  labelVi: string;
  labelEn: string;
  icon: string;
  colors: [string, string];
  iconColor: string;
}

export const PRESET_AVATARS: PresetAvatarItem[] = [
  {
    id: 'runner',
    uri: 'preset:runner',
    labelVi: 'Vận động viên',
    labelEn: 'Runner',
    icon: 'run-fast',
    colors: ['#F59E0B', '#EA580C'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'cardio',
    uri: 'preset:cardio',
    labelVi: 'Trái tim khỏe',
    labelEn: 'Cardio Pulse',
    icon: 'heart-pulse',
    colors: ['#FB7185', '#E11D48'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'cyber',
    uri: 'preset:cyber',
    labelVi: 'ProWatch Cyber',
    labelEn: 'ProWatch Cyber',
    icon: 'watch-variant',
    colors: ['#38BDF8', '#2563EB'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'fitness',
    uri: 'preset:fitness',
    labelVi: 'Gym & Thể hình',
    labelEn: 'Strength & Gym',
    icon: 'dumbbell',
    colors: ['#8B5CF6', '#6D28D9'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'doctor',
    uri: 'preset:doctor',
    labelVi: 'Chuyên gia Y tế',
    labelEn: 'Medical Pro',
    icon: 'stethoscope',
    colors: ['#10B981', '#047857'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'yoga',
    uri: 'preset:yoga',
    labelVi: 'Thiền & Yoga',
    labelEn: 'Zen & Yoga',
    icon: 'meditation',
    colors: ['#14B8A6', '#0D9488'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'cyclist',
    uri: 'preset:cyclist',
    labelVi: 'Đua xe đạp',
    labelEn: 'Cyclist',
    icon: 'bike-fast',
    colors: ['#06B6D4', '#0284C7'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'swimmer',
    uri: 'preset:swimmer',
    labelVi: 'Bơi lội',
    labelEn: 'Swimmer',
    icon: 'swim',
    colors: ['#60A5FA', '#1D4ED8'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'champion',
    uri: 'preset:champion',
    labelVi: 'Nhà vô địch',
    labelEn: 'Champion',
    icon: 'trophy-award',
    colors: ['#FBBF24', '#D97706'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'hiking',
    uri: 'preset:hiking',
    labelVi: 'Leo núi',
    labelEn: 'Explorer',
    icon: 'hiking',
    colors: ['#34D399', '#059669'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'astronaut',
    uri: 'preset:astronaut',
    labelVi: 'Phi hành gia',
    labelEn: 'Space Explorer',
    icon: 'space-station',
    colors: ['#6366F1', '#4338CA'],
    iconColor: '#FFFFFF',
  },
  {
    id: 'bolt',
    uri: 'preset:bolt',
    labelVi: 'Năng lượng cao',
    labelEn: 'High Energy',
    icon: 'lightning-bolt',
    colors: ['#EC4899', '#BE185D'],
    iconColor: '#FFFFFF',
  },
];

interface UserAvatarProps {
  avatar?: string | null;
  name?: string | null;
  size?: number;
  showEditBadge?: boolean;
  onPress?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  size = 46,
  showEditBadge = false,
  onPress,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const preset = avatar?.startsWith('preset:')
    ? PRESET_AVATARS.find((p) => p.uri === avatar)
    : undefined;

  const isImageUri =
    Boolean(avatar) &&
    !avatar?.startsWith('preset:') &&
    (avatar!.startsWith('data:image/') ||
      avatar!.startsWith('http://') ||
      avatar!.startsWith('https://') ||
      avatar!.startsWith('file://') ||
      avatar!.startsWith('content://'));

  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  const radius = size / 2;
  const badgeSize = Math.max(18, Math.round(size * 0.36));

  const content = (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {preset ? (
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.avatarCircle,
            { width: size, height: size, borderRadius: radius },
          ]}
        >
          <MaterialCommunityIcons
            name={preset.icon as any}
            size={Math.round(size * 0.52)}
            color={preset.iconColor}
          />
        </LinearGradient>
      ) : isImageUri && !imgError ? (
        <Image
          source={{ uri: avatar! }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: Colors.primaryLight,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
          }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.avatarCircle,
            { width: size, height: size, borderRadius: radius },
          ]}
        >
          <Text
            style={[
              styles.initialText,
              { fontSize: Math.round(size * 0.42) },
            ]}
          >
            {initial}
          </Text>
        </LinearGradient>
      )}

      {showEditBadge && (
        <View
          style={[
            styles.cameraBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="camera"
            size={Math.round(badgeSize * 0.58)}
            color="#FFFFFF"
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface AvatarPickerModalProps {
  visible: boolean;
  currentAvatar?: string | null;
  userName?: string | null;
  onClose: () => void;
  onSaveAvatar: (newAvatarUri: string) => Promise<{ success: boolean; message?: string }>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  currentAvatar,
  userName,
  onClose,
  onSaveAvatar,
}) => {
  const { t } = useLanguage();
  const [selectedUri, setSelectedUri] = useState<string>(currentAvatar || '');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPickingFile, setIsPickingFile] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSelectedUri(currentAvatar || '');
      if (
        currentAvatar &&
        (currentAvatar.startsWith('http://') || currentAvatar.startsWith('https://'))
      ) {
        setCustomUrl(currentAvatar);
      } else {
        setCustomUrl('');
      }
    }
  }, [visible, currentAvatar]);

  // Chọn ảnh từ thư viện thiết bị (Hỗ trợ cả Android Native và Web)
  const handlePickFromDevice = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event: any) => {
          const file = event?.target?.files?.[0];
          if (!file) return;
          setIsPickingFile(true);
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            const rawDataUrl = String(loadEvt.target?.result || '');
            // Resize ảnh trên Canvas xuống tối đa 256x256 để lưu nhanh và mượt
            const img = new window.Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const size = 256;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                const compressed = canvas.toDataURL('image/jpeg', 0.82);
                setSelectedUri(compressed);
              } else {
                setSelectedUri(rawDataUrl);
              }
              setIsPickingFile(false);
            };
            img.onerror = () => {
              setSelectedUri(rawDataUrl);
              setIsPickingFile(false);
            };
            img.src = rawDataUrl;
          };
          reader.onerror = () => {
            setIsPickingFile(false);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (e) {
        setIsPickingFile(false);
      }
      return;
    }

    // Trên Android Native: Gọi WatchNotificationModule.pickAvatarImage
    try {
      setIsPickingFile(true);
      const nativeMod = NativeModules.WatchNotificationModule;
      if (nativeMod && typeof nativeMod.pickAvatarImage === 'function') {
        const base64DataUri: string | null = await nativeMod.pickAvatarImage();
        if (base64DataUri && base64DataUri.startsWith('data:image/')) {
          setSelectedUri(base64DataUri);
        }
      } else {
        Alert.alert(
          t('Chọn ảnh đại diện', 'Select Avatar'),
          t(
            'Thiết bị hiện tại chưa hỗ trợ trình chọn ảnh hệ thống. Bạn có thể chọn một biểu tượng trong bộ sưu tập hoặc dán liên kết ảnh bên dưới.',
            'System photo picker is unavailable on this runtime. Please choose a preset avatar or paste an image URL below.'
          )
        );
      }
    } catch (err: any) {
      if (err?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert(
          t('Không thể tải ảnh', 'Failed to load image'),
          err?.message || t('Vui lòng thử lại với ảnh khác.', 'Please try another photo.')
        );
      }
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      Alert.alert(
        t('Đường dẫn không hợp lệ', 'Invalid URL'),
        t('Vui lòng nhập đường dẫn bắt đầu bằng https:// hoặc http://', 'Please enter a valid https:// or http:// image URL')
      );
      return;
    }
    setSelectedUri(trimmed);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const res = await onSaveAvatar(selectedUri);
      if (res.success) {
        onClose();
      } else if (res.message) {
        Alert.alert(t('Thông báo', 'Notice'), res.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, Shadows.lg]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>
                {t('Đổi ảnh đại diện', 'Change Profile Avatar')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('Chọn ảnh từ thiết bị hoặc bộ biểu tượng ProWatch', 'Upload from device or choose a ProWatch preset')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Live Preview */}
            <View style={styles.previewSection}>
              <UserAvatar avatar={selectedUri} name={userName} size={86} />
              <Text style={styles.previewName}>{userName || t('Người dùng ProWatch', 'ProWatch User')}</Text>

              <View style={styles.deviceActionRow}>
                <TouchableOpacity
                  style={styles.uploadPhotoBtn}
                  onPress={handlePickFromDevice}
                  disabled={isPickingFile}
                  activeOpacity={0.8}
                >
                  {isPickingFile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="image-plus" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadPhotoBtnText}>
                        {t('Chọn ảnh từ máy', 'Upload Photo')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {Boolean(selectedUri) && (
                  <TouchableOpacity
                    style={styles.resetDefaultBtn}
                    onPress={() => {
                      setSelectedUri('');
                      setCustomUrl('');
                    }}
                    activeOpacity={0.75}
                  >
                    <Feather name="rotate-ccw" size={15} color="#64748B" />
                    <Text style={styles.resetDefaultBtnText}>
                      {t('Mặc định', 'Default')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Preset Avatars Grid */}
            <Text style={styles.sectionLabel}>
              {t('Bộ biểu tượng ProWatch Health', 'ProWatch Health Presets')}
            </Text>
            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((item) => {
                const isSelected = selectedUri === item.uri;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.presetItem,
                      isSelected && styles.presetItemSelected,
                    ]}
                    onPress={() => setSelectedUri(item.uri)}
                    activeOpacity={0.75}
                  >
                    <LinearGradient
                      colors={item.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.presetCircle}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={24}
                        color={item.iconColor}
                      />
                    </LinearGradient>
                    <Text
                      style={[
                        styles.presetLabel,
                        isSelected && styles.presetLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {t(item.labelVi, item.labelEn)}
                    </Text>
                    {isSelected && (
                      <View style={styles.selectedCheckBadge}>
                        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Custom Image URL */}
            <Text style={styles.sectionLabel}>
              {t('Hoặc dán liên kết ảnh (URL)', 'Or Paste Image URL')}
            </Text>
            <View style={styles.urlRow}>
              <TextInput
                style={styles.urlInput}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.urlApplyBtn}
                onPress={handleApplyUrl}
                activeOpacity={0.8}
              >
                <Text style={styles.urlApplyText}>{t('Áp dụng', 'Apply')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelBtnText}>{t('Hủy', 'Cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleConfirmSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {t('Lưu ảnh đại diện', 'Save Avatar')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 14,
  },
  previewSection: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 12,
  },
  deviceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadPhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetDefaultBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  presetItem: {
    width: '23.5%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  presetItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  presetCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  presetLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  presetLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  urlInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  urlApplyBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlApplyText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

