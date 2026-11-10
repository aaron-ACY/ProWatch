package com.prowatch.health

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import kotlin.math.min

class WatchNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pickAvatarPromise: Promise? = null

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

  @ReactMethod
  fun downloadAndInstallApk(apkUrl: String, versionTag: String, promise: Promise) {
    promise.resolve(false)
  }

  @ReactMethod
  fun installPendingApk(promise: Promise) {
    promise.resolve(false)
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
