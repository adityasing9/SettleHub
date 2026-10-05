package com.paoa.core.memory

import com.paoa.domain.model.*

class DigitalTwinLearner {

    data class ProcrastinationInsight(
        val category: TaskCategory,
        val postponementRate: Double,
        val neutralObservation: String,
        val actionableRecommendation: String
    )

    fun analyzePostponementPatterns(
        tasks: List<Task>,
        postponements: List<PlannedVsActualLog>
    ): List<ProcrastinationInsight> {
        val insights = mutableListOf<ProcrastinationInsight>()

        // Group by category
        val byCategory = tasks.groupBy { it.category }

        for ((category, categoryTasks) in byCategory) {
            val totalInCat = categoryTasks.size
            if (totalInCat == 0) continue

            val postponedTasks = categoryTasks.filter { it.postponementCount > 0 }
            val rate = postponedTasks.size.toDouble() / totalInCat.toDouble()

            if (rate >= 0.3) {
                val percentage = (rate * 100).toInt()
                val (obs, rec) = when (category) {
                    TaskCategory.STUDY -> {
                        "Study sessions scheduled later in the evening have a $percentage% postponement frequency." to
                                "Consider scheduling study sessions earlier (5:00 PM – 7:30 PM) or breaking them into 30-45 minute blocks."
                    }
                    TaskCategory.EXERCISE -> {
                        "Workout routines have been postponed $percentage% of the time when placed after long study blocks." to
                                "Try scheduling exercise right before dinner or earlier in the afternoon."
                    }
                    TaskCategory.PROJECT -> {
                        "Project tasks show a $percentage% postponement rate, usually due to large session sizes." to
                                "Decompose large project goals into discrete 30-minute milestones."
                    }
                    else -> {
                        "$category activities have a $percentage% postponement rate." to
                                "Adjust session lengths or schedule with a wider 20-minute buffer."
                    }
                }

                insights.add(
                    ProcrastinationInsight(
                        category = category,
                        postponementRate = rate,
                        neutralObservation = obs,
                        actionableRecommendation = rec
                    )
                )
            }
        }

        return insights
    }

    fun learnEstimatedDuration(
        currentEstimateMinutes: Int,
        actualMinutes: Int,
        sampleCount: Int = 1
    ): Int {
        if (actualMinutes <= 0) return currentEstimateMinutes
        // Exponential moving average update: Alpha = 0.3
        val alpha = 0.3
        val updated = (currentEstimateMinutes * (1.0 - alpha)) + (actualMinutes * alpha)
        return updated.toInt()
    }
}
