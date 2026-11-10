package com.prowatch.health

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.min

class WatchNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pickAvatarPromise: Promise? = null
  @Volatile
  private var lastDownloadedApkFile: File? = null

  companion object {
    private const val REQUEST_PICK_AVATAR = 49102
  }

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "WatchNotificationModule"

  @ReactMethod
  fun isPermissionGranted(promise: Promise) {
    promise.resolve(true)
  }

  @ReactMethod
  fun openPermissionSettings(promise: Promise) {
    promise.resolve(true)
  }

  /**
   * Tải trực tiếp gói cài đặt APK từ GitHub Releases ngay trong giao diện ứng dụng,
   * phát sự kiện tiến trình AppUpdateProgress (percent, stage, downloadedMB, totalMB)
   * và tự động mở trình cài đặt Android PackageInstaller khi tải xong.
   */
  @ReactMethod
  fun downloadAndInstallApk(apkUrl: String, versionTag: String, promise: Promise) {
    Thread {
      try {
        val safeTag = versionTag.replace(Regex("[^a-zA-Z0-9._-]"), "")
        val cacheDir = reactApplicationContext.cacheDir
        // Dọn dẹp các file APK bản cũ trong cache để giải phóng bộ nhớ
        cacheDir.listFiles()?.forEach { f ->
          if (f.name.startsWith("ProWatch-Health-") && f.name.endsWith(".apk")) {
            try { f.delete() } catch (_: Exception) {}
          }
        }

        val targetFile = File(cacheDir, "ProWatch-Health-$safeTag.apk")
        emitUpdateProgress(2, "connecting", 0.0, 0.0)

        var currentUrl = apkUrl
        var redirectCount = 0
        var connection: HttpURLConnection? = null

        while (redirectCount < 10) {
          val url = URL(currentUrl)
          val conn = url.openConnection() as HttpURLConnection
          conn.instanceFollowRedirects = false
          conn.connectTimeout = 20000
          conn.readTimeout = 45000
          conn.setRequestProperty("User-Agent", "ProWatch-Health-AutoUpdater/1.0")
          conn.setRequestProperty("Accept", "application/octet-stream, application/vnd.android.package-archive, */*")
          conn.connect()

          val code = conn.responseCode
          if (code in 300..399) {
            val location = conn.getHeaderField("Location")
            conn.disconnect()
            if (location.isNullOrEmpty()) break
            currentUrl = URL(url, location).toString()
            redirectCount++
            continue
          }
          connection = conn
          break
        }

        if (connection == null || connection.responseCode != HttpURLConnection.HTTP_OK) {
          val errCode = connection?.responseCode ?: -1
          connection?.disconnect()
          promise.reject("DOWNLOAD_FAILED", "HTTP error code: $errCode")
          return@Thread
        }

        val totalBytes = connection.contentLengthLong
        val totalMB = if (totalBytes > 0) totalBytes.toDouble() / (1024.0 * 1024.0) else 55.0

        connection.inputStream.use { input ->
          FileOutputStream(targetFile).use { output ->
            val buffer = ByteArray(32 * 1024)
            var downloadedBytes = 0L
            var lastEmittedPercent = 2
            var bytesRead: Int

            while (input.read(buffer).also { bytesRead = it } != -1) {
              output.write(buffer, 0, bytesRead)
              downloadedBytes += bytesRead
              val downloadedMB = downloadedBytes.toDouble() / (1024.0 * 1024.0)
              val percent = if (totalBytes > 0) {
                ((downloadedBytes * 100L) / totalBytes).toInt().coerceIn(3, 99)
              } else {
                ((downloadedMB / totalMB) * 95.0).toInt().coerceIn(3, 95)
              }
              if (percent >= lastEmittedPercent + 1) {
                lastEmittedPercent = percent
                emitUpdateProgress(percent, "downloading", downloadedMB, totalMB)
              }
            }
            output.flush()
          }
        }
        connection.disconnect()

        if (!targetFile.exists() || targetFile.length() < 100_000L) {
          promise.reject("INVALID_APK", "Gói APK tải về không hợp lệ hoặc bị gián đoạn.")
          return@Thread
        }

        lastDownloadedApkFile = targetFile
        val finalMB = targetFile.length().toDouble() / (1024.0 * 1024.0)
        emitUpdateProgress(100, "installing", finalMB, finalMB)

        val result = launchApkInstaller(targetFile)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("AUTO_UPDATE_ERROR", e.message, e)
      }
    }.start()
  }

  /**
   * Kích hoạt cài đặt gói APK đã tải sẵn trong cache (ví dụ sau khi người dùng vừa cấp quyền Unknown Sources).
   */
  @ReactMethod
  fun installPendingApk(promise: Promise) {
    try {
      val file = lastDownloadedApkFile
      if (file != null && file.exists() && file.length() > 100_000L) {
        val result = launchApkInstaller(file)
        promise.resolve(result)
      } else {
        promise.resolve("NO_PENDING_APK")
      }
    } catch (e: Exception) {
      promise.reject("INSTALL_PENDING_ERROR", e.message, e)
    }
  }

  private fun launchApkInstaller(apkFile: File): String {
    val ctx = reactApplicationContext
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (!ctx.packageManager.canRequestPackageInstalls()) {
        val manageIntent = Intent(
          Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:${ctx.packageName}")
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val activity = ctx.currentActivity
        if (activity != null) {
          activity.startActivity(manageIntent)
        } else {
          ctx.startActivity(manageIntent)
        }
        return "NEED_UNKNOWN_SOURCES_PERMISSION"
      }
    }

    val authority = "${ctx.packageName}.FileSystemFileProvider"
    val apkUri = FileProvider.getUriForFile(ctx, authority, apkFile)

    val installIntent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(apkUri, "application/vnd.android.package-archive")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    val activity = ctx.currentActivity
    if (activity != null) {
      activity.startActivity(installIntent)
    } else {
      ctx.startActivity(installIntent)
    }
    return "INSTALLER_LAUNCHED"
  }

  private fun emitUpdateProgress(percent: Int, stage: String, downloadedMB: Double, totalMB: Double) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    try {
      val params = Arguments.createMap().apply {
        putInt("percent", percent)
        putString("stage", stage)
        putDouble("downloadedMB", downloadedMB)
        putDouble("totalMB", totalMB)
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AppUpdateProgress", params)
    } catch (_: Exception) {
    }
  }

  /**
   * Mở trình chọn ảnh hệ thống Android (ACTION_GET_CONTENT - không cần quyền READ_EXTERNAL_STORAGE),
   * cắt vuông và nén về 256x256 JPEG Base64 Data URI để lưu làm Avatar.
   */
  @ReactMethod
  fun pickAvatarImage(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "Không tìm thấy cửa sổ ứng dụng hiện tại.")
      return
    }
    pickAvatarPromise = promise
    try {
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
        type = "image/*"
        addCategory(Intent.CATEGORY_OPENABLE)
      }
      activity.startActivityForResult(
        Intent.createChooser(intent, "Chọn ảnh đại diện"),
        REQUEST_PICK_AVATAR
      )
    } catch (e: Exception) {
      pickAvatarPromise = null
      promise.reject("E_PICKER_ERROR", e.message, e)
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?
  ) {
    if (requestCode != REQUEST_PICK_AVATAR) return
    val promise = pickAvatarPromise ?: return
    pickAvatarPromise = null

    if (resultCode != Activity.RESULT_OK || data?.data == null) {
      promise.reject("E_PICKER_CANCELLED", "Đã hủy chọn ảnh.")
      return
    }

    try {
      val uri = data.data!!
      val inputStream = reactApplicationContext.contentResolver.openInputStream(uri)
      val original = BitmapFactory.decodeStream(inputStream)
      inputStream?.close()

      if (original == null) {
        promise.reject("E_DECODE_FAILED", "Không thể đọc định dạng ảnh này.")
        return
      }

      val side = min(original.width, original.height)
      val xOffset = (original.width - side) / 2
      val yOffset = (original.height - side) / 2
      val square = Bitmap.createBitmap(original, xOffset, yOffset, side, side)
      val scaled = Bitmap.createScaledBitmap(square, 256, 256, true)

      val out = ByteArrayOutputStream()
      scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
      val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
      promise.resolve("data:image/jpeg;base64,$base64")
    } catch (e: Exception) {
      promise.reject("E_PROCESS_IMAGE", e.message, e)
    }
  }

  override fun onNewIntent(intent: Intent) {
    // No-op
  }

  /**
   * Cập nhật dữ liệu thời gian thực cho cả 2 Widget trên màn hình chính Android:
   * 1. HealthVitalsWidgetProvider (Heart Rate, SpO2 & Status)
   * 2. FitnessWidgetProvider (Steps, Calories, Distance & Activity)
   */
  @ReactMethod
  fun updateHomeWidgets(
    bpm: Int,
    spo2: Int,
    statusText: String,
    statusLevel: String,
    steps: Int,
    stepsGoal: Int,
    calories: Int,
    caloGoal: Int,
    activity: String,
    updatedAt: String,
    promise: Promise
  ) {
    try {
      val ctx = reactApplicationContext
      val prefs = ctx.getSharedPreferences(HealthVitalsWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit()
        .putInt("bpm", bpm)
        .putInt("spo2", spo2)
        .putString("statusText", statusText)
        .putString("statusLevel", statusLevel)
        .putInt("steps", steps)
        .putInt("stepsGoal", stepsGoal)
        .putInt("calories", calories)
        .putInt("caloGoal", caloGoal)
        .putString("activity", activity)
        .putString("updatedAt", updatedAt)
        .apply()

      HealthVitalsWidgetProvider.updateAllWidgets(ctx)
      FitnessWidgetProvider.updateAllWidgets(ctx)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /**
   * Yêu cầu ghim trực tiếp 1 trong 2 Widget ra màn hình chính Android (Android 8.0+)
   */
  @ReactMethod
  fun requestPinWidget(widgetType: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(false)
      return
    }
    try {
      val ctx = reactApplicationContext
      val appWidgetManager = AppWidgetManager.getInstance(ctx)
      if (!appWidgetManager.isRequestPinAppWidgetSupported) {
        promise.resolve(false)
        return
      }
      val providerClass = if (widgetType.lowercase() == "fitness") {
        FitnessWidgetProvider::class.java
      } else {
        HealthVitalsWidgetProvider::class.java
      }
      val componentName = ComponentName(ctx, providerClass)
      val pinned = appWidgetManager.requestPinAppWidget(componentName, null, null)
      promise.resolve(pinned)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter compatibility
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter compatibility
  }
}
