package com.paoa.domain.model

data class DigitalTwinProfile(
    val userName: String = "Aaditya",
    val wakeTimeMinutes: Int = 7 * 60, // 07:00 AM
    val sleepTimeMinutes: Int = 23 * 60 + 30, // 11:30 PM
    val defaultBufferMinutes: Int = 15,
    val defaultReminderMode: ReminderMode = ReminderMode.ALARM,
    val defaultReminderOffsetMinutes: Int = 10,
    val peakStudyStartHour: Int = 17, // 5:00 PM
    val peakStudyEndHour: Int = 20,   // 8:00 PM
    val averageStudySessionMinutes: Int = 50,
    val maxRecommendedContinuousMinutes: Int = 90,
    val categoryPostponementRate: Map<TaskCategory, Double> = mapOf(
        TaskCategory.STUDY to 0.25,
        TaskCategory.PROJECT to 0.15,
        TaskCategory.EXERCISE to 0.20,
        TaskCategory.ROUTINE to 0.10,
        TaskCategory.SOCIAL to 0.05,
        TaskCategory.PERSONAL to 0.15
    )
)

data class MemoryFact(
    val id: Long = 0,
    val topic: String,
    val fact: String,
    val source: String = "BEHAVIORAL_INFERENCE",
    val confidence: Double = 1.0,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

data class PlannedVsActualLog(
    val id: Long = 0,
    val taskId: Long,
    val taskTitle: String,
    val category: TaskCategory,
    val plannedStartTime: Long,
    val actualStartTime: Long,
    val plannedDurationMinutes: Int,
    val actualDurationMinutes: Int,
    val startDelayMinutes: Int,
    val durationVarianceMinutes: Int,
    val reason: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

sealed interface UserIntent {
    data object WhatShouldIDoNow : UserIntent

    data class ScheduleTask(
        val title: String,
        val durationMinutes: Int = 45,
        val targetDateOffsetDays: Int = 0, // 0 = today, 1 = tomorrow
        val targetHour: Int? = null,
        val targetMinute: Int? = null,
        val preferredTimeOfDay: String? = null, // "MORNING", "EVENING", "NIGHT"
        val priority: Priority = Priority.NORMAL,
        val category: TaskCategory = TaskCategory.PERSONAL,
        val deadline: Long? = null
    ) : UserIntent

    data class RescheduleTask(
        val taskQuery: String,
        val targetDateOffsetDays: Int = 1, // default tomorrow
        val targetHour: Int? = null,
        val targetMinute: Int? = null,
        val reason: String? = null
    ) : UserIntent

    data class SetUnavailable(
        val startHour: Int,
        val startMinute: Int = 0,
        val endHour: Int,
        val endMinute: Int = 0,
        val label: String = "Out / Busy",
        val targetDateOffsetDays: Int = 0
    ) : UserIntent

    data class CompleteTask(
        val taskQuery: String,
        val actualDurationMinutes: Int? = null
    ) : UserIntent

    data class ExplainSchedule(
        val taskQuery: String? = null
    ) : UserIntent

    data object QueryMemory : UserIntent

    data class UpdatePreference(
        val key: String,
        val value: String,
        val rawUserStatement: String
    ) : UserIntent

    data object QueryProductivity : UserIntent

    data class Unknown(val rawText: String) : UserIntent
}
