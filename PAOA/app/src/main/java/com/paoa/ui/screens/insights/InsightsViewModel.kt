package com.paoa.ui.screens.insights

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.memory.DigitalTwinLearner
import com.paoa.core.memory.PlannedVsActualEngine
import com.paoa.data.local.PAOADatabase
import com.paoa.data.repository.TaskRepository
import com.paoa.domain.model.PlannedVsActualLog
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import com.paoa.domain.model.TaskStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class InsightsViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val taskRepository = TaskRepository(database)
    private val digitalTwinLearner = DigitalTwinLearner()
    private val plannedVsActualEngine = PlannedVsActualEngine()

    data class InsightsUiState(
        val totalTasks: Int = 0,
        val completedTasks: Int = 0,
        val completionRatePct: Int = 0,
        val averageStartDelayMinutes: Double = 0.0,
        val schedulingAccuracyPct: Int = 0,
        val procrastinationInsights: List<DigitalTwinLearner.ProcrastinationInsight> = emptyList(),
        val bestFocusPeriod: String = "5:00 PM – 8:00 PM",
        val avgSessionLengthMinutes: Int = 45,
        val isLoading: Boolean = false
    )

    private val _uiState = MutableStateFlow(InsightsUiState())
    val uiState: StateFlow<InsightsUiState> = _uiState.asStateFlow()

    init {
        loadAnalytics()
    }

    fun loadAnalytics() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val tasks = taskRepository.getAllTasks()
            val completed = tasks.count { it.status == TaskStatus.COMPLETED }
            val total = tasks.size
            val rate = if (total > 0) (completed * 100) / total else 0

            // Sample simulated logs from task records
            val logs = tasks.filter { it.status == TaskStatus.COMPLETED }.map { t ->
                PlannedVsActualLog(
                    taskId = t.id,
                    taskTitle = t.title,
                    category = t.category,
                    plannedStartTime = t.createdAt,
                    actualStartTime = t.createdAt + (10 * 60 * 1000L), // simulated 10m average delay
                    plannedDurationMinutes = t.estimatedDurationMinutes,
                    actualDurationMinutes = if (t.actualDurationMinutes > 0) t.actualDurationMinutes else t.estimatedDurationMinutes,
                    startDelayMinutes = 10,
                    durationVarianceMinutes = 5
                )
            }

            val varianceSummary = plannedVsActualEngine.computeSummary(logs)
            val insights = digitalTwinLearner.analyzePostponementPatterns(tasks, logs)

            _uiState.value = InsightsUiState(
                totalTasks = total,
                completedTasks = completed,
                completionRatePct = rate,
                averageStartDelayMinutes = varianceSummary.averageStartDelayMinutes,
                schedulingAccuracyPct = varianceSummary.schedulingAccuracyPercentage,
                procrastinationInsights = insights,
                bestFocusPeriod = "5:00 PM – 8:00 PM",
                avgSessionLengthMinutes = 45,
                isLoading = false
            )
        }
    }
}
