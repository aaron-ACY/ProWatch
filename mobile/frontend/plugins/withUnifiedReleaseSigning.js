const {
  withAppBuildGradle,
  withGradleProperties,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const UNIFIED_SIGNING_BLOCK = `    signingConfigs {
        // Chi su dung duy nhat 1 Release Keystore (prowatch-release.jks), khong dung ban Debug
        release {
            def candidateFiles = [
                System.getenv('ANDROID_KEYSTORE_PATH') ? file(System.getenv('ANDROID_KEYSTORE_PATH')) : null,
                findProperty('PROWATCH_RELEASE_STORE_FILE') ? file(findProperty('PROWATCH_RELEASE_STORE_FILE')) : null,
                file('prowatch-release.jks'),
                file('../../signing/prowatch-release.jks'),
                file("\${System.getProperty('user.home')}/.prowatch-signing/prowatch-release.jks")
            ].findAll { it != null && it.exists() }

            if (candidateFiles.isEmpty()) {
                throw new GradleException(
                    "Khong tim thay Release Keystore (prowatch-release.jks)! " +
                    "Build bi chan de dam bao tinh nhat quan chu ky so Release."
                )
            }

            def resolvedStorePassword = System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: findProperty('PROWATCH_RELEASE_STORE_PASSWORD')
            def resolvedKeyPassword = System.getenv('ANDROID_KEY_PASSWORD') ?: findProperty('PROWATCH_RELEASE_KEY_PASSWORD') ?: resolvedStorePassword
            def credsFile = file("\${System.getProperty('user.home')}/.prowatch-signing/credentials.txt")
            if ((!resolvedStorePassword || !resolvedKeyPassword) && credsFile.exists()) {
                credsFile.readLines().each { line ->
                    if (line.startsWith('STORE_PASSWORD=')) resolvedStorePassword = line.substring('STORE_PASSWORD='.length()).trim()
                    if (line.startsWith('KEY_PASSWORD=')) resolvedKeyPassword = line.substring('KEY_PASSWORD='.length()).trim()
                }
            }

            storeFile candidateFiles[0]
            storePassword resolvedStorePassword
            keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: findProperty('PROWATCH_RELEASE_KEY_ALIAS') ?: 'prowatch'
            keyPassword resolvedKeyPassword
            v1SigningEnabled true
            v2SigningEnabled true
            enableV3Signing true
            enableV4Signing true
        }
    }`;

const SANITIZE_TASKS_BLOCK = `
// Vo hieu hoa toan bo cac bien the khong phai Release (debug, debugOptimized) — chi xuat ban Release duy nhat
androidComponents {
    beforeVariants(selector().all()) { variantBuilder ->
        if (variantBuilder.buildType != "release") {
            variantBuilder.enable = false
        }
    }
}

// Tu dong dong bo file APK Release va don dep duplicate app / profile phu / xung dot chu ky cu tren thiet bi
tasks.register('sanitizeReleaseDeviceInstall', Exec) {
    workingDir projectRoot
    commandLine 'node', "\${projectRoot}/scripts/prepare-device-install.js", 'release'
    ignoreExitValue = true
}

tasks.matching { it.name == 'assembleRelease' }.configureEach {
    finalizedBy 'sanitizeReleaseDeviceInstall'
}
`;

function withUnifiedReleaseSigning(config) {
  // 1. Copy prowatch-release.jks from signing/ into android/app/ and remove debug artifacts during prebuild
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const srcKeystore = path.join(projectRoot, 'signing', 'prowatch-release.jks');
      const destAppDir = path.join(projectRoot, 'android', 'app');
      const destKeystore = path.join(destAppDir, 'prowatch-release.jks');
      const debugKeystore = path.join(destAppDir, 'debug.keystore');
      const srcDebugDir = path.join(destAppDir, 'src', 'debug');
      const srcDebugOptDir = path.join(destAppDir, 'src', 'debugOptimized');

      if (fs.existsSync(srcKeystore) && fs.existsSync(destAppDir)) {
        fs.copyFileSync(srcKeystore, destKeystore);
      }
      if (fs.existsSync(debugKeystore)) {
        fs.unlinkSync(debugKeystore);
      }
      if (fs.existsSync(srcDebugDir)) {
        fs.rmSync(srcDebugDir, { recursive: true, force: true });
      }
      if (fs.existsSync(srcDebugOptDir)) {
        fs.rmSync(srcDebugOptDir, { recursive: true, force: true });
      }
      return modConfig;
    },
  ]);

  // 2. Ensure non-secret PROWATCH_RELEASE_* properties exist in android/gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const props = modConfig.modResults.filter(
      (item) =>
        !(
          item.type === 'property' &&
          (item.key === 'PROWATCH_RELEASE_STORE_PASSWORD' ||
            item.key === 'PROWATCH_RELEASE_KEY_PASSWORD')
        )
    );
    const setProp = (key, value) => {
      const existing = props.find((item) => item.type === 'property' && item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    setProp('PROWATCH_RELEASE_STORE_FILE', 'prowatch-release.jks');
    setProp('PROWATCH_RELEASE_KEY_ALIAS', 'prowatch');

    modConfig.modResults = props;
    return modConfig;
  });

  // 3. Enforce Release-only signingConfig and disable non-release variants in android/app/build.gradle
  config = withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    const signingConfigsRegex = /signingConfigs\s*\{[\s\S]*?\n    \}/m;
    if (signingConfigsRegex.test(contents)) {
      contents = contents.replace(signingConfigsRegex, UNIFIED_SIGNING_BLOCK);
    }

    contents = contents.replace(
      /debug\s*\{\s*signingConfig\s+signingConfigs\.(debug|release)\s*\}\s*/g,
      ''
    );
    contents = contents.replace(
      /signingConfig\s+signingConfigs\.debug/g,
      'signingConfig signingConfigs.release'
    );

    if (!contents.includes('sanitizeReleaseDeviceInstall')) {
      contents = `${contents.trimEnd()}\n${SANITIZE_TASKS_BLOCK}`;
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });

  return config;
}

module.exports = withUnifiedReleaseSigning;
