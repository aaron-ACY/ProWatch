package com.prowatch.health

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.NumberFormat
import java.util.Locale

class FitnessWidgetProvider : AppWidgetProvider() {

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
      val component = ComponentName(context, FitnessWidgetProvider::class.java)
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
      val steps = prefs.getInt("steps", 0)
      val stepsGoal = prefs.getInt("stepsGoal", 10000).coerceAtLeast(1)
      val calories = prefs.getInt("calories", 0)
      val caloGoal = prefs.getInt("caloGoal", 500).coerceAtLeast(1)
      val rawActivity = prefs.getString("activity", "Nghỉ ngơi") ?: "Nghỉ ngơi"

      val stepsPct = ((steps.toFloat() / stepsGoal.toFloat()) * 100f).toInt().coerceIn(0, 100)
      val caloPct = ((calories.toFloat() / caloGoal.toFloat()) * 100f).toInt().coerceIn(0, 100)
      val distKm = String.format(Locale.US, "%.2f", (steps * 0.72f) / 1000f)

      val actUpper = rawActivity.uppercase(Locale.ROOT)
      val activityLabel = when {
        actUpper.contains("RUN") || actUpper.contains("CHẠY") -> "Đang chạy bộ"
        actUpper.contains("WALK") || actUpper.contains("ĐI BỘ") -> "Đang đi bộ"
        actUpper.contains("SLEEP") || actUpper.contains("NGỦ") -> "Đang ngủ"
        steps > 0 -> "Vận động"
        else -> "Nghỉ ngơi"
      }

      val fmt = NumberFormat.getIntegerInstance(Locale.US)
      val views = RemoteViews(context.packageName, R.layout.widget_fitness)

      views.setTextViewText(R.id.widget_fitness_activity_badge, activityLabel)
      views.setTextViewText(R.id.widget_fitness_steps_pct, "$stepsPct%")
      views.setTextViewText(
        R.id.widget_fitness_steps_val,
        "${fmt.format(steps)} / ${fmt.format(stepsGoal)}"
      )
      views.setProgressBar(R.id.widget_fitness_steps_progress, 100, stepsPct, false)

      views.setTextViewText(
        R.id.widget_fitness_calo_val,
        "${fmt.format(calories)} / ${fmt.format(caloGoal)} kcal"
      )
      views.setProgressBar(R.id.widget_fitness_calo_progress, 100, caloPct, false)
      views.setTextViewText(R.id.widget_fitness_dist_val, "Quãng đường: $distKm km")

      val launchIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        appWidgetId + 10000,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_fitness_root, pendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}

