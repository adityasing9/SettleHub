package com.paoa.scheduler

import com.paoa.core.scheduler.DynamicRescheduler
import com.paoa.domain.model.*
import org.junit.Assert.*
import org.junit.Test
import java.util.Calendar

class DynamicReschedulingTest {

    private val rescheduler = DynamicRescheduler()

    @Test
    fun testDynamicRescheduleProtectsCriticalAndDefersFlexible() {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 17)
            set(Calendar.MINUTE, 0)
        }
        val outingStart = cal.timeInMillis

        cal.set(Calendar.HOUR_OF_DAY, 20)
        val outingEnd = cal.timeInMillis

        // Existing blocks colliding with 5 PM - 8 PM
        val criticalTask = Task(
            id = 10L,
            title = "Project Deadline Submission",
            priority = Priority.CRITICAL,
            estimatedDurationMinutes = 45
        )

        val flexibleTask = Task(
            id = 11L,
            title = "Optional Evening Jog",
            priority = Priority.FLEXIBLE,
            estimatedDurationMinutes = 30
        )

        val collidingBlock1 = ScheduleBlock(
            taskId = 10L,
            title = "Project Deadline Submission",
            startTime = outingStart,
            endTime = outingStart + (45 * 60 * 1000L),
            priority = Priority.CRITICAL
        )

        val collidingBlock2 = ScheduleBlock(
            taskId = 11L,
            title = "Optional Evening Jog",
            startTime = outingStart + (60 * 60 * 1000L),
            endTime = outingStart + (90 * 60 * 1000L),
            priority = Priority.FLEXIBLE
        )

        val result = rescheduler.handleUnavailableInterval(
            unavailableStart = outingStart,
            unavailableEnd = outingEnd,
            reason = "Out with friends",
            currentBlocks = listOf(collidingBlock1, collidingBlock2),
            allActiveTasks = listOf(criticalTask, flexibleTask)
        )

        // Assert unavailable block was added
        val unavailableBlock = result.updatedBlocks.find { it.blockType == BlockType.UNAVAILABLE }
        assertNotNull(unavailableBlock)
        assertEquals("Out with friends", unavailableBlock?.title)

        // Assert flexible task moved to tomorrow
        assertTrue(result.movedToTomorrowTasks.any { it.id == flexibleTask.id })

        // Assert explanation explains adaptation without shaming
        assertTrue(result.humanExplanation.contains("Out with friends"))
        assertTrue(result.humanExplanation.contains("tomorrow"))
    }
}
