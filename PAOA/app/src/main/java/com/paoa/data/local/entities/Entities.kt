package com.paoa.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val id: Long = 1L,
    val name: String = "Aaditya",
    val preferredLanguage: String = "en-US",
    val interactionStyle: String = "concise",
    val typicalWakeTime: String = "07:00",
    val typicalSleepTime: String = "23:30",
    val defaultReminderMode: String = "ALARM",
    val defaultBufferMinutes: Int = 15,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "user_preferences",
    indices = [Index(value = ["preferenceKey"], unique = true)]
)
data class UserPreferenceEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val category: String,
    val preferenceKey: String,
    val preferenceValue: String,
    val confidenceScore: Double = 1.0,
    val isUserDefined: Boolean = true,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "tasks",
    indices = [
        Index(value = ["status"]),
        Index(value = ["deadline"]),
        Index(value = ["category"])
    ]
)
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val description: String = "",
    val category: String = "PERSONAL",
    val priority: String = "NORMAL",
    val estimatedDurationMinutes: Int = 45,
    val actualDurationMinutes: Int = 0,
    val deadline: Long? = null,
    val preferredTimeOfDay: String? = null,
    val earliestStart: Long? = null,
    val latestFinish: Long? = null,
    val recurrenceRule: String? = null,
    val status: String = "PLANNED",
    val reminderMode: String = "ALARM",
    val reminderOffsetMinutes: Int = 10,
    val creationSource: String = "TEXT",
    val postponementCount: Int = 0,
    val completionTimestamp: Long? = null,
    val goalId: Long? = null,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "task_dependencies",
    foreignKeys = [
        ForeignKey(
            entity = TaskEntity::class,
            parentColumns = ["id"],
            childColumns = ["taskId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = TaskEntity::class,
            parentColumns = ["id"],
            childColumns = ["dependsOnTaskId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["taskId", "dependsOnTaskId"], unique = true),
        Index(value = ["dependsOnTaskId"])
    ]
)
data class TaskDependencyEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: Long,
    val dependsOnTaskId: Long
)

@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val description: String = "",
    val category: String = "ACADEMIC",
    val targetDate: Long? = null,
    val progressPercentage: Double = 0.0,
    val isArchived: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "schedule_blocks",
    indices = [
        Index(value = ["startTime"]),
        Index(value = ["endTime"]),
        Index(value = ["taskId"])
    ]
)
data class ScheduleBlockEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: Long? = null,
    val eventId: Long? = null,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val blockType: String = "TASK",
    val isLocked: Boolean = false,
    val scheduleExplanation: String = "",
    val priority: String = "NORMAL",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "events",
    indices = [Index(value = ["startTime"]), Index(value = ["endTime"])]
)
data class FixedEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val isAllDay: Boolean = false,
    val location: String? = null,
    val recurrenceRule: String? = null,
    val isExternal: Boolean = false
)

@Entity(
    tableName = "reminders",
    indices = [Index(value = ["triggerTime"]), Index(value = ["taskId"])]
)
data class ReminderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: Long? = null,
    val scheduleBlockId: Long? = null,
    val title: String,
    val triggerTime: Long,
    val type: String = "ALARM",
    val status: String = "PENDING",
    val snoozeCount: Int = 0
)

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String = "Conversation",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "messages",
    indices = [Index(value = ["conversationId"])]
)
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val conversationId: Long,
    val role: String, // "USER", "ASSISTANT"
    val content: String,
    val inputMode: String = "TEXT", // "VOICE", "TEXT"
    val intentDetected: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "memories",
    indices = [Index(value = ["topic"])]
)
data class MemoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val topic: String,
    val fact: String,
    val source: String = "BEHAVIORAL_INFERENCE",
    val confidence: Double = 1.0,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val lastValidatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "behavioral_events",
    indices = [Index(value = ["timestamp"]), Index(value = ["taskId"])]
)
data class BehavioralEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: Long? = null,
    val eventType: String, // "TASK_START", "TASK_COMPLETE", "TASK_POSTPONE", "TASK_EXTEND"
    val plannedStart: Long? = null,
    val actualStart: Long? = null,
    val plannedDurationMins: Int? = null,
    val actualDurationMins: Int? = null,
    val reason: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "postponements",
    indices = [Index(value = ["taskId"])]
)
data class PostponementEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: Long,
    val taskTitle: String,
    val scheduledTime: Long,
    val postponedTo: Long? = null,
    val statedReason: String? = null,
    val category: String = "PERSONAL",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "daily_reviews",
    indices = [Index(value = ["reviewDate"], unique = true)]
)
data class DailyReviewEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val reviewDate: String, // "YYYY-MM-DD"
    val completedTaskCount: Int,
    val plannedTaskCount: Int,
    val postponedTaskCount: Int,
    val totalFocusMinutes: Int,
    val summaryText: String,
    val createdAt: Long = System.currentTimeMillis()
)
