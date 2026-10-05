package com.paoa.core.security

import android.content.Context
import com.paoa.data.local.PAOADatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class DataExportManager(
    private val context: Context,
    private val database: PAOADatabase
) {

    suspend fun exportDataAsJson(): String = withContext(Dispatchers.IO) {
        val root = JSONObject()

        // 1. Profile
        val profile = database.profileDao().getProfile()
        if (profile != null) {
            val profileObj = JSONObject().apply {
                put("name", profile.name)
                put("preferredLanguage", profile.preferredLanguage)
                put("interactionStyle", profile.interactionStyle)
                put("typicalWakeTime", profile.typicalWakeTime)
                put("typicalSleepTime", profile.typicalSleepTime)
                put("defaultReminderMode", profile.defaultReminderMode)
                put("defaultBufferMinutes", profile.defaultBufferMinutes)
            }
            root.put("profile", profileObj)
        }

        // 2. Tasks
        val tasks = database.taskDao().getAllTasks()
        val tasksArray = JSONArray()
        for (t in tasks) {
            val taskObj = JSONObject().apply {
                put("id", t.id)
                put("title", t.title)
                put("description", t.description)
                put("category", t.category)
                put("priority", t.priority)
                put("estimatedDurationMinutes", t.estimatedDurationMinutes)
                put("actualDurationMinutes", t.actualDurationMinutes)
                put("status", t.status)
                put("postponementCount", t.postponementCount)
                put("createdAt", t.createdAt)
            }
            tasksArray.put(taskObj)
        }
        root.put("tasks", tasksArray)

        // 3. Memories
        val memories = database.memoryDao().getActiveMemories()
        val memoriesArray = JSONArray()
        for (m in memories) {
            val memObj = JSONObject().apply {
                put("topic", m.topic)
                put("fact", m.fact)
                put("source", m.source)
                put("confidence", m.confidence)
            }
            memoriesArray.put(memObj)
        }
        root.put("memories", memoriesArray)

        // 4. Postponements
        val postponements = database.behavioralDao().getAllPostponements()
        val postArray = JSONArray()
        for (p in postponements) {
            val pObj = JSONObject().apply {
                put("taskTitle", p.taskTitle)
                put("category", p.category)
                put("scheduledTime", p.scheduledTime)
                put("reason", p.statedReason)
            }
            postArray.put(pObj)
        }
        root.put("postponements", postArray)

        root.put("exportedAt", System.currentTimeMillis())
        root.put("appVersion", "1.0.0")

        val jsonString = root.toString(2)

        // Write to local cache export file
        val exportFile = File(context.cacheDir, "paoa_export_${System.currentTimeMillis()}.json")
        exportFile.writeText(jsonString)

        jsonString
    }

    suspend fun purgeAllData(): Unit = withContext(Dispatchers.IO) {
        database.taskDao().clearAll()
        database.scheduleBlockDao().clearAll()
        database.reminderDao().clearAll()
        database.memoryDao().clearAll()
        database.behavioralDao().clearPostponements()
        database.behavioralDao().clearEvents()
        database.conversationDao().clearHistory()
    }
}
