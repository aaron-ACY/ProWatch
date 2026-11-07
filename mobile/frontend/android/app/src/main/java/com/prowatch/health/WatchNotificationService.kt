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
    val extras = notification.extras ?: return
    val rawTitle = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
    val rawBigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
    val rawText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
    val body = if (rawBigText.isNotEmpty()) rawBigText else rawText

    if (rawTitle.isEmpty() && body.isEmpty()) return

    // 1. Kiểm tra cuộc gọi (Cuộc gọi thường SIM/GSM + Cuộc gọi qua app Zalo, Messenger, WhatsApp, Telegram, Viber, Skype, Teams, Meet)
    val isCall = isCallNotification(pkg, category, notification, sbn, rawTitle, body)

    // 2. Kiểm tra tin nhắn SMS
    val defaultSmsPkg = try {
      Telephony.Sms.getDefaultSmsPackage(applicationContext) ?: ""
    } catch (_: Exception) {
      ""
    }

    val isSms = !isCall && ((defaultSmsPkg.isNotEmpty() && pkg.equals(defaultSmsPkg, ignoreCase = true)) ||
      pkg.contains("mms", ignoreCase = true) ||
      pkg.contains("com.google.android.apps.messaging", ignoreCase = true) ||
      pkg.contains("com.samsung.android.messaging", ignoreCase = true) ||
      pkg.contains("com.android.messaging", ignoreCase = true))

    // Chỉ nhận Cuộc gọi đến (CALL) và Tin nhắn SMS (SMS)
    if (!isCall && !isSms) {
      return
    }

    // Bỏ qua ongoing notification ngoại trừ cuộc gọi đang đổ chuông
    if (sbn.isOngoing && !isCall) {
      return
    }

    val mappedCategory = if (isCall) "CALL" else "SMS"
    val sourceApp = if (isCall) getCallSourceApp(pkg) else ""

    val finalTitle = when {
      isCall && sourceApp.isNotEmpty() && rawTitle.isNotEmpty() -> "$sourceApp: $rawTitle"
      isCall && sourceApp.isNotEmpty() -> "Cuoc goi $sourceApp"
      isCall && rawTitle.isNotEmpty() -> rawTitle
      isCall -> "Cuoc goi den"
      rawTitle.isNotEmpty() -> rawTitle
      else -> "Tin nhan SMS"
    }

    val finalBody = when {
      isCall && body.isNotEmpty() && !body.equals(rawTitle, ignoreCase = true) -> body
      isCall && sourceApp.isNotEmpty() -> "Dang goi den qua $sourceApp..."
      isCall -> "Dang goi den..."
      body.isNotEmpty() -> body
      else -> "Tin nhan SMS"
    }

    // Chống dội thông báo trùng lặp trong vòng 2.5 giây khi chuông đang reo
    val now = System.currentTimeMillis()
    val signature = "$mappedCategory|$finalTitle|$finalBody"
    if (signature == lastSignature && (now - lastTimestamp) < 2500L) {
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

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    if (sbn == null) return
    val pkg = sbn.packageName ?: return

    val notification = sbn.notification ?: return
    val category = notification.category ?: ""
    val extras = notification.extras
    val rawTitle = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
    val rawText = extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""

    // Nếu thông báo cuộc gọi bị gỡ bỏ (người dùng đã nghe máy, từ chối hoặc người gọi dập máy)
    if (isCallNotification(pkg, category, notification, sbn, rawTitle, rawText)) {
      WatchNotificationModule.emitSystemNotification(
        category = "CALL_END",
        title = "Cuoc goi ket thuc",
        message = "",
        packageName = pkg
      )
    }
  }

  private fun isCallNotification(
    pkg: String,
    category: String,
    notification: Notification,
    sbn: StatusBarNotification,
    title: String,
    body: String
  ): Boolean {
    // A. Danh mục cuộc gọi chuẩn của Android (CATEGORY_CALL)
    if (category == Notification.CATEGORY_CALL) {
      return true
    }

    // B. Kiểm tra trình quay số mặc định của hệ thống
    val isSystemDialer = pkg.contains("dialer", ignoreCase = true) ||
      pkg.contains("incallui", ignoreCase = true) ||
      pkg.contains("telecom", ignoreCase = true) ||
      pkg.contains("com.android.phone", ignoreCase = true) ||
      pkg.contains("com.samsung.android.incallui", ignoreCase = true) ||
      pkg.contains("com.samsung.android.dialer", ignoreCase = true) ||
      pkg.contains("com.google.android.dialer", ignoreCase = true)

    if (isSystemDialer) {
      return true
    }

    // C. Kiểm tra các nút hành động (Notification Actions) - đặc trưng của cuộc gọi đến
    val hasCallAction = notification.actions?.any { action ->
      val actTitle = action.title?.toString()?.lowercase() ?: ""
      actTitle.contains("trả lời") ||
        actTitle.contains("nghe") ||
        actTitle.contains("từ chối") ||
        actTitle.contains("gác máy") ||
        actTitle.contains("answer") ||
        actTitle.contains("decline") ||
        actTitle.contains("reject") ||
        actTitle.contains("accept")
    } ?: false

    if (hasCallAction) {
      return true
    }

    // D. Danh sách các ứng dụng gọi điện / OTT phổ biến
    val isVoipApp = pkg.contains("com.zing.zalo", ignoreCase = true) ||
      pkg.contains("com.facebook.orca", ignoreCase = true) ||
      pkg.contains("com.facebook.katana", ignoreCase = true) ||
      pkg.contains("com.facebook.mlite", ignoreCase = true) ||
      pkg.contains("whatsapp", ignoreCase = true) ||
      pkg.contains("telegram", ignoreCase = true) ||
      pkg.contains("viber", ignoreCase = true) ||
      pkg.contains("skype", ignoreCase = true) ||
      pkg.contains("teams", ignoreCase = true) ||
      pkg.contains("tachyon", ignoreCase = true) ||
      pkg.contains("meetings", ignoreCase = true)

    if (isVoipApp) {
      val combinedText = "$title $body".lowercase()
      val isCallText = combinedText.contains("cuộc gọi") ||
        combinedText.contains("cuoc goi") ||
        combinedText.contains("gọi đến") ||
        combinedText.contains("goi den") ||
        combinedText.contains("đang gọi") ||
        combinedText.contains("dang goi") ||
        combinedText.contains("incoming call") ||
        combinedText.contains("calling") ||
        combinedText.contains("video call")

      if (isCallText) {
        return true
      }
    }

    return false
  }

  private fun getCallSourceApp(pkg: String): String {
    return when {
      pkg.contains("com.zing.zalo", ignoreCase = true) -> "Zalo"
      pkg.contains("com.facebook.orca", ignoreCase = true) ||
      pkg.contains("com.facebook.katana", ignoreCase = true) ||
      pkg.contains("com.facebook.mlite", ignoreCase = true) -> "Messenger"
      pkg.contains("whatsapp", ignoreCase = true) -> "WhatsApp"
      pkg.contains("telegram", ignoreCase = true) -> "Telegram"
      pkg.contains("viber", ignoreCase = true) -> "Viber"
      pkg.contains("skype", ignoreCase = true) -> "Skype"
      pkg.contains("teams", ignoreCase = true) -> "Teams"
      pkg.contains("tachyon", ignoreCase = true) || pkg.contains("meetings", ignoreCase = true) -> "Meet"
      else -> ""
    }
  }
}
