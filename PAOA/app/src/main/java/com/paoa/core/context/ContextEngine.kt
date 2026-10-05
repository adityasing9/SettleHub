package com.paoa.core.context

import com.paoa.domain.model.*
import java.util.Calendar

class ContextEngine(
    private val digitalTwin: DigitalTwinProfile = DigitalTwinProfile()
) {

    fun recommendNextAction(
        activeTasks: List<Task>,
        currentBlocks: List<ScheduleBlock>,
        currentTimeMillis: Long = System.currentTimeMillis()
    ): Recommendation? {
        if (activeTasks.isEmpty()) return null

        val currentHour = Calendar.getInstance().apply { timeInMillis = currentTimeMillis }.get(Calendar.HOUR_OF_DAY)

        // Find next upcoming block or commitment
        val upcomingBlock = currentBlocks
            .filter { it.startTime > currentTimeMillis }
            .minByOrNull { it.startTime }

        val availableMinutes = if (upcomingBlock != null) {
            ((upcomingBlock.startTime - currentTimeMillis) / (60 * 1000)).toInt()
        } else {
            120 // 2 hours default available window
        }

        // Score all pending tasks
        val scoredCandidates = activeTasks.map { task ->
            val score = calculateTaskScore(task, currentHour, availableMinutes, currentTimeMillis)
            task to score
        }.sortedByDescending { it.second }

        val bestTask = scoredCandidates.firstOrNull()?.first ?: return null
        val bestScore = scoredCandidates.firstOrNull()?.second ?: 0.0
        val alternatives = scoredCandidates.drop(1).take(2).map { it.first }

        val rationale = buildRecommendationRationale(bestTask, currentHour, availableMinutes, currentTimeMillis)

        val scheduledBlock = currentBlocks.find { it.taskId == bestTask.id && it.startTime <= currentTimeMillis && it.endTime > currentTimeMillis }

        return Recommendation(
            task = bestTask,
            scheduledBlock = scheduledBlock,
            rationale = rationale,
            urgencyScore = bestScore,
            alternativeTasks = alternatives
        )
    }

    private fun calculateTaskScore(
        task: Task,
        currentHour: Int,
        availableMinutes: Int,
        now: Long
    ): Double {
        var score = 0.0

        // 1. Priority weight (Critical=40, Important=25, Normal=15, Flexible=5)
        score += when (task.priority) {
            Priority.CRITICAL -> 40.0
            Priority.IMPORTANT -> 25.0
            Priority.NORMAL -> 15.0
            Priority.FLEXIBLE -> 5.0
        }

        // 2. Deadline Urgency (Within next 6 hours gives huge boost)
        task.deadline?.let { dl ->
            val hoursRemaining = (dl - now) / (1000.0 * 3600.0)
            if (hoursRemaining in 0.0..6.0) {
                score += 35.0 * (1.0 - (hoursRemaining / 6.0))
            } else if (hoursRemaining < 0.0) {
                score += 45.0 // Overdue
            }
        }

        // 3. Peak Focus Alignment
        if (task.category == TaskCategory.STUDY && currentHour in digitalTwin.peakStudyStartHour..digitalTwin.peakStudyEndHour) {
            score += 20.0
        }

        // 4. Duration Window Fit (favor task that fits comfortably in remaining free time)
        if (task.estimatedDurationMinutes <= availableMinutes) {
            score += 15.0
        } else {
            score -= 10.0 // Might overrun into the next appointment
        }

        // 5. Postponement recovery boost
        if (task.postponementCount > 0) {
            score += minOf(15.0, task.postponementCount * 5.0)
        }

        return score
    }

    private fun buildRecommendationRationale(
        task: Task,
        currentHour: Int,
        availableMinutes: Int,
        now: Long
    ): String {
        val deadlineText = task.deadline?.let { dl ->
            val hoursLeft = ((dl - now) / (1000 * 3600)).toInt()
            if (hoursLeft in 0..12) " (Deadline approaching in $hoursLeft hrs)" else ""
        } ?: ""

        val peakText = if (task.category == TaskCategory.STUDY && currentHour in digitalTwin.peakStudyStartHour..digitalTwin.peakStudyEndHour) {
            " You are currently in your peak focus window (${digitalTwin.peakStudyStartHour}:00-${digitalTwin.peakStudyEndHour}:00)."
        } else ""

        val fitText = " You have approximately $availableMinutes minutes available, which fits this ${task.estimatedDurationMinutes}-minute session."

        return "Focus on ${task.title}$deadlineText.$peakText$fitText"
    }
}
