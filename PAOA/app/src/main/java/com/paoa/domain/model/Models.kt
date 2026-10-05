package com.paoa.domain.model

enum class Priority(val level: Int, val displayName: String, val colorHex: Long) {
    CRITICAL(4, "Critical", 0xFFEF4444),   // Crimson Red
    IMPORTANT(3, "Important", 0xFFF59E0B), // Amber Gold
    NORMAL(2, "Normal", 0xFF3B82F6),       // Cyan/Blue
    FLEXIBLE(1, "Flexible", 0xFF10B981);   // Emerald Green

    companion object {
        fun fromString(value: String?): Priority {
            return when (value?.uppercase()) {
                "CRITICAL", "URGENT", "P0", "HARD" -> CRITICAL
                "IMPORTANT", "HIGH", "P1" -> IMPORTANT
                "FLEXIBLE", "LOW", "CHILL", "OPTIONAL" -> FLEXIBLE
                else -> NORMAL
            }
        }
    }
}

enum class TaskStatus {
    PLANNED,
    IN_PROGRESS,
    COMPLETED,
    POSTPONED,
    CANCELLED,
    MISSED
}

enum class TaskCategory(val displayName: String) {
    STUDY("Study"),
    PROJECT("Project"),
    ROUTINE("Routine"),
    EXERCISE("Exercise"),
    SOCIAL("Social & Friends"),
    PERSONAL("Personal");

    companion object {
        fun fromString(value: String?): TaskCategory {
            return when (value?.uppercase()) {
                "STUDY", "DSA", "DBMS", "HOMEWORK", "ASSIGNMENT", "EXAM" -> STUDY
                "PROJECT", "CODING", "DEV", "BUILD" -> PROJECT
                "EXERCISE", "RUN", "GYM", "WORKOUT" -> EXERCISE
                "SOCIAL", "FRIENDS", "OUTING", "MOVIE", "DINNER" -> SOCIAL
                "ROUTINE", "HABIT", "CHORES" -> ROUTINE
                else -> PERSONAL
            }
        }
    }
}

enum class ReminderMode {
    ALARM,
    NOTIFICATION,
    NONE,
    SMART
}

enum class BlockType {
    TASK,
    FIXED_EVENT,
    UNAVAILABLE,
    BUFFER,
    SLEEP,
    ROUTINE
}

data class Task(
    val id: Long = 0,
    val title: String,
    val description: String = "",
    val category: TaskCategory = TaskCategory.PERSONAL,
    val priority: Priority = Priority.NORMAL,
    val estimatedDurationMinutes: Int = 45,
    val actualDurationMinutes: Int = 0,
    val deadline: Long? = null,
    val preferredTimeOfDay: String? = null,
    val earliestStart: Long? = null,
    val latestFinish: Long? = null,
    val recurrenceRule: String? = null,
    val status: TaskStatus = TaskStatus.PLANNED,
    val reminderMode: ReminderMode = ReminderMode.ALARM,
    val reminderOffsetMinutes: Int = 10,
    val creationSource: String = "TEXT",
    val postponementCount: Int = 0,
    val completionTimestamp: Long? = null,
    val goalId: Long? = null,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

data class ScheduleBlock(
    val id: Long = 0,
    val taskId: Long? = null,
    val eventId: Long? = null,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val blockType: BlockType = BlockType.TASK,
    val isLocked: Boolean = false,
    val scheduleExplanation: String = "",
    val priority: Priority = Priority.NORMAL
)

data class TimeInterval(
    val start: Long,
    val end: Long
) {
    val durationMinutes: Long get() = (end - start) / (60 * 1000)

    fun overlapsWith(other: TimeInterval): Boolean {
        return start < other.end && end > other.start
    }
}

data class Recommendation(
    val task: Task,
    val scheduledBlock: ScheduleBlock?,
    val rationale: String,
    val urgencyScore: Double,
    val alternativeTasks: List<Task> = emptyList()
)
