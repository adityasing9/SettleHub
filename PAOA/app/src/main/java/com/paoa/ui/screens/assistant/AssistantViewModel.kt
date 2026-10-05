package com.paoa.ui.screens.assistant

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.ai.IntentRouter
import com.paoa.core.context.ContextEngine
import com.paoa.core.reminders.AlarmScheduler
import com.paoa.core.scheduler.DynamicRescheduler
import com.paoa.core.scheduler.SmartSchedulingEngine
import com.paoa.core.voice.SpeechRecognizerHelper
import com.paoa.core.voice.TextToSpeechHelper
import com.paoa.data.local.PAOADatabase
import com.paoa.data.local.entities.MessageEntity
import com.paoa.data.repository.MemoryRepository
import com.paoa.data.repository.ScheduleRepository
import com.paoa.data.repository.TaskRepository
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import com.paoa.domain.model.UserIntent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class AssistantViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val taskRepository = TaskRepository(database)
    private val scheduleRepository = ScheduleRepository(database)
    private val memoryRepository = MemoryRepository(database)

    private val schedulingEngine = SmartSchedulingEngine()
    private val dynamicRescheduler = DynamicRescheduler(schedulingEngine)
    private val contextEngine = ContextEngine()
    private val alarmScheduler = AlarmScheduler(application)

    private val speechHelper = SpeechRecognizerHelper(application)
    private val ttsHelper = TextToSpeechHelper(application)

    data class ChatMessage(
        val role: String, // "USER" or "ASSISTANT"
        val content: String,
        val timestamp: Long = System.currentTimeMillis()
    )

    data class AssistantUiState(
        val messages: List<ChatMessage> = emptyList(),
        val isListening: Boolean = false,
        val partialVoiceText: String = "",
        val isSpeaking: Boolean = false
    )

    private val _uiState = MutableStateFlow(AssistantUiState())
    val uiState: StateFlow<AssistantUiState> = _uiState.asStateFlow()

    init {
        // Initial greeting
        _uiState.value = AssistantUiState(
            messages = listOf(
                ChatMessage(
                    role = "ASSISTANT",
                    content = "Hello! I am your personal operating assistant. You can speak or type your plans, ask what to do next, or tell me when your day changes."
                )
            )
        )

        observeSpeechRecognition()
    }

    private fun observeSpeechRecognition() {
        viewModelScope.launch {
            speechHelper.state.collect { state ->
                when (state) {
                    is SpeechRecognizerHelper.SpeechState.Listening -> {
                        _uiState.value = _uiState.value.copy(isListening = true, partialVoiceText = "")
                    }
                    is SpeechRecognizerHelper.SpeechState.PartialResult -> {
                        _uiState.value = _uiState.value.copy(partialVoiceText = state.text)
                    }
                    is SpeechRecognizerHelper.SpeechState.FinalResult -> {
                        _uiState.value = _uiState.value.copy(isListening = false, partialVoiceText = "")
                        processUserInput(state.text, isVoice = true)
                    }
                    is SpeechRecognizerHelper.SpeechState.Error -> {
                        _uiState.value = _uiState.value.copy(isListening = false)
                    }
                    is SpeechRecognizerHelper.SpeechState.Idle -> {
                        _uiState.value = _uiState.value.copy(isListening = false)
                    }
                }
            }
        }
    }

    fun toggleVoiceInput() {
        if (_uiState.value.isListening) {
            speechHelper.stopListening()
        } else {
            ttsHelper.stop()
            speechHelper.startListening()
        }
    }

    fun sendTextMessage(input: String) {
        if (input.isBlank()) return
        processUserInput(input, isVoice = false)
    }

    private fun processUserInput(rawText: String, isVoice: Boolean) {
        val userMsg = ChatMessage(role = "USER", content = rawText)
        val updatedList = _uiState.value.messages + userMsg
        _uiState.value = _uiState.value.copy(messages = updatedList)

        viewModelScope.launch {
            // Save to database
            database.conversationDao().insertMessage(
                MessageEntity(
                    conversationId = 1L,
                    role = "USER",
                    content = rawText,
                    inputMode = if (isVoice) "VOICE" else "TEXT"
                )
            )

            // Route Intent
            val intent = IntentRouter.route(rawText)
            val responseText = executeIntent(intent)

            val assistantMsg = ChatMessage(role = "ASSISTANT", content = responseText)
            _uiState.value = _uiState.value.copy(messages = _uiState.value.messages + assistantMsg)

            // Save assistant response
            database.conversationDao().insertMessage(
                MessageEntity(
                    conversationId = 1L,
                    role = "ASSISTANT",
                    content = responseText,
                    inputMode = "TEXT"
                )
            )

            // Speak response if voice was used or active
            if (isVoice) {
                ttsHelper.speak(responseText)
            }
        }
    }

    private suspend fun executeIntent(intent: UserIntent): String {
        return when (intent) {
            is UserIntent.WhatShouldIDoNow -> {
                val activeTasks = taskRepository.getActiveTasks()
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val recommendation = contextEngine.recommendNextAction(activeTasks, currentBlocks)

                if (recommendation != null) {
                    recommendation.rationale
                } else {
                    "You have no pending tasks right now. Take some time to relax, or tell me what you'd like to accomplish."
                }
            }

            is UserIntent.ScheduleTask -> {
                val newTask = Task(
                    title = intent.title,
                    estimatedDurationMinutes = intent.durationMinutes,
                    priority = intent.priority,
                    category = intent.category,
                    deadline = intent.deadline,
                    preferredTimeOfDay = intent.preferredTimeOfDay
                )
                val taskId = taskRepository.insertTask(newTask)
                val savedTask = newTask.copy(id = taskId)

                // Run scheduler to place task
                val allActive = taskRepository.getActiveTasks()
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val scheduleResult = schedulingEngine.scheduleDay(allActive, currentBlocks)

                scheduleRepository.insertBlocks(scheduleResult.scheduledBlocks)

                // Schedule alarm/reminder
                val placedBlock = scheduleResult.scheduledBlocks.find { it.taskId == taskId }
                if (placedBlock != null) {
                    alarmScheduler.scheduleReminder(savedTask, placedBlock)
                }

                val periodText = if (intent.preferredTimeOfDay != null) " in the ${intent.preferredTimeOfDay.lowercase()}" else ""
                "Scheduled '${savedTask.title}' for ${savedTask.estimatedDurationMinutes} minutes$periodText. I've set a reminder accordingly."
            }

            is UserIntent.RescheduleTask -> {
                val matched = taskRepository.findTasksByTitle(intent.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskPostponed(matched.id)
                    "Moved '${matched.title}' to tomorrow. I've adjusted your remaining schedule to keep your evening balanced."
                } else {
                    "I couldn't find a task matching '${intent.taskQuery}'. Could you clarify the task name?"
                }
            }

            is UserIntent.SetUnavailable -> {
                val cal = Calendar.getInstance()
                cal.add(Calendar.DAY_OF_YEAR, intent.targetDateOffsetDays)
                cal.set(Calendar.HOUR_OF_DAY, intent.startHour)
                cal.set(Calendar.MINUTE, intent.startMinute)
                val startTime = cal.timeInMillis

                cal.set(Calendar.HOUR_OF_DAY, intent.endHour)
                cal.set(Calendar.MINUTE, intent.endMinute)
                val endTime = cal.timeInMillis

                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val allActive = taskRepository.getActiveTasks()

                val result = dynamicRescheduler.handleUnavailableInterval(
                    unavailableStart = startTime,
                    unavailableEnd = endTime,
                    reason = intent.label,
                    currentBlocks = currentBlocks,
                    allActiveTasks = allActive
                )

                scheduleRepository.replaceUnlockedBlocksInRange(startTime, endTime, result.updatedBlocks)

                result.humanExplanation
            }

            is UserIntent.CompleteTask -> {
                val matched = taskRepository.findTasksByTitle(intent.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskComplete(matched.id, matched.estimatedDurationMinutes)
                    "Great work on completing '${matched.title}'! I've updated your progress and digital twin focus metrics."
                } else {
                    "I marked your task as completed."
                }
            }

            is UserIntent.ExplainSchedule -> {
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val block = if (!intent.taskQuery.isNullOrBlank()) {
                    currentBlocks.find { it.title.contains(intent.taskQuery, ignoreCase = true) }
                } else {
                    currentBlocks.find { it.startTime <= System.currentTimeMillis() && it.endTime >= System.currentTimeMillis() }
                        ?: currentBlocks.firstOrNull()
                }

                if (block != null) {
                    block.scheduleExplanation.ifBlank {
                        "Scheduled here because it aligns with your focus preferences and available time buffer."
                    }
                } else {
                    "I schedule tasks based on your peak focus windows, nearest deadlines, and necessary rest buffers."
                }
            }

            is UserIntent.QueryMemory -> {
                val memories = memoryRepository.getActiveMemories()
                if (memories.isNotEmpty()) {
                    val summary = memories.take(4).joinToString("\n• ") { it.fact }
                    "Here is what I currently know about your rhythm:\n• $summary\n\nYou can review and edit everything in Settings -> What I Know About You."
                } else {
                    "I am learning your schedule patterns. You can customize your routine in Settings."
                }
            }

            is UserIntent.UpdatePreference -> {
                memoryRepository.insertMemory(
                    topic = "USER_PREFERENCE",
                    fact = intent.rawUserStatement,
                    source = "CONVERSATION_EDIT"
                )
                "Understood. I've updated your preferences with: \"${intent.rawUserStatement}\". I will adapt future schedules accordingly."
            }

            is UserIntent.QueryProductivity -> {
                val allTasks = taskRepository.getAllTasks()
                val completed = allTasks.count { it.status == com.paoa.domain.model.TaskStatus.COMPLETED }
                val pending = allTasks.count { it.status == com.paoa.domain.model.TaskStatus.PLANNED }
                "Today you have completed $completed tasks, with $pending remaining. You are maintaining steady focus without overworking."
            }

            is UserIntent.Unknown -> {
                "I heard you. To schedule a task, try 'Study DSA for 2 hours tonight' or ask 'What should I do now?'."
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        speechHelper.stopListening()
        ttsHelper.shutdown()
    }
}
