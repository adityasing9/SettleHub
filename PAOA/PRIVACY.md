# Personal AI Operating Assistant (PAOA) - Privacy Architecture

## 1. Core Privacy Commitments

1. **Local-First & On-Device**: All tasks, conversations, notes, digital twin profile facts, and behavioral analytics reside exclusively on your physical Android device.
2. **Zero Telemetry & Zero Ads**: PAOA includes **no Google Analytics, no Firebase Crashlytics, no Facebook SDK, no advertising trackers**.
3. **₹0 Operating Cost & No Hidden Uploads**: The application does not communicate with any external backend servers. No audio recordings, schedule data, or conversational queries ever leave the device.
4. **Transparent Digital Twin**: What the assistant knows about you is 100% visible and editable on the "What I Know About You" screen.
5. **Complete User Sovereignty**: You can export your complete database to JSON at any moment, or wipe everything with a single tap.

---

## 2. On-Device Storage & Security

- **Database**: SQLite database stored in sandbox directory `/data/data/com.paoa.app/databases/paoa_database.db`.
- **Encrypted Preferences**: Sensitive configuration flags and user identity stored via Android `EncryptedSharedPreferences` backed by hardware-protected **Android Keystore** master keys.
- **Microphone Security**: Audio data from `SpeechRecognizer` is streamed only to the local Android speech synthesis service and is immediately discarded from memory once the transcript is parsed.

---

## 3. Data Export & Wiping

In `Settings -> Privacy & Data`:
- **Export Data as JSON**: Produces a clean, formatted JSON file containing all tasks, schedule history, digital twin memories, and habits. Can be saved locally or shared via Android Sharesheet.
- **Reset Personal Model**: Clears learned behavioral coefficients (postponement rates, focus window scores) while keeping task history intact.
- **Delete All Personal Data**: Executes a complete cascading purge of all Room database tables, resetting the app to day-one status.
