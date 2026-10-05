package com.paoa.reminders

import com.paoa.domain.model.Priority
import com.paoa.domain.model.ReminderMode
import com.paoa.domain.model.ScheduleBlock
import com.paoa.domain.model.Task
import org.junit.Assert.*
import org.junit.Test
import java.util.Calendar

class ReminderCalculationTest {

    @Test
    fun testTaskTimeAndReminderTimeAreSeparated() {
        // Section 24: Task = 6:30 - 7:00 AM, Reminder = 6:20 AM (10 min prior)
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 6)
            set(Calendar.MINUTE, 30)
            set(Calendar.SECOND, 0)
        }
        val taskStart = cal.timeInMillis
        val taskEnd = taskStart + (30 * 60 * 1000L)

        val task = Task(
            id = 100L,
            title = "Morning Run",
            reminderMode = ReminderMode.ALARM,
            reminderOffsetMinutes = 10
        )

        val block = ScheduleBlock(
            taskId = 100L,
            title = "Morning Run",
            startTime = taskStart,
            endTime = taskEnd
        )

        val triggerTime = block.startTime - (task.reminderOffsetMinutes * 60 * 1000L)

        // Verify task starts at 6:30 AM
        val checkCal = Calendar.getInstance().apply { timeInMillis = block.startTime }
        assertEquals(6, checkCal.get(Calendar.HOUR_OF_DAY))
        assertEquals(30, checkCal.get(Calendar.MINUTE))

        // Verify reminder fires at 6:20 AM (10 minutes before)
        val triggerCal = Calendar.getInstance().apply { timeInMillis = triggerTime }
        assertEquals(6, triggerCal.get(Calendar.HOUR_OF_DAY))
        assertEquals(20, triggerCal.get(Calendar.MINUTE))
        assertNotEquals(block.startTime, triggerTime)
    }
}
