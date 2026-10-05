package com.paoa.core.memory

import com.paoa.domain.model.PlannedVsActualLog
import com.paoa.domain.model.Task

class PlannedVsActualEngine {

    data class VarianceSummary(
        val totalSessionsRecorded: Int,
        val averageStartDelayMinutes: Double,
        val averageDurationVarianceMinutes: Double,
        val schedulingAccuracyPercentage: Int
    )

    fun recordSession(
        task: Task,
        plannedStart: Long,
        actualStart: Long,
        plannedDurationMins: Int,
        actualDurationMins: Int,
        reason: String? = null
    ): PlannedVsActualLog {
        val startDelay = maxOf(0, ((actualStart - plannedStart) / (60 * 1000)).toInt())
        val durationVariance = actualDurationMins - plannedDurationMins

        return PlannedVsActualLog(
            taskId = task.id,
            taskTitle = task.title,
            category = task.category,
            plannedStartTime = plannedStart,
            actualStartTime = actualStart,
            plannedDurationMinutes = plannedDurationMins,
            actualDurationMinutes = actualDurationMins,
            startDelayMinutes = startDelay,
            durationVarianceMinutes = durationVariance,
            reason = reason
        )
    }

    fun computeSummary(logs: List<PlannedVsActualLog>): VarianceSummary {
        if (logs.isEmpty()) {
            return VarianceSummary(
                totalSessionsRecorded = 0,
                averageStartDelayMinutes = 0.0,
                averageDurationVarianceMinutes = 0.0,
                schedulingAccuracyPercentage = 100
            )
        }

        val total = logs.size
        val avgDelay = logs.map { it.startDelayMinutes }.average()
        val avgVariance = logs.map { kotlin.math.abs(it.durationVarianceMinutes) }.average()

        // Accuracy score based on percentage of tasks that completed within +/- 20% of estimate
        val accurateCount = logs.count {
            val ratio = if (it.plannedDurationMinutes > 0) {
                it.actualDurationMinutes.toDouble() / it.plannedDurationMinutes.toDouble()
            } else 1.0
            ratio in 0.8..1.2
        }

        val accuracyPct = ((accurateCount.toDouble() / total.toDouble()) * 100).toInt()

        return VarianceSummary(
            totalSessionsRecorded = total,
            averageStartDelayMinutes = avgDelay,
            averageDurationVarianceMinutes = avgVariance,
            schedulingAccuracyPercentage = accuracyPct
        )
    }
}
