package com.paoa.core.scheduler

import com.paoa.domain.model.*
import java.util.Calendar

class DynamicRescheduler(
    private val schedulingEngine: SmartSchedulingEngine = SmartSchedulingEngine()
) {

    data class RescheduleResult(
        val updatedBlocks: List<ScheduleBlock>,
        val movedToTomorrowTasks: List<Task>,
        val humanExplanation: String
    )

    fun handleUnavailableInterval(
        unavailableStart: Long,
        unavailableEnd: Long,
        reason: String,
        currentBlocks: List<ScheduleBlock>,
        allActiveTasks: List<Task>
    ): RescheduleResult {
        // 1. Create the new unavailable block (e.g., social outing / friends / busy)
        val unavailableBlock = ScheduleBlock(
            title = reason,
            startTime = unavailableStart,
            endTime = unavailableEnd,
            blockType = BlockType.UNAVAILABLE,
            isLocked = true,
            scheduleExplanation = "Reserved for '$reason' ($unavailableStart to $unavailableEnd)."
        )

        // 2. Identify colliding blocks
        val conflictInterval = TimeInterval(unavailableStart, unavailableEnd)
        val collidingBlocks = currentBlocks.filter { block ->
            block.blockType == BlockType.TASK &&
                    TimeInterval(block.startTime, block.endTime).overlapsWith(conflictInterval)
        }

        val nonCollidingBlocks = currentBlocks.filter { !collidingBlocks.contains(it) }.toMutableList()
        nonCollidingBlocks.add(unavailableBlock)

        // 3. Separate colliding tasks by Priority
        val collidingTaskIds = collidingBlocks.mapNotNull { it.taskId }.toSet()
        val collidingTasks = allActiveTasks.filter { collidingTaskIds.contains(it.id) }

        val criticalOrImportant = collidingTasks.filter { it.priority == Priority.CRITICAL || it.priority == Priority.IMPORTANT }
        val flexibleOrNormal = collidingTasks.filter { it.priority == Priority.NORMAL || it.priority == Priority.FLEXIBLE }

        // Flexible items moved to tomorrow to avoid evening cramming
        val movedToTomorrow = mutableListOf<Task>()
        val tasksToRescheduleToday = criticalOrImportant.toMutableList()

        for (task in flexibleOrNormal) {
            if (task.priority == Priority.FLEXIBLE) {
                // Postpone flexible tasks to tomorrow
                movedToTomorrow.add(task)
            } else {
                // Try to keep normal tasks if time permits, or defer
                tasksToRescheduleToday.add(task)
            }
        }

        // 4. Run scheduling engine on the remaining day with the unavailable block fixed
        val scheduleOutput = schedulingEngine.scheduleDay(
            tasks = tasksToRescheduleToday,
            existingBlocks = nonCollidingBlocks,
            baseTimeMillis = System.currentTimeMillis()
        )

        // Any tasks unplaced by the scheduler also get safely moved to tomorrow
        movedToTomorrow.addAll(scheduleOutput.unplacedTasks)

        val finalBlocks = (nonCollidingBlocks + scheduleOutput.scheduledBlocks).sortedBy { it.startTime }

        // 5. Build empathetic, objective explanation
        val explanation = buildDynamicExplanation(
            reason = reason,
            protectedTasks = criticalOrImportant,
            movedTasks = movedToTomorrow
        )

        return RescheduleResult(
            updatedBlocks = finalBlocks,
            movedToTomorrowTasks = movedToTomorrow,
            humanExplanation = explanation
        )
    }

    private fun buildDynamicExplanation(
        reason: String,
        protectedTasks: List<Task>,
        movedTasks: List<Task>
    ): String {
        val parts = mutableListOf<String>()
        parts.add("Your schedule has been adapted for '$reason'.")

        if (protectedTasks.isNotEmpty()) {
            val names = protectedTasks.joinToString(", ") { it.title }
            parts.add("Protected your critical focus on $names.")
        }

        if (movedTasks.isNotEmpty()) {
            val names = movedTasks.joinToString(", ") { it.title }
            parts.add("Moved $names to tomorrow to preserve your rest and prevent late-night cramming.")
        }

        return parts.joinToString(" ")
    }
}
