# Personal AI Operating Assistant (PAOA) - System Architecture

## 1. Architectural Philosophy

PAOA is architected as an **on-device personal operating assistant and companion** for a single individual. It is strictly:
- **Local-first & Offline-first**: Operates with 100% functionality without network connection or cloud servers.
- **₹0 Operating Cost**: No API keys, no paid subscriptions, no mandatory external backends.
- **12 GB RAM Compliant**: Efficient memory footprint; never continuously loads multi-gigabyte models into RAM.
- **Explainable & Transparent**: Every scheduling action, postponement observation, and learned behavior has an accessible rationale.
- **Respectful & Non-Judgmental**: Treats social life, fatigue, entertainment, and breaks as legitimate events.

```
       +-------------------------------------------------------+
       |                  USER INTERACTION                     |
       |     Text / Touch UI   |   Voice Input & Spoken TTS    |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                ASSISTANT COORDINATOR                  |
       |  - Conversational History                             |
       |  - Intent Routing & Safety Guardrails                 |
       +---------------------------+---------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-----------------------------+             +-------------------------------+
|     AI INTENT PIPELINE      |             |         CONTEXT ENGINE        |
| Layer 1: Deterministic regex|             | - Time / Date / Day           |
| Layer 2: Lightweight NLP    |             | - Current task & free windows |
| Layer 3: Local AI Model     |             | - Battery / App usage / State |
+--------------+--------------+             +---------------+---------------+
               |                                            |
               +--------------------+-----------------------+
                                    |
                                    v
       +-------------------------------------------------------+
       |                SMART SCHEDULING ENGINE                |
       |  - Constraint Satisfaction Problem (CSP) Solver       |
       |  - Interval & Priority Scoring Optimization           |
       |  - Context Switching & Buffer Allocator               |
       |  - Task Splitting & Dynamic Rescheduler               |
       |  - Explainability Generator                           |
       +---------------------------+---------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-----------------------------+             +-------------------------------+
|    EXECUTION & REMINDERS    |             |      ROOM LOCAL DATABASE      |
| - AlarmManager (Alarms)     |             | - Tasks & Goals & Habits      |
| - NotificationManager       |             | - Schedule Blocks & Reminders |
| - Foreground Services       |             | - Digital Twin & Memory Store |
| - WorkManager (Periodic)    |             | - Planned vs Actual Logs      |
+-----------------------------+             +---------------+---------------+
                                                            |
                                                            v
                                            +-------------------------------+
                                            |       LEARNING ENGINE         |
                                            | - Planned vs Actual diff      |
                                            | - Procrastination / Delays    |
                                            | - Digital Twin Updates        |
                                            +-------------------------------+
```

---

## 2. The Core Operational Loop

```
Talk -> Understand -> Remember -> Plan -> Remind -> Observe -> Learn -> Adapt
```

1. **Talk**: User interacts via voice (Android SpeechRecognizer / TextToSpeech) or Compose UI.
2. **Understand**: Multi-layered NLP pipeline decodes user intent, extracting task details, time constraints, or queries.
3. **Remember**: Memory Engine fetches profile habits, constraints, recent commitments, and digital twin patterns.
4. **Plan**: Smart Scheduling Engine maps tasks to available intervals using priority, deadlines, and productive energy windows.
5. **Remind**: System queues exact alarms via Android `AlarmManager` and contextual notifications via `NotificationManager`.
6. **Observe**: System tracks task start, delays, app usage, and completions without surveillance shaming.
7. **Learn**: Behavioral learning calculates planned-vs-actual variance, postponement tendencies, and optimal focus slots.
8. **Adapt**: Dynamic rescheduler reorganizes remaining commitments automatically when reality shifts.

---

## 3. Layered AI Architecture

Rather than depending on a brittle or resource-heavy monolithic LLM, PAOA employs a 4-layer AI architecture:

### Layer 1: Deterministic Command Engine
- Instant execution for common operations with zero CPU/RAM overhead:
  - "Move DSA to tomorrow"
  - "Mark DBMS assignment complete"
  - "Show today's tasks"
  - "I'm busy from 6 to 9"
  - "What should I do now?"
- Uses compiled regex patterns and state machines for deterministic 0ms responses.

### Layer 2: Lightweight NLP Parser
- Entity extraction without external servers:
  - **Temporal expressions**: "tomorrow at 5 PM", "in 45 minutes", "next Monday", "tonight", "this weekend"
  - **Durations**: "for 2 hours", "30 mins", "a quick session"
  - **Priorities**: "urgent", "critical", "important", "flexible"
  - **Categories**: Study, Project, Exercise, Routine, Social, Personal
  - **Recurrence**: "every day", "weekdays", "every Tuesday"

### Layer 3: Local AI & Reasoning Engine
- Pluggable interface for on-device reasoning (e.g. MediaPipe / On-Device Small Language Models / Rule-based conversational fallbacks).
- Loaded on-demand only when natural conversation or complex queries require semantic nuance, then unloaded to conserve the 12 GB RAM envelope.
- Complete non-LLM rule/heuristic fallback ensures the app never crashes or becomes unusable if model execution fails.

### Layer 4: Decoupled Scheduler
- **Critical Principle**: The AI never directly mutates schedule blocks. Instead, it emits structured intents (`ScheduleTaskIntent`, `RescheduleIntent`, `MarkUnavailableIntent`, `SplitTaskIntent`).
- The Scheduler validates constraints, prevents collisions, respects task dependencies, and commits the state.

---

## 4. Smart Scheduling Engine & Optimization Algorithms

The scheduling engine solves a constrained interval placement problem:

1. **Hard Constraints**:
   - Sleep intervals (e.g., 11:30 PM - 7:00 AM)
   - Fixed commitments & appointments
   - Unavailable intervals declared by user ("going out with friends from 5 to 8")
   - Task dependency order ($Task_A \to Task_B$)
   - Deadlines ($Finish \le Deadline$)
2. **Soft Preferences**:
   - User's peak focus windows (e.g., 5:00 PM – 8:00 PM for study/DSA)
   - Session duration limits (split sessions if $> 90$ mins and user frequently postpones long sessions)
   - Minimum buffer time (10–15 mins between heavy cognitive tasks)
   - Energy decay curve throughout the day
3. **Dynamic Rescheduling**:
   - Preserves `CRITICAL` deadlines first.
   - Adjusts `IMPORTANT` items next.
   - Postpones or scales down `FLEXIBLE` items first.
   - Never blindly shifts all tasks linearly into late night.

---

## 5. Security & Privacy Architecture

- **Local Storage**: Android Room SQLite database located strictly in protected app storage (`/data/data/com.paoa.app/databases/`).
- **Cryptographic Security**: Android Keystore backed encryption for sensitive user notes, profile data, and backups.
- **Zero Cloud Leakage**: No Firebase, no telemetry SDKs, no advertising identifiers, no third-party network pings.
- **Auditability**: Complete transparency screen ("What I Know About You") where every learned preference can be inspected or edited.
- **Export & Purge**: User can export data to plain JSON or trigger a complete wipe of the digital twin with one tap.

---

## 6. Target Android Technology Stack

- **Language**: Kotlin 1.9+
- **UI Toolkit**: Jetpack Compose (Material 3 Dark-first aesthetic)
- **Architecture**: MVI / Clean Architecture (ViewModel + StateFlow + Kotlin Coroutines)
- **Database**: Android Room 2.6+ with SQLite and TypeConverters
- **Background Operations**: WorkManager (periodic analytics/review) + AlarmManager (exact alarms)
- **Voice**: Android native `SpeechRecognizer` + `TextToSpeech`
- **Device Usage**: Android `UsageStatsManager` (explicit opt-in)
