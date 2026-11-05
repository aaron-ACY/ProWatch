package com.prowatch.health

import android.app.Notification
import android.provider.Telephony
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class WatchNotificationService : NotificationListenerService() {

  private var lastSignature: String = ""
  private var lastTimestamp: Long = 0L

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    val pkg = sbn.packageName ?: return

    // Bỏ qua thông báo của chính ứng dụng ProWatch hoặc hệ thống Android nền
    if (pkg == applicationContext.packageName || pkg == "android" || pkg == "com.android.systemui") {
      return
    }

    val notification = sbn.notification ?: return

    // Bỏ qua group summary notification để tránh trùng lặp
    if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) {
      return
    }

    val category = notification.category ?: ""
    val defaultSmsPkg = try {
      Telephony.Sms.getDefaultSmsPackage(applicationContext) ?: ""
    } catch (_: Exception) {
      ""
    }

    val isCall = category == Notification.CATEGORY_CALL ||
      pkg.contains("dialer", ignoreCase = true) ||
      pkg.contains("incallui", ignoreCase = true) ||
      pkg.contains("telecom", ignoreCase = true)

    val isSms = (defaultSmsPkg.isNotEmpty() && pkg.equals(defaultSmsPkg, ignoreCase = true)) ||
      pkg.contains("mms", ignoreCase = true) ||
      pkg.contains("com.google.android.apps.messaging", ignoreCase = true) ||
      pkg.contains("com.samsung.android.messaging", ignoreCase = true) ||
      pkg.contains("com.android.messaging", ignoreCase = true)

    // Chỉ nhận Cuộc gọi đến (CALL) và Tin nhắn SMS (SMS), bỏ qua tất cả các ứng dụng khác trên điện thoại
    if (!isCall && !isSms) {
      return
    }

    // Bỏ qua ongoing notification ngoại trừ cuộc gọi đến
    if (sbn.isOngoing && !isCall) {
      return
    }

    val extras = notification.extras ?: return
    val rawTitle = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
    val rawBigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
    val rawText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
    val body = if (rawBigText.isNotEmpty()) rawBigText else rawText

    if (rawTitle.isEmpty() && body.isEmpty()) return

    val mappedCategory = if (isCall) "CALL" else "SMS"
    val fallbackLabel = if (isCall) "Cuoc goi den" else "Tin nhan SMS"
    val finalTitle = if (rawTitle.isNotEmpty()) rawTitle else fallbackLabel
    val finalBody = if (body.isNotEmpty()) body else fallbackLabel

    // Chống dội thông báo trùng lặp trong vòng 2 giây
    val now = System.currentTimeMillis()
    val signature = "$mappedCategory|$finalTitle|$finalBody"
    if (signature == lastSignature && (now - lastTimestamp) < 2000L) {
      return
    }
    lastSignature = signature
    lastTimestamp = now

    WatchNotificationModule.emitSystemNotification(
      category = mappedCategory,
      title = finalTitle,
      message = finalBody,
      packageName = pkg
    )
  }
}
