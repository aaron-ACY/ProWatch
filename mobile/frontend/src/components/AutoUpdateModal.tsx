import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

/**
 * Phân tích các thẻ định dạng inline của Markdown: **in đậm**, *in nghiêng*, `code`, [link](url)
 */
function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const full = match[0];
    if (match[2] && match[3]) {
      const label = match[2];
      const url = match[3];
      nodes.push(
        <Text
          key={`${keyPrefix}-link-${tokenIdx}`}
          style={styles.mdLink}
          onPress={() => Linking.openURL(url).catch(() => {})}
        >
          {label}
        </Text>
      );
    } else if (match[4]) {
      nodes.push(
        <Text key={`${keyPrefix}-code-${tokenIdx}`} style={styles.mdInlineCode}>
          {match[4]}
        </Text>
      );
    } else if (match[5]) {
      nodes.push(
        <Text key={`${keyPrefix}-bi-${tokenIdx}`} style={[styles.mdBold, styles.mdItalic]}>
          {match[5]}
        </Text>
      );
    } else if (match[6]) {
      nodes.push(
        <Text key={`${keyPrefix}-b-${tokenIdx}`} style={styles.mdBold}>
          {match[6]}
        </Text>
      );
    } else if (match[7]) {
      nodes.push(
        <Text key={`${keyPrefix}-i-${tokenIdx}`} style={styles.mdItalic}>
          {match[7]}
        </Text>
      );
    } else {
      nodes.push(full);
    }

    lastIndex = tokenRegex.lastIndex;
    tokenIdx++;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

/**
 * Bộ hiển thị nội dung Markdown (.md) chuẩn chỉnh dành cho Release Notes trên Mobile
 */
const ReleaseMarkdownContent: React.FC<{ markdown: string }> = React.memo(({ markdown }) => {
  const blocks = useMemo(() => {
    const cleaned = markdown
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\r\n/g, '\n')
      .trim();

    const lines = cleaned.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Bỏ qua dòng trống
      if (!trimmed) {
        i++;
        continue;
      }

      // Khối Code (``` ... ```)
      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        elements.push(
          <View key={`codeblock-${i}`} style={styles.mdCodeBlock}>
            <Text style={styles.mdCodeBlockText}>{codeLines.join('\n')}</Text>
          </View>
        );
        continue;
      }

      // Đường kẻ ngang (---, ***, ___)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        elements.push(<View key={`hr-${i}`} style={styles.mdDivider} />);
        i++;
        continue;
      }

      // Khối trích dẫn Blockquote (> ...)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          const qContent = lines[i].trim().replace(/^>\s?/, '').trim();
          if (qContent) quoteLines.push(qContent);
          i++;
        }
        elements.push(
          <View key={`quote-${i}`} style={styles.mdBlockquote}>
            {quoteLines.map((ql, qIdx) => (
              <Text key={`ql-${i}-${qIdx}`} style={styles.mdBlockquoteText}>
                {renderInlineMarkdown(ql, `q-${i}-${qIdx}`)}
              </Text>
            ))}
          </View>
        );
        continue;
      }

      // Bảng Markdown (| Col 1 | Col 2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableRows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          const rowStr = lines[i].trim();
          const cells = rowStr
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          // Bỏ qua dòng phân cách | :--- | :--- |
          const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
          if (!isSeparator && cells.length > 0) {
            tableRows.push(cells);
          }
          i++;
        }

        if (tableRows.length > 0) {
          elements.push(
            <View key={`table-${i}`} style={styles.mdTable}>
              {tableRows.map((row, rIdx) => {
                const isHeader = rIdx === 0 && tableRows.length > 1;
                return (
                  <View
                    key={`trow-${i}-${rIdx}`}
                    style={[
                      styles.mdTableRow,
                      isHeader && styles.mdTableHeaderRow,
                      rIdx === tableRows.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {row.map((cell, cIdx) => (
                      <View
                        key={`tcell-${i}-${rIdx}-${cIdx}`}
                        style={[styles.mdTableCell, cIdx === 0 && { flex: 1.1 }, cIdx > 0 && { flex: 1.4 }]}
                      >
                        <Text style={isHeader ? styles.mdTableHeaderText : styles.mdTableCellText}>
                          {renderInlineMarkdown(cell, `tc-${i}-${rIdx}-${cIdx}`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        }
        continue;
      }

      // Tiêu đề Heading (#, ##, ###, ####)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2].trim();
        if (level === 1) {
          elements.push(
            <View key={`h1-${i}`} style={styles.mdH1Container}>
              <Text style={styles.mdH1}>{renderInlineMarkdown(headingText, `h1-${i}`)}</Text>
            </View>
          );
        } else if (level === 2) {
          elements.push(
            <View key={`h2-${i}`} style={styles.mdH2Container}>
              <View style={styles.mdH2Accent} />
              <Text style={styles.mdH2}>{renderInlineMarkdown(headingText, `h2-${i}`)}</Text>
            </View>
          );
        } else if (level === 3) {
          elements.push(
            <Text key={`h3-${i}`} style={styles.mdH3}>
              {renderInlineMarkdown(headingText, `h3-${i}`)}
            </Text>
          );
        } else {
          elements.push(
            <Text key={`h4-${i}`} style={styles.mdH4}>
              {renderInlineMarkdown(headingText, `h4-${i}`)}
            </Text>
          );
        }
        i++;
        continue;
      }

      // Danh sách Bullet (- , * , + )
      const bulletMatch = rawLine.match(/^(\s*)([-*+])\s+(.+)$/);
      if (bulletMatch) {
        const indentSpaces = bulletMatch[1].length;
        const isNested = indentSpaces >= 2;
        const itemText = bulletMatch[3].trim();
        elements.push(
          <View key={`ul-${i}`} style={[styles.mdListRow, isNested && styles.mdListRowNested]}>
            <Text style={[styles.mdBulletDot, isNested && styles.mdBulletDotNested]}>
              {isNested ? '◦' : '•'}
            </Text>
            <Text style={styles.mdListText}>{renderInlineMarkdown(itemText, `ul-${i}`)}</Text>
          </View>
        );
        i++;
        continue;
      }

      // Danh sách đánh số (1. , 2. )
      const orderedMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (orderedMatch) {
        const indentSpaces = orderedMatch[1].length;
        const isNested = indentSpaces >= 2;
        const numLabel = orderedMatch[2];
        const itemText = orderedMatch[3].trim();
        elements.push(
          <View key={`ol-${i}`} style={[styles.mdListRow, isNested && styles.mdListRowNested]}>
            <Text style={styles.mdOrderedNum}>{numLabel}.</Text>
            <Text style={styles.mdListText}>{renderInlineMarkdown(itemText, `ol-${i}`)}</Text>
          </View>
        );
        i++;
        continue;
      }

      // Đoạn văn bản thường
      elements.push(
        <Text key={`p-${i}`} style={styles.mdParagraph}>
          {renderInlineMarkdown(trimmed, `p-${i}`)}
        </Text>
      );
      i++;
    }

    return elements;
  }, [markdown]);

  return <View style={styles.mdContainer}>{blocks}</View>;
});

export const AutoUpdateModal: React.FC = () => {
  const { t } = useLanguage();
  const [releaseInfo, setReleaseInfo] = useState<GitHubReleaseInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadStage, setDownloadStage] = useState<string>('connecting');
  const [downloadedMB, setDownloadedMB] = useState<number>(0);
  const [totalMB, setTotalMB] = useState<number>(0);
  const [apkReadyToInstall, setApkReadyToInstall] = useState(false);
  const [waitingUnknownSources, setWaitingUnknownSources] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismissedTagRef = useRef<string | null>(null);
  const lastCheckAtRef = useRef<number>(0);

  const checkLatestReleaseSilently = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    const now = Date.now();
    // Tránh gọi liên tục trong vòng 60 giây
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

      // Chỉ thông báo khi phiên bản trên GitHub mới hơn phiên bản hiện tại
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
      setApkReadyToInstall(false);
      setErrorMessage(null);
      setVisible(true);
    } catch {
      // Bỏ qua lỗi mạng khi kiểm tra ngầm
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      checkLatestReleaseSilently();
    }, 2200);

    const progressSub = DeviceEventEmitter.addListener(
      'AppUpdateProgress',
      (evt: { percent?: number; stage?: string; downloadedMB?: number; totalMB?: number }) => {
        if (typeof evt?.percent === 'number') {
          setDownloadPercent(evt.percent);
        }
        if (typeof evt?.stage === 'string') {
          setDownloadStage(evt.stage);
        }
        if (typeof evt?.downloadedMB === 'number') {
          setDownloadedMB(evt.downloadedMB);
        }
        if (typeof evt?.totalMB === 'number') {
          setTotalMB(evt.totalMB);
        }
      }
    );

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (waitingUnknownSources) {
          setWaitingUnknownSources(false);
          const mod = NativeModules.WatchNotificationModule;
          if (mod?.installPendingApk) {
            mod
              .installPendingApk()
              .then((res: string) => {
                if (res === 'NEED_UNKNOWN_SOURCES_PERMISSION') {
                  setWaitingUnknownSources(true);
                }
              })
              .catch(() => {});
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

    const mod = NativeModules.WatchNotificationModule;

    // Nếu gói APK đã được tải xong trước đó, gọi cài đặt ngay mà không cần tải lại
    if (apkReadyToInstall && mod?.installPendingApk) {
      try {
        const pendingRes: string = await mod.installPendingApk();
        if (pendingRes === 'NEED_UNKNOWN_SOURCES_PERMISSION') {
          setWaitingUnknownSources(true);
          return;
        }
        if (pendingRes === 'INSTALLER_LAUNCHED') {
          return;
        }
      } catch {
        // Nếu file cache bị xóa, tiếp tục tải lại bên dưới
      }
    }

    setIsDownloading(true);
    setDownloadPercent(2);
    setDownloadStage('connecting');
    setDownloadedMB(0);
    setTotalMB(0);

    try {
      if (mod?.downloadAndInstallApk) {
        const result: string | boolean = await mod.downloadAndInstallApk(
          releaseInfo.apkDownloadUrl,
          releaseInfo.version
        );
        setIsDownloading(false);

        if (result === 'NEED_UNKNOWN_SOURCES_PERMISSION') {
          setApkReadyToInstall(true);
          setWaitingUnknownSources(true);
        } else if (result === 'INSTALLER_LAUNCHED' || result === true) {
          setApkReadyToInstall(true);
        } else {
          setErrorMessage(
            t(
              'Không thể khởi chạy bộ cài đặt tự động. Vui lòng thử lại.',
              'Could not launch package installer. Please try again.'
            )
          );
        }
      } else {
        setIsDownloading(false);
        setErrorMessage(
          t(
            'Bản dựng hiện tại chưa hỗ trợ tự động tải. Đang mở trình duyệt...',
            'Current build does not support in-app download. Opening browser...'
          )
        );
        await Linking.openURL(releaseInfo.apkDownloadUrl);
      }
    } catch (err: any) {
      setIsDownloading(false);
      const detail = err?.message ? ` (${err.message})` : '';
      setErrorMessage(
        t(
          `Lỗi khi tải gói cập nhật${detail}. Vui lòng kiểm tra kết nối mạng và thử lại.`,
          `Failed to download update package${detail}. Please check your connection and retry.`
        )
      );
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

  const stageLabel =
    downloadStage === 'connecting'
      ? t('Đang kết nối máy chủ GitHub Releases...', 'Connecting to GitHub Releases...')
      : downloadStage === 'installing' || downloadPercent >= 100
      ? t('Đang mở trình cài đặt Android...', 'Launching Android installer...')
      : t('Đang tải gói cài đặt APK...', 'Downloading APK package...');

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

          {/* Release Notes Box (Rendered Markdown) */}
          {Boolean(releaseInfo.body) && (
            <View style={styles.notesWrapper}>
              <View style={styles.notesHeaderRow}>
                <MaterialCommunityIcons name="text-box-check-outline" size={15} color={Colors.primary} />
                <Text style={styles.notesHeader}>
                  {t('Nội dung bản cập nhật:', "What's new in this release:")}
                </Text>
              </View>
              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <ReleaseMarkdownContent markdown={releaseInfo.body} />
              </ScrollView>
            </View>
          )}

          {/* Download Progress Bar */}
          {isDownloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeaderRow}>
                <View style={styles.progressLabelRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.progressLabel} numberOfLines={1}>
                    {stageLabel}
                  </Text>
                </View>
                <Text style={styles.progressPercent}>{downloadPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${downloadPercent}%` }]} />
              </View>
              {totalMB > 0 && (
                <Text style={styles.progressSizeText}>
                  {downloadedMB.toFixed(1)} MB / {totalMB.toFixed(1)} MB
                </Text>
              )}
            </View>
          )}

          {/* Hướng dẫn khi chờ cấp quyền cài ứng dụng không rõ nguồn gốc */}
          {!isDownloading && waitingUnknownSources && (
            <View style={styles.permissionBanner}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color="#0284C7" />
              <Text style={styles.permissionBannerText}>
                {t(
                  'Đã tải xong 100%! Vui lòng bật "Cho phép từ nguồn này" trong Cài đặt rồi nhấn Cài đặt ngay.',
                  '100% downloaded! Please enable "Allow from this source" in Settings then tap Install Now.'
                )}
              </Text>
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
              style={[
                styles.updateBtn,
                apkReadyToInstall && !isDownloading && styles.installReadyBtn,
                isDownloading && styles.btnDisabled,
              ]}
              onPress={handleStartUpdate}
              disabled={isDownloading}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={
                  apkReadyToInstall && !isDownloading
                    ? 'package-up'
                    : 'download-circle-outline'
                }
                size={18}
                color={Colors.white}
              />
              <Text style={styles.updateBtnText}>
                {isDownloading
                  ? t(`Đang tải (${downloadPercent}%)`, `Downloading (${downloadPercent}%)`)
                  : apkReadyToInstall
                  ? t('Cài đặt ngay', 'Install Now')
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
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
    marginBottom: 12,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  notesHeader: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  notesScroll: {
    maxHeight: 250,
  },
  notesScrollContent: {
    paddingRight: 4,
    paddingBottom: 4,
  },

  // Markdown Renderer Styles
  mdContainer: {
    width: '100%',
    gap: 5,
  },
  mdH1Container: {
    paddingBottom: 5,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mdH1: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  mdH2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  mdH2Accent: {
    width: 3.5,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  mdH2: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 19,
  },
  mdH3: {
    fontSize: 12.8,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 5,
    lineHeight: 18,
  },
  mdH4: {
    fontSize: 12.2,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
    lineHeight: 17,
  },
  mdParagraph: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  mdBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  mdItalic: {
    fontStyle: 'italic',
    color: '#475569',
  },
  mdInlineCode: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    color: '#0F172A',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  mdLink: {
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  mdDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  mdBlockquote: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 3,
    marginVertical: 2,
  },
  mdBlockquoteText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#1E3A8A',
  },
  mdListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
    gap: 6,
  },
  mdListRowNested: {
    paddingLeft: 14,
  },
  mdBulletDot: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: Colors.primary,
    width: 10,
    textAlign: 'center',
  },
  mdBulletDotNested: {
    fontSize: 12,
    color: '#64748B',
  },
  mdOrderedNum: {
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 16,
  },
  mdListText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  mdCodeBlock: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
  },
  mdCodeBlockText: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontSize: 11,
    color: '#F8FAFC',
    lineHeight: 16,
  },
  mdTable: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 4,
    backgroundColor: Colors.white,
  },
  mdTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mdTableHeaderRow: {
    backgroundColor: '#F1F5F9',
  },
  mdTableCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  mdTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  mdTableCellText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },

  // Progress & Action Styles
  progressSection: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
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
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressSizeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 5,
    textAlign: 'right',
  },
  permissionBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  permissionBannerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#0369A1',
    fontWeight: '600',
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
  installReadyBtn: {
    backgroundColor: '#16A34A',
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
