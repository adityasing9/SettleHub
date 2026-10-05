package com.paoa.ui.screens.calendar

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.scheduler.SmartSchedulingEngine
import com.paoa.data.local.PAOADatabase
import com.paoa.data.repository.ScheduleRepository
import com.paoa.data.repository.TaskRepository
import com.paoa.domain.model.ScheduleBlock
import com.paoa.domain.model.Task
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

enum class CalendarViewMode {
    DAY,
    THREE_DAY,
    WEEK,
    MONTH
}

class CalendarViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val scheduleRepository = ScheduleRepository(database)
    private val taskRepository = TaskRepository(database)
    private val schedulingEngine = SmartSchedulingEngine()

    data class CalendarUiState(
        val viewMode: CalendarViewMode = CalendarViewMode.DAY,
        val selectedDateMillis: Long = System.currentTimeMillis(),
        val blocks: List<ScheduleBlock> = emptyList(),
        val activeTasks: List<Task> = emptyList(),
        val selectedBlockForExplanation: ScheduleBlock? = null,
        val isLoading: Boolean = false
    )

    private val _uiState = MutableStateFlow(CalendarUiState())
    val uiState: StateFlow<CalendarUiState> = _uiState.asStateFlow()

    init {
        loadBlocksForCurrentSelection()
    }

    fun setViewMode(mode: CalendarViewMode) {
        _uiState.value = _uiState.value.copy(viewMode = mode)
        loadBlocksForCurrentSelection()
    }

    fun selectDate(millis: Long) {
        _uiState.value = _uiState.value.copy(selectedDateMillis = millis)
        loadBlocksForCurrentSelection()
    }

    fun selectBlockForExplanation(block: ScheduleBlock?) {
        _uiState.value = _uiState.value.copy(selectedBlockForExplanation = block)
    }

    fun loadBlocksForCurrentSelection() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val cal = Calendar.getInstance().apply { timeInMillis = _uiState.value.selectedDateMillis }
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            val startTime = cal.timeInMillis

            val daysToAdd = when (_uiState.value.viewMode) {
                CalendarViewMode.DAY -> 1
                CalendarViewMode.THREE_DAY -> 3
                CalendarViewMode.WEEK -> 7
                CalendarViewMode.MONTH -> 30
            }

            cal.add(Calendar.DAY_OF_YEAR, daysToAdd)
            val endTime = cal.timeInMillis

            val blocks = scheduleRepository.getBlocksInRange(startTime, endTime)
            val tasks = taskRepository.getActiveTasks()

            _uiState.value = _uiState.value.copy(
                blocks = blocks,
                activeTasks = tasks,
                isLoading = false
            )
        }
    }

    fun triggerAutoReschedule() {
        viewModelScope.launch {
            val tasks = taskRepository.getActiveTasks()
            val existing = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
            val result = schedulingEngine.scheduleDay(tasks, existing)
            scheduleRepository.insertBlocks(result.scheduledBlocks)
            loadBlocksForCurrentSelection()
        }
    }
}
