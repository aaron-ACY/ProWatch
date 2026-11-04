import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { APP_INFO } from '../config/appInfo';
import { useLanguage } from '../context/LanguageContext';

const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/aaron-ACY/ProWatch/releases/latest';

interface GitHubReleaseInfo {
  tagName: string;
  version: string;
  title: string;
  body: string;
  apkDownloadUrl: string;
  publishedAt: string;
}

function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^[vV]/, '');
}

function compareSemver(a: string, b: string): number {
  const pa = normalizeVersion(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export const AutoUpdateModal: React.FC = () => {
  const { t } = useLanguage();
  const [releaseInfo, setReleaseInfo] = useState<GitHubReleaseInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [waitingUnknownSources, setWaitingUnknownSources] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismissedTagRef = useRef<string | null>(null);
  const lastCheckAtRef = useRef<number>(0);

  const checkLatestReleaseSilently = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    const now = Date.now();
    // Avoid spamming GitHub API if checked within the last 60 seconds
    if (now - lastCheckAtRef.current < 60_000) return;
    lastCheckAtRef.current = now;

    try {
      const response = await fetch(GITHUB_LATEST_RELEASE_API, {
        headers: {
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) return;

      const data = await response.json();
      const rawTag: string = data?.tag_name || '';
      if (!rawTag) return;

      const remoteVersion = normalizeVersion(rawTag);
      const localVersion = normalizeVersion(APP_INFO.version);

      if (compareSemver(remoteVersion, localVersion) <= 0) {
        return;
      }

      if (dismissedTagRef.current === rawTag) {
        return;
      }

      const assets: Array<{ name?: string; browser_download_url?: string }> = Array.isArray(data?.assets)
        ? data.assets
        : [];
      const apkAsset = assets.find(
        (a) => a?.name && a.name.toLowerCase().endsWith('.apk') && a.browser_download_url
      );

      const apkUrl =
        apkAsset?.browser_download_url ||
        `https://github.com/aaron-ACY/ProWatch/releases/download/${rawTag}/ProWatch-Health.apk`;

      setReleaseInfo({
        tagName: rawTag,
        version: remoteVersion,
        title: data?.name || `ProWatch Health v${remoteVersion}`,
        body: data?.body || '',
        apkDownloadUrl: apkUrl,
        publishedAt: data?.published_at || '',
      });
      setErrorMessage(null);
      setVisible(true);
    } catch {
      // Silent background check: ignore network/offline errors
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      checkLatestReleaseSilently();
    }, 2200);

    const progressSub = DeviceEventEmitter.addListener(
      'AppUpdateProgress',
      (evt: { percent?: number; stage?: string }) => {
        if (typeof evt?.percent === 'number') {
          setDownloadPercent(evt.percent);
        }
      }
    );

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (waitingUnknownSources) {
          setWaitingUnknownSources(false);
          const mod = NativeModules.WatchNotificationModule;
          if (mod?.installPendingApk) {
            mod.installPendingApk().catch(() => {});
          }
        } else {
          checkLatestReleaseSilently();
        }
      }
    });

    return () => {
      clearTimeout(initialTimer);
      progressSub.remove();
      appStateSub.remove();
    };
  }, [checkLatestReleaseSilently, waitingUnknownSources]);

  const handleStartUpdate = async () => {
    if (!releaseInfo || isDownloading) return;
    setErrorMessage(null);
    setIsDownloading(true);
    setDownloadPercent(2);

    try {
      const mod = NativeModules.WatchNotificationModule;
      if (mod?.downloadAndInstallApk) {
        const result: string = await mod.downloadAndInstallApk(
          releaseInfo.apkDownloadUrl,
          releaseInfo.version
        );
        if (result === 'NEED_UNKNOWN_SOURCES_PERMISSION') {
          setWaitingUnknownSources(true);
        }
        setIsDownloading(false);
      } else {
        setIsDownloading(false);
        await Linking.openURL(releaseInfo.apkDownloadUrl);
      }
    } catch {
      setIsDownloading(false);
      setErrorMessage(
        t(
          'Không thể tải tự động. Đang mở trình duyệt để tải gói APK...',
          'Automatic download failed. Opening browser to download APK...'
        )
      );
      Linking.openURL(releaseInfo.apkDownloadUrl).catch(() => {});
    }
  };

  const handleDismiss = () => {
    if (isDownloading) return;
    if (releaseInfo) {
      dismissedTagRef.current = releaseInfo.tagName;
    }
    setVisible(false);
  };

  if (!visible || !releaseInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, Shadows.lg]}>
          {/* Header Icon & Version Badge */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="cloud-download-outline" size={30} color={Colors.primary} />
          </View>

          <Text style={styles.title}>
            {t('Phát hiện bản cập nhật mới!', 'New Update Available!')}
          </Text>

          <View style={styles.versionRow}>
            <View style={styles.versionPillOld}>
              <Text style={styles.versionPillOldText}>v{APP_INFO.version}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={16} color={Colors.textMuted} />
            <View style={styles.versionPillNew}>
              <Text style={styles.versionPillNewText}>v{releaseInfo.version}</Text>
            </View>
          </View>

          {/* Release Notes Box */}
          {Boolean(releaseInfo.body) && (
            <View style={styles.notesWrapper}>
              <Text style={styles.notesHeader}>
                {t('Nội dung bản cập nhật:', "What's new in this release:")}
              </Text>
              <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={true}>
                <Text style={styles.notesBody}>{releaseInfo.body.trim()}</Text>
              </ScrollView>
            </View>
          )}

          {/* Download Progress Bar */}
          {isDownloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.progressLabel}>
                    {downloadPercent < 100
                      ? t('Đang tải gói APK bản mới...', 'Downloading new APK package...')
                      : t('Đang mở trình cài đặt Android...', 'Launching Android installer...')}
                  </Text>
                </View>
                <Text style={styles.progressPercent}>{downloadPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${downloadPercent}%` }]} />
              </View>
            </View>
          )}

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.laterBtn, isDownloading && styles.btnDisabled]}
              onPress={handleDismiss}
              disabled={isDownloading}
              activeOpacity={0.75}
            >
              <Text style={styles.laterBtnText}>{t('Để sau', 'Later')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.updateBtn, isDownloading && styles.btnDisabled]}
              onPress={handleStartUpdate}
              disabled={isDownloading}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="download-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.updateBtnText}>
                {isDownloading
                  ? t(`Đang tải (${downloadPercent}%)`, `Downloading (${downloadPercent}%)`)
                  : t('Cập nhật ngay', 'Update Now')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  versionPillOld: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.cardMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  versionPillOldText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  versionPillNew: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  versionPillNewText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  notesWrapper: {
    width: '100%',
    backgroundColor: Colors.cardMuted,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 165,
  },
  notesBody: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  progressSection: {
    width: '100%',
    marginBottom: 14,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 2,
  },
  laterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  updateBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

