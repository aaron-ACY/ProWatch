const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const adbPath = 'C:\\Users\\huudan\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const appId = 'com.prowatch.health';

function run(cmd, cwd = rootDir) {
  return execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, JAVA_HOME: 'C:\\Program Files\\Java\\jdk-21.0.12' } });
}

// 1. Tự động tìm và dọn dẹp các package rác/debug khác (ví dụ com.prowatch.health.debug)
function cleanupDuplicatePackages() {
  try {
    const out = execSync(`"${adbPath}" shell pm list packages --user 0`, { encoding: 'utf8' });
    const duplicates = out
      .split(/\r?\n/)
      .map(l => l.replace('package:', '').trim())
      .filter(p => p.startsWith('com.prowatch') && p !== appId);

    if (duplicates.length > 0) {
      console.log('⚠️ Phát hiện package thừa / bản debug cũ:', duplicates.join(', '));
      duplicates.forEach(pkgName => {
        console.log(`🗑️ Đang gỡ bỏ package thừa: ${pkgName}...`);
        try {
          execSync(`"${adbPath}" uninstall --user 0 ${pkgName}`, { stdio: 'inherit' });
          console.log(`✅ Đã gỡ thành công: ${pkgName}`);
        } catch (e) {
          console.warn(`Không thể gỡ tự động ${pkgName}:`, e.message);
        }
      });
    }
  } catch (err) {
    // Bỏ qua lỗi shell
  }
}

// 2. Lấy thông tin phiên bản trên user 0 chính xác
function getInstalledVersionUser0() {
  try {
    const output = execSync(`"${adbPath}" shell "dumpsys package ${appId} | grep -E 'versionCode|versionName'"`, { encoding: 'utf8' });
    const codeMatch = output.match(/versionCode=(\d+)/);
    const nameMatch = output.match(/versionName=([^\s]+)/);
    if (codeMatch && nameMatch) {
      return {
        installed: true,
        versionCode: parseInt(codeMatch[1], 10),
        versionName: nameMatch[1],
      };
    }
  } catch (e) {
    // Chưa cài đặt
  }
  return { installed: false };
}

// 3. Kiểm tra các profile phụ (Secure Folder, Dual Apps)
function checkSecondaryUsers() {
  try {
    const usersOut = execSync(`"${adbPath}" shell pm list users`, { encoding: 'utf8' });
    const otherUsers = usersOut
      .split(/\r?\n/)
      .filter(line => line.includes('UserInfo{') && !line.includes('UserInfo{0:'));
    
    if (otherUsers.length > 0) {
      const isSecureFolder = otherUsers.some(u => u.includes('Secure Folder'));
      const isDualApp = otherUsers.some(u => u.includes('DUAL_APP') || u.includes('95:') || u.includes('999:'));
      
      console.log('ℹ️ Phát hiện thiết bị có không gian phụ:');
      otherUsers.forEach(u => console.log('   *', u.trim()));
      if (isSecureFolder) {
        console.log('💡 Lưu ý: Nếu thấy icon có huy hiệu màu xanh, đó là bản trong Secure Folder (Thư mục bảo mật).');
      }
      if (isDualApp) {
        console.log('💡 Lưu ý: Nếu thấy icon có huy hiệu ứng dụng kép, đó là bản Dual Apps/Dual Messenger.');
      }
    }
  } catch (e) {
    // ignore
  }
}

try {
  console.log(`\n=======================================================`);
  console.log(`🚀 QUY TRÌNH CẬP NHẬT PHIÊN BẢN (UPDATE IN-PLACE --user 0)`);
  console.log(`=======================================================\n`);

  // Bước 1: Kiểm tra kết nối ADB
  console.log('🔍 [1/5] Kiểm tra kết nối thiết bị qua ADB...');
  const devicesOutput = execSync(`"${adbPath}" devices`, { encoding: 'utf8' });
  if (!devicesOutput.includes('\tdevice')) {
    throw new Error('Không tìm thấy điện thoại kết nối qua USB! Vui lòng cắm cáp và bật USB Debugging.');
  }
  console.log('✅ Điện thoại đã kết nối sẵn sàng!');

  // Bước 2: Dọn dẹp package thừa & kiểm tra multi-user
  console.log('\n🧹 [2/5] Quét các package trùng lặp và không gian phụ...');
  cleanupDuplicatePackages();
  checkSecondaryUsers();

  // Bước 3: Kiểm tra phiên bản hiện tại trên User 0
  console.log('\n🔎 [3/5] Kiểm tra phiên bản hiện tại trên điện thoại (User 0)...');
  const appInfo = getInstalledVersionUser0();
  if (appInfo.installed) {
    console.log(`📌 Bản hiện tại trên máy: v${appInfo.versionName} (Build ${appInfo.versionCode})`);
    console.log(`🔄 Tự động tăng phiên bản (Bump Version Patch)...`);
    execSync(`node "${path.join(__dirname, 'bump-version.js')}" patch`, { cwd: rootDir, stdio: 'inherit' });
  } else {
    console.log(`ℹ️ Chưa có bản cũ trên User 0. Sẽ tiến hành cài mới lần đầu.`);
  }

  // Đọc version mới nhất
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
  const targetVersionName = pkg.version;
  const targetVersionCode = appJson.expo?.android?.versionCode || 1;

  // Bước 4: Biên dịch Release APK
  console.log(`\n📦 [4/5] Đang biên dịch Release APK: v${targetVersionName} (Build ${targetVersionCode})...`);
  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  try {
    run(`${gradlewCmd} assembleRelease`, androidDir);
  } catch (buildErr) {
    if (process.platform === 'win32') {
      console.warn('\n⚠️ Gradle gặp xung đột khóa file (Windows lock). Đang giải phóng daemon (--stop) và thử lại...');
      try {
        run(`${gradlewCmd} --stop`, androidDir);
      } catch (e) {}
      run(`${gradlewCmd} assembleRelease`, androidDir);
    } else {
      throw buildErr;
    }
  }

  if (!fs.existsSync(apkPath)) {
    throw new Error('Không tìm thấy file APK sau khi build: ' + apkPath);
  }
  console.log('✅ Đã biên dịch xong file APK Release!');

  // Bước 5: Cập nhật đè lên ứng dụng hiện tại (không truyền --user 0 để tránh xung đột Samsung Knox)
  console.log(`\n📲 [5/5] Cập nhật ghi đè trực tiếp lên thiết bị (adb install -r -d)...`);
  execSync(`"${adbPath}" install -r -d "${apkPath}"`, { stdio: 'inherit' });
  console.log('✅ Cập nhật thành công!');

  // Xác nhận lại phiên bản sau khi cập nhật
  const verify = getInstalledVersionUser0();
  if (verify.installed) {
    console.log(`\n🎯 KẾT QUẢ XÁC NHẬN TRÊN ĐIỆN THOẠI (USER 0):`);
    console.log(`   - Version Name : v${verify.versionName}`);
    console.log(`   - Version Code : ${verify.versionCode}`);
    console.log(`   - Trạng thái   : ĐÃ CẬP NHẬT THÀNH CÔNG VÀO BẢN DUY NHẤT`);
  }

  // Khởi chạy app trên user 0
  console.log(`\n✨ Khởi chạy ProWatch Health (v${targetVersionName}) trên User 0...`);
  execSync(`"${adbPath}" shell am start --user 0 -n ${appId}/.MainActivity`, { stdio: 'inherit' });
  console.log('\n🎉 HOÀN TẤT CẬP NHẬT! Không tạo bản sao, dữ liệu người dùng được giữ nguyên 100%.');

} catch (error) {
  console.error('\n❌ Có lỗi xảy ra trong quá trình cập nhật:', error.message);
  process.exit(1);
}
