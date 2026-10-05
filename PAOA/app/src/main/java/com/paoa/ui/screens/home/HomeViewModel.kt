package com.paoa.ui.screens.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.context.ContextEngine
import com.paoa.core.scheduler.SmartSchedulingEngine
import com.paoa.data.local.PAOADatabase
import com.paoa.data.repository.MemoryRepository
import com.paoa.data.repository.ScheduleRepository
import com.paoa.data.repository.TaskRepository
import com.paoa.domain.model.Recommendation
import com.paoa.domain.model.ScheduleBlock
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val taskRepository = TaskRepository(database)
    private val scheduleRepository = ScheduleRepository(database)
    private val memoryRepository = MemoryRepository(database)

    private val contextEngine = ContextEngine()
    private val schedulingEngine = SmartSchedulingEngine()

    data class HomeUiState(
        val userName: String = "Aaditya",
        val greeting: String = "Good evening",
        val recommendation: Recommendation? = null,
        val nextBlock: ScheduleBlock? = null,
        val completedCount: Int = 0,
        val totalCount: Int = 0,
        val isLoading: Boolean = false,
        val activeSessionTask: Task? = null
    )

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val profile = memoryRepository.getProfile()
            val allTasks = taskRepository.getAllTasks()
            val activeTasks = taskRepository.getActiveTasks()

            // Calculate start and end of today
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            val startOfDay = cal.timeInMillis
            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            val endOfDay = cal.timeInMillis

            var currentBlocks = scheduleRepository.getBlocksInRange(startOfDay, endOfDay)

            // If no blocks currently scheduled for today, run initial smart schedule
            if (currentBlocks.isEmpty() && activeTasks.isNotEmpty()) {
                val scheduleResult = schedulingEngine.scheduleDay(activeTasks, emptyList())
                scheduleRepository.insertBlocks(scheduleResult.scheduledBlocks)
                currentBlocks = scheduleResult.scheduledBlocks
            }

            val now = System.currentTimeMillis()
            val rec = contextEngine.recommendNextAction(activeTasks, currentBlocks, now)
            val next = currentBlocks.filter { it.startTime > now }.minByOrNull { it.startTime }

            val completed = allTasks.count { it.status == TaskStatus.COMPLETED }
            val total = allTasks.size

            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val greeting = when (hour) {
                in 5..11 -> "Good morning"
                in 12..16 -> "Good afternoon"
                in 17..21 -> "Good evening"
                else -> "Good night"
            }

            _uiState.value = HomeUiState(
                userName = profile.name,
                greeting = greeting,
                recommendation = rec,
                nextBlock = next,
                completedCount = completed,
                totalCount = total,
                isLoading = false
            )
        }
    }

    fun startTask(task: Task) {
        viewModelScope.launch {
            taskRepository.updateTask(task.copy(status = TaskStatus.IN_PROGRESS))
            _uiState.value = _uiState.value.copy(activeSessionTask = task)
            loadData()
        }
    }

    fun completeTask(task: Task) {
        viewModelScope.launch {
            taskRepository.markTaskComplete(task.id, task.estimatedDurationMinutes)
            _uiState.value = _uiState.value.copy(activeSessionTask = null)
            loadData()
        }
    }
}
