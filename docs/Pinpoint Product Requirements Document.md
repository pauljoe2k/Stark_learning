# Pinpoint: Product Requirements Document

*Version 1.0 · Hackathon MVP · Team of three · Status: draft for review*

## 1. Overview

**Product:** Pinpoint is a mobile-first web app that helps students learn faster by combining two proven techniques in one loop: speaking a topic aloud to expose gaps (active recall), and pinning each idea to a photo of a familiar place so it sticks (memory palace).

**One-line pitch:** *Explain it. Pin it. Own it.*

**Platform:** Progressive web app (React front end, Node and Express API, PostgreSQL database), with the Gemini API for content analysis.

## 2. Problem statement

Students spend hours re-reading notes, which feels productive but works poorly. They cannot tell which parts of a topic they truly understand, and what they do learn fades within days. Existing tools handle one piece in isolation (flashcards, notes, timers) and none connect checking understanding with long-term retention.

| Problem | Effect on the student |
| --- | --- |
| Passive study (re-reading) | False sense of understanding |
| No feedback on what is missing | Gaps discovered only at the exam |
| Abstract facts are hard to retain | Forgetting within days |
| Building a memory palace mentally is hard | Most students never use the technique |

## 3. Goals and non-goals

### Goals

1. Let a student find out, in under three minutes, which key points of a topic they can and cannot explain.
2. Make a memory palace easy to build using photos of places the student already knows.
3. Test retention under a self-set time limit and show clearly what to revisit.
4. Give the student one dashboard that shows progress, tasks, and days left until the next exam.

### Non-goals (MVP)

- Teacher or classroom features, live confusion tracking, or any multi-user collaboration.
- Social features, sharing of palaces, or leaderboards.
- Native mobile apps.
- Spaced-repetition scheduling, offline mode, and AI-graded voice answers in Recall.
- Support for uploads larger than two pages per topic.

## 4. Target users

Students worldwide, at any level, studying on a phone or laptop. One account type; no roles.

| Persona | Need | How they use Pinpoint |
| --- | --- | --- |
| **Aarav, fast learner** | Learn more in less time | Moves quickly through Explain, builds larger palaces, uses Recall to test speed |
| **Meera, learns at her own pace** | Understand deeply and remember it | Retries Explain until gaps close, pins only what she understands, repeats Recall |

UI copy must say "learns at their own pace" and avoid the word "slow."

## 5. Core user flow

1. Sign up or log in, then land on the dashboard.
2. **Topic:** upload a PDF or photos (max 2 pages). Review the AI-extracted key points.
3. **Explain:** choose a topic and recording time, speak, and see the gap map and score.
4. Retry the gaps until the score reaches the pass mark.
5. **Palace:** add a place (photo), then add flags for each key idea.
6. **Recall:** play a round on a random place, with a time limit per flag, and review green and red flags.
7. **Home:** see tasks tick off, mastery rise, and the exam countdown.

Explaining precedes pinning by design: students should only memorize what they have shown they understand.

## 6. Functional requirements

Priority key: **P0** = required for the demo, **P1** = important, **P2** = nice to have.

### 6.1 Authentication and account

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1.1 | A user can sign up with name, email, and password, and log in. | P0 |
| FR-1.2 | Passwords are stored hashed; sessions use a signed token. | P0 |
| FR-1.3 | All data is private to the account; no route returns another user's data. | P0 |
| FR-1.4 | A user can update their name and Explain pass mark (default 70%). | P2 |

### 6.2 Home (dashboard)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-2.1 | Show the greeting "Hey {name}". | P0 |
| FR-2.2 | List previous units and topics with a mastery indicator; each topic shows whether its notes were uploaded or AI-generated. | P0 |
| FR-2.3 | Show an auto-generated task list per topic: Add material, Explain it, Pin it, Recall it, each marked complete or incomplete. | P0 |
| FR-2.4 | A task is complete when: a file exists (Add material); an explanation meets the pass mark (Explain it); at least one flag is linked to the topic (Pin it); the latest recall round is mostly green (Recall it). | P0 |
| FR-2.5 | Show a calendar with exam dates marked and one large number showing days left to the nearest exam. | P0 (number), P1 (full calendar) |
| FR-2.6 | The countdown colour changes as the date nears (calm, amber, red). | P2 |
| FR-2.7 | A user can add, edit, and delete exams. | P0 (add), P2 (edit, delete) |

### 6.3 Topic

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-3.1 | A user can upload PDFs or images for a topic. | P0 |
| FR-3.2 | The server enforces a maximum of two pages per topic (PDF page count, or two images) and returns a clear error otherwise. | P0 |
| FR-3.3 | On upload, the system extracts a title, a short notes summary, and 5 to 8 key points. | P0 |
| FR-3.4 | The user can edit the title, notes, and key points before and after saving. | P0 |
| FR-3.5 | A user can group topics into units. | P1 |
| FR-3.6 | The user can re-run extraction or remove a file. | P2 |

### 6.4 Explain

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-4.1 | The user selects a topic and a recording time (for example 1, 2, 3, or 5 minutes) with a visible countdown. | P0 |
| FR-4.2 | Speech is transcribed live in the browser; a typed-input fallback is always available. | P0 |
| FR-4.3 | The user can edit the transcript before submitting; submissions under roughly 15 words are blocked with a prompt to say more. | P1 |
| FR-4.4 | The system compares the transcript to the topic's key points and marks each as covered, partial, incorrect, or missing, with short feedback. | P0 |
| FR-4.5 | The score is computed in code: covered = 1, partial = 0.5, incorrect and missing = 0, shown as a percentage and as "You covered X of Y key points." | P0 |
| FR-4.6 | The user can retry only the unmet points. | P1 |
| FR-4.7 | A "Pin the gaps" action creates flags for unmet key points in the Palace. | P1 |
| FR-4.8 | Each attempt is saved so the user can see progress across attempts. | P1 |

### 6.5 Palace

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-5.1 | Show a grid of the user's places, each a photo tile with a name and flag count. | P0 |
| FR-5.2 | Opening a place shows its photo with multiple flags, with zoom and pan. | P0 |
| FR-5.3 | Tapping a flag opens a side panel (a bottom sheet on mobile) showing the flag's information, with an Edit button at the bottom. | P0 |
| FR-5.4 | "Add flag": the user taps a spot on the photo and enters the information; the flag may optionally link to a topic key point. | P0 |
| FR-5.5 | "Add place": the user takes or uploads a photo and names it. | P0 |
| FR-5.6 | Flag positions are stored as percentages of the image so they stay aligned on any screen size. | P0 |
| FR-5.7 | Photos are compressed on the device before upload. | P1 |
| FR-5.8 | A user can delete flags and places. | P1 |

### 6.6 Recall mode

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-6.1 | The app selects a random place from those the user has created. | P0 |
| FR-6.2 | The user sets the time allowed per flag before starting. | P0 |
| FR-6.3 | Flags are hidden at the start; the user taps one, tries to recall it, and reveals the answer. | P0 |
| FR-6.4 | A flag is **green** if recalled within the time limit and **red** if not (including timeout). Grading is self-confirmed by the student. | P0 |
| FR-6.5 | At the end of a round, the photo shows all flags coloured green or red. | P0 |
| FR-6.6 | Results update the topic's mastery and the Recall task on the dashboard. | P1 |
| FR-6.7 | Red flags are prioritized when choosing the next round. | P2 |

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Performance** | Screens load in under 2 seconds on a typical mobile connection; an Explain result returns within about 6 seconds. |
| **Reliability** | If the AI service fails, a keyword-based fallback still returns a result; if speech recognition is unsupported, typed input is offered. |
| **Security and privacy** | Data is private by default; every query is scoped to the logged-in user; secrets (AI key, storage keys) live only on the server; room photos use non-guessable URLs. |
| **Usability** | Mobile-first layout, large tap targets, bottom-bar navigation with five tabs: Home, Topic, Explain, Palace, Recall. |
| **Compatibility** | Latest Chrome and Edge for voice; other modern browsers supported with typed input. |
| **Accessibility** | Sufficient colour contrast, and red and green states also use an icon or label so colour is never the only signal. |
| **Cost control** | AI calls are rate-limited per user and responses are cached during development. |

## 8. AI behaviour requirements

| Operation | Input | Output |
| --- | --- | --- |
| **Extract** | Uploaded PDF or images | Title, notes summary, 5 to 8 key points with stable ids |
| **Check explanation** | Key points, notes, transcript | Per-point status, evidence, feedback, summary, and next-focus ids |

Rules:

- Output must be JSON only and is validated by the server; invalid output is retried once.
- Judgement is based on meaning, not exact keywords, and only against the uploaded material.
- The prompt states that the transcript may contain speech-recognition errors.
- The score is never computed by the AI; the server calculates it.
- No personal details are included in prompts.

## 9. Data requirements

Main entities: users, units, topics, topic files, explanations, places, flags, recall rounds, recall results, and exams.

- Key points are stored on the topic, each with a stable id, and are referenced by flags and explanation results.
- Dashboard tasks are computed from existing records, not stored.
- Explanation attempts are kept so progress over time can be shown.

## 10. Success metrics

The hackathon goal is a working end-to-end demo. These are targets to measure on the team and a few test users, not guaranteed outcomes.

| Metric | Target |
| --- | --- |
| Complete loop (upload, explain, pin, recall) works end to end in the demo | Yes, without errors |
| Time from upload to first gap map | Under 3 minutes |
| Self-measured recall improvement (quiz before vs after one explain-and-pin round) | A clear improvement on at least two testers, reported honestly with the method used |
| Explain result latency | Under 6 seconds |
| Test-user feedback: "I could see exactly what I was missing" | Majority agree |

## 11. Dependencies and assumptions

**Dependencies**

- Gemini API key from Google AI Studio (a subscription to the Gemini app does not include API access).
- A hosted PostgreSQL database and an image and file storage service.
- Browser Web Speech API support for voice (Chrome and Edge).

**Assumptions**

- Students have a phone or laptop with a camera and microphone.
- Two pages per topic is enough for a first version.
- Free-tier limits are adequate for a hackathon demo; usage will be monitored.

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Voice recognition unsupported or inaccurate | Typed fallback; transcript editable before submission |
| AI returns invalid or wrong output | JSON validation and retry; judge only against uploaded material; keyword fallback |
| AI rate limits or outages during the demo | Per-user rate limits, caching, fallback, and a recorded backup demo |
| Slow photo uploads on mobile data | Client-side compression |
| Free-tier backend cold start | Warm-up ping before presenting |
| Privacy concerns around room photos and study notes | Private by default and non-guessable URLs; clearly stated in the pitch |
| Scope creep with three people working in parallel | Strict P0 list and cut order (section 13) |

## 13. Release plan and scope control

### Build order

| Phase | Work |
| --- | --- |
| 0 | Project setup, authentication, schema, API contract, bottom-bar shell |
| 1 | Topic upload and key-point extraction (riskiest external call, so prove it first) |
| 2 | Explain: recording, AI check, score, and gap map |
| 3 | Palace: places grid, photo viewer, flags, side panel |
| 4 | Recall mode |
| 5 | Dashboard: greeting, tasks, countdown, calendar |
| 6 | Polish, seed demo data, deploy, record a backup demo |

### Cut order if time runs short

1. Full calendar grid (keep only the countdown number)
2. Manual tasks (keep only auto-generated ones)
3. Spaced repetition
4. Voice answers in Recall
5. Unit grouping (use a flat topic list)

The loop of upload, explain, pin, and recall must never be cut.

### Suggested team split (three people)

| Role | Owns | Hands off to |
| --- | --- | --- |
| **Person 1: Backend and AI** | Schema, auth, uploads with the two-page limit, Gemini extraction and explain endpoints, scoring, recall and exam endpoints, deployment | Both front-end owners (API contract and seeded demo data) |
| **Person 2: Front end, learning flow** | App shell and bottom bar, Home dashboard, Topic screen, Explain screen with speech and typed fallback | Person 3 (topic and key-point data used for flags) |
| **Person 3: Front end, Palace and Recall** | Photo viewer with zoom and pan, flags and side panel, add place and add flag, Recall mode and timer, visual polish | Person 1 (flag and recall endpoints) |

Agree the API routes and JSON shapes together in the first hour so all three can build in parallel against mock data. Share the demo script and backup recording: whoever finishes first records it, and all three rehearse it.

## 14. Future scope

- Spaced-repetition scheduling for flags
- Walk-through mode across a place's flags
- AI-checked spoken answers in Recall
- Recall speed tracking
- Read-only sharing of palaces for study groups
- Offline review
- Support for longer documents

## 15. Open questions

| Question | Current default |
| --- | --- |
| Is Recall self-graded or AI-checked? | Self-graded with a timer |
| What is the Explain pass mark? | 70% |
| Must every flag link to a key point? | No; allow both linked and free-note flags |
| Final product name | Pinpoint (alternatives: Loop, Stick, Recall) |
| Which storage provider? | Cloudinary or Supabase Storage |

## 16. Demo script (about two minutes)

1. **Hook (15s):** "Re-reading doesn't work. Explaining does, and so does your own room."
2. **Explain (40s):** Explain a topic aloud, skipping one part on purpose; the gap map shows what is missing.
3. **Fix (15s):** Re-explain the missing part and watch the score rise.
4. **Pin (30s):** Photograph a desk and drop flags for the key ideas.
5. **Recall (15s):** Hide the flags, recall them against the timer, and one turns red.
6. **Close (5s):** "Explain it. Pin it. Own it."
