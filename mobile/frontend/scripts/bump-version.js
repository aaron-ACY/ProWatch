const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch'; // 'patch', 'minor', 'major'

const packageJsonPath = path.resolve(__dirname, '../package.json');
const appJsonPath = path.resolve(__dirname, '../app.json');
const versionPropsPath = path.resolve(__dirname, '../android/version.properties');
const appInfoTsPath = path.resolve(__dirname, '../src/config/appInfo.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let [major, minor, patch] = pkg.version.split('.').map(Number);

if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (type === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersionName = `${major}.${minor}.${patch}`;

// Update package.json
pkg.version = newVersionName;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Update app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = newVersionName;
const newVersionCode = (appJson.expo.android.versionCode || 1) + 1;
appJson.expo.android.versionCode = newVersionCode;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

// Update android/version.properties
const today = new Date().toISOString().split('T')[0];
const versionPropsContent = `# ==============================================================================
# PROWATCH HEALTH - THONG TIN PHIEN BAN VA BAN BUILD (VERSION MANAGEMENT)
# ==============================================================================
VERSION_MAJOR=${major}
VERSION_MINOR=${minor}
VERSION_PATCH=${patch}
VERSION_BUILD=${newVersionCode}

VERSION_CODE=${newVersionCode}
VERSION_NAME=${newVersionName}
APP_NAME=ProWatch Health
APPLICATION_ID=com.prowatch.health
RELEASE_DATE=${today}
BUILD_FLAVOR=development
`;
if (fs.existsSync(path.dirname(versionPropsPath))) {
  fs.writeFileSync(versionPropsPath, versionPropsContent, 'utf8');
}

// Update android/app/build.gradle
const buildGradlePath = path.resolve(__dirname, '../android/app/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
  buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersionName}"`);
  fs.writeFileSync(buildGradlePath, buildGradle, 'utf8');
}

// Update src/config/appInfo.ts
if (fs.existsSync(appInfoTsPath)) {
  let appInfo = fs.readFileSync(appInfoTsPath, 'utf8');
  appInfo = appInfo.replace(/version:\s*'[^']*'/, `version: '${newVersionName}'`);
  appInfo = appInfo.replace(/buildNumber:\s*\d+/, `buildNumber: ${newVersionCode}`);
  appInfo = appInfo.replace(/releaseDate:\s*'[^']*'/, `releaseDate: '${today}'`);
  fs.writeFileSync(appInfoTsPath, appInfo, 'utf8');
}

console.log(`=======================================================`);
console.log(`  Da cap nhat phien ban ung dung thanh cong!`);
console.log(`  - Version Name : ${newVersionName}`);
console.log(`  - Version Code : ${newVersionCode}`);
console.log(`  - Release Date : ${today}`);
console.log(`=======================================================`);
