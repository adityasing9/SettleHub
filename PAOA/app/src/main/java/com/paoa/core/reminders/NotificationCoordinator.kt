package com.paoa.core.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.paoa.MainActivity
import com.paoa.domain.model.ReminderMode

class NotificationCoordinator(private val context: Context) {

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    companion object {
        const val CHANNEL_REMINDERS = "paoa_reminders_channel"
        const val CHANNEL_ALARMS = "paoa_alarms_channel"
        const val CHANNEL_BRIEFING = "paoa_briefing_channel"
    }

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val remindersChannel = NotificationChannel(
                CHANNEL_REMINDERS,
                "Task Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies you before scheduled activities start"
                enableVibration(true)
            }

            val alarmsChannel = NotificationChannel(
                CHANNEL_ALARMS,
                "Critical Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Audible alarms for critical tasks and deadlines"
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), null)
                enableVibration(true)
            }

            val briefingChannel = NotificationChannel(
                CHANNEL_BRIEFING,
                "Daily Briefings",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Morning day plan and evening review summaries"
            }

            notificationManager.createNotificationChannel(remindersChannel)
            notificationManager.createNotificationChannel(alarmsChannel)
            notificationManager.createNotificationChannel(briefingChannel)
        }
    }

    fun showTaskReminder(
        taskId: Long,
        title: String,
        reminderMode: ReminderMode,
        scheduledStartTime: Long
    ) {
        val channelId = if (reminderMode == ReminderMode.ALARM) CHANNEL_ALARMS else CHANNEL_REMINDERS

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            taskId.toInt(),
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action: Start Now
        val startIntent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_START_TASK
            putExtra(AlarmScheduler.EXTRA_TASK_ID, taskId)
        }
        val startPendingIntent = PendingIntent.getBroadcast(
            context,
            (taskId * 10 + 1).toInt(),
            startIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action: Snooze
        val snoozeIntent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_SNOOZE
            putExtra(AlarmScheduler.EXTRA_TASK_ID, taskId)
        }
        val snoozePendingIntent = PendingIntent.getBroadcast(
            context,
            (taskId * 10 + 2).toInt(),
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText("Scheduled to start soon. Tap to begin or review.")
            .setPriority(if (reminderMode == ReminderMode.ALARM) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_HIGH)
            .setCategory(if (reminderMode == ReminderMode.ALARM) NotificationCompat.CATEGORY_ALARM else NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .addAction(android.R.drawable.ic_media_play, "Start Now", startPendingIntent)
            .addAction(android.R.drawable.ic_lock_idle_alarm, "Snooze 10m", snoozePendingIntent)

        if (reminderMode == ReminderMode.ALARM) {
            builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
        }

        notificationManager.notify(taskId.toInt(), builder.build())
    }
}
