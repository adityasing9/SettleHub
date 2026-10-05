package com.paoa.reminders

import com.paoa.core.reminders.MissedTaskEvaluator
import com.paoa.domain.model.Priority
import com.paoa.domain.model.Task
import org.junit.Assert.*
import org.junit.Test

class MissedTaskEvaluatorTest {

    private val evaluator = MissedTaskEvaluator()

    @Test
    fun testCriticalMissedTaskProposesImmediateStart() {
        val criticalTask = Task(
            id = 1L,
            title = "Assignment Submission",
            priority = Priority.CRITICAL,
            estimatedDurationMinutes = 45
        )

        val strategy = evaluator.evaluate(
            task = criticalTask,
            remainingFreeMinutesToday = 120
        )

        assertTrue(strategy is MissedTaskEvaluator.MissedTaskStrategy.ProposeImmediateStart)
    }

    @Test
    fun testNormalTaskWithNoFreeTimeMovesToTomorrow() {
        val normalTask = Task(
            id = 2L,
            title = "DSA Practice",
            priority = Priority.NORMAL,
            estimatedDurationMinutes = 60
        )

        // Only 15 minutes left today, not enough for 60 min session
        val strategy = evaluator.evaluate(
            task = normalTask,
            remainingFreeMinutesToday = 15
        )

        assertTrue(strategy is MissedTaskEvaluator.MissedTaskStrategy.MoveToTomorrow)
        val move = strategy as MissedTaskEvaluator.MissedTaskStrategy.MoveToTomorrow
        assertTrue(move.rationale.contains("tomorrow"))
    }
}
