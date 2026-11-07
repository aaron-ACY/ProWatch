package com.prowatch.health

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class WatchNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var lastDownloadedApkFile: File? = null

  init {
    instance = this
  }

  override fun getName(): String = "WatchNotificationModule"

  @ReactMethod
  fun isPermissionGranted(promise: Promise) {
    try {
      val pkgName = reactApplicationContext.packageName
      val flat = Settings.Secure.getString(
        reactApplicationContext.contentResolver,
        "enabled_notification_listeners"
      )
      val granted = !flat.isNullOrEmpty() && flat.contains(pkgName)
      promise.resolve(granted)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openPermissionSettings(promise: Promise) {
    try {
      val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_SETTINGS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun downloadAndInstallApk(apkUrl: String, versionTag: String, promise: Promise) {
    Thread {
      try {
        val safeTag = versionTag.replace(Regex("[^a-zA-Z0-9._-]"), "")
        val targetFile = File(reactApplicationContext.cacheDir, "ProWatch-Health-$safeTag.apk")
        if (targetFile.exists()) {
          targetFile.delete()
        }

        emitUpdateProgress(2, "connecting")

        var currentUrl = apkUrl
        var redirectCount = 0
        var connection: HttpURLConnection? = null

        while (redirectCount < 6) {
          val url = URL(currentUrl)
          val conn = url.openConnection() as HttpURLConnection
          conn.instanceFollowRedirects = true
          conn.connectTimeout = 20000
          conn.readTimeout = 30000
          conn.setRequestProperty("User-Agent", "ProWatch-Health-AutoUpdater")
          conn.setRequestProperty("Accept", "application/octet-stream, */*")
          conn.connect()

          val code = conn.responseCode
          if (code in 300..399) {
            val location = conn.getHeaderField("Location")
            conn.disconnect()
            if (location.isNullOrEmpty()) break
            currentUrl = location
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
        connection.inputStream.use { input ->
          FileOutputStream(targetFile).use { output ->
            val buffer = ByteArray(16 * 1024)
            var downloadedBytes = 0L
            var lastEmittedPercent = 2
            var bytesRead: Int

            while (input.read(buffer).also { bytesRead = it } != -1) {
              output.write(buffer, 0, bytesRead)
              downloadedBytes += bytesRead
              if (totalBytes > 0) {
                val percent = ((downloadedBytes * 100L) / totalBytes).toInt().coerceIn(3, 99)
                if (percent >= lastEmittedPercent + 2) {
                  lastEmittedPercent = percent
                  emitUpdateProgress(percent, "downloading")
                }
              }
            }
            output.flush()
          }
        }
        connection.disconnect()

        lastDownloadedApkFile = targetFile
        emitUpdateProgress(100, "installing")

        val launched = launchApkInstaller(targetFile)
        promise.resolve(launched)
      } catch (e: Exception) {
        promise.reject("AUTO_UPDATE_ERROR", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  fun installPendingApk(promise: Promise) {
    try {
      val file = lastDownloadedApkFile
      if (file != null && file.exists()) {
        val launched = launchApkInstaller(file)
        promise.resolve(launched)
      } else {
        promise.resolve(false)
      }
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  private fun launchApkInstaller(apkFile: File): String {
    val authority = "${reactApplicationContext.packageName}.FileSystemFileProvider"
    val apkUri = FileProvider.getUriForFile(reactApplicationContext, authority, apkFile)

    val installIntent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(apkUri, "application/vnd.android.package-archive")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    reactApplicationContext.startActivity(installIntent)
    return "INSTALLER_LAUNCHED"
  }

  private fun emitUpdateProgress(percent: Int, stage: String) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    try {
      val params = Arguments.createMap().apply {
        putInt("percent", percent)
        putString("stage", stage)
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AppUpdateProgress", params)
    } catch (_: Exception) {
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

  private fun sendEvent(category: String, title: String, message: String, packageName: String) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    try {
      val params = Arguments.createMap().apply {
        putString("category", category)
        putString("title", title)
        putString("message", message)
        putString("packageName", packageName)
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("WatchSystemNotification", params)
    } catch (_: Exception) {
    }
  }

  companion object {
    @Volatile
    private var instance: WatchNotificationModule? = null

    fun emitSystemNotification(
      category: String,
      title: String,
      message: String,
      packageName: String
    ) {
      instance?.sendEvent(category, title, message, packageName)
    }
  }
}
