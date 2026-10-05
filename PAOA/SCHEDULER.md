# Personal AI Operating Assistant (PAOA) - Scheduling Engine

## 1. Scheduling Philosophy

PAOA does not optimize for "maximum task density."
It optimizes for:
> **Realistic completion + User wellbeing + Important outcomes**

The scheduler never packs every second of the day like a factory assembly line. It explicitly schedules buffers, preserves downtime, respects sleep, and accommodates spontaneous events (friends, trips, breaks, fatigue).

---

## 2. Algorithm Overview

The Smart Scheduling Engine uses a multi-stage **Constrained Heuristic Interval Scheduler** with Explainability:

```
[ Active Tasks Pool ]
         |
         v
Stage 1: Constraint Verification & Availability Matrix
  - Exclude sleep blocks (e.g. 11:30 PM - 07:00 AM)
  - Exclude fixed calendar events & hard appointments
  - Exclude user-declared unavailable intervals ("busy 6-9 PM")
  - Compute free continuous slots: FreeIntervals = [T_start, T_end]
         |
         v
Stage 2: Dependency Resolution (DAG Topological Sort)
  - Ensure Task A is scheduled before Task B if A -> B
         |
         v
Stage 3: Task Scoring & Ranking
  - Score = w_p * PriorityScore + w_d * DeadlineUrgency + w_f * FocusFit + w_u * PostponementPenalty
         |
         v
Stage 4: Intelligent Slot Placement & Task Splitting
  - Long task (> 90m) + history of postponement -> Split into 2 manageable sessions
  - Match task category with user's peak focus window (e.g., Study -> 5:00 PM - 8:00 PM)
  - Ensure minimum buffer (10-15m) between intensive tasks
         |
         v
Stage 5: Dynamic Rescheduling (On Reality Shift)
  - Mark new conflict interval
  - Protect CRITICAL and high-urgency tasks
  - Reschedule flexible/normal tasks
  - Generate human-readable explanation
```

---

## 3. Priority Levels & Handling

| Level | Priority | Behavior under conflict | Examples |
|---|---|---|---|
| **CRITICAL** | 4 | **Never moved automatically**. Protected first. Warns if impossible. | Exams, Hard deadlines, Doctor appointment |
| **IMPORTANT** | 3 | Preserved wherever possible; split if necessary. | Assignments, Major project blocks, Key prep |
| **NORMAL** | 2 | Shifted to next available optimal slot within the day or tomorrow. | Regular study, routine workout, grocery |
| **FLEXIBLE** | 1 | Deferred first to protect user bandwidth and avoid cognitive overload. | Optional reading, entertainment, casual tasks |

---

## 4. Priority Scoring Equation

For a task $T$ candidate for placement at time $t$:

$$\text{Score}(T, t) = w_p \cdot P(T) + w_u \cdot U(T, t) + w_f \cdot F(T, t) - w_s \cdot S(T) - w_c \cdot C(t)$$

Where:
- $P(T) \in [1, 4]$: Priority weight (Critical=4, Flexible=1).
- $U(T, t) = \max\left(0, 1 - \frac{\text{Deadline} - t}{\text{Window}}\right)$: Urgency based on proximity to hard deadline.
- $F(T, t) \in [0, 1]$: Personal Model Focus Fit. Yields $+1.0$ if slot $t$ aligns with user's proven productive focus period for that category.
- $S(T) \in [0, 1]$: Session friction. Penalty if session duration exceeds the user's historical tolerance without breaks.
- $C(t)$: Context-switching cost if changing categories abruptly with insufficient buffer.

---

## 5. Dynamic Rescheduling Workflow

When the user announces a real-life change (e.g. *"I'm going out with friends from 5 to 8"*):
1. **Declare Unavailable Block**: An `UnavailableBlock` is inserted for 5:00 PM – 8:00 PM.
2. **Collect Colliding Blocks**: Find all tasks intersecting with $[17:00, 20:00]$.
3. **Partition by Flexibility**:
   - `CRITICAL`: If an assignment is due at 9:00 PM, fit it in the 8:00 PM – 9:00 PM window immediately after friends, or in the preceding afternoon window if time allows.
   - `IMPORTANT`: Relocate to late evening (e.g., 8:30 PM - 9:30 PM) or split into a concise session.
   - `NORMAL / FLEXIBLE`: Move exercise or leisure reading to tomorrow morning without judgment.
4. **Transparent Communication**:
   > *"Your evening changed. I protected your project deadline and moved exercise to tomorrow. DSA has been split into two shorter sessions."*

---

## 6. Task Splitting Logic

If:
$$\text{EstimatedDuration} > 90 \text{ mins} \quad \text{AND} \quad \text{PostponementRate}(category) > 30\%$$
Then:
- Split into: Session 1 (45-60 min) + Break (15 min) + Session 2 (45-60 min).
- Explain to user: *"You normally focus better with shorter sessions for DSA, so I've scheduled two 45-minute blocks."*

---

## 7. Explainability Rationale Generation

Every committed schedule block stores an explanation string. When the user asks:
> *"Why did you schedule this now?"*

The system inspects the `schedule_explanation` property:
- *"DSA was scheduled at 6 PM because you complete study tasks 42% more reliably between 5 PM and 8 PM, and this task has been postponed twice."*
- *"DBMS was placed at 8 PM because its deadline is tonight at 11:59 PM, and your 5 PM to 8 PM slot is reserved for your social outing."*
