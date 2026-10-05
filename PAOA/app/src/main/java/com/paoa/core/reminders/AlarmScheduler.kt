package com.paoa.core.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.paoa.domain.model.ReminderMode
import com.paoa.domain.model.ScheduleBlock
import com.paoa.domain.model.Task

class AlarmScheduler(private val context: Context) {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

    companion object {
        const val ACTION_TRIGGER_REMINDER = "com.paoa.ACTION_TRIGGER_REMINDER"
        const val EXTRA_TASK_ID = "EXTRA_TASK_ID"
        const val EXTRA_TASK_TITLE = "EXTRA_TASK_TITLE"
        const val EXTRA_REMINDER_MODE = "EXTRA_REMINDER_MODE"
        const val EXTRA_SCHEDULED_START = "EXTRA_SCHEDULED_START"
    }

    /**
     * Schedules a reminder separated from the task start time.
     * E.g. Task scheduled for 6:30 AM, Reminder trigger time = 6:20 AM (10 min offset).
     */
    fun scheduleReminder(task: Task, block: ScheduleBlock) {
        if (task.reminderMode == ReminderMode.NONE || alarmManager == null) return

        val reminderOffsetMillis = task.reminderOffsetMinutes * 60 * 1000L
        val triggerTime = block.startTime - reminderOffsetMillis

        // If trigger time is in the past, don't schedule
        if (triggerTime <= System.currentTimeMillis()) return

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TRIGGER_REMINDER
            putExtra(EXTRA_TASK_ID, task.id)
            putExtra(EXTRA_TASK_TITLE, task.title)
            putExtra(EXTRA_REMINDER_MODE, task.reminderMode.name)
            putExtra(EXTRA_SCHEDULED_START, block.startTime)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            task.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val canScheduleExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }

        if (canScheduleExact) {
            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } catch (e: SecurityException) {
                // Fallback to inexact alarm if security exception occurs
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
        } else {
            // Inexact fallback on newer Android versions if user has not granted permission
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
        }
    }

    fun cancelReminder(taskId: Long) {
        if (alarmManager == null) return
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TRIGGER_REMINDER
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            taskId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
        }
    }
}
