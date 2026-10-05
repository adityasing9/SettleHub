package com.paoa.core.ai

import com.paoa.domain.model.Priority
import com.paoa.domain.model.TaskCategory
import com.paoa.domain.model.UserIntent
import java.util.Calendar
import java.util.regex.Pattern

object LightweightNlpParser {

    private val DURATION_HOURS_PATTERN = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?|h\\b)", Pattern.CASE_INSENSITIVE)
    private val DURATION_MINS_PATTERN = Pattern.compile("(\\d+)\\s*(?:minutes?|mins?|m\\b)", Pattern.CASE_INSENSITIVE)
    private val TIME_AT_PATTERN = Pattern.compile("(?:at|around)\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)", Pattern.CASE_INSENSITIVE)

    fun parseTaskCreation(input: String): UserIntent.ScheduleTask {
        val lower = input.lowercase().trim()

        // 1. Duration extraction
        var durationMinutes = 45 // safe default
        val hourMatch = DURATION_HOURS_PATTERN.matcher(lower)
        if (hourMatch.find()) {
            val hours = hourMatch.group(1)?.toDoubleOrNull() ?: 1.0
            durationMinutes = (hours * 60).toInt()
        } else {
            val minMatch = DURATION_MINS_PATTERN.matcher(lower)
            if (minMatch.find()) {
                durationMinutes = minMatch.group(1)?.toIntOrNull() ?: 45
            }
        }

        // 2. Date offset extraction
        var targetDateOffsetDays = 0
        if (lower.contains("tomorrow")) {
            targetDateOffsetDays = 1
        } else if (lower.contains("day after tomorrow")) {
            targetDateOffsetDays = 2
        }

        // 3. Time of day / Specific hour
        var preferredPeriod: String? = null
        var targetHour: Int? = null
        var targetMinute: Int? = null

        val atMatch = TIME_AT_PATTERN.matcher(lower)
        if (atMatch.find()) {
            val timeStr = atMatch.group(1) ?: ""
            val (h, m) = parseExplicitTime(timeStr)
            targetHour = h
            targetMinute = m
        }

        if (lower.contains("tonight") || lower.contains("evening")) {
            preferredPeriod = "EVENING"
            if (targetHour == null) targetHour = 18
        } else if (lower.contains("morning")) {
            preferredPeriod = "MORNING"
            if (targetHour == null) targetHour = 9
        } else if (lower.contains("afternoon")) {
            preferredPeriod = "AFTERNOON"
            if (targetHour == null) targetHour = 14
        } else if (lower.contains("night")) {
            preferredPeriod = "NIGHT"
            if (targetHour == null) targetHour = 21
        }

        // 4. Priority extraction
        val priority = when {
            lower.contains("critical") || lower.contains("urgent") || lower.contains("exam") || lower.contains("hard deadline") -> Priority.CRITICAL
            lower.contains("important") || lower.contains("assignment") || lower.contains("submission") -> Priority.IMPORTANT
            lower.contains("flexible") || lower.contains("chill") || lower.contains("optional") || lower.contains("casual") -> Priority.FLEXIBLE
            else -> Priority.NORMAL
        }

        // 5. Category extraction
        val category = when {
            lower.contains("dsa") || lower.contains("dbms") || lower.contains("study") || lower.contains("exam") || lower.contains("read") -> TaskCategory.STUDY
            lower.contains("project") || lower.contains("code") || lower.contains("assignment") || lower.contains("dev") -> TaskCategory.PROJECT
            lower.contains("run") || lower.contains("gym") || lower.contains("exercise") || lower.contains("walk") || lower.contains("workout") -> TaskCategory.EXERCISE
            lower.contains("friends") || lower.contains("party") || lower.contains("movie") || lower.contains("dinner") || lower.contains("outing") -> TaskCategory.SOCIAL
            lower.contains("clean") || lower.contains("grocery") || lower.contains("habit") -> TaskCategory.ROUTINE
            else -> TaskCategory.PERSONAL
        }

        // 6. Title cleanup: strip out intent words and metadata words
        var cleanedTitle = input
            .replace("(?i)^i\\s+(?:need|have|want)\\s+to\\s+".toRegex(), "")
            .replace("(?i)^i\\s+will\\s+".toRegex(), "")
            .replace("(?i)^please\\s+schedule\\s+".toRegex(), "")
            .replace("(?i)\\bfor\\s+\\d+(?:\\.\\d+)?\\s*(?:hours?|hrs?|minutes?|mins?|h|m)\\b".toRegex(), "")
            .replace("(?i)\\b(?:tomorrow|today|tonight|this\\s+evening|in\\s+the\\s+morning|afternoon)\\b".toRegex(), "")
            .replace("(?i)\\bat\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?\\b".toRegex(), "")
            .trim()

        if (cleanedTitle.isEmpty()) {
            cleanedTitle = if (category == TaskCategory.STUDY) "Study Session" else "New Task"
        } else {
            // Capitalize first letter
            cleanedTitle = cleanedTitle.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }

        // 7. Deadline computation if critical/urgent
        var deadline: Long? = null
        if (priority == Priority.CRITICAL || priority == Priority.IMPORTANT || lower.contains("tonight")) {
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_YEAR, targetDateOffsetDays)
            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            cal.set(Calendar.SECOND, 0)
            deadline = cal.timeInMillis
        }

        return UserIntent.ScheduleTask(
            title = cleanedTitle,
            durationMinutes = durationMinutes,
            targetDateOffsetDays = targetDateOffsetDays,
            targetHour = targetHour,
            targetMinute = targetMinute ?: 0,
            preferredTimeOfDay = preferredPeriod,
            priority = priority,
            category = category,
            deadline = deadline
        )
    }

    private fun parseExplicitTime(text: String): Pair<Int?, Int?> {
        val lower = text.lowercase().trim()
        val isPm = lower.contains("pm")
        val isAm = lower.contains("am")
        val digitsOnly = lower.replace("[^0-9:]".toRegex(), "")

        if (digitsOnly.isEmpty()) return null to null

        val parts = digitsOnly.split(":")
        var hour = parts[0].toIntOrNull() ?: return null to null
        val minute = if (parts.size > 1) parts[1].toIntOrNull() ?: 0 else 0

        if (isPm && hour < 12) hour += 12
        if (isAm && hour == 12) hour = 0
        if (!isPm && !isAm && hour in 1..7) hour += 12

        return hour to minute
    }
}
