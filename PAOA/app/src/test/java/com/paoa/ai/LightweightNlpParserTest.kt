package com.paoa.ai

import com.paoa.core.ai.LightweightNlpParser
import com.paoa.domain.model.Priority
import com.paoa.domain.model.TaskCategory
import org.junit.Assert.*
import org.junit.Test

class LightweightNlpParserTest {

    @Test
    fun testStudySessionWithDurationAndPeriod() {
        val result = LightweightNlpParser.parseTaskCreation("I need to study DSA for 2 hours tonight")
        assertEquals(120, result.durationMinutes)
        assertEquals(TaskCategory.STUDY, result.category)
        assertEquals("EVENING", result.preferredTimeOfDay)
        assertTrue(result.title.contains("DSA", ignoreCase = true))
    }

    @Test
    fun testTomorrowAssignment() {
        val result = LightweightNlpParser.parseTaskCreation("I have to finish my DBMS assignment tomorrow")
        assertEquals(1, result.targetDateOffsetDays)
        assertEquals(TaskCategory.STUDY, result.category)
        assertEquals(Priority.IMPORTANT, result.priority)
        assertTrue(result.title.contains("DBMS", ignoreCase = true))
    }

    @Test
    fun testRunTomorrowMorning() {
        val result = LightweightNlpParser.parseTaskCreation("I want to run tomorrow morning")
        assertEquals(1, result.targetDateOffsetDays)
        assertEquals(TaskCategory.EXERCISE, result.category)
        assertEquals("MORNING", result.preferredTimeOfDay)
        assertEquals(9, result.targetHour)
    }

    @Test
    fun testExamUrgencyDetection() {
        val result = LightweightNlpParser.parseTaskCreation("I have an exam on Friday")
        assertEquals(Priority.CRITICAL, result.priority)
    }
}
