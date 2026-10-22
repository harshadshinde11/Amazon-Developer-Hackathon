import { GoogleGenAI } from '@google/genai';
import { QuizQuestion, StudySession } from '../src/types.js';

let genAI: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        genAI = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }
  return genAI;
}

export async function chatWithTutor(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  subjectName?: string;
  topicName?: string;
  topicNotes?: string;
  mode?: 'simple' | 'exam' | 'tutorial' | 'revision' | 'practice';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}): Promise<string> {
  const { messages, subjectName = 'General Studies', topicName, topicNotes, mode = 'simple', difficulty = 'intermediate' } = params;

  const modeInstructions: Record<string, string> = {
    simple:
      'Explain concepts in intuitive, plain English. Use relatable real-world analogies, concise definitions, and clear examples. Avoid overwhelming jargon.',
    exam:
      'Focus on high-yield examination preparation: define key terminology precisely, outline expected marking points for short and long answer questions, highlight common examiner pitfalls, and provide memorization tips. Do not guarantee specific exam questions.',
    tutorial:
      'Provide a step-by-step tutorial. Walk through the concept progressively with numbered milestones, practical code/pseudocode or diagrams, and a mini-exercise to test understanding.',
    revision:
      'Generate rapid, high-density revision notes. Use bullet points, bold key terms, formula blocks, and a 3-point memory checklist.',
    practice:
      'Act as a Socratic tutor: present a targeted problem or practice question, explain the underlying concept, and guide the student toward self-discovery without giving away answers immediately.',
  };

  const systemInstruction = `You are StudyPilot AI, an elite educational tutor and study partner for the Amazon Developer Hackathon 2026.
Subject Context: ${subjectName}.
${topicName ? `Selected Topic: ${topicName}.` : ''}
${topicNotes ? `Student-provided topic notes (treat as the course-specific source of truth):\n${topicNotes}` : ''}
Difficulty Level: ${difficulty}.
Pedagogical Mode: ${mode} (${modeInstructions[mode] || modeInstructions.simple}).

Keep explanations grounded in the selected subject and topic. Do not switch to another subject because a term is ambiguous. If a request is outside the selected subject, briefly say so and ask whether the student wants to switch subjects. For custom subjects, use only the student's saved topics and supplied notes; do not invent an official syllabus.

Formatting guidelines:
- Use clean Markdown with headers (###), bold text, bullet points, and code blocks with syntax highlighting where relevant.
- Structure explanations with:
  1. Concept Overview / Definition
  2. Step-by-Step Breakdown or Example
  3. Real-World Analogy or Practical Application
  4. Quick Self-Check or Key Takeaway
- Be encouraging, academically rigorous, and direct.`;

  const client = getAIClient();
  if (client) {
    try {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (res.text) {
        return res.text;
      }
    } catch (err) {
      console.warn('Gemini chat error, falling back to educational response generator:', err);
    }
  }

  // Graceful, high-quality fallback based on query
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
  const normalizedSubject = subjectName.toLowerCase();
  const isDsaSubject = /data structures|\bdsa\b|algorithms/i.test(normalizedSubject);
  const isAiSubject = /artificial intelligence|\bai\b/i.test(normalizedSubject);
  if ((isDsaSubject || isAiSubject) && (lastUserMsg.includes('a*') || lastUserMsg.includes('astar'))) {
    return `> **Demo mode:** This response uses local fallback content; no Gemini response was generated.

### The A* Search Algorithm Explained (${mode.toUpperCase()} Mode)

The **A* (A-star) algorithm** is one of the most widely used pathfinding and graph traversal algorithms in computer science and artificial intelligence (such as in Google Maps routing and video game NPC navigation).

#### 1. The Core Equation
A* determines which node to visit next using an evaluation function:
$$f(n) = g(n) + h(n)$$

- **$g(n)$**: The exact cost incurred to reach node $n$ from the start node.
- **$h(n)$**: The estimated heuristic cost from node $n$ to the goal.
- **$f(n)$**: The total estimated cost of the cheapest solution passing through $n$.

#### 2. The Golden Rule: Admissibility
For A* to guarantee the **optimal (shortest) path** in tree search:
> The heuristic $h(n)$ must be **admissible**, meaning it never overestimates the actual cost to reach the goal ($h(n) \\le h^*(n)$).

*Analogy:* Think of $h(n)$ as straight-line "as-the-crow-flies" GPS distance. Since roads have curves, the straight line is always $\\le$ actual road distance, ensuring you never prematurely rule out the best road.

#### 3. Step-by-Step Execution
1. Maintain an **Open List** (priority queue sorted by $f(n)$) and a **Closed List** (already evaluated nodes).
2. Pop the node with the lowest $f(n)$.
3. If it is the goal, reconstruct the path and terminate.
4. Otherwise, generate its neighbors, compute their $f(n)$, and add them to the Open List.

#### 4. Quick Checkpoint
What happens if $h(n) = 0$ for all nodes?
*Answer:* A* turns into standard **Dijkstra's Algorithm**, exploring in all directions equally!`;
  }

  if (isDsaSubject && lastUserMsg.includes('binary search')) {
    return `> **Demo mode:** This response uses local fallback content; no Gemini response was generated.

### Binary Search: Fast Lookup in O(log n) Time

Binary Search is a classic divide-and-conquer algorithm designed to locate a target value in a **strictly sorted array**.

#### 1. Key Concept
Instead of checking every element sequentially ($O(n)$), Binary Search cuts the search space in half at every comparison.

#### 2. How It Works
\`\`\`typescript
function binarySearch(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor(low + (high - low) / 2); // Avoid integer overflow

    if (arr[mid] === target) {
      return mid; // Found target at index mid
    } else if (arr[mid] < target) {
      low = mid + 1; // Discard left half
    } else {
      high = mid - 1; // Discard right half
    }
  }

  return -1; // Target not found
}
\`\`\`

#### 3. Complexity
- **Time Complexity:** $O(\\log_2 n)$ — searching 1,000,000 items takes at most ~20 comparisons!
- **Space Complexity:** $O(1)$ iterative, $O(\\log n)$ recursive due to call stack.

*Exam Note:* Remember the prerequisite: Binary search requires the dataset to be sorted!`;
  }

  return `> **Demo mode:** This response uses local fallback content; no Gemini response was generated.

### ${subjectName}${topicName ? ` · ${topicName}` : ''}

I don't have a configured AI model available to reliably explain **${messages[messages.length - 1]?.content}** yet, and I won't guess at a syllabus for ${subjectName}. Add your course notes or topic details in My Subjects, or configure the Gemini backend to get a subject-grounded explanation, notes, examples, and practice questions.`;
}

export async function generateStudyPlanWithAI(params: {
  subjectName: string;
  topics: Array<{ name: string; difficulty?: string; confidenceLevel?: number; status?: string }>;
  examDate?: string;
  hoursPerDay?: number;
  weakTopics?: string[];
}): Promise<{
  title: string;
  priorityRationale: string;
  totalHours: number;
  sessions: Array<Omit<StudySession, 'id' | 'studyPlanId'>>;
}> {
  const {
    subjectName,
    topics,
    examDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    hoursPerDay = 2,
    weakTopics = [],
  } = params;

  const client = getAIClient();
  if (client) {
    try {
      const prompt = `Generate a realistic, balanced study plan for:
Subject: ${subjectName}
Examination Date: ${examDate}
Available daily study hours: ${hoursPerDay}
Topics: ${JSON.stringify(topics)}
Topics marked weak/needing revision: ${JSON.stringify(weakTopics)}

Planning rules:
- Respect the student's available daily hours.
- Prioritize upcoming exams and allocate extra time and earlier sessions to weaker topics.
- Break long sessions with clear objectives.
- Provide practical learning objectives, recommended activities (e.g. coding, diagrams, flashcards), and revision tasks.
- Avoid scheduling in the past. Today's date is ${new Date().toISOString().split('T')[0]}.

Output MUST be valid JSON matching this schema:
{
  "title": string,
  "priorityRationale": string,
  "totalHours": number,
  "sessions": [
    {
      "subjectName": string,
      "topicName": string,
      "scheduledDate": string (YYYY-MM-DD),
      "startTime": string (e.g. "09:00", "14:30"),
      "durationMinutes": number,
      "status": "pending",
      "learningObjective": string,
      "recommendedActivity": string,
      "revisionTask": string
    }
  ]
}`;

      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      if (res.text) {
        const parsed = JSON.parse(res.text);
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gemini study plan generation error, generating rule-based plan:', err);
    }
  }

  // Deterministic rule-based plan generator matching the rules
  const today = new Date();
  const sessionList: Array<Omit<StudySession, 'id' | 'studyPlanId'>> = [];
  let dayOffset = 1;
  let totalMinutes = 0;

  // Sort topics: weak topics first, then lower confidence
  const sortedTopics = [...topics].sort((a, b) => {
    const aWeak = weakTopics.includes(a.name) ? -1 : 1;
    const bWeak = weakTopics.includes(b.name) ? -1 : 1;
    if (aWeak !== bWeak) return aWeak - bWeak;
    return (a.confidenceLevel || 3) - (b.confidenceLevel || 3);
  });

  for (const t of sortedTopics) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() + dayOffset);
    const dateStr = sessionDate.toISOString().split('T')[0];

    const isWeak = weakTopics.includes(t.name);
    const duration = isWeak ? 60 : 45;
    totalMinutes += duration;

    sessionList.push({
      subjectName,
      topicName: t.name,
      scheduledDate: dateStr,
      startTime: dayOffset % 2 === 0 ? '14:00' : '10:00',
      durationMinutes: duration,
      status: 'pending',
      learningObjective: isWeak
        ? `Remediate knowledge gaps and master core definitions in ${t.name}.`
        : `Consolidate understanding and practice problem-solving in ${t.name}.`,
      recommendedActivity: isWeak
        ? `Review reference notes, trace sample problems on paper, and solve 3 practice examples.`
        : `Solve diagnostic problems and create concise flashcard summaries.`,
      revisionTask: `Complete a 5-question targeted quiz to verify mastery.`,
    });

    dayOffset += 1;
  }

  const rationale = weakTopics.length > 0
    ? `Prioritized ${weakTopics.join(', ')} with extended 60-minute sessions due to previous diagnostic scores below 60%. All sessions are scheduled ahead of the ${examDate} examination.`
    : `Balanced daily revision plan scheduled ahead of examination date (${examDate}), providing progressive mastery and spaced retention.`;

  return {
    title: `${subjectName} Mastery Sprint`,
    priorityRationale: `Demo mode: Gemini was unavailable, so this schedule was generated with local rules. ${rationale}`,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    sessions: sessionList,
  };
}

export async function generateQuizWithAI(params: {
  subjectName: string;
  topicName: string;
  topicNotes?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  numQuestions?: number;
  questionType?: 'mcq' | 'true_false' | 'short_answer';
}): Promise<QuizQuestion[]> {
  const {
    subjectName,
    topicName,
    topicNotes,
    difficulty = 'intermediate',
    numQuestions = 5,
    questionType = 'mcq',
  } = params;

  const normalizeGeneratedQuiz = (value: unknown): QuizQuestion[] | null => {
    if (!Array.isArray(value) || value.length !== numQuestions) return null;
    const validTypes = ['mcq', 'true_false', 'short_answer'];
    const questions: QuizQuestion[] = [];

    for (const [index, question] of value.entries()) {
      if (!question || typeof question !== 'object') return null;
      const candidate = question as Record<string, unknown>;
      if (typeof candidate.question !== 'string' || !candidate.question.trim() || candidate.question.length > 2000
        || !Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > 6
        || !candidate.options.every((option) => typeof option === 'string' && option.trim().length > 0 && option.length <= 500)
        || !Number.isInteger(candidate.correctAnswer) || (candidate.correctAnswer as number) < 0
        || (candidate.correctAnswer as number) >= candidate.options.length
        || typeof candidate.explanation !== 'string' || !candidate.explanation.trim() || candidate.explanation.length > 4000
        || (candidate.type !== undefined && !validTypes.includes(String(candidate.type)))) return null;

      questions.push({
        id: typeof candidate.id === 'string' && candidate.id.length <= 100 ? candidate.id : `q_${Date.now()}_${index}`,
        question: candidate.question,
        type: (candidate.type || questionType) as QuizQuestion['type'],
        options: candidate.options as string[],
        correctAnswer: candidate.correctAnswer as number,
        explanation: candidate.explanation,
        commonMistakes: typeof candidate.commonMistakes === 'string' ? candidate.commonMistakes.slice(0, 1000) : undefined,
        generationMode: 'gemini',
      });
    }
    return questions;
  };

  const buildDemoQuiz = (bank: QuizQuestion[]): QuizQuestion[] => {
    const supplementalQuestions: QuizQuestion[] = [
      {
        id: 'q_demo_prerequisite',
        question: `What should you verify before applying ${topicName}?`,
        type: 'mcq',
        options: ['The assumptions and input constraints', 'That variable names are short', 'That every example uses identical data', 'That edge cases can be ignored'],
        correctAnswer: 0,
        explanation: `Correct application of ${topicName} depends on its assumptions and input constraints.`,
      },
      {
        id: 'q_demo_validation',
        question: `Which is the best way to check your understanding of ${topicName}?`,
        type: 'mcq',
        options: ['Apply it to a worked example and explain each decision', 'Memorize its name only', 'Skip boundary cases', 'Assume every implementation behaves identically'],
        correctAnswer: 0,
        explanation: `Working through an example makes the reasoning behind ${topicName} observable.`,
      },
      {
        id: 'q_demo_pitfall',
        question: `Which general study pitfall should you avoid when learning ${topicName}?`,
        type: 'mcq',
        options: ['Ignoring assumptions and boundary cases', 'Checking a result against an example', 'Writing down an invariant', 'Comparing alternative approaches'],
        correctAnswer: 0,
        explanation: 'Assumptions and boundary cases often determine whether a method is correct.',
      },
    ];
    const questions = [...bank.slice(0, numQuestions)];
    let supplementalIndex = 0;
    while (questions.length < numQuestions) {
      const next = supplementalQuestions[supplementalIndex % supplementalQuestions.length];
      questions.push({
        ...next,
        id: `q_demo_extra_${questions.length + 1}`,
        question: supplementalIndex >= supplementalQuestions.length
          ? `Further practice: ${next.question}`
          : next.question,
      });
      supplementalIndex++;
    }
    return questions.map((question, index) => ({
      ...question,
      id: `q_demo_${index + 1}`,
      generationMode: 'demo',
    }));
  };

  const client = getAIClient();
  if (client) {
    try {
      const prompt = `Generate a high quality educational quiz on:
Subject: ${subjectName}
Topic: ${topicName}
${topicNotes ? `Student-provided course notes:\n${topicNotes}` : ''}
Difficulty: ${difficulty}
Number of questions: ${numQuestions}
Question Type: ${questionType}

Rules:
- Questions must be academically rigorous and accurate.
- For mcq, provide exactly 4 options.
- correctAnswer must be the 0-indexed integer corresponding to the correct option.
- Provide a clear explanation of why the correct answer is right and why common misconceptions are wrong.

Output MUST be a JSON array of objects with schema:
[
  {
    "id": string,
    "question": string,
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": string,
    "commonMistakes": string
  }
]`;

      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      if (res.text) {
        const parsed = JSON.parse(res.text);
        const validated = normalizeGeneratedQuiz(parsed);
        if (validated) return validated;
        throw new Error('Gemini returned an invalid quiz payload');
      }
    } catch (err) {
      console.warn('Gemini quiz generation error, falling back to curated question bank:', err);
    }
  }

  // Keep the demo fallback educational without implying an official syllabus or inventing facts.
  const normalizedSubject = subjectName.toLowerCase();
  if ((/data structures|\bdsa\b|algorithms|artificial intelligence|\bai\b/i.test(normalizedSubject))
    && (topicName.toLowerCase().includes('a*') || topicName.toLowerCase().includes('astar'))) {
    return buildDemoQuiz([
      {
        id: `q_astar_1`,
        question: 'In the A* search formula f(n) = g(n) + h(n), what does h(n) represent?',
        type: 'mcq',
        options: [
          'The exact cost from the start node to node n',
          'The heuristic estimated cost from node n to the goal',
          'The total number of edges in the search tree',
          'The depth of the deepest node in the frontier',
        ],
        correctAnswer: 1,
        explanation: 'h(n) represents the heuristic estimate from current node n to the goal.',
        commonMistakes: 'Students frequently swap g(n) (cost from start) with h(n) (estimated cost to goal).',
      },
      {
        id: `q_astar_2`,
        question: 'What property of heuristic h(n) guarantees optimality in A* tree search?',
        type: 'mcq',
        options: [
          'Monotonicity only',
          'Admissibility: h(n) never overestimates the true remaining cost',
          'Heuristic value must always equal zero',
          'Heuristic value must be strictly greater than 10',
        ],
        correctAnswer: 1,
        explanation: 'Admissibility guarantees that A* tree search will always find the optimal shortest path.',
        commonMistakes: 'Believing that any non-negative heuristic is sufficient.',
      },
      {
        id: `q_astar_3`,
        question: 'What happens to A* search if h(n) = 0 for all nodes?',
        type: 'mcq',
        options: [
          'It fails to terminate',
          'It becomes equivalent to Dijkstra Algorithm',
          'It becomes Depth-First Search',
          'It runs in O(1) constant time',
        ],
        correctAnswer: 1,
        explanation: 'When h(n) = 0, f(n) = g(n), which means nodes are expanded strictly by path cost, exactly like Dijkstra.',
        commonMistakes: 'Assuming it defaults to Greedy Best-First Search.',
      },
      {
        id: `q_astar_4`,
        question: 'For graph search (where nodes can be revisited via different paths), what stronger condition is required for optimality without reopening closed nodes?',
        type: 'mcq',
        options: [
          'Consistency (monotonicity): h(n) <= c(n, a, n\') + h(n\')',
          'Strict positivity of all weights',
          'A cyclic heuristic function',
          'Negative edge costs',
        ],
        correctAnswer: 0,
        explanation: 'Consistency (triangle inequality) ensures that the estimated cost never decreases along any path, eliminating the need to re-open closed nodes.',
        commonMistakes: 'Assuming admissibility alone is enough for graph search without re-opening.',
      },
      {
        id: `q_astar_5`,
        question: 'Which heuristic is generally admissible for navigating a grid with 4-directional movement (up, down, left, right)?',
        type: 'mcq',
        options: [
          'Euclidean distance squared',
          'Manhattan distance (|x1 - x2| + |y1 - y2|)',
          'Maximum of coordinate differences multiplied by 2',
          'Chebyshev distance multiplied by 5',
        ],
        correctAnswer: 1,
        explanation: 'In a 4-directional grid, Manhattan distance matches the minimum possible steps with no obstacles, making it admissible.',
        commonMistakes: 'Using squared Euclidean distance which vastly overestimates path lengths.',
      },
    ]);
  }

  // Generic robust topic question generator
  return buildDemoQuiz([
    {
      id: `q_gen_1`,
      question: `Without course notes for ${topicName}, which source should you use to confirm its subject-specific definitions?`,
      type: 'mcq',
      options: [
        `Your instructor's materials or notes supplied for this subject`,
        `An unrelated subject's syllabus`,
        `An unverified assumption based only on the topic title`,
        `A practice score without reviewing the course material`,
      ],
      correctAnswer: 0,
      explanation: `Course materials provide the reliable subject-specific meaning of ${topicName}; a topic title alone does not define an official syllabus.`,
    },
    {
      id: `q_gen_2`,
      question: `Which practice best checks your understanding of ${topicName}?`,
      type: 'mcq',
      options: [
        `Explain an example using the definitions and rules in your course materials`,
        `Memorize the topic name without reviewing its meaning`,
        `Assume the same explanation applies to every subject`,
        `Skip the assumptions and evidence in your notes`,
      ],
      correctAnswer: 0,
      explanation: `Explaining a worked example against the supplied course materials reveals which concepts still need review.`,
    },
    {
      id: `q_gen_3`,
      question: `What should you do if a question about ${topicName} goes beyond the notes you provided?`,
      type: 'mcq',
      options: [
        `Add a trusted course reference or ask your instructor before treating an answer as authoritative`,
        `Assume the first plausible answer is an official course requirement`,
        `Replace your subject's notes with unrelated material`,
        `Treat a generic practice question as a verified syllabus`,
      ],
      correctAnswer: 0,
      explanation: `The demo question bank does not have your course's syllabus, so unknown details should be verified from a trusted source.`,
    },
  ]);
}

export async function summarizeNotesWithAI(params: {
  notesText: string;
  subjectName: string;
}): Promise<{
  summary: string;
  keyTakeaways: string[];
  suggestedQuestions: string[];
}> {
  const { notesText, subjectName } = params;

  const client = getAIClient();
  if (client) {
    try {
      const prompt = `Summarize these study notes for an examination on "${subjectName}":
${notesText}

Provide:
1. A concise, clear educational summary.
2. 4 bulleted key examination takeaways.
3. 3 suggested practice questions.

Output as JSON with keys: "summary" (string), "keyTakeaways" (string[]), "suggestedQuestions" (string[]).`;

      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      if (res.text) {
        return JSON.parse(res.text);
      }
    } catch (err) {
      console.warn('Gemini notes summarization error:', err);
    }
  }

  // Fallback summarizer
  const lines = notesText.split('\n').filter((l) => l.trim().length > 0);
  return {
    summary: `Demo mode: Gemini was unavailable, so this is a generic local summary template, not an analysis of the note contents. ${lines.length} non-empty lines were found in your notes on ${subjectName}.`,
    keyTakeaways: [
      `Master the core invariant: verify prerequisites before applying the primary method.`,
      `Time and space complexity bounds determine whether the approach scales.`,
      `Edge cases (empty set, single item, extreme values) require explicit handling.`,
      `Review key formulas and ensure heuristic properties (admissibility/consistency) are preserved.`,
    ],
    suggestedQuestions: [
      `What is the time complexity of the core algorithm described in these notes?`,
      `How does this approach compare to naive brute-force alternatives?`,
      `Explain why the boundary condition is necessary to prevent infinite loops.`,
    ],
  };
}
