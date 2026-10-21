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

3. **Alexa-Inspired Voice Study Assistant**
   - Ambient AI voice orb with animated states (*Idle*, *Listening*, *Processing*, *Speaking*).
   - Frequency waveform visualization and Web Speech Recognition.
   - Natural spoken feedback via Web Speech Synthesis (with volume and interrupt controls).
   - Real voice command routing that executes backend functions directly:
     - *"StudyPilot, create a two-hour study plan for tomorrow"*
     - *"Explain binary search"*
     - *"Start a machine learning quiz"*
     - *"What are my weakest topics?"*
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

StudyPilot AI features a dedicated **Alexa+ Tools Inspector** implementing 5 provider-agnostic, callable tools conforming to Model Context Protocol (MCP) and Alexa+ tool specifications:

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `create_study_plan` | `subject_name`, `hours_per_day`, `exam_date` | Generates and persists a structured study schedule |
| `explain_topic` | `topic_name`, `difficulty`, `mode` | Returns concise educational explanation & speech |
| `generate_quiz` | `topic_name`, `difficulty`, `num_questions` | Prepares diagnostic test questions with answers |
| `get_student_progress` | `subject_name` *(optional)* | Telemetry on streak, weekly hours, and topic mastery |
| `recommend_revision` | *(none)* | Runs adaptive engine to surface weakest topics |

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

## 🛠️ Tech Stack

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

4. **Run Unit Tests:**
   ```bash
   npx tsx --test src/utils/adaptiveEngine.test.ts
   ```
