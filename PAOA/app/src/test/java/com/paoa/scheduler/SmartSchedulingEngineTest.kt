package com.paoa.scheduler

import com.paoa.core.scheduler.SmartSchedulingEngine
import com.paoa.domain.model.Priority
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import org.junit.Assert.*
import org.junit.Test
import java.util.Calendar

class SmartSchedulingEngineTest {

    private val scheduler = SmartSchedulingEngine()

    @Test
    fun testTaskSplittingForLongSessions() {
        val longStudyTask = Task(
            id = 1L,
            title = "DSA Marathon",
            category = TaskCategory.STUDY,
            estimatedDurationMinutes = 120, // > 90 mins -> should be split into two 60 min blocks
            priority = Priority.NORMAL
        )

        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 8)
            set(Calendar.MINUTE, 0)
        }

        val result = scheduler.scheduleDay(listOf(longStudyTask), emptyList(), cal.timeInMillis)

        // Verify task was split into 2 blocks
        assertEquals(2, result.scheduledBlocks.size)
        assertTrue(result.scheduledBlocks[0].title.contains("Part 1"))
        assertTrue(result.scheduledBlocks[1].title.contains("Part 2"))
        val durationMinutes = (result.scheduledBlocks[0].endTime - result.scheduledBlocks[0].startTime) / (60 * 1000L)
        assertEquals(60L, durationMinutes)
    }

    @Test
    fun testExplainabilityRationaleGenerated() {
        val task = Task(
            id = 2L,
            title = "DBMS Assignment",
            category = TaskCategory.STUDY,
            estimatedDurationMinutes = 45,
            priority = Priority.IMPORTANT
        )

        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 10)
            set(Calendar.MINUTE, 0)
        }

        val result = scheduler.scheduleDay(listOf(task), emptyList(), cal.timeInMillis)

        assertTrue(result.scheduledBlocks.isNotEmpty())
        val block = result.scheduledBlocks.first()
        assertTrue(block.scheduleExplanation.isNotBlank())
    }
}
