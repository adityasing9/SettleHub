package com.paoa.ui.screens.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.device.DevicePermissionManager
import com.paoa.core.security.DataExportManager
import com.paoa.data.local.PAOADatabase
import com.paoa.data.repository.MemoryRepository
import com.paoa.domain.model.MemoryFact
import com.paoa.domain.model.ReminderMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val memoryRepository = MemoryRepository(database)
    private val permissionManager = DevicePermissionManager(application)
    private val exportManager = DataExportManager(application, database)

    data class SettingsUiState(
        val defaultReminderMode: ReminderMode = ReminderMode.ALARM,
        val speechRate: Float = 1.0f,
        val bufferMinutes: Int = 15,
        val memories: List<MemoryFact> = emptyList(),
        val permissions: List<DevicePermissionManager.PermissionItem> = emptyList(),
        val exportJsonString: String? = null,
        val messageBanner: String? = null
    )

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            val profile = memoryRepository.getProfile()
            val memories = memoryRepository.getActiveMemories()
            val perms = permissionManager.getPermissionsState()

            val mode = runCatching { ReminderMode.valueOf(profile.defaultReminderMode) }
                .getOrDefault(ReminderMode.ALARM)

            _uiState.value = _uiState.value.copy(
                defaultReminderMode = mode,
                bufferMinutes = profile.defaultBufferMinutes,
                memories = memories,
                permissions = perms
            )
        }
    }

    fun setReminderMode(mode: ReminderMode) {
        viewModelScope.launch {
            val profile = memoryRepository.getProfile().copy(defaultReminderMode = mode.name)
            memoryRepository.saveProfile(profile)
            _uiState.value = _uiState.value.copy(defaultReminderMode = mode)
        }
    }

    fun deactivateMemory(id: Long) {
        viewModelScope.launch {
            memoryRepository.deactivateMemory(id)
            loadSettings()
            _uiState.value = _uiState.value.copy(messageBanner = "Preference corrected and removed from Digital Twin.")
        }
    }

    fun exportData() {
        viewModelScope.launch {
            val json = exportManager.exportDataAsJson()
            _uiState.value = _uiState.value.copy(
                exportJsonString = json,
                messageBanner = "Data successfully exported as JSON."
            )
        }
    }

    fun purgeAllData() {
        viewModelScope.launch {
            exportManager.purgeAllData()
            loadSettings()
            _uiState.value = _uiState.value.copy(messageBanner = "All personal local data completely wiped.")
        }
    }

    fun openAppSettings() {
        permissionManager.openAppSettings()
    }

    fun openExactAlarmSettings() {
        permissionManager.openExactAlarmSettings()
    }

    fun clearBanner() {
        _uiState.value = _uiState.value.copy(messageBanner = null)
    }
}
