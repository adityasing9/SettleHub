# Personal AI Operating Assistant (PAOA) - Testing Strategy & Test Suites

## 1. Testing Philosophy

To ensure reliability without costly cloud testing infrastructure, PAOA prioritizes:
- **Hermetic Unit & Logic Tests**: All core business logic (NLP, Scheduling, Conflict Resolution, Personal Model) runs as pure JUnit tests without requiring a live Android device or emulator.
- **Explainability Verification**: Tests assert that decisions contain valid, human-readable explanations.
- **Zero Mock Degradation**: Core algorithms run on authentic domain data rather than superficial mocks.

---

## 2. Test Suite Organization

```
app/src/test/java/com/paoa/
├── ai/
│   ├── DeterministicCommandParserTest.kt  # Layer 1 commands
│   ├── LightweightNlpParserTest.kt        # Entity & duration extraction
│   └── IntentRoutingTest.kt               # Correct intent dispatch
├── scheduler/
│   ├── SmartSchedulerTest.kt              # Baseline placement
│   ├── ConflictResolutionTest.kt          # Overlaps & unavailable intervals
│   ├── DynamicReschedulingTest.kt         # Real-time schedule shifts
│   ├── TaskSplittingTest.kt               # Splitting long tasks (>90m)
│   ├── DependencyGraphTest.kt             # Task DAG dependencies (A -> B)
│   └── ExplainabilityTest.kt              # Verifies rationale generation
├── memory/
│   ├── DigitalTwinModelTest.kt            # Focus periods & duration learning
│   ├── PreferenceUpdateTest.kt            # Retraction and preference updates
│   └── BehavioralLearningTest.kt          # Planned vs actual variance
├── reminders/
│   ├── ReminderCalculationTest.kt         # Offset calculations (task vs reminder)
│   └── MissedTaskEvaluatorTest.kt         # Neutral recovery strategies
└── privacy/
    ├── DataExportTest.kt                  # JSON serialization verification
    └── DataPurgeTest.kt                   # Complete cascading wipe
```

---

## 3. Key Scheduler Scenarios Tested

1. **Hard Deadline Protection**:
   - Given a `CRITICAL` task with deadline 9:00 PM and an unexpected user outing from 5:00 PM to 8:00 PM.
   - Assert: The scheduler protects the critical task by scheduling it in the free window 8:00 PM – 9:00 PM or earlier in the afternoon, rather than blindly postponing past the deadline.
2. **Task Splitting on Postponement Tendency**:
   - Given a 120-minute study task where user's history indicates $> 40\%$ delay for sessions $> 90$ mins.
   - Assert: Task is partitioned into two 60-minute blocks separated by a rest buffer.
3. **DAG Dependency Order**:
   - Given Task $B$ depends on Task $A$.
   - Assert: Finish time of $A$ strictly precedes start time of $B$.

---

## 4. Running the Tests

Execute tests via Gradle:
```bash
./gradlew test
```
Or for specific suites:
```bash
./gradlew testDebugUnitTest --tests "com.paoa.scheduler.*"
```
