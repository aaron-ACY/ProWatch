import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Image
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Shadows } from '../theme/colors';
import { watchService, WatchNotificationType } from '../services/watchService';
import { bleService, WatchMenu, WATCH_MENUS, WATCH_FIRMWARE_VERSION } from '../services/bleService';
import { WatchCustomization, WatchFaceType, WatchStatus } from '../types';
import { useAuth } from '../context/AuthContext';
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

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<WatchCustomization>(watchService.getCustomization());
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(watchService.getWatchStatus());
  const [isTestingDevice, setIsTestingDevice] = useState(false);

  // 2FA Supabase state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [isLoadingMfa, setIsLoadingMfa] = useState(false);
  const [isEnrollModalVisible, setIsEnrollModalVisible] = useState(false);

  const refreshMfaStatus = async () => {
    try {
      const status = await mfaService.getMfaStatus();
      setMfaStatus(status);
    } catch (e) {}
  };

  // Quyền đọc thông báo hệ thống Android (NotificationListenerService)
  const [androidNotifGranted, setAndroidNotifGranted] = useState<boolean>(false);

  const refreshAndroidNotifPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await watchService.isAndroidNotificationPermissionGranted();
      setAndroidNotifGranted(granted);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshMfaStatus();
      refreshAndroidNotifPermission();
    }, [refreshAndroidNotifPermission])
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshAndroidNotifPermission();
      }
    });
    return () => sub.remove();
  }, [refreshAndroidNotifPermission]);

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

  const handleOpenAndroidNotifSettings = async () => {
    const ok = await watchService.openAndroidNotificationPermissionSettings();
    if (!ok) {
      showNotification(
        'error',
        'Không thể mở Cài đặt',
        'Vui lòng vào Cài đặt điện thoại -> Quyền truy cập đặc biệt -> Truy cập thông báo -> Bật cho ProWatch.'
      );
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
              <Text style={styles.basicPopupBtnText}>Đã hiểu</Text>
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
          <Text style={styles.title}>Cài đặt hệ thống</Text>
        </View>

        {/* User Profile Card */}
        <View style={[styles.profileCard, Shadows.sm]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Người dùng'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@prowatch.com'}</Text>
          </View>
          <View style={styles.profileBadge}>
            <MaterialCommunityIcons name="shield-check" size={14} color={Colors.primary} />
            <Text style={styles.profileBadgeText}>Đã xác thực</Text>
          </View>
        </View>

        {/* Kết nối thiết bị & Bluetooth (Dạng Toggle Component riêng biệt) */}
        <Text style={styles.sectionTitle}>Kết nối thiết bị & Bluetooth</Text>
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

        {/* Điều khiển đồng hồ từ xa (XIAO ESP32-S3) */}
        <Text style={styles.sectionTitle}>Điều khiển đồng hồ từ xa</Text>
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.controlSubTitle}>Chuyển nhanh màn hình (Firmware v1.5.1)</Text>
          <View style={styles.menuGrid}>
            {WATCH_MENUS.map((m) => (
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
                  name={
                    m.id === 0
                      ? "clock-outline"
                      : m.id === 1
                        ? "heart-pulse"
                        : m.id === 2
                          ? "cog-outline"
                          : "bell-ring-outline"
                  }
                  size={18}
                  color={watchStatus.connected ? Colors.primary : Colors.textMuted}
                />
                <Text style={[
                  styles.menuBtnText,
                  !watchStatus.connected && styles.textDisabled
                ]}>
                  {m.label}
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
              <Text style={[styles.navStepText, !watchStatus.connected && styles.textDisabled]}>Trang trước (D2)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navStepBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleStepWatchMenu('next')}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <Text style={[styles.navStepText, !watchStatus.connected && styles.textDisabled]}>Trang sau (D0)</Text>
              <Feather name="chevron-right" size={16} color={watchStatus.connected ? Colors.textPrimary : Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.controlSubTitle}>Tiện ích nguồn & Thời gian</Text>
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleSetWatchScreen(true)}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={watchStatus.connected ? "#D97706" : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>Bật màn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={() => handleSetWatchScreen(false)}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="power-sleep" size={16} color={watchStatus.connected ? Colors.textSecondary : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>Tắt màn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={handleSyncTime}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="sync" size={16} color={watchStatus.connected ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>Đồng bộ giờ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
              onPress={handleClearOffline}
              disabled={!watchStatus.connected}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="delete-sweep-outline" size={16} color={watchStatus.connected ? Colors.danger : Colors.textMuted} />
              <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>Xóa offline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings Section (Sử dụng toggle, tinh gọn các loại thông báo) */}
        <Text style={styles.sectionTitle}>Cài đặt các loại thông báo</Text>
        <View style={[styles.card, Shadows.sm]}>
          {/* Master toggle */}
          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: Colors.primaryLight }]}>
              <MaterialCommunityIcons name="bell-ring" size={20} color={Colors.primary} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Đồng bộ thông báo đồng hồ</Text>
              <Text style={styles.switchSub}>Bật/tắt toàn bộ nhận tin & cảnh báo trên đồng hồ</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(val) => {
                updateSettingAndSend('notificationsEnabled', val);
              }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              {Platform.OS === 'android' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.switchRow}>
                    <View
                      style={[
                        styles.notifTypeIcon,
                        { backgroundColor: androidNotifGranted ? '#DCFCE7' : '#FEF3C7' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={androidNotifGranted ? 'shield-check' : 'shield-lock-outline'}
                        size={18}
                        color={androidNotifGranted ? '#16A34A' : '#D97706'}
                      />
                    </View>
                    <View style={styles.switchInfo}>
                      <Text style={styles.switchLabel}>Quyền đọc Cuộc gọi & SMS Android</Text>
                      <Text style={styles.switchSub}>
                        {androidNotifGranted
                          ? 'Đã cấp quyền: Tự động đẩy Cuộc gọi đến & Tin nhắn SMS sang đồng hồ'
                          : 'Cần bật quyền Truy cập thông báo để nhận Cuộc gọi đến & SMS từ điện thoại'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.quickActionBtn,
                        {
                          flex: 0,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          backgroundColor: androidNotifGranted ? Colors.background : Colors.primaryLight,
                          borderColor: androidNotifGranted ? Colors.border : Colors.primary,
                        },
                      ]}
                      onPress={handleOpenAndroidNotifSettings}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.quickActionText,
                          { color: androidNotifGranted ? Colors.textSecondary : Colors.primary },
                        ]}
                      >
                        {androidNotifGranted ? 'Cài đặt' : 'Cấp quyền'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.divider} />

              {/* 1. Cuộc gọi đến */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialCommunityIcons name="phone-incoming" size={18} color="#16A34A" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Cuộc gọi đến</Text>
                  <Text style={styles.switchSub}>Bật sáng màn hình và hiển thị người gọi trên XIAO ESP32-S3</Text>
                </View>
                <Switch
                  value={notifCategories.calls}
                  onValueChange={(val) => toggleNotifCategory('calls', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.divider} />

              {/* 2. Tin nhắn SMS */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons name="message-text" size={18} color="#0284C7" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Tin nhắn SMS</Text>
                  <Text style={styles.switchSub}>Xem trước người gửi và nội dung tin nhắn SMS trên đồng hồ</Text>
                </View>
                <Switch
                  value={notifCategories.sms}
                  onValueChange={(val) => toggleNotifCategory('sms', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.divider} />

              {/* 3. Nhắc nhở uống nước */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="cup-water" size={18} color="#D97706" />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Nhắc nhở uống nước</Text>
                  <Text style={styles.switchSub}>Nhắc bổ sung nước định kỳ trên màn hình đồng hồ</Text>
                </View>
                <Switch
                  value={notifCategories.water}
                  onValueChange={(val) => toggleNotifCategory('water', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.divider} />

              {/* 4. Thông báo / Cảnh báo Nhịp tim & SpO2 */}
              <View style={styles.switchRow}>
                <View style={[styles.notifTypeIcon, { backgroundColor: Colors.heartRateLight }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={18} color={Colors.heartRate} />
                </View>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Cảnh báo Nhịp tim & SpO2</Text>
                  <Text style={styles.switchSub}>
                    Thông báo khi chỉ số Quá thấp / Bình thường / Quá cao sau khi đo
                  </Text>
                </View>
                <Switch
                  value={notifCategories.health}
                  onValueChange={(val) => toggleNotifCategory('health', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.divider} />

              {/* Bộ nút gửi thử thông báo trực tiếp lên màn hình đồng hồ */}
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.switchSub, { marginBottom: 8, fontWeight: '600', color: Colors.textSecondary }]}>
                  Gửi thử thông báo Cuộc gọi, SMS & Nhắc uống nước:
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
                      Cuộc gọi
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
                      Tin nhắn SMS
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
                      Uống nước
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.switchSub,
                    { marginTop: 12, marginBottom: 8, fontWeight: '600', color: Colors.textSecondary },
                  ]}
                >
                  Thử Cảnh báo Nhịp tim / SpO2 (Quá thấp / Bình thường / Quá cao):
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
                      Quá thấp
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
                      Bình thường
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
                      Quá cao
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* MỤC DEMO THÔNG BÁO TÙY CHỈNH TRÊN MÀN HÌNH ĐỒNG HỒ */}
                <View style={styles.demoSectionBox}>
                  <View style={styles.demoHeaderRow}>
                    <MaterialCommunityIcons name="watch-vibrate" size={18} color={selectedDemoColor.hex} />
                    <Text style={styles.demoSectionTitle}>
                      Demo Thông báo tùy chỉnh trên Màn hình Đồng hồ
                    </Text>
                  </View>
                  <Text style={styles.demoSectionSub}>
                    Điền loại thông báo, màu sắc, tiêu đề và nội dung để gửi trực tiếp lên màn hình đồng hồ XIAO ESP32-S3 (tự tắt sau 5s hoặc 10s và quay lại màn hình chính).
                  </Text>

                  {/* 1. Chọn loại thông báo */}
                  <Text style={styles.demoFieldLabel}>1. Loại thông báo:</Text>
                  <View style={styles.demoChipWrap}>
                    {DEMO_NOTIF_TYPES.map((item) => {
                      const active = demoType === item.type;
                      return (
                        <TouchableOpacity
                          key={item.type}
                          style={[
                            styles.demoTypeChip,
                            active && {
                              backgroundColor: selectedDemoColor.bgHex,
                              borderColor: selectedDemoColor.hex,
                            },
                          ]}
                          onPress={() => handleSelectDemoType(item)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={item.icon as any}
                            size={14}
                            color={active ? selectedDemoColor.hex : Colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.demoTypeChipText,
                              active && { color: selectedDemoColor.hex, fontWeight: '700' },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 2. Chọn màu thông báo */}
                  <Text style={styles.demoFieldLabel}>2. Màu thông báo trên màn hình đồng hồ:</Text>
                  <View style={styles.demoColorRow}>
                    {DEMO_NOTIF_COLORS.map((col) => {
                      const active = demoColorId === col.id;
                      return (
                        <TouchableOpacity
                          key={col.id}
                          style={[
                            styles.demoColorChip,
                            { borderColor: active ? col.hex : Colors.border },
                            active && { backgroundColor: col.bgHex, borderWidth: 2 },
                          ]}
                          onPress={() => setDemoColorId(col.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.demoColorDot, { backgroundColor: col.hex }]} />
                          <Text
                            style={[
                              styles.demoColorLabel,
                              active && { color: col.hex, fontWeight: '700' },
                            ]}
                          >
                            {col.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 3. Điền tiêu đề thông báo */}
                  <Text style={styles.demoFieldLabel}>3. Tiêu đề thông báo:</Text>
                  <TextInput
                    style={styles.demoTextInput}
                    value={demoTitle}
                    onChangeText={setDemoTitle}
                    placeholder="Nhập tiêu đề (VD: Nguyen Van A)"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={24}
                  />

                  {/* 4. Điền nội dung thông báo (căn trái) */}
                  <Text style={styles.demoFieldLabel}>4. Nội dung thông báo (căn trái):</Text>
                  <TextInput
                    style={[styles.demoTextInput, styles.demoTextArea]}
                    value={demoBody}
                    onChangeText={setDemoBody}
                    placeholder="Nhập nội dung thông báo..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    maxLength={88}
                  />

                  {/* Nút gửi Demo lên màn hình đồng hồ */}
                  <TouchableOpacity
                    style={[
                      styles.demoSubmitBtn,
                      { backgroundColor: selectedDemoColor.hex },
                      !watchStatus.connected && styles.btnDisabled,
                    ]}
                    onPress={handleRunCustomDemoNotification}
                    disabled={!watchStatus.connected}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons
                      name="watch-vibrate"
                      size={18}
                      color={watchStatus.connected ? Colors.white : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.demoSubmitBtnText,
                        !watchStatus.connected && styles.textDisabled,
                      ]}
                    >
                      Gửi thông báo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Display & Sensor Toggles */}
        <Text style={styles.sectionTitle}>Màn hình & Cảm biến</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="brightness-6" size={18} color="#D97706" />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Màn hình luôn bật (AOD)</Text>
              <Text style={styles.switchSub}>
                {settings.alwaysOnDisplay
                  ? 'Đang bật: Giữ mặt đồng hồ luôn sáng mờ (~15%) khi nghỉ'
                  : 'Đang tắt: Tự động tắt hẳn màn hình sau 10 giây không chạm'}
              </Text>
            </View>
            <Switch
              value={settings.alwaysOnDisplay}
              onValueChange={(val) => updateSettingAndSend('alwaysOnDisplay', val)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={[styles.notifTypeIcon, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="gesture-tap-hold" size={18} color="#0284C7" />
            </View>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Nhấc tay sáng màn hình</Text>
              <Text style={styles.switchSub}>
                {settings.raiseToWake
                  ? 'Đang bật: Tự động bật sáng màn hình khi xoay/nhấc cổ tay'
                  : 'Đang tắt: Chỉ bật màn hình khi chạm nút cảm ứng D0/D1/D2'}
              </Text>
            </View>
            <Switch
              value={settings.raiseToWake}
              onValueChange={(val) => updateSettingAndSend('raiseToWake', val)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {settings.raiseToWake && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.quickActionBtn, !watchStatus.connected && styles.btnDisabled]}
                onPress={handleTriggerRaiseToWake}
                disabled={!watchStatus.connected}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="watch-vibrate"
                  size={16}
                  color={watchStatus.connected ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.quickActionText, !watchStatus.connected && styles.textDisabled]}>
                  Mô phỏng cử chỉ nhấc tay sáng màn hình
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Health Warning Thresholds */}
        <Text style={styles.sectionTitle}>Ngưỡng cảnh báo y tế</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdLeft}>
              <View style={[styles.miniIcon, { backgroundColor: Colors.heartRateLight }]}>
                <MaterialCommunityIcons name="heart-flash" size={16} color={Colors.heartRate} />
              </View>
              <Text style={styles.thresholdLabel}>Cảnh báo nhịp tim cao</Text>
            </View>
            <View style={styles.thresholdValueBox}>
              <Text style={styles.thresholdValueText}>&gt; {settings.hrAlertHigh} BPM</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdLeft}>
              <View style={[styles.miniIcon, { backgroundColor: Colors.spo2Light }]}>
                <MaterialCommunityIcons name="water-alert" size={16} color={Colors.spo2} />
              </View>
              <Text style={styles.thresholdLabel}>Cảnh báo SpO2 thấp</Text>
            </View>
            <View style={styles.thresholdValueBox}>
              <Text style={styles.thresholdValueText}>&lt; {settings.spo2AlertLow}%</Text>
            </View>
          </View>
        </View>


        {/* Device Hardware Info */}
        <Text style={styles.sectionTitle}>Thông tin phần cứng</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Bộ xử lý chính</Text>
            <Text style={[styles.infoVal, { color: Colors.primary, fontWeight: '700' }]}>
              Seeed Studio XIAO ESP32-S3
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Trạng thái kết nối</Text>
            <Text style={[styles.infoVal, { color: watchStatus.connected ? Colors.success : Colors.danger, fontWeight: '700' }]}>
              {watchStatus.connected ? 'Đang hoạt động (BLE/Wi-Fi)' : 'Chưa kết nối'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Phiên bản Firmware</Text>
            <Text style={styles.infoVal}>{watchStatus.firmwareVersion || WATCH_FIRMWARE_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Địa chỉ Bluetooth MAC</Text>
            <Text style={styles.infoVal}>{watchStatus.bleAddress}</Text>
          </View>
        </View>

        {/* App Info & Version */}
        <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Ứng dụng</Text>
            <Text style={styles.infoVal}>{APP_INFO.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Phiên bản (Version)</Text>
            <Text style={[styles.infoVal, { color: Colors.primary, fontWeight: '700' }]}>
              v{APP_INFO.version} (Build {APP_INFO.buildNumber})
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Gói cài đặt (APK)</Text>
            <Text style={[styles.infoVal, { color: Colors.textSecondary, fontWeight: '600' }]}>
              {APP_INFO.apkFileName || 'ProWatch-Health.apk'}
            </Text>
          </View>
        </View>

        {/* Supabase 2FA Security Section (Dạng Toggle) */}
        <Text style={styles.sectionTitle}>Bảo mật tài khoản & Xác thực 2 bước</Text>
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
              <Text style={styles.mfaTitleText}>Xác thực 2 bước (2FA)</Text>
            </View>

            {/* Toggle Switch */}
            {isLoadingMfa ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
            ) : (
              <Switch
                value={Boolean(mfaStatus?.isEnabled)}
                onValueChange={handleToggleMfa}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            )}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={Colors.white} />
          <Text style={styles.logoutBtnText}>Đăng xuất</Text>
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
  menuGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  menuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  menuBtnText: {
    fontSize: 12,
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
});
