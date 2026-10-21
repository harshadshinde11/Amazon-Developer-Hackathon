# StudyPilot AI — Your Personal AI Study Partner
> *"Study smarter. Learn faster. Achieve more."*  
> **Prepared for the Amazon Developer Hackathon 2026 (Alexa+ Track)**

---

## 🚀 Overview

**StudyPilot AI** is a complete, futuristic educational web application that fuses the conversational power of modern LLMs with an Alexa-inspired voice study assistant. It helps students master complex subjects through diagnostic quizzes, intelligent adaptive recommendations, exam-prioritized study schedules, and voice-command workflows.

---

## ✨ Core Features

1. **AI Study Dashboard**
   - Personalized student greeting with study streak counter and weekly study hours tracking.
   - Real-time **Adaptive Learning Engine Alert**: proactively detects topics where quiz scores fall below 60% and suggests targeted recovery actions.
   - Today's study schedule with interactive session check-off.
   - Exam countdown widget for upcoming deadlines.

2. **ChatGPT-Style AI Study Chat**
   - Five tailored pedagogical modes: **Simple Explanation**, **Exam Preparation**, **Step-by-Step Tutorial**, **Revision Notes**, and **Practice Q&A**.
   - Markdown rendering with code blocks, inline math notation, copy-to-clipboard buttons, and regeneration controls.
   - Topic and difficulty selectors (Beginner, Intermediate, Advanced).

3. **Simulated Alexa+-Inspired Study Assistant**
   - Ambient AI voice orb with animated states (*Idle*, *Listening*, *Processing*, *Speaking*).
   - Frequency waveform visualization and Web Speech Recognition.
   - Natural spoken feedback via Web Speech Synthesis (with volume and interrupt controls).
    - Text and voice requests use the same intent router and backend tools. Example requests:
       - *"Create a two-hour plan for Algorithms & Data Structures"*
       - *"Explain Breadth-First Search"*
       - *"Quiz me on A* Search Algorithm"*
       - *"What should I study today?"*
       - *"How much did I study this week?"*

4. **AI Study Planner**
   - Solves scheduling constraints by prioritizing upcoming exams and weaker topics.
   - Generates dates, start times, durations, learning objectives, activities, and revision tasks.
   - Interactive session status toggling (`pending` ➔ `completed`) automatically updates student hours and streak telemetry.

5. **Quiz Center & Adaptive Assessment**
   - Custom quiz generator with questions powered by Gemini 3.8 Flash.
   - Real-time quiz interface with timer, progress bar, and practice mode toggle.
   - Detailed grading review: correct vs incorrect answers, clear explanations, and common misconceptions.
   - Celebration confetti and immediate database synchronization updating topic mastery levels.

6. **Progress & Mastery Analytics**
   - Classification of all student topics into:
     - **Strong** (average score $\ge 80\%$)
     - **Developing** ($60\% - 79\%$)
     - **Needs revision** ($< 60\%$)
     - **Untested** ($0$ attempts)
   - Visual weekly activity bar chart and mastery distribution meters.
   - Unlocked academic achievement badges.

7. **My Subjects & Notes Workspace**
   - Manage subjects, course codes, and exam target dates.
   - Topic confidence rating stars (1–5).
   - Notes analyzer: paste lecture notes or upload text files to generate AI summaries, exam takeaways, and practice questions.

---

## 🏆 Amazon Developer Hackathon 2026 (Alexa+ Track)

StudyPilot AI includes an **Alexa+-inspired in-app simulation** for the Amazon Developer Hackathon 2026. It is not connected to Alexa+ devices or an official Alexa+ runtime, and it does not currently expose an MCP server. The browser uses a local conversational intent router and calls the existing Express API:

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `create_study_plan` | `subject_name`, optional saved `topics`, `exam_date`, `hours_per_day` | Validates saved subjects/topics and schedule values, then saves a plan using the existing JSON database |
| `explain_topic` | `topic_name`, `difficulty`, `mode` | Uses the existing tutor service for a level-appropriate explanation |
| `generate_quiz` | Saved `topic_name`, `difficulty`, `num_questions` | Uses the existing quiz generator; questions are handed to Quiz Center and attempts persist on submission |
| `get_student_progress` | optional saved `subject_name` | Returns saved quiz attempts, study sessions, and computed topic performance |
| `recommend_revision` | none | Uses persisted quiz scores, topic mastery, study sessions, and examination dates |

### Tool Architecture

- `src/components/ChatView.tsx` and `src/components/VoiceAssistantView.tsx` send requests to the shared backend router.
- `server.ts` exposes `/api/ai/assistant`, `/api/ai/voice-command`, and `/api/alexa-plus/invoke`.
- `server/alexaPlusTools.ts` identifies intents, requests missing details, validates arguments, invokes tools, and returns the backend result plus concise speech text.
- Tools read and write through `server/db.ts` to `data/studypilot_db.json`. The default demo dataset is initialized when the file is absent; it is not a source of new quiz scores.
- Generated questions are passed to the existing Quiz Center. Only submitted answers create a persisted quiz attempt, which then feeds revision recommendations.
- Browser speech recognition and speech synthesis are optional browser capabilities. Typed input remains available.

### Testing via cURL:
```bash
curl -X POST http://localhost:3000/api/alexa-plus/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "recommend_revision",
    "arguments": {}
  }'
```

---

## Setup and Limitations

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure `GEMINI_API_KEY` if AI-generated explanations, plans, and questions are desired. Without a usable Gemini API key, the existing service fallback is used.
3. Start the app with `npm run dev` and open `http://localhost:3000`.
4. Run checks with `npm run lint` and `npm test`.

The simulation does not connect to Amazon Alexa+, Echo devices, an Alexa+ runtime, or an MCP server. Browser speech recognition varies by browser and may require microphone permission; speech synthesis may use the device's installed voices. Tool intent recognition is a local pattern-based router rather than an Alexa+ model/runtime. Study data is stored in the existing local JSON file and is intended for this demo, not concurrent or production multi-user workloads.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend:** Node.js, Express, tsx
- **AI Engine:** `@google/genai` (Gemini 3.8 Flash)
- **Database:** Server-side persistent JSON store (`data/studypilot_db.json`) with demo reset capability
- **Voice:** Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

---

## 🚦 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file from `.env.example`:
   ```bash
   GEMINI_API_KEY="your_api_key_here"
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

