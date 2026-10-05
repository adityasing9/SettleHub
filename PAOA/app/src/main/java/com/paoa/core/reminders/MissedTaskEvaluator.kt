package com.paoa.core.reminders

import com.paoa.domain.model.Priority
import com.paoa.domain.model.ScheduleBlock
import com.paoa.domain.model.Task

class MissedTaskEvaluator {

    sealed interface MissedTaskStrategy {
        data class ProposeImmediateStart(val task: Task, val rationale: String) : MissedTaskStrategy
        data class RescheduleLaterToday(val task: Task, val candidateStart: Long, val rationale: String) : MissedTaskStrategy
        data class MoveToTomorrow(val task: Task, val rationale: String) : MissedTaskStrategy
    }

    fun evaluate(
        task: Task,
        remainingFreeMinutesToday: Int,
        currentTimeMillis: Long = System.currentTimeMillis()
    ): MissedTaskStrategy {
        // Critical with near deadline -> immediate start
        if (task.priority == Priority.CRITICAL) {
            return MissedTaskStrategy.ProposeImmediateStart(
                task = task,
                rationale = "This is a Critical task with an active deadline. Do you want to start now?"
            )
        }

        // If today has ample free time to fit the duration
        if (remainingFreeMinutesToday >= task.estimatedDurationMinutes + 15) {
            return MissedTaskStrategy.RescheduleLaterToday(
                task = task,
                candidateStart = currentTimeMillis + (30 * 60 * 1000L),
                rationale = "You didn't get to ${task.title} yet. You have a free slot later today. Would you like to do it then?"
            )
        }

        // Otherwise, move to tomorrow without judgment
        return MissedTaskStrategy.MoveToTomorrow(
            task = task,
            rationale = "Today is nearly full. I've placed ${task.title} on tomorrow's schedule so you can rest tonight."
        )
    }
}
