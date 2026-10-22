import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Square,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api.js';
import { NavView } from './Sidebar.js';
import { AgentActionRecord, QuizQuestion, Subject } from '../types.js';

interface VoiceAssistantViewProps {
  subjects: Subject[];
  activeSubjectId: string;
  onNavigate: (view: NavView) => void;
  onStartQuizWithTopic: (topicId?: string, topicName?: string, questions?: QuizQuestion[], quizId?: string) => void;
  onRefreshData: () => void;
}

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: string;
  toolName?: string;
  success?: boolean;
  data?: any;
  actionHistory?: AgentActionRecord[];
}

export const VoiceAssistantView: React.FC<VoiceAssistantViewProps> = ({
  subjects,
  activeSubjectId,
  onNavigate,
  onStartQuizWithTopic,
  onRefreshData,
}) => {
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<VoiceMessage[]>([
    {
      id: 'v_welcome',
      sender: 'assistant',
      text: 'Hello Harshad! I am StudyPilot, a simulated Alexa-inspired study assistant in this web app. You can ask me to create study plans, explain topics, check saved progress, or start a quiz.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingToolRef = useRef<{ name: string; arguments: Record<string, unknown> } | undefined>(undefined);
  const activeSubject = subjects.find((subject) => subject.id === activeSubjectId && !subject.archivedAt);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, state]);

  const speakText = (text: string) => {
    if (isMuted || !synthRef.current) {
      setState('idle');
      return;
    }

    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = synthRef.current.getVoices();
      const femaleVoice = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Zira')) && v.lang.startsWith('en')
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => {
        setState('speaking');
      };

      utterance.onend = () => {
        setState('idle');
      };

      utterance.onerror = () => {
        setState('idle');
      };

      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setState('idle');
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (state === 'speaking') {
      setState('idle');
    }
  };

  const startListening = () => {
    stopSpeaking();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use the text input below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setState('listening');
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);

        if (event.results[0].isFinal) {
          processVoiceInput(current);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setState('idle');
      };

      recognition.onend = () => setState((current) => current === 'listening' ? 'idle' : current);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Recognition start failed:', e);
      setState('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setState('idle');
  };

  const processVoiceInput = async (command: string) => {
    if (!command.trim()) return;

    // Add user message
    const userMsg: VoiceMessage = {
      id: `v_u_${Date.now()}`,
      sender: 'user',
      text: command,
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) => [...prev, userMsg]);
    setState('processing');

    try {
      const result = await api.executeVoiceCommand(command, pendingToolRef.current, activeSubject?.name);
      pendingToolRef.current = result.pendingTool;

      const assistantMsg: VoiceMessage = {
        id: `v_a_${Date.now()}`,
        sender: 'assistant',
        text: result.speech,
        action: result.action,
        toolName: result.toolCall?.name || result.pendingTool?.name,
        success: result.success,
        data: result.data,
        actionHistory: result.actionHistory,
        timestamp: new Date().toISOString(),
      };

      setConversation((prev) => [...prev, assistantMsg]);
      if (result.success) onRefreshData();
      speakText(result.speech);
    } catch (err: any) {
      const errorMsg: VoiceMessage = {
        id: `v_a_err_${Date.now()}`,
        sender: 'assistant',
        text: `I had trouble processing that request: ${err.message || 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, errorMsg]);
      speakText('Sorry, I encountered an issue processing that command.');
    }
  };

  const sampleCommands = [
    'Create a two-hour study plan for Algorithms & Data Structures',
    'Explain Breadth-First Search',
    'Start a quiz on A* Search Algorithm',
    'What are my weakest topics?',
    'How much did I study this week?',
    'Recommend what I should revise next',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/40 border border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Mic size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Alexa-Inspired Study Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                AMAZON 2026
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Simulated Alexa+-style tools using saved StudyPilot data and browser speech.
              {activeSubject ? ` Active subject: ${activeSubject.name}.` : ' Add a subject to personalize tutoring.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state === 'speaking' && (
            <button
              onClick={stopSpeaking}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Square size={13} className="fill-rose-300" />
              <span>Stop Voice</span>
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isMuted ? 'Unmute Assistant Voice' : 'Mute Assistant Voice'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Hero Animated Orb & Waveform Section */}
      <div className="relative rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 flex flex-col items-center justify-center min-h-[320px] overflow-hidden">
        {/* State Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              state === 'listening'
                ? 'bg-rose-500 animate-ping'
                : state === 'processing'
                ? 'bg-amber-400 animate-pulse'
                : state === 'speaking'
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-xs font-semibold text-slate-300 capitalize">
            {state === 'listening'
              ? 'Listening to your voice...'
              : state === 'processing'
              ? 'Processing request and checking saved study data...'
              : state === 'speaking'
              ? 'StudyPilot Speaking...'
              : 'Idle - Ready for voice or text'}
          </span>
        </div>

        {/* Ambient Backlight */}
        <div
          className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-40 ${
            state === 'listening'
              ? 'bg-rose-600'
              : state === 'speaking'
              ? 'bg-cyan-500'
              : state === 'processing'
              ? 'bg-amber-500'
              : 'bg-purple-600'
          }`}
        />

        {/* Central Alexa AI Orb */}
        <div className="relative z-10 flex flex-col items-center my-6">
          <div
            onClick={state === 'listening' ? stopListening : startListening}
            className={`relative w-36 h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none ${
              state === 'listening'
                ? 'animate-orb-active shadow-2xl shadow-rose-500/50 bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600'
                : state === 'speaking'
                ? 'animate-orb-active shadow-2xl shadow-cyan-500/50 bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600'
                : state === 'processing'
                ? 'animate-spin shadow-2xl shadow-amber-500/40 bg-gradient-to-tr from-amber-500 to-purple-600'
                : 'animate-orb-idle shadow-xl shadow-purple-600/30 bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-600 hover:scale-105'
            }`}
          >
            {/* Inner Glass Core */}
            <div className="w-28 h-28 rounded-full bg-slate-950/40 backdrop-blur-md flex items-center justify-center border border-white/20">
              {state === 'listening' ? (
                <MicOff size={36} className="text-white animate-pulse" />
              ) : (
                <Mic size={36} className="text-white" />
              )}
            </div>

            {/* Ripple ring when active */}
            {state === 'listening' && (
              <div className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ripple pointer-events-none" />
            )}
          </div>

          <p className="text-xs text-slate-400 mt-4 font-medium">
            {state === 'listening'
              ? 'Click to stop listening'
              : 'Click orb to speak (or select a prompt below)'}
          </p>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex items-center gap-1.5 h-8 mt-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const isWaveActive = state === 'speaking' || state === 'listening';
            const height = isWaveActive ? Math.sin((i / 24) * Math.PI) * 24 + (i % 3) * 4 : 4;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  state === 'listening'
                    ? 'bg-rose-400'
                    : state === 'speaking'
                    ? 'bg-cyan-400'
                    : 'bg-slate-700'
                }`}
                style={{
                  height: `${Math.max(height, 4)}px`,
                }}
              />
            );
          })}
        </div>

        {/* Live speech transcript display */}
        {transcript && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white max-w-md text-center">
            "{transcript}"
          </div>
        )}
      </div>

      {/* Quick Voice Command Chips */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Suggested Alexa Voice Commands:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {sampleCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => processVoiceInput(cmd)}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-xs text-left text-slate-300 hover:text-white transition-all flex items-center justify-between group"
            >
              <span className="truncate">"{cmd}"</span>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-purple-400 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Conversational Transcript History */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles size={16} className="text-purple-400" />
          <span>Spoken Session Transcript & Executed Actions</span>
        </h3>

        <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl text-xs md:text-sm ${
                msg.sender === 'user'
                  ? 'bg-purple-950/30 border border-purple-500/30 text-purple-200 ml-8'
                  : 'bg-slate-800/40 border border-slate-700/60 text-slate-200 mr-8'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-300">
                  {msg.sender === 'user' ? 'Student Voice' : 'StudyPilot Voice Assistant'}
                </span>
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="leading-relaxed">{msg.text}</p>

              {/* Action Banner for Tool Executions */}
              {msg.action && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${msg.success ? 'text-emerald-400' : 'text-amber-300'}`}>
                    <CheckCircle2 size={13} />
                    <span>{msg.toolName ? `Tool ${msg.toolName}` : 'Assistant response'}: {msg.success ? 'complete' : msg.action === 'ASK_FOR_DETAILS' ? 'needs details' : 'not completed'}</span>
                  </span>

                  {msg.success && msg.toolName === 'create_study_plan' && (
                    <button
                      onClick={() => onNavigate('planner')}
                      className="px-2 py-1 rounded bg-purple-600/40 hover:bg-purple-600 text-white text-[11px] font-semibold"
                    >
                      View Generated Plan
                    </button>
                  )}

                  {msg.success && msg.toolName === 'generate_quiz' && (
                    <button
                      onClick={() => onStartQuizWithTopic(msg.data?.topicId, msg.data?.topicName, msg.data?.questions as QuizQuestion[], msg.data?.quizId)}
                      className="px-2 py-1 rounded bg-blue-600/40 hover:bg-blue-600 text-white text-[11px] font-semibold"
                    >
                      Take and submit quiz
                    </button>
                  )}

                  {msg.success && (msg.toolName === 'recommend_revision' || msg.toolName === 'get_student_progress') && (
                    <button
                      onClick={() => onNavigate('analytics')}
                      className="px-2 py-1 rounded bg-amber-600/40 hover:bg-amber-600 text-white text-[11px] font-semibold"
                    >
                      View Saved Analytics
                    </button>
                  )}
                </div>
              )}
              {msg.toolName === 'create_study_plan' && msg.success && msg.data && (
                <p className="mt-2 text-xs text-slate-300">Saved: {msg.data.title} for {msg.data.subjectName}, {msg.data.sessions?.length || 0} sessions through {msg.data.examDate}.</p>
              )}
              {msg.toolName === 'get_student_progress' && msg.success && msg.data && (
                <div className="mt-2 text-xs text-slate-300">
                  <p>{msg.data.quizAttempts?.length || 0} saved quiz attempts and {msg.data.studySessions?.length || 0} saved study sessions.</p>
                  {msg.data.topicPerformance?.map((topic: any) => <p key={topic.topicId}>{topic.topicName}: {topic.attemptsCount ? `${topic.averageScore}% average` : 'no saved quiz score'} ({topic.status})</p>)}
                </div>
              )}
              {msg.toolName === 'recommend_revision' && msg.success && msg.data?.weakTopics?.map((topic: any) => (
                <p key={topic.topicId} className="mt-2 text-xs text-slate-300">Revise {topic.topicName}: {topic.averageScore}% average from {topic.attemptsCount} saved attempts.</p>
              ))}
              {msg.toolName === 'generate_quiz' && msg.success && msg.data && (
                <p className="mt-2 text-xs text-slate-300">Prepared {msg.data.totalQuestions} questions on {msg.data.topicName}; use "Take and submit quiz" to record your answers.</p>
              )}
              {msg.actionHistory && msg.actionHistory.length > 0 && (
                <ol className="mt-2 space-y-1.5 border-l border-cyan-700/60 pl-3" aria-label="Adaptive Coach action history">
                  {msg.actionHistory.map((action, index) => (
                    <li key={`${action.tool}-${index}`} className="text-[11px]">
                      <p className="font-semibold text-cyan-200">{action.tool} · {action.status}</p>
                      <p className="text-slate-300">{action.summary}</p>
                      <p className="text-slate-400">Used: {action.dataUsed.join('; ')}</p>
                      {action.savedRecordId && <p className="text-emerald-300">Saved record: {action.savedRecordId}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Fallback Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.trim()) {
              processVoiceInput(manualInput);
              setManualInput('');
            }
          }}
          className="pt-2 flex items-center gap-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Type voice command fallback (e.g. 'StudyPilot, create a study plan')..."
            className="flex-1 bg-slate-800/80 text-white text-xs md:text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:border-purple-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || state === 'processing'}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
