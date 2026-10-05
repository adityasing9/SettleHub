# Personal AI Operating Assistant (PAOA) - AI Architecture & NLP

## 1. Principles of On-Device AI

1. **₹0 Operating Cost**: Runs purely on-device. No API keys, zero cloud costs.
2. **Deterministic-First Reliability**: Never use probabilistic generation where exact logic is faster, cheaper, and 100% accurate.
3. **Decoupled Control**: AI extracts *intent* and parameters. It **never** writes raw updates to the database or calendar directly. All mutations pass through the Scheduler and domain validators.
4. **Safety & Confirmation**: Irreversible or high-impact actions (deleting tasks, wiping calendar, dropping critical deadlines) require explicit confirmation.

---

## 2. Multi-Layer Pipeline

```
Raw User Input ("I need to study DSA for 2 hours tonight")
                     |
                     v
+------------------------------------------------------------+
|             Layer 1: Deterministic Command Engine          |
| Fast-path regex & intent lookup for explicit commands:     |
| - "What should I do now?"                                  |
| - "Mark [task] complete"                                   |
| - "Move [task] to tomorrow"                                |
| - "Show my schedule"                                       |
+-----------------------------+------------------------------+
                              | (If not an exact command)
                              v
+------------------------------------------------------------+
|             Layer 2: Lightweight NLP Parser                |
| Rule-based entity extraction:                              |
| - Temporal expressions: today, tomorrow, Friday, at 6 PM   |
| - Durations: 45 mins, 2 hours, 30m                         |
| - Priority tags: critical, urgent, important, chill        |
| - Categories: study, project, workout, social, chill       |
+-----------------------------+------------------------------+
                              | (If complex natural syntax)
                              v
+------------------------------------------------------------+
|             Layer 3: Local AI & Semantic Reasoning         |
| - On-device lightweight model / conversational resolver    |
| - Clarifies ambiguities if critical info is absent         |
| - Summarizes daily reviews & conversational advice         |
| - Unloads immediately to preserve 12 GB RAM envelope       |
+-----------------------------+------------------------------+
                              |
                              v
                   Structured User Intent
  (e.g., ScheduleTaskIntent(title="DSA", duration=120, time=EVENING))
                              |
                              v
                     Safety & Validation Gate
                              |
                              v
                    Smart Scheduling Engine
```

---

## 3. Supported Intents

| Intent | Description | Example Phrases |
|---|---|---|
| `WHAT_SHOULD_I_DO_NOW` | Evaluates current context, urgency, and focus | "What should I do now?", "Next task?", "What's next?" |
| `SCHEDULE_TASK` | Create & place a task into the schedule | "I need to study DSA", "Finish DBMS assignment tomorrow" |
| `RESCHEDULE_TASK` | Move or postpone a specific task | "Move DSA to tomorrow", "Push DBMS to 8 PM" |
| `SET_UNAVAILABLE` | Declare busy/social/relaxation block | "I'm going out with friends from 5 to 8", "Busy 6-9 PM" |
| `COMPLETE_TASK` | Mark a task done and log actual duration | "I finished DBMS", "Mark DSA as done" |
| `EXPLAIN_SCHEDULE` | Explain rationale for current placement | "Why did you schedule this now?", "Why is DSA at 6 PM?" |
| `QUERY_MEMORY` | Inspect digital twin and learned preferences | "What do you know about me?", "Show my profile" |
| `UPDATE_PREFERENCE` | Modify a personal habit or routine rule | "I don't like studying in the morning anymore" |
| `QUERY_PRODUCTIVITY`| Inquire about day's focus and progress | "How productive was I today?", "How many tasks finished?" |

---

## 4. "What Should I Do Now?" Context Algorithm

When the user asks *"What should I do now?"*, PAOA executes a multi-factor ranking across all pending tasks:

$$\text{CandidateScore}(T) = 5.0 \cdot \mathbb{I}_{\text{Critical}} + 3.0 \cdot \text{Urgency}(T) + 2.0 \cdot \text{EnergyFit}(T, \text{now}) + 1.5 \cdot \text{DurationFit}(T, \Delta t_{\text{free}}) - 1.0 \cdot \text{PostponementFatigue}(T)$$

Where:
- $\mathbb{I}_{\text{Critical}}$: 1 if priority is `CRITICAL`, 0 otherwise.
- $\text{Urgency}(T)$: Highest if task deadline is approaching within $< 4$ hours.
- $\text{EnergyFit}(T, \text{now})$: Matches user's current time with historical peak performance for this task's category.
- $\text{DurationFit}(T, \Delta t_{\text{free}})$: Favor tasks whose estimated duration comfortably fits the current free interval before the next commitment.

The assistant returns a direct, actionable answer:
> *"Do your DBMS assignment now for 35 minutes. It has the nearest deadline tonight and fits your current free window before dinner."*
