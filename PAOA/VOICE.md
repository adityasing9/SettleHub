# Personal AI Operating Assistant (PAOA) - Voice Interaction

## 1. Principles of Voice Support

PAOA provides a fully conversational voice experience **without paid voice APIs** (such as ElevenLabs, Google Cloud Speech, or Azure Cognitive Services).
Instead, it relies entirely on:
1. **Android `android.speech.SpeechRecognizer`**: Native on-device speech-to-text.
2. **Android `android.speech.tts.TextToSpeech`**: Native system synthesis engine.

This delivers:
- **Zero Cost**: Completely free to run indefinitely.
- **Offline Capability**: Works without internet access when offline language packs are installed in Android speech settings.
- **Low Latency**: Direct hardware audio pipeline with minimal latency.
- **Privacy Preservation**: Audio waveforms are processed on-device and never sent to remote third-party speech servers.

---

## 2. Voice Architecture

```
User Speaks ("I need to study DSA tonight")
                  |
                  v
       +-----------------------+
       |   SpeechRecognizer    | (android.speech.SpeechRecognizer)
       | - Continuous listening|
       | - Partial results     |
       +----------+------------+
                  |
                  v Text Transcript
       +-----------------------+
       |  AI Intent Pipeline   |
       | - NLP & Entity Parser |
       +----------+------------+
                  |
                  v Structured Intent / Response
       +-----------------------+
       |   Assistant Response  |
       +----------+------------+
                  |
                  v Natural text response
       +-----------------------+
       |     TextToSpeech      | (android.speech.tts.TextToSpeech)
       | - Configured rate     |
       | - Voice & pitch       |
       +-----------------------+
                  |
                  v Audio Output
User Hears: "I've scheduled DSA from 6:00 to 7:30 PM."
```

---

## 3. Voice Settings & User Controls

In Settings -> Voice Configuration:
- **Speech Recognition**:
  - Offline mode indicator
  - Language selection (default: `Locale.getDefault()`)
  - Continuous listening vs single-turn push-to-talk
- **Text-to-Speech Output**:
  - Enable / disable spoken responses
  - Speech rate multiplier ($0.75\times$ to $1.5\times$)
  - Pitch multiplier ($0.8\times$ to $1.2\times$)
  - Preferred system voice selection
