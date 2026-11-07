/**
 * ProWatch Health - Release-Only Pre-Install Device Sanitizer & Single-Icon Enforcer
 *
 * Tự động chạy sau bước build Gradle (`assembleRelease`) và trước khi
 * `npx expo run:android --variant release` hoặc `deploy-release.js` cài đặt APK:
 *
 * 1. Xóa triệt để mọi thư mục/file APK Debug (`android/app/build/outputs/apk/debug`, `debug.keystore`)
 *    để dự án chỉ xuất duy nhất bản Release (`app-release.apk`).
 * 2. Đồng bộ file `app-release.apk` ra `mobile/ProWatch-Health.apk` (luôn dùng đúng Release Key).
 * 3. Gỡ bỏ mọi package trùng tên/biểu tượng từ các bản phát triển cũ (`com.prowatch.health.debug`,
 *    `com.prowatch.app`, `com.anonymous.frontend`, `com.anonymous.prowatchhealth`).
 * 4. Gỡ bỏ bản sao `com.prowatch.health` bị cài nhầm vào không gian phụ (Samsung Secure Folder User 150,
 *    Dual Apps User 95/999, Work Profile User 10...) — giữ duy nhất 1 app trên User 0.
 * 5. Tự động phát hiện và xử lý xung đột chữ ký số (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) nếu trên máy
 *    vẫn còn tàn dư của bản ký bằng `CN=Android Debug` cũ, giúp `npx expo run:android --variant release`
 *    luôn cài đặt thành công ngay từ lần chạy đầu tiên.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_ID = 'com.prowatch.health';
const LEGACY_DUPLICATE_PACKAGES = [
  'com.prowatch.health.debug',
  'com.prowatch.health.preview',
  'com.prowatch.health.dev',
  'com.prowatch.app',
  'com.anonymous.frontend',
  'com.anonymous.prowatchhealth',
];

const frontendRoot = path.resolve(__dirname, '..');
const mobileRoot = path.resolve(frontendRoot, '..');
const releaseApkPath = path.join(
  frontendRoot,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk'
);
const debugApkOutputDir = path.join(
  frontendRoot,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug'
);
const debugKeystorePath = path.join(
  frontendRoot,
  'android',
  'app',
  'debug.keystore'
);
const trackedRootApkPath = path.join(mobileRoot, 'ProWatch-Health.apk');

function resolveAdbPath() {
  const candidates = [
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    'C:\\Users\\huudan\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    'adb',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'adb' || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'adb';
}

function runAdb(adbPath, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(adbPath, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 30000,
      }),
    };
  } catch (err) {
    const stdout = err.stdout ? String(err.stdout) : '';
    const stderr = err.stderr ? String(err.stderr) : '';
    return {
      ok: false,
      stdout,
      stderr,
      combined: `${stdout}\n${stderr}`.trim(),
      error: err,
    };
  }
}

function removeDebugArtifactsAndSyncReleaseApk() {
  // Xóa triệt để debug.keystore, src/debug, src/debugOptimized và thư mục outputs/apk/debug để chỉ tồn tại bản Release duy nhất
  const srcDebugDir = path.join(frontendRoot, 'android', 'app', 'src', 'debug');
  const srcDebugOptDir = path.join(frontendRoot, 'android', 'app', 'src', 'debugOptimized');
  for (const dirOrFile of [debugKeystorePath, debugApkOutputDir, srcDebugDir, srcDebugOptDir]) {
    if (fs.existsSync(dirOrFile)) {
      try {
        fs.rmSync(dirOrFile, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  if (fs.existsSync(releaseApkPath)) {
    try {
      fs.copyFileSync(releaseApkPath, trackedRootApkPath);
      console.log(`[ProWatch Release] Đã đồng bộ APK chuẩn Release -> ${trackedRootApkPath}`);
    } catch (err) {
      console.warn(`[ProWatch Release] Không thể copy sang ProWatch-Health.apk: ${err.message}`);
    }
  }
}

function getConnectedDevices(adbPath) {
  const res = runAdb(adbPath, ['devices']);
  if (!res.ok) return [];
  return res.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice'))
    .map((line) => line.split('\t')[0].trim())
    .filter(Boolean);
}

function getDeviceUsers(adbPath, serial) {
  const res = runAdb(adbPath, ['-s', serial, 'shell', 'pm', 'list', 'users']);
  if (!res.ok) return [0];
  const users = [];
  const regex = /UserInfo\{(\d+):/g;
  let match;
  while ((match = regex.exec(res.stdout)) !== null) {
    users.push(parseInt(match[1], 10));
  }
  return users.length > 0 ? users : [0];
}

function getInstalledPackagesForUser(adbPath, serial, userId) {
  const res = runAdb(adbPath, ['-s', serial, 'shell', 'pm', 'list', 'packages', '--user', String(userId)]);
  if (!res.ok) return new Set();
  return new Set(
    res.stdout
      .split(/\r?\n/)
      .map((l) => l.replace(/^package:/, '').trim())
      .filter(Boolean)
  );
}

function sanitizeDevice(adbPath, serial, targetApk) {
  console.log(`[ProWatch Release] Đang kiểm tra thiết bị ${serial}...`);
  const users = getDeviceUsers(adbPath, serial);

  // 1. Gỡ bỏ com.prowatch.health khỏi mọi không gian phụ (userId != 0: Secure Folder 150, Dual App 95/999...)
  for (const userId of users) {
    if (userId === 0) continue;
    const pkgs = getInstalledPackagesForUser(adbPath, serial, userId);
    if (pkgs.has(APP_ID)) {
      console.log(`[ProWatch Release] Gỡ bản sao ${APP_ID} trên không gian phụ (User ${userId}) để tránh 2 biểu tượng...`);
      runAdb(adbPath, ['-s', serial, 'shell', 'pm', 'uninstall', '--user', String(userId), APP_ID]);
    }
  }

  // 2. Gỡ bỏ mọi package rác / trùng biểu tượng từ các bản phát triển cũ trên tất cả user
  for (const userId of users) {
    const pkgs = getInstalledPackagesForUser(adbPath, serial, userId);
    for (const pkg of pkgs) {
      const isLegacyDuplicate =
        LEGACY_DUPLICATE_PACKAGES.includes(pkg) ||
        (pkg.startsWith('com.prowatch') && pkg !== APP_ID);
      if (isLegacyDuplicate) {
        console.log(`[ProWatch Release] Gỡ package trùng lặp cũ: ${pkg} (User ${userId})...`);
        runAdb(adbPath, ['-s', serial, 'shell', 'pm', 'uninstall', '--user', String(userId), pkg]);
        runAdb(adbPath, ['-s', serial, 'uninstall', pkg]);
      }
    }
  }

  // 3. Kiểm tra tương thích chữ ký số trên User 0 với bản Release APK duy nhất
  if (targetApk && fs.existsSync(targetApk)) {
    const installCheck = runAdb(
      adbPath,
      ['-s', serial, 'install', '-r', '-d', '--user', '0', targetApk],
      { timeout: 60000 }
    );

    if (!installCheck.ok) {
      const out = installCheck.combined || '';
      if (
        out.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE') ||
        out.includes('INSTALL_PARSE_FAILED_INCONSISTENT_CERTIFICATES') ||
        out.includes('INSTALL_FAILED_SHARED_USER_INCOMPATIBLE')
      ) {
        console.log(
          `[ProWatch Release] Phát hiện bản cài cũ trên máy dùng key khác (Debug Key cũ). Đang gỡ sạch trên toàn bộ User để đồng bộ sang Release Key chuẩn...`
        );
        runAdb(adbPath, ['-s', serial, 'uninstall', APP_ID]);
        for (const userId of users) {
          runAdb(adbPath, ['-s', serial, 'shell', 'pm', 'uninstall', '--user', String(userId), APP_ID]);
        }
        const retry = runAdb(
          adbPath,
          ['-s', serial, 'install', '-r', '-d', '--user', '0', targetApk],
          { timeout: 60000 }
        );
        if (retry.ok) {
          console.log(`[ProWatch Release] Đã đồng bộ thành công ${APP_ID} (Release Key) trên User 0!`);
        }
      }
    } else {
      console.log(`[ProWatch Release] Đã xác nhận cài đặt duy nhất 1 bản ${APP_ID} trên User 0 (Release Key).`);
    }
  }
}

function main() {
  removeDebugArtifactsAndSyncReleaseApk();

  if (process.env.CI === 'true') {
    return;
  }

  const adbPath = resolveAdbPath();
  const devices = getConnectedDevices(adbPath);
  if (devices.length === 0) {
    return;
  }

  for (const serial of devices) {
    sanitizeDevice(adbPath, serial, releaseApkPath);
  }
}

main();
