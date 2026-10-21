import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Mic,
  MicOff,
  Lightbulb,
  GraduationCap,
} from 'lucide-react';
import { useStudyData } from '../hooks/useStudyData.js';
import { chatApi } from '../services/chatApi.js';
import { ChatMessage, Conversation } from '../types.js';

export const StudyChat: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q');

  const { subjects, conversations, refreshData } = useStudyData();

  const [activeConvId, setActiveConvId] = useState<string>(
    conversations[0]?.id || `conv_${Date.now()}`
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    conversations[0]?.messages || []
  );
  const [inputText, setInputText] = useState(initialQuery || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjects[0]?.name || 'Algorithms & Data Structures'
  );
  const [mode, setMode] = useState<'simple' | 'exam' | 'tutorial' | 'revision' | 'practice'>('simple');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const current = conversations.find((c) => c.id === activeConvId);
    if (current) {
      setMessages(current.messages);
      if (current.subjectName) setSelectedSubject(current.subjectName);
    }
  }, [activeConvId, conversations]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      mode,
      subjectName: selectedSubject,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        subjectName: selectedSubject,
        mode,
        difficulty,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        mode,
        subjectName: selectedSubject,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      const conv: Conversation = {
        id: activeConvId,
        userId: 'user_alexa_01',
        title: content.slice(0, 36) + (content.length > 36 ? '...' : ''),
        subjectName: selectedSubject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
      };
      await chatApi.saveConversation(conv);
      refreshData();
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `Error: ${err.message || 'Please check your connection and try again.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;

    const trimmed = messages.slice(0, lastUserIdx + 1);
    setMessages(trimmed);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
        subjectName: selectedSubject,
        mode,
        difficulty,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        mode,
        subjectName: selectedSubject,
      };

      const finalMessages = [...trimmed, assistantMessage];
      setMessages(finalMessages);

      const conv: Conversation = {
        id: activeConvId,
        userId: 'user_alexa_01',
        title: messages[0]?.content.slice(0, 36) || 'Study Session',
        subjectName: selectedSubject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
      };
      await chatApi.saveConversation(conv);
      refreshData();
    } catch (err: any) {
      console.error('Error regenerating:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    const conv: Conversation = {
      id: activeConvId,
      userId: 'user_alexa_01',
      title: 'New Conversation',
      subjectName: selectedSubject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    chatApi.saveConversation(conv);
    refreshData();
  };

  const handleNewChat = () => {
    const newId = `conv_${Date.now()}`;
    setActiveConvId(newId);
    setMessages([]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  };

  const suggestedPrompts = [
    'Explain the A* algorithm in simple English.',
    'Teach me database normalization with examples.',
    'Summarize these notes for my examination.',
    'Create a three-day revision plan for computer networks.',
    'Generate 5 multiple-choice questions on machine learning.',
    'Explain why my quiz answer is incorrect.',
  ];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
      {/* Conversation History Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-[#0a0f24]/70 p-3 hidden md:flex flex-col">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold border border-purple-500/40 flex items-center justify-center gap-1.5 transition-colors mb-3"
        >
          <Sparkles size={14} />
          <span>+ New Conversation</span>
        </button>

        <div className="text-[11px] font-semibold text-slate-400 px-2 mb-2 uppercase tracking-wider">
          Chat History
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={`w-full text-left p-2 rounded-lg text-xs truncate transition-colors flex items-center justify-between group ${
                activeConvId === c.id
                  ? 'bg-purple-600/20 text-white font-medium border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="truncate">{c.title || 'Untitled Session'}</span>
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors"
          >
            <Trash2 size={12} />
            <span>Clear Current Chat</span>
          </button>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full bg-[#070913]/40">
        {/* Chat Control Toolbar */}
        <div className="p-3 border-b border-slate-800 bg-[#0a0f24]/50 flex flex-wrap items-center justify-between gap-3">
          {/* Subject Context Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <BookOpen size={13} className="text-purple-400" />
              <span>Subject:</span>
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-800/80 text-white text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-purple-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              <option value="General Studies">General Studies</option>
            </select>
          </div>

          {/* Response Mode Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Mode:</span>
            {[
              { id: 'simple', label: 'Simple' },
              { id: 'exam', label: 'Exam Prep' },
              { id: 'tutorial', label: 'Step-by-Step' },
              { id: 'revision', label: 'Revision Notes' },
              { id: 'practice', label: 'Practice Q&A' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                  mode === m.id
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Difficulty setting */}
          <div className="flex items-center gap-1.5">
            <GraduationCap size={13} className="text-slate-400" />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="bg-slate-800/80 text-white text-xs rounded-lg px-2 py-1 border border-slate-700"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                How can I help you learn today?
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Ask any question, request step-by-step breakdowns, or select a suggested topic below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/30 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start gap-2"
                  >
                    <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Sparkles size={14} />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="space-y-2 prose prose-invert prose-xs max-w-none">
                    {msg.content.split('\n\n').map((block, i) => {
                      if (block.startsWith('### ')) {
                        return (
                          <h3 key={i} className="text-sm font-bold text-white mt-2 mb-1 border-b border-slate-700 pb-1">
                            {block.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (block.startsWith('#### ')) {
                        return (
                          <h4 key={i} className="text-xs font-bold text-purple-300 mt-2 mb-0.5">
                            {block.replace('#### ', '')}
                          </h4>
                        );
                      }
                      if (block.startsWith('```')) {
                        const code = block.replace(/```[a-z]*\n?/g, '');
                        return (
                          <div key={i} className="my-2 rounded-lg bg-slate-950 p-3 font-mono text-xs overflow-x-auto border border-slate-800 relative group">
                            <pre className="text-emerald-400">{code}</pre>
                            <button
                              onClick={() => copyToClipboard(code, `code_${i}`)}
                              className="absolute top-2 right-2 p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white"
                              title="Copy code"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        );
                      }
                      if (block.startsWith('- ') || block.startsWith('* ')) {
                        const items = block.split('\n').filter((l) => l.trim().length > 0);
                        return (
                          <ul key={i} className="list-disc pl-4 space-y-1 text-slate-300">
                            {items.map((it, idx) => (
                              <li key={idx}>{it.replace(/^[-*]\s+/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={i} className="whitespace-pre-wrap">{block}</p>;
                    })}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize">{msg.mode || 'Simple'}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                          title="Regenerate response"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                    H
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shrink-0 animate-pulse">
                <Sparkles size={14} />
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                <span className="flex space-x-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>StudyPilot is formulating your explanation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0f24]/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl border transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
              }`}
              title={isRecording ? 'Stop Voice Input' : 'Dictate Question'}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask a question about ${selectedSubject}...`}
              className="flex-1 bg-slate-800/80 text-white text-xs md:text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:border-purple-500 placeholder-slate-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/20 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
