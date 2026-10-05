# Personal AI Operating Assistant (PAOA) - Android Permissions & Device Controls

## 1. Transparency Principle

PAOA adheres to a strict privacy and permissions policy:
- **No Hidden Background Access**: We never silently collect device information.
- **Graceful Degradation**: If the user denies a permission, the app continues to function smoothly with appropriate fallbacks.
- **Permissions Management Screen**: A dedicated settings screen allows users to inspect permission status, rationale, and grant/revoke access.

---

## 2. Permission Matrix

| Permission | API Level | Rationale | Graceful Fallback if Denied |
|---|---|---|---|
| `RECORD_AUDIO` | All | Real-time voice commands and conversational interaction via microphone. | Text-only typing interface remains 100% functional. |
| `POST_NOTIFICATIONS` | 33+ | Delivering task reminders, dynamic rescheduling alerts, and daily briefings. | Reminders will not trigger popups; in-app dashboard still tracks schedule. |
| `SCHEDULE_EXACT_ALARM` | 31+ | Firing pinpoint alarms and wake-up notifications at the exact second required. | Alarms may be delayed by Doze mode batching (inexact alarms). |
| `USE_EXACT_ALARM` | 33+ | Setting critical deadlines and calendar alerts with exact precision. | App falls back to standard inexact alarms. |
| `RECEIVE_BOOT_COMPLETED` | All | Rescheduling active alarms and notifications automatically upon device reboot. | User must reopen the app once after restarting the device. |
| `PACKAGE_USAGE_STATS` | 21+ | Optional productivity tracking (screen time, coding vs distraction). | Digital twin relies on self-reported activity sessions rather than app statistics. |
| `READ_CALENDAR` / `WRITE_CALENDAR` | All | Optional import/export of external calendar events to prevent schedule clashes. | User manually inputs appointments or fixed commitments within PAOA. |
| `FOREGROUND_SERVICE` | 28+ | Active task focus sessions and voice audio recognition while app is in background. | Background voice commands disabled; active sessions pause on app minimize. |
| `VIBRATE` | All | Tactile haptic feedback for alarms and urgent notifications. | Visual notification banner only. |
| `WAKE_LOCK` | All | Ensuring alarm alerts awaken device screen during sleep hours. | Normal screen lock notifications. |

---

## 3. Dedicated Permissions Screen UI

Located at `Settings -> Permissions & Device Control`:
Each entry displays:
1. **Permission Title** (e.g. "Microphone / Voice Input")
2. **Current State**: `GRANTED` (Green indicator) or `NOT GRANTED` (Orange indicator)
3. **Transparent Rationale**: Why PAOA needs this permission.
4. **Action Button**: "Grant Permission" or "Open System Settings" if permanently denied.
