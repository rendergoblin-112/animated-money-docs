# Voice log: Knight Capital example

The 7 takes in `vo/` are the final takes of the approved cold open. All ElevenLabs premade voices, model `eleven_v4`, `/with-timestamps` endpoint (character timings in `*.align.json`). The example renders from these files with no API key.

| Line | File | Voice | Settings | Request id | Raw pitch | Correction | Final |
|---|---|---|---|---|---|---|---|
| NA | vo/NA_will_cur.mp3 | Will, `[curious]` | stab 0.4, sim 0.75, seed 303 | z0wQHhzspMBCqXQIZgX1 | 130.0 Hz | none | 130.0 Hz |
| NB | vo/NB_will_ps.wav (align: NB_will) | Will, `[curious]` | stab 0.4, seed 304, prev = NA | rZJud53WtTFSnDHwAXHh | 116.5 Hz | +1.6 st PSOLA | 129.3 Hz |
| S1 | vo/S1_jessica.mp3 | Jessica | stab 0.5, seed 401, prev = NB | qK2zXxszGmwt2wT4H6cA | 233 Hz | none | 1.78× |
| S2 | vo/S2_brian_ps.wav (align: S2_brian) | Brian | stab 0.6, seed 402, prev = S1 | W2DrOfc0nOSitd88JPcW | ~120 Hz (fry) | −2.4 st PSOLA | 104.5 Hz = 0.80× |
| S3 | vo/S3_jessica_t3.mp3 | Jessica | stab 0.95, seed 405, prev = S2 | 56F6phRVA5mNilVcipmf | 211 Hz | none | 1.64× |
| ND | vo/ND_will_ps.wav (align: ND_will) | Will, `[curious]` | stab 0.4, seed 305, prev = S3 | s0ADMfAu9j1VKvXrQcX9 | 119.2 Hz | +1.1 st PSOLA | 128.5 Hz |
| NC | vo/NC_will.mp3 | Will, `[curious]` | stab 0.4, seed 306, prev = ND | H50TFQlu1m6tqP9M9D8t | 140.1 Hz | none | 140.1 Hz |

Assembled narrator median: 130.8 Hz (band 125–136). The original production used 20 TTS calls in total (rejected takes: Bill 146 Hz, Will plain 116 Hz, Will `[excited]` 217 Hz shouting, Jessica deadpan at 260–314 Hz, a lower-stability Will retake at 114.5 Hz).

Assembly: 35.08 s of voice, 103 words, 177 wpm; skit starts at 18.45 s.
