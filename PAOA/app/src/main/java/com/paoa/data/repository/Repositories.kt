package com.paoa.data.repository

import com.paoa.data.local.PAOADatabase
import com.paoa.data.local.entities.*
import com.paoa.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TaskRepository(private val database: PAOADatabase) {
    private val taskDao = database.taskDao()

    fun observeActiveTasks(): Flow<List<Task>> {
        return taskDao.observeActiveTasks().map { list ->
            list.map { it.toDomain() }
        }
    }

    suspend fun getActiveTasks(): List<Task> {
        return taskDao.getActiveTasks().map { it.toDomain() }
    }

    suspend fun getAllTasks(): List<Task> {
        return taskDao.getAllTasks().map { it.toDomain() }
    }

    suspend fun findTasksByTitle(query: String): List<Task> {
        return taskDao.findTasksByTitle(query).map { it.toDomain() }
    }

    suspend fun getTaskById(id: Long): Task? {
        return taskDao.getTaskById(id)?.toDomain()
    }

    suspend fun insertTask(task: Task): Long {
        return taskDao.insertTask(task.toEntity())
    }

    suspend fun updateTask(task: Task) {
        taskDao.updateTask(task.toEntity())
    }

    suspend fun markTaskComplete(id: Long, actualDuration: Int) {
        taskDao.updateTaskStatus(
            id = id,
            status = TaskStatus.COMPLETED.name,
            actualDuration = actualDuration,
            completedAt = System.currentTimeMillis()
        )
    }

    suspend fun markTaskPostponed(id: Long) {
        taskDao.incrementPostponement(id)
    }

    suspend fun clearAll() {
        taskDao.clearAll()
    }
}

class ScheduleRepository(private val database: PAOADatabase) {
    private val scheduleDao = database.scheduleBlockDao()

    fun observeBlocksInRange(start: Long, end: Long): Flow<List<ScheduleBlock>> {
        return scheduleDao.observeBlocksInRange(start, end).map { list ->
            list.map { it.toDomain() }
        }
    }

    suspend fun getBlocksInRange(start: Long, end: Long): List<ScheduleBlock> {
        return scheduleDao.getBlocksInRange(start, end).map { it.toDomain() }
    }

    fun observeCurrentOrNextBlock(now: Long = System.currentTimeMillis()): Flow<ScheduleBlock?> {
        return scheduleDao.observeCurrentOrNextBlock(now).map { it?.toDomain() }
    }

    suspend fun getCurrentBlock(now: Long = System.currentTimeMillis()): ScheduleBlock? {
        return scheduleDao.getCurrentBlock(now)?.toDomain()
    }

    suspend fun insertBlocks(blocks: List<ScheduleBlock>) {
        scheduleDao.insertBlocks(blocks.map { it.toEntity() })
    }

    suspend fun replaceUnlockedBlocksInRange(start: Long, end: Long, newBlocks: List<ScheduleBlock>) {
        scheduleDao.deleteUnlockedBlocksInRange(start, end)
        scheduleDao.insertBlocks(newBlocks.map { it.toEntity() })
    }

    suspend fun clearAll() {
        scheduleDao.clearAll()
    }
}

class MemoryRepository(private val database: PAOADatabase) {
    private val memoryDao = database.memoryDao()
    private val profileDao = database.profileDao()

    fun observeActiveMemories(): Flow<List<MemoryFact>> {
        return memoryDao.observeActiveMemories().map { list ->
            list.map { MemoryFact(it.id, it.topic, it.fact, it.source, it.confidence, it.isActive, it.createdAt) }
        }
    }

    suspend fun getActiveMemories(): List<MemoryFact> {
        return memoryDao.getActiveMemories().map {
            MemoryFact(it.id, it.topic, it.fact, it.source, it.confidence, it.isActive, it.createdAt)
        }
    }

    suspend fun insertMemory(topic: String, fact: String, source: String = "BEHAVIORAL_INFERENCE"): Long {
        return memoryDao.insertMemory(
            MemoryEntity(
                topic = topic,
                fact = fact,
                source = source,
                confidence = 1.0
            )
        )
    }

    suspend fun deactivateMemory(id: Long) {
        memoryDao.deactivateMemory(id)
    }

    suspend fun getProfile(): UserProfileEntity {
        return profileDao.getProfile() ?: UserProfileEntity()
    }

    suspend fun saveProfile(profile: UserProfileEntity) {
        profileDao.saveProfile(profile)
    }

    suspend fun clearAll() {
        memoryDao.clearAll()
    }
}

// Extension Mappers
fun TaskEntity.toDomain(): Task = Task(
    id = id,
    title = title,
    description = description,
    category = TaskCategory.fromString(category),
    priority = Priority.fromString(priority),
    estimatedDurationMinutes = estimatedDurationMinutes,
    actualDurationMinutes = actualDurationMinutes,
    deadline = deadline,
    preferredTimeOfDay = preferredTimeOfDay,
    earliestStart = earliestStart,
    latestFinish = latestFinish,
    recurrenceRule = recurrenceRule,
    status = runCatching { TaskStatus.valueOf(status) }.getOrDefault(TaskStatus.PLANNED),
    reminderMode = runCatching { ReminderMode.valueOf(reminderMode) }.getOrDefault(ReminderMode.ALARM),
    reminderOffsetMinutes = reminderOffsetMinutes,
    creationSource = creationSource,
    postponementCount = postponementCount,
    completionTimestamp = completionTimestamp,
    goalId = goalId,
    notes = notes,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Task.toEntity(): TaskEntity = TaskEntity(
    id = id,
    title = title,
    description = description,
    category = category.name,
    priority = priority.name,
    estimatedDurationMinutes = estimatedDurationMinutes,
    actualDurationMinutes = actualDurationMinutes,
    deadline = deadline,
    preferredTimeOfDay = preferredTimeOfDay,
    earliestStart = earliestStart,
    latestFinish = latestFinish,
    recurrenceRule = recurrenceRule,
    status = status.name,
    reminderMode = reminderMode.name,
    reminderOffsetMinutes = reminderOffsetMinutes,
    creationSource = creationSource,
    postponementCount = postponementCount,
    completionTimestamp = completionTimestamp,
    goalId = goalId,
    notes = notes,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun ScheduleBlockEntity.toDomain(): ScheduleBlock = ScheduleBlock(
    id = id,
    taskId = taskId,
    eventId = eventId,
    title = title,
    startTime = startTime,
    endTime = endTime,
    blockType = runCatching { BlockType.valueOf(blockType) }.getOrDefault(BlockType.TASK),
    isLocked = isLocked,
    scheduleExplanation = scheduleExplanation,
    priority = Priority.fromString(priority)
)

fun ScheduleBlock.toEntity(): ScheduleBlockEntity = ScheduleBlockEntity(
    id = id,
    taskId = taskId,
    eventId = eventId,
    title = title,
    startTime = startTime,
    endTime = endTime,
    blockType = blockType.name,
    isLocked = isLocked,
    scheduleExplanation = scheduleExplanation,
    priority = priority.name
)
