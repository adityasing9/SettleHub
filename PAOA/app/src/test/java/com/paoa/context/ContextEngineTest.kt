package com.paoa.context

import com.paoa.core.context.ContextEngine
import com.paoa.domain.model.Priority
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import org.junit.Assert.*
import org.junit.Test

class ContextEngineTest {

    private val contextEngine = ContextEngine()

    @Test
    fun testRecommendHighestUrgencyTask() {
        val now = System.currentTimeMillis()

        val normalTask = Task(
            id = 1L,
            title = "Read Articles",
            category = TaskCategory.PERSONAL,
            priority = Priority.NORMAL,
            estimatedDurationMinutes = 30
        )

        val criticalAssignment = Task(
            id = 2L,
            title = "DBMS Assignment",
            category = TaskCategory.STUDY,
            priority = Priority.CRITICAL,
            deadline = now + (2 * 3600 * 1000L), // Due in 2 hours
            estimatedDurationMinutes = 45
        )

        val recommendation = contextEngine.recommendNextAction(
            activeTasks = listOf(normalTask, criticalAssignment),
            currentBlocks = emptyList(),
            currentTimeMillis = now
        )

        assertNotNull(recommendation)
        assertEquals("DBMS Assignment", recommendation?.task?.title)
        assertTrue(recommendation!!.rationale.contains("DBMS Assignment"))
    }
}
