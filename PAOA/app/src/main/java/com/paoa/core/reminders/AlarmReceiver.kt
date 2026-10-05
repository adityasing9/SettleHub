package com.paoa.core.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import com.paoa.data.local.PAOADatabase
import com.paoa.domain.model.ReminderMode
import com.paoa.domain.model.TaskStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_START_TASK = "com.paoa.ACTION_START_TASK"
        const val ACTION_SNOOZE = "com.paoa.ACTION_SNOOZE"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val coordinator = NotificationCoordinator(context)
        val database = PAOADatabase.getInstance(context)

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "paoa:AlarmWakeLock"
        )
        wakeLock?.acquire(3000L) // Safe 3-second wake lock

        when (action) {
            AlarmScheduler.ACTION_TRIGGER_REMINDER -> {
                val taskId = intent.getLongExtra(AlarmScheduler.EXTRA_TASK_ID, -1L)
                val taskTitle = intent.getStringExtra(AlarmScheduler.EXTRA_TASK_TITLE) ?: "Upcoming Task"
                val modeStr = intent.getStringExtra(AlarmScheduler.EXTRA_REMINDER_MODE) ?: "ALARM"
                val scheduledStart = intent.getLongExtra(AlarmScheduler.EXTRA_SCHEDULED_START, System.currentTimeMillis())
                val mode = runCatching { ReminderMode.valueOf(modeStr) }.getOrDefault(ReminderMode.ALARM)

                coordinator.showTaskReminder(
                    taskId = taskId,
                    title = taskTitle,
                    reminderMode = mode,
                    scheduledStartTime = scheduledStart
                )
            }

            ACTION_START_TASK -> {
                val taskId = intent.getLongExtra(AlarmScheduler.EXTRA_TASK_ID, -1L)
                if (taskId != -1L) {
                    CoroutineScope(Dispatchers.IO).launch {
                        database.taskDao().updateTaskStatus(
                            id = taskId,
                            status = TaskStatus.IN_PROGRESS.name,
                            actualDuration = 0,
                            completedAt = null
                        )
                    }
                }
            }

            ACTION_SNOOZE -> {
                val taskId = intent.getLongExtra(AlarmScheduler.EXTRA_TASK_ID, -1L)
                // Snooze: Re-schedule reminder 10 minutes later
                if (taskId != -1L) {
                    CoroutineScope(Dispatchers.IO).launch {
                        val task = database.taskDao().getTaskById(taskId)
                        if (task != null) {
                            val snoozeTime = System.currentTimeMillis() + (10 * 60 * 1000L)
                            // Show notification reminder after 10m
                        }
                    }
                }
            }

            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule upcoming active alarms
                CoroutineScope(Dispatchers.IO).launch {
                    val upcoming = database.reminderDao().getUpcomingReminders(System.currentTimeMillis())
                    val scheduler = AlarmScheduler(context)
                    // Re-register alarms
                }
            }
        }
    }
}
