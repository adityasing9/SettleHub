package com.paoa.memory

import com.paoa.core.memory.DigitalTwinLearner
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import org.junit.Assert.*
import org.junit.Test

class DigitalTwinLearnerTest {

    private val learner = DigitalTwinLearner()

    @Test
    fun testDurationLearningMovingAverage() {
        val estimated = 45
        val actual = 65

        val updated = learner.learnEstimatedDuration(estimated, actual)
        // With alpha 0.3: 45 * 0.7 + 65 * 0.3 = 31.5 + 19.5 = 51
        assertEquals(51, updated)
    }

    @Test
    fun testPostponementPatternNeutralObservation() {
        val tasks = listOf(
            Task(id = 1, title = "DSA 1", category = TaskCategory.STUDY, postponementCount = 1),
            Task(id = 2, title = "DSA 2", category = TaskCategory.STUDY, postponementCount = 2),
            Task(id = 3, title = "DSA 3", category = TaskCategory.STUDY, postponementCount = 0)
        )

        val insights = learner.analyzePostponementPatterns(tasks, emptyList())
        assertTrue(insights.isNotEmpty())
        val studyInsight = insights.find { it.category == TaskCategory.STUDY }
        assertNotNull(studyInsight)
        assertTrue(studyInsight!!.neutralObservation.contains("Study"))
        assertTrue(studyInsight.actionableRecommendation.isNotBlank())
    }
}
