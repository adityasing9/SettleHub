package com.paoa.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.paoa.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity): Long

    @Update
    suspend fun updateTask(task: TaskEntity)

    @Query("SELECT * FROM tasks WHERE id = :id")
    suspend fun getTaskById(id: Long): TaskEntity?

    @Query("SELECT * FROM tasks WHERE status IN ('PLANNED', 'IN_PROGRESS', 'POSTPONED') ORDER BY priority DESC, deadline ASC")
    fun observeActiveTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE status IN ('PLANNED', 'IN_PROGRESS', 'POSTPONED') ORDER BY priority DESC, deadline ASC")
    suspend fun getActiveTasks(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE title LIKE '%' || :query || '%' LIMIT 5")
    suspend fun findTasksByTitle(query: String): List<TaskEntity>

    @Query("UPDATE tasks SET status = :status, actualDurationMinutes = :actualDuration, completionTimestamp = :completedAt, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateTaskStatus(id: Long, status: String, actualDuration: Int, completedAt: Long?, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE tasks SET postponementCount = postponementCount + 1, status = 'POSTPONED', updatedAt = :updatedAt WHERE id = :id")
    suspend fun incrementPostponement(id: Long, updatedAt: Long = System.currentTimeMillis())

    @Query("SELECT * FROM tasks ORDER BY createdAt DESC")
    fun observeAllTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks ORDER BY createdAt DESC")
    suspend fun getAllTasks(): List<TaskEntity>

    @Query("DELETE FROM tasks")
    suspend fun clearAll()
}

@Dao
interface ScheduleBlockDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBlock(block: ScheduleBlockEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBlocks(blocks: List<ScheduleBlockEntity>)

    @Query("SELECT * FROM schedule_blocks WHERE startTime >= :start AND endTime <= :end ORDER BY startTime ASC")
    fun observeBlocksInRange(start: Long, end: Long): Flow<List<ScheduleBlockEntity>>

    @Query("SELECT * FROM schedule_blocks WHERE startTime >= :start AND endTime <= :end ORDER BY startTime ASC")
    suspend fun getBlocksInRange(start: Long, end: Long): List<ScheduleBlockEntity>

    @Query("SELECT * FROM schedule_blocks WHERE startTime >= :now ORDER BY startTime ASC LIMIT 1")
    fun observeCurrentOrNextBlock(now: Long): Flow<ScheduleBlockEntity?>

    @Query("SELECT * FROM schedule_blocks WHERE startTime <= :now AND endTime > :now LIMIT 1")
    suspend fun getCurrentBlock(now: Long): ScheduleBlockEntity?

    @Query("DELETE FROM schedule_blocks WHERE startTime >= :start AND endTime <= :end AND isLocked = 0")
    suspend fun deleteUnlockedBlocksInRange(start: Long, end: Long)

    @Query("DELETE FROM schedule_blocks WHERE taskId = :taskId")
    suspend fun deleteBlocksForTask(taskId: Long)

    @Query("DELETE FROM schedule_blocks")
    suspend fun clearAll()
}

@Dao
interface ReminderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReminder(reminder: ReminderEntity): Long

    @Query("SELECT * FROM reminders WHERE status = 'PENDING' AND triggerTime >= :fromTime ORDER BY triggerTime ASC")
    suspend fun getUpcomingReminders(fromTime: Long): List<ReminderEntity>

    @Query("UPDATE reminders SET status = :status WHERE id = :id")
    suspend fun updateReminderStatus(id: Long, status: String)

    @Query("DELETE FROM reminders")
    suspend fun clearAll()
}

@Dao
interface MemoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMemory(memory: MemoryEntity): Long

    @Query("SELECT * FROM memories WHERE isActive = 1 ORDER BY confidence DESC")
    fun observeActiveMemories(): Flow<List<MemoryEntity>>

    @Query("SELECT * FROM memories WHERE isActive = 1 ORDER BY confidence DESC")
    suspend fun getActiveMemories(): List<MemoryEntity>

    @Query("UPDATE memories SET isActive = 0 WHERE id = :id")
    suspend fun deactivateMemory(id: Long)

    @Query("DELETE FROM memories")
    suspend fun clearAll()
}

@Dao
interface BehavioralDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: BehavioralEventEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPostponement(postponement: PostponementEntity): Long

    @Query("SELECT * FROM postponements ORDER BY createdAt DESC")
    fun observePostponements(): Flow<List<PostponementEntity>>

    @Query("SELECT * FROM postponements ORDER BY createdAt DESC")
    suspend fun getAllPostponements(): List<PostponementEntity>

    @Query("SELECT * FROM behavioral_events ORDER BY timestamp DESC LIMIT 100")
    suspend fun getRecentEvents(): List<BehavioralEventEntity>

    @Query("DELETE FROM postponements")
    suspend fun clearPostponements()

    @Query("DELETE FROM behavioral_events")
    suspend fun clearEvents()
}

@Dao
interface ProfileDao {
    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    suspend fun getProfile(): UserProfileEntity?

    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    fun observeProfile(): Flow<UserProfileEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProfile(profile: UserProfileEntity)

    @Query("SELECT * FROM user_preferences")
    fun observePreferences(): Flow<List<UserPreferenceEntity>>

    @Query("SELECT * FROM user_preferences")
    suspend fun getPreferences(): List<UserPreferenceEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun savePreference(preference: UserPreferenceEntity)

    @Query("DELETE FROM user_preferences WHERE preferenceKey = :key")
    suspend fun deletePreference(key: String)
}

@Dao
interface ConversationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity): Long

    @Query("SELECT * FROM messages ORDER BY timestamp ASC")
    fun observeMessages(): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentMessages(limit: Int = 20): List<MessageEntity>

    @Query("DELETE FROM messages")
    suspend fun clearHistory()
}
