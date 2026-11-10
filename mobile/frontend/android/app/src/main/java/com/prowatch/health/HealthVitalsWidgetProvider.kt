package com.prowatch.health

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews

class HealthVitalsWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId)
    }
  }

  companion object {
    const val PREFS_NAME = "ProWatchWidgets"

    fun updateAllWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, HealthVitalsWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      for (id in ids) {
        updateWidget(context, manager, id)
      }
    }

    fun updateWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int
    ) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val bpm = prefs.getInt("bpm", 0)
      val spo2 = prefs.getInt("spo2", 0)
      val statusText = prefs.getString("statusText", "Chưa đo") ?: "Chưa đo"
      val statusLevel = prefs.getString("statusLevel", "NONE") ?: "NONE"
      val updatedAt = prefs.getString("updatedAt", "--:--") ?: "--:--"

      val views = RemoteViews(context.packageName, R.layout.widget_health_vitals)

      views.setTextViewText(R.id.widget_vitals_updated, updatedAt)
      views.setTextViewText(R.id.widget_vitals_hr_val, if (bpm > 0) bpm.toString() else "--")
      views.setTextViewText(
        R.id.widget_vitals_hr_sub,
        if (bpm > 0) {
          when {
            bpm < 50 -> "Thấp (<50)"
            bpm > 100 -> "Cao (>100)"
            else -> "An toàn 50-100"
          }
        } else {
          "Chưa có số đo"
        }
      )

      views.setTextViewText(R.id.widget_vitals_spo2_val, if (spo2 > 0) spo2.toString() else "--")
      views.setTextViewText(
        R.id.widget_vitals_spo2_sub,
        if (spo2 > 0) {
          if (spo2 >= 95) "Tối ưu 95-100%" else "Thấp (<95%)"
        } else {
          "Chưa có số đo"
        }
      )

      views.setTextViewText(R.id.widget_vitals_status_badge, statusText)
      views.setTextViewText(R.id.widget_vitals_condition_text, statusText)

      when (statusLevel) {
        "HIGH" -> {
          views.setInt(R.id.widget_vitals_status_badge, "setBackgroundResource", R.drawable.bg_widget_status_risk)
          views.setTextColor(R.id.widget_vitals_status_badge, Color.parseColor("#FCA5A5"))
          views.setTextColor(R.id.widget_vitals_condition_text, Color.parseColor("#F87171"))
          views.setTextViewText(R.id.widget_vitals_condition_sub, "Cần kiểm tra ngay")
        }
        "MEDIUM" -> {
          views.setInt(R.id.widget_vitals_status_badge, "setBackgroundResource", R.drawable.bg_widget_status_warn)
          views.setTextColor(R.id.widget_vitals_status_badge, Color.parseColor("#FDE68A"))
          views.setTextColor(R.id.widget_vitals_condition_text, Color.parseColor("#FBBF24"))
          views.setTextViewText(R.id.widget_vitals_condition_sub, "Theo dõi thêm")
        }
        "GOOD" -> {
          views.setInt(R.id.widget_vitals_status_badge, "setBackgroundResource", R.drawable.bg_widget_status_good)
          views.setTextColor(R.id.widget_vitals_status_badge, Color.parseColor("#6EE7B7"))
          views.setTextColor(R.id.widget_vitals_condition_text, Color.parseColor("#34D399"))
          views.setTextViewText(R.id.widget_vitals_condition_sub, "Chỉ số ổn định")
        }
        else -> {
          views.setInt(R.id.widget_vitals_status_badge, "setBackgroundResource", R.drawable.bg_widget_status_none)
          views.setTextColor(R.id.widget_vitals_status_badge, Color.parseColor("#CBD5E1"))
          views.setTextColor(R.id.widget_vitals_condition_text, Color.parseColor("#94A3B8"))
          views.setTextViewText(R.id.widget_vitals_condition_sub, "Đeo đồng hồ để đo")
        }
      }

      val launchIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        appWidgetId,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_vitals_root, pendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}

