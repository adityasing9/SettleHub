# PAOA — Personal AI Operating Assistant

> *"An AI that knows how I normally live and helps me decide what to do next."*

[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84.svg?style=flat&logo=android)](https://www.android.com)
[![Architecture](https://img.shields.io/badge/Architecture-Local--First-blue.svg)](./ARCHITECTURE.md)
[![Operating Cost](https://img.shields.io/badge/Cost-₹0%20Zero--Cost-brightgreen.svg)](#zero-cost-guarantee)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)

PAOA (Personal AI Operating Assistant) is a **local-first, offline-capable, zero-cost AI companion, dynamic scheduler, and productivity manager** built natively for Android.

Unlike standard to-do lists, calendar apps, or cloud chatbots, PAOA continuously learns your daily routine, respects your social life, adapts when your day changes, sets precise alarms and reminders, and answers your most critical question with explainable logic:

> **"What should I do now?"**

---

## 🌟 Key Features

### 1. 🧠 Layered On-Device AI Pipeline
- **₹0 Operating Cost**: No OpenAI/Gemini/Anthropic API keys required. No cloud subscriptions.
- **Layer 1: Deterministic Engine**: 0ms instant execution for commands like *"Move DSA to tomorrow"* or *"Mark DBMS complete"*.
- **Layer 2: Lightweight NLP Parser**: Local natural-language entity extraction for dates, times, durations, and priorities.
- **Layer 3: Local AI & Heuristic Reasoning**: High-level conversational advice with immediate fallback.
- **Decoupled Architecture**: AI extracts structured *intent*; our dedicated **Constraint Satisfaction Scheduler** manages the calendar.

### 2. 📅 Smart Scheduling & Dynamic Rescheduling
- **Human-Centric Optimization**: Optimizes for realistic completion and user wellbeing, rather than packing every minute.
- **Dynamic Rescheduling**: When life happens (*"I'm going out with friends from 5 to 8"*), PAOA protects hard deadlines, splits long study blocks, moves flexible items, and explains why.
- **Social Life is Not a Failure**: Entertainment, fatigue, family, and social outings are treated as legitimate life events.
- **Task Splitting**: Automatically splits $>90$m tasks into focused blocks if your history indicates high postponement for marathon sessions.
- **Explainability**: Every placed task has a clear reason (e.g. *"Scheduled at 6 PM because you complete study sessions 42% more reliably then"*).

### 3. 🎙️ On-Device Conversational Voice Assistant
- Powered by native Android `SpeechRecognizer` and `TextToSpeech`.
- Offline voice recognition support (via offline speech packs).
- Conversational context across multiple turns without paid voice APIs.

### 4. 🪞 Personal Memory & Digital Twin
- Remembers wake/sleep routines, preferred study hours, and average completion speed.
- Completely transparent: Inspect everything in **"What I Know About You"**.
- One-tap correction: Say *"I don't like studying in the morning anymore"* to instantly update your model.

### 5. 📊 Non-Judgmental Insights & Procrastination Analysis
- Kept strictly off the calm Home screen.
- Tracks **Planned vs Actual** (start time delays and duration overruns).
- Identifies postponement patterns neutrally without guilt or shaming.

### 6. 🔒 Strict Privacy & Local Storage
- Purely local SQLite Room database on your device.
- Cryptographically protected via Android Keystore.
- Complete data export (JSON) and one-tap data wipe.

---

## 📱 Navigation & Screen Structure

1. **Home**: Calm, minimal dashboard showing *What Should I Do Now?*, *Next Activity*, *Today's Progress*, and *Quick Mic*.
2. **Assistant**: Conversational interface with voice and text, suggested prompts, and intent history.
3. **Calendar**: Unified Day, 3-Day, Week, and Month views synchronized with the scheduler.
4. **Insights**: Deep analytics (Productivity, Planned vs Actual, Postponement Patterns, Digital Twin habits).
5. **Settings**: Voice settings, Scheduling buffers, Permissions & Device Controls, and Data Export/Purge.

---

## 🏗️ Architecture & Technology Stack

```
Android App (Kotlin + Jetpack Compose Material 3)
   ├── core/ai          (Deterministic Parser, NLP Entity Extractor, Intent Router)
   ├── core/scheduler   (Constraint Satisfaction Solver, Dynamic Rescheduler, Explainability)
   ├── core/context     (Context Engine, Energy Matrix, Availability Windows)
   ├── core/memory      (Personal Memory Store, Digital Twin Model, Learning Engine)
   ├── core/reminders   (AlarmManager, NotificationManager, Inexact Fallback)
   ├── core/voice       (Android SpeechRecognizer, TextToSpeech Engine)
   ├── core/analytics   (Planned vs Actual Tracker, Procrastination Analyzer)
   ├── core/database    (Room Database, SQLite Entities & DAOs)
   └── ui/              (MVI ViewModels, Compose Screens & Components)
```

For complete technical specifications, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SCHEDULER.md](./SCHEDULER.md)
- [DATABASE.md](./DATABASE.md)
- [AI.md](./AI.md)
- [VOICE.md](./VOICE.md)
- [PRIVACY.md](./PRIVACY.md)
- [ANDROID_PERMISSIONS.md](./ANDROID_PERMISSIONS.md)
- [TESTING.md](./TESTING.md)
- [ROADMAP.md](./ROADMAP.md)

---

## 🛠️ Build & Installation Setup

### Prerequisites
- **JDK**: Java 17+ (e.g. Microsoft OpenJDK 17)
- **Android SDK**: API Level 34 (Android 14) / Min SDK 26 (Android 8.0)
- **Gradle**: 8.2+

### Quick Start
```bash
# Clone the repository
git clone https://github.com/adityasing9/SettleHub.git paoa
cd paoa

# Build debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Install on connected device
./gradlew installDebug
```

---

## ⚠️ Important Android Limitations

- **Exact Alarms**: Exact alarms require user approval under Android 12+ (`SCHEDULE_EXACT_ALARM`). PAOA gracefully falls back to standard notifications if denied.
- **Battery Optimization**: Aggressive manufacturer task killers (MIUI, OneUI) may suppress background alerts. PAOA provides instructions in the Permissions screen to whitelist the app.
- **Usage Statistics**: App screen time tracking requires explicit grant in Android Special App Access.

---

## 🗺️ Roadmap & Future Enhancements

- [x] On-device MVI Architecture & Room Database
- [x] Deterministic NLP & Entity Extraction
- [x] Dynamic Scheduling & Task Splitting
- [x] Native Voice STT & Spoken TTS Engine
- [x] Planned vs Actual Behavioral Learning
- [x] Privacy Export & Keystore Security
- [ ] Optional Encrypted WebDAV / Nextcloud Backup
- [ ] WearOS Companion Tile

---

## 📄 License

Distributed under the MIT License. Free and open source for personal sovereignty.
