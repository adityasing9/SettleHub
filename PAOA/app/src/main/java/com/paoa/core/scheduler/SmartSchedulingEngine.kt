package com.paoa.core.scheduler

import com.paoa.domain.model.*
import java.util.Calendar

class SmartSchedulingEngine(
    private val digitalTwin: DigitalTwinProfile = DigitalTwinProfile()
) {

    data class SchedulingResult(
        val scheduledBlocks: List<ScheduleBlock>,
        val unplacedTasks: List<Task>,
        val explanationSummary: String
    )

    fun scheduleDay(
        tasks: List<Task>,
        existingBlocks: List<ScheduleBlock>,
        baseTimeMillis: Long = System.currentTimeMillis()
    ): SchedulingResult {
        val calendar = Calendar.getInstance().apply { timeInMillis = baseTimeMillis }
        val startOfDay = getStartOfDay(calendar)
        val endOfDay = getEndOfDay(calendar)

        // 1. Identify Occupied Intervals (Sleep, Locked blocks, Fixed Events, Outings)
        val occupied = mutableListOf<TimeInterval>()

        // Sleep block 1: Start of day to wake time (e.g. 00:00 to 07:00)
        val wakeMillis = startOfDay + (digitalTwin.wakeTimeMinutes * 60 * 1000L)
        if (wakeMillis > startOfDay) {
            occupied.add(TimeInterval(startOfDay, wakeMillis))
        }

        // Sleep block 2: Sleep time to end of day (e.g. 23:30 to 24:00)
        val sleepMillis = startOfDay + (digitalTwin.sleepTimeMinutes * 60 * 1000L)
        if (sleepMillis < endOfDay) {
            occupied.add(TimeInterval(sleepMillis, endOfDay))
        }

        // Add locked blocks and unavailable intervals
        existingBlocks.filter { it.isLocked || it.blockType == BlockType.UNAVAILABLE || it.blockType == BlockType.FIXED_EVENT }
            .forEach { occupied.add(TimeInterval(it.startTime, it.endTime)) }

        // Sort occupied intervals
        occupied.sortBy { it.start }

        // 2. Compute Free Intervals
        val freeIntervals = computeFreeIntervals(startOfDay, endOfDay, occupied)

        // 3. Rank Tasks by Multi-Objective Score
        val sortedTasks = tasks.sortedWith(
            compareByDescending<Task> { it.priority.level }
                .thenBy { it.deadline ?: Long.MAX_VALUE }
                .thenByDescending { it.postponementCount }
        )

        val newBlocks = mutableListOf<ScheduleBlock>()
        val unplaced = mutableListOf<Task>()
        val currentFree = freeIntervals.toMutableList()

        for (task in sortedTasks) {
            // Task Splitting check: if > 90 mins, split into two manageable sessions
            val shouldSplit = task.estimatedDurationMinutes > digitalTwin.maxRecommendedContinuousMinutes

            if (shouldSplit) {
                val halfDuration = task.estimatedDurationMinutes / 2
                val placedFirst = placeTaskSlot(
                    task = task,
                    durationMins = halfDuration,
                    titleSuffix = " (Part 1)",
                    freeIntervals = currentFree,
                    baseTime = baseTimeMillis,
                    newBlocks = newBlocks,
                    isSplit = true
                )
                val placedSecond = placeTaskSlot(
                    task = task,
                    durationMins = halfDuration,
                    titleSuffix = " (Part 2)",
                    freeIntervals = currentFree,
                    baseTime = baseTimeMillis,
                    newBlocks = newBlocks,
                    isSplit = true
                )

                if (!placedFirst && !placedSecond) {
                    unplaced.add(task)
                }
            } else {
                val placed = placeTaskSlot(
                    task = task,
                    durationMins = task.estimatedDurationMinutes,
                    titleSuffix = "",
                    freeIntervals = currentFree,
                    baseTime = baseTimeMillis,
                    newBlocks = newBlocks,
                    isSplit = false
                )
                if (!placed) {
                    unplaced.add(task)
                }
            }
        }

        val summary = generateSummary(newBlocks.size, unplaced.size)
        return SchedulingResult(newBlocks, unplaced, summary)
    }

    private fun placeTaskSlot(
        task: Task,
        durationMins: Int,
        titleSuffix: String,
        freeIntervals: MutableList<TimeInterval>,
        baseTime: Long,
        newBlocks: MutableList<ScheduleBlock>,
        isSplit: Boolean
    ): Boolean {
        val durationMillis = durationMins * 60 * 1000L
        val bufferMillis = digitalTwin.defaultBufferMinutes * 60 * 1000L

        // Prioritize intervals that align with peak focus for STUDY (e.g. 5 PM - 8 PM)
        var selectedIntervalIndex = -1
        var candidateStart = -1L

        val peakStartMillis = getPeakHourMillis(baseTime, digitalTwin.peakStudyStartHour)
        val peakEndMillis = getPeakHourMillis(baseTime, digitalTwin.peakStudyEndHour)

        // Try peak focus window first if Study task
        if (task.category == TaskCategory.STUDY) {
            for (i in freeIntervals.indices) {
                val interval = freeIntervals[i]
                val effectiveStart = maxOf(interval.start, baseTime)
                if (effectiveStart >= peakStartMillis && effectiveStart + durationMillis <= minOf(interval.end, peakEndMillis)) {
                    selectedIntervalIndex = i
                    candidateStart = effectiveStart
                    break
                }
            }
        }

        // Fallback: earliest available interval fitting the duration
        if (selectedIntervalIndex == -1) {
            for (i in freeIntervals.indices) {
                val interval = freeIntervals[i]
                val effectiveStart = maxOf(interval.start, baseTime)
                if (effectiveStart + durationMillis <= interval.end) {
                    selectedIntervalIndex = i
                    candidateStart = effectiveStart
                    break
                }
            }
        }

        if (selectedIntervalIndex == -1 || candidateStart == -1L) {
            return false // No fitting slot found
        }

        val candidateEnd = candidateStart + durationMillis
        val interval = freeIntervals[selectedIntervalIndex]

        // Build explanation
        val explanation = buildExplanation(task, candidateStart, isSplit)

        val block = ScheduleBlock(
            taskId = task.id,
            title = task.title + titleSuffix,
            startTime = candidateStart,
            endTime = candidateEnd,
            blockType = BlockType.TASK,
            priority = task.priority,
            scheduleExplanation = explanation
        )
        newBlocks.add(block)

        // Update free intervals: consume [candidateStart, candidateEnd + buffer]
        freeIntervals.removeAt(selectedIntervalIndex)
        val remainingStart = candidateEnd + bufferMillis
        if (remainingStart < interval.end) {
            freeIntervals.add(selectedIntervalIndex, TimeInterval(remainingStart, interval.end))
        }
        if (interval.start < candidateStart) {
            freeIntervals.add(selectedIntervalIndex, TimeInterval(interval.start, candidateStart))
        }
        freeIntervals.sortBy { it.start }

        return true
    }

    private fun buildExplanation(task: Task, startMillis: Long, isSplit: Boolean): String {
        val cal = Calendar.getInstance().apply { timeInMillis = startMillis }
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        val amPm = if (hour >= 12) "PM" else "AM"
        val displayHour = if (hour % 12 == 0) 12 else hour % 12

        return when {
            task.category == TaskCategory.STUDY && hour in digitalTwin.peakStudyStartHour..digitalTwin.peakStudyEndHour -> {
                "Scheduled at $displayHour $amPm because you normally focus better in the evening (${digitalTwin.peakStudyStartHour}:00-${digitalTwin.peakStudyEndHour}:00)."
            }
            task.priority == Priority.CRITICAL -> {
                "Protected at $displayHour $amPm due to critical urgency and deadline constraint."
            }
            isSplit -> {
                "Split into shorter sessions because you frequently complete sessions under 60 minutes more reliably."
            }
            task.postponementCount > 1 -> {
                "Prioritized at $displayHour $amPm because this task was postponed ${task.postponementCount} times."
            }
            else -> {
                "Placed at $displayHour $amPm in your next available focus window with a ${digitalTwin.defaultBufferMinutes}-minute buffer."
            }
        }
    }

    private fun computeFreeIntervals(
        dayStart: Long,
        dayEnd: Long,
        occupied: List<TimeInterval>
    ): List<TimeInterval> {
        val free = mutableListOf<TimeInterval>()
        var cursor = dayStart

        for (occ in occupied) {
            if (occ.start > cursor) {
                free.add(TimeInterval(cursor, occ.start))
            }
            cursor = maxOf(cursor, occ.end)
        }

        if (cursor < dayEnd) {
            free.add(TimeInterval(cursor, dayEnd))
        }

        return free
    }

    private fun getStartOfDay(cal: Calendar): Long {
        val c = cal.clone() as Calendar
        c.set(Calendar.HOUR_OF_DAY, 0)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    private fun getEndOfDay(cal: Calendar): Long {
        val c = cal.clone() as Calendar
        c.set(Calendar.HOUR_OF_DAY, 23)
        c.set(Calendar.MINUTE, 59)
        c.set(Calendar.SECOND, 59)
        c.set(Calendar.MILLISECOND, 999)
        return c.timeInMillis
    }

    private fun getPeakHourMillis(baseTime: Long, hourOfDay: Int): Long {
        val c = Calendar.getInstance().apply { timeInMillis = baseTime }
        c.set(Calendar.HOUR_OF_DAY, hourOfDay)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        return c.timeInMillis
    }

    private fun generateSummary(placedCount: Int, unplacedCount: Int): String {
        return if (unplacedCount == 0) {
            "All $placedCount activities successfully optimized with buffers."
        } else {
            "Scheduled $placedCount activities. $unplacedCount flexible tasks deferred to protect wellbeing."
        }
    }
}
