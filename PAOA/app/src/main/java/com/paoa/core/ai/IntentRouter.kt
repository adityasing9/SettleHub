package com.paoa.core.ai

import com.paoa.domain.model.UserIntent

object IntentRouter {

    fun route(input: String): UserIntent {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) return UserIntent.Unknown("")

        // 1. Try Layer 1 Deterministic
        val deterministicResult = DeterministicCommandEngine.parse(trimmed)
        if (deterministicResult != null) {
            return deterministicResult
        }

        // 2. Try Layer 2 Lightweight NLP
        // If input contains task intention markers
        val lower = trimmed.lowercase()
        val isTaskIntention = lower.startsWith("i need") ||
                lower.startsWith("i have to") ||
                lower.startsWith("i want to") ||
                lower.startsWith("study") ||
                lower.startsWith("work on") ||
                lower.startsWith("prepare for") ||
                lower.startsWith("run") ||
                lower.contains("assignment") ||
                lower.contains("exam") ||
                lower.contains("for ") ||
                lower.contains("tomorrow") ||
                lower.contains("tonight")

        if (isTaskIntention) {
            return LightweightNlpParser.parseTaskCreation(trimmed)
        }

        // Fallback to task creation with default title if short phrase
        if (trimmed.split(" ").size <= 5 && !trimmed.endsWith("?")) {
            return LightweightNlpParser.parseTaskCreation(trimmed)
        }

        return UserIntent.Unknown(trimmed)
    }
}
