# Personal AI Operating Assistant (PAOA) - Database Schema

## 1. Overview

PAOA uses **SQLite** through **Android Room** persistence library.
All data is stored locally on-device. No remote servers or cloud databases are required.

## 2. Entities & Table Design

### 2.1. `user_profile`
Stores basic user identity, configuration, and defaults.
- `id` (INTEGER, Primary Key): Single-row constraint (`id = 1`)
- `name` (TEXT): User's preferred name (e.g. "Aaditya")
- `preferred_language` (TEXT): Default "en-US"
- `interaction_style` (TEXT): "concise", "detailed", "motivational", "neutral"
- `typical_wake_time` (TEXT): e.g. "07:00"
- `typical_sleep_time` (TEXT): e.g. "23:30"
- `default_reminder_mode` (TEXT): "ALARM", "NOTIFICATION", "SMART"
- `default_buffer_minutes` (INTEGER): Default 15
- `created_at` (INTEGER): Timestamp ms
- `updated_at` (INTEGER): Timestamp ms

### 2.2. `user_preferences`
Key-value and category-based preferences for adaptive scheduling.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `category` (TEXT): e.g. "STUDY", "EXERCISE", "SLEEP", "REMINDER"
- `preference_key` (TEXT, Indexed): e.g. "preferred_study_period"
- `preference_value` (TEXT): e.g. "17:00-20:00"
- `confidence_score` (REAL): 0.0 to 1.0 (manually set = 1.0, learned = derived)
- `is_user_defined` (INTEGER): 1 if explicitly entered, 0 if inferred
- `updated_at` (INTEGER)

### 2.3. `tasks`
Core task registry.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `title` (TEXT, Indexed)
- `description` (TEXT)
- `category` (TEXT): "STUDY", "PROJECT", "ROUTINE", "EXERCISE", "SOCIAL", "PERSONAL"
- `priority` (TEXT): "CRITICAL", "IMPORTANT", "NORMAL", "FLEXIBLE"
- `estimated_duration_minutes` (INTEGER)
- `actual_duration_minutes` (INTEGER)
- `deadline` (INTEGER, Nullable, Indexed): Timestamp ms
- `preferred_time_of_day` (TEXT, Nullable): "MORNING", "AFTERNOON", "EVENING", "NIGHT"
- `earliest_start` (INTEGER, Nullable): Timestamp ms
- `latest_finish` (INTEGER, Nullable): Timestamp ms
- `recurrence_rule` (TEXT, Nullable): RRULE format (e.g. "FREQ=DAILY;INTERVAL=1")
- `status` (TEXT, Indexed): "PLANNED", "IN_PROGRESS", "COMPLETED", "POSTPONED", "CANCELLED", "MISSED"
- `reminder_mode` (TEXT): "ALARM", "NOTIFICATION", "NONE", "SMART"
- `reminder_offset_minutes` (INTEGER): e.g. 10 minutes prior
- `creation_source` (TEXT): "VOICE", "TEXT", "CALENDAR", "AUTO_HABIT"
- `postponement_count` (INTEGER): Defaults to 0
- `completion_timestamp` (INTEGER, Nullable)
- `goal_id` (INTEGER, Nullable, Foreign Key -> `goals.id` ON DELETE SET NULL)
- `notes` (TEXT)
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

### 2.4. `task_dependencies`
Represents DAG dependencies ($Task_A$ must finish before $Task_B$).
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Foreign Key -> `tasks.id` ON DELETE CASCADE)
- `depends_on_task_id` (INTEGER, Foreign Key -> `tasks.id` ON DELETE CASCADE)
- UNIQUE constraint on `(task_id, depends_on_task_id)`

### 2.5. `goals`
High-level objectives decomposable into milestones and tasks.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `title` (TEXT)
- `description` (TEXT)
- `category` (TEXT): "ACADEMIC", "FITNESS", "PROJECT", "PERSONAL"
- `target_date` (INTEGER, Nullable)
- `progress_percentage` (REAL)
- `is_archived` (INTEGER)
- `created_at` (INTEGER)

### 2.6. `schedule_blocks`
Concrete time allocations computed by the Scheduling Engine.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Nullable, Foreign Key -> `tasks.id` ON DELETE CASCADE)
- `event_id` (INTEGER, Nullable, Foreign Key -> `events.id` ON DELETE CASCADE)
- `title` (TEXT)
- `start_time` (INTEGER, Indexed): Timestamp ms
- `end_time` (INTEGER, Indexed): Timestamp ms
- `block_type` (TEXT): "TASK", "FIXED_EVENT", "UNAVAILABLE", "BUFFER", "SLEEP", "ROUTINE"
- `is_locked` (INTEGER): 1 if user locked the block from rescheduling
- `schedule_explanation` (TEXT): Why this block was positioned here
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

### 2.7. `events`
Fixed commitments that act as hard constraints in the schedule.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `title` (TEXT)
- `start_time` (INTEGER, Indexed)
- `end_time` (INTEGER, Indexed)
- `is_all_day` (INTEGER)
- `location` (TEXT, Nullable)
- `recurrence_rule` (TEXT, Nullable)
- `is_external` (INTEGER): 1 if synced from device calendar

### 2.8. `reminders`
Scheduled alerts tied to exact alarm/notification services.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Nullable, Foreign Key -> `tasks.id` ON DELETE CASCADE)
- `schedule_block_id` (INTEGER, Nullable, Foreign Key -> `schedule_blocks.id` ON DELETE CASCADE)
- `trigger_time` (INTEGER, Indexed)
- `type` (TEXT): "ALARM", "NOTIFICATION"
- `status` (TEXT): "PENDING", "TRIGGERED", "DISMISSED", "SNOOZED"
- `snooze_count` (INTEGER)

### 2.9. `conversations` & `messages`
Stores assistant interactions and voice transcripts locally.
- `conversation_id` (INTEGER, Primary Key, AutoGenerate)
- `title` (TEXT)
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

**`messages`**:
- `id` (INTEGER, Primary Key, AutoGenerate)
- `conversation_id` (INTEGER, Foreign Key -> `conversations.id` ON DELETE CASCADE)
- `role` (TEXT): "USER", "ASSISTANT", "SYSTEM"
- `content` (TEXT)
- `input_mode` (TEXT): "VOICE", "TEXT"
- `intent_detected` (TEXT, Nullable)
- `timestamp` (INTEGER)

### 2.10. `memories`
Long-term semantic & declarative memory facts for the Digital Twin.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `topic` (TEXT, Indexed): "ROUTINE", "STUDY_PREFERENCE", "SOCIAL_LIFE", "FATIGUE"
- `fact` (TEXT): e.g. "Prefers studying DSA in the evening around 6 PM"
- `source` (TEXT): "CONVERSATION", "BEHAVIORAL_INFERENCE", "USER_EDIT"
- `confidence` (REAL): 0.0 - 1.0
- `is_active` (INTEGER): 1 for active, 0 if retracted by user
- `created_at` (INTEGER)
- `last_validated_at` (INTEGER)

### 2.11. `behavioral_events` & `activity_sessions`
Tracks user action timestamps (task start, task finish, pause).
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Nullable, Foreign Key -> `tasks.id` ON DELETE SET NULL)
- `event_type` (TEXT): "TASK_START", "TASK_COMPLETE", "TASK_POSTPONE", "TASK_EXTEND"
- `planned_start` (INTEGER, Nullable)
- `actual_start` (INTEGER, Nullable)
- `planned_duration_mins` (INTEGER, Nullable)
- `actual_duration_mins` (INTEGER, Nullable)
- `reason` (TEXT, Nullable): e.g. "friends", "tired", "college assignment"
- `timestamp` (INTEGER, Indexed)

### 2.12. `postponements`
Neutrally records postponement occurrences without guilt or shaming.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Foreign Key -> `tasks.id` ON DELETE CASCADE)
- `scheduled_time` (INTEGER)
- `postponed_to` (INTEGER, Nullable)
- `stated_reason` (TEXT, Nullable)
- `category` (TEXT)
- `created_at` (INTEGER)

### 2.13. `scheduling_decisions`
Audit trail of why the scheduler placed or modified blocks.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `task_id` (INTEGER, Nullable)
- `decision_type` (TEXT): "INITIAL_SCHEDULE", "RESCHEDULE", "SPLIT", "BUFFER_INSERTION"
- `rationale` (TEXT): e.g. "Moved DSA to 6 PM matching peak historical focus window"
- `timestamp` (INTEGER)

### 2.14. `daily_reviews`
End-of-day summary logs.
- `id` (INTEGER, Primary Key, AutoGenerate)
- `review_date` (TEXT, Indexed): "YYYY-MM-DD"
- `completed_task_count` (INTEGER)
- `planned_task_count` (INTEGER)
- `postponed_task_count` (INTEGER)
- `total_focus_minutes` (INTEGER)
- `summary_text` (TEXT)
- `created_at` (INTEGER)

---

## 3. Database Indices & Performance Optimization

To guarantee smooth 60fps Compose UI and $<10$ms query times:
- `tasks(status, deadline)`: for rapid retrieval of actionable tasks.
- `schedule_blocks(start_time, end_time)`: for instantaneous interval lookup and clash detection.
- `reminders(trigger_time, status)`: for alarm receiver lookups.
- `behavioral_events(timestamp, event_type)`: for fast analytics aggregation.
