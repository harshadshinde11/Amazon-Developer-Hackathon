import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Terminal,
  Play,
  CheckCircle2,
  Copy,
  Check,
  Code,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { AlexaToolManifest } from '../types.js';
import { api } from '../api.js';

interface AlexaPlusViewProps {
  onRefreshData: () => void;
}

export const AlexaPlusView: React.FC<AlexaPlusViewProps> = ({ onRefreshData }) => {
  const [manifest, setManifest] = useState<{
    track: string;
    application: string;
    mcpVersion: string;
    description: string;
    tools: AlexaToolManifest[];
  } | null>(null);

  const [selectedTool, setSelectedTool] = useState<string>('create_study_plan');
  const [paramsInput, setParamsInput] = useState<string>('{\n  "subject_name": "Algorithms & Data Structures",\n  "hours_per_day": 2\n}');
  const [isInvoking, setIsInvoking] = useState(false);
  const [invocationResult, setInvocationResult] = useState<any>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    api.getAlexaToolsManifest().then(setManifest).catch(console.error);
  }, []);

  const toolPresets: Record<string, string> = {
    create_study_plan: '{\n  "subject_name": "Algorithms & Data Structures",\n  "hours_per_day": 2\n}',
    explain_topic: '{\n  "topic_name": "Binary Search",\n  "difficulty": "intermediate",\n  "mode": "simple"\n}',
    generate_quiz: '{\n  "topic_name": "A* Search Algorithm",\n  "difficulty": "intermediate",\n  "num_questions": 3\n}',
    get_student_progress: '{}',
    recommend_revision: '{}',
  };

  const handleSelectTool = (name: string) => {
    setSelectedTool(name);
    setParamsInput(toolPresets[name] || '{}');
    setInvocationResult(null);
  };

  const handleInvoke = async () => {
    setIsInvoking(true);
    setInvocationResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(paramsInput || '{}');
    } catch (e: any) {
      alert(`Invalid JSON in parameters: ${e.message}`);
      setIsInvoking(false);
      return;
    }

    try {
      const res = await api.invokeAlexaTool(selectedTool, parsedArgs);
      setInvocationResult(res);
      if (res.success) onRefreshData();
    } catch (err: any) {
      setInvocationResult({
        success: false,
        error: err.message || 'Execution error',
      });
    } finally {
      setIsInvoking(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:3000/api/alexa-plus/invoke \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ tool: selectedTool, arguments: JSON.parse(paramsInput || '{}') })}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-blue-950/50 border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-2">
              <Sparkles size={13} className="text-cyan-400" />
              <span>In-App Alexa+-Inspired Simulation</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Amazon Developer Hackathon 2026 - Study Assistant Tools
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              A simulated conversational experience inside StudyPilot. The tools call this app's backend and JSON database; no official Alexa+ runtime, Alexa device, or MCP server is connected.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
              Local API Tools
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Tool Testing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tools Manifest List */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers size={16} className="text-purple-400" />
            <span>Registered Alexa+ Tools (5)</span>
          </h3>

          <div className="space-y-2">
            {manifest?.tools.map((t) => {
              const isSelected = selectedTool === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => handleSelectTool(t.name)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-purple-300 truncate">
                      {t.name}()
                    </span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/60 text-slate-300 font-mono">
                      Callable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center & Right: Live Tool Runner & Output */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invocation Form */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Tool Execution Testbed
                </span>
                <h3 className="text-base font-mono font-bold text-white mt-0.5">
                  {selectedTool}
                </h3>
              </div>

              <button
                onClick={handleInvoke}
                disabled={isInvoking}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Play size={14} className={isInvoking ? 'animate-spin' : ''} />
                <span>{isInvoking ? 'Invoking Tool...' : 'Execute Tool'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Arguments Payload (JSON)</span>
                <span className="text-[10px] text-slate-500">Edit JSON values as desired</span>
              </label>
              <textarea
                value={paramsInput}
                onChange={(e) => setParamsInput(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 text-emerald-400 text-xs font-mono rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Quick Curl Snippet */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] truncate mr-2">
                <Terminal size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">{curlCommand.slice(0, 70)}...</span>
              </div>
              <button
                onClick={copyCurl}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0 flex items-center gap-1 text-[11px]"
                title="Copy cURL Command"
              >
                {copiedCurl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>
          </div>

          {/* Invocation Output Results */}
          {invocationResult && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className={invocationResult.success ? 'text-emerald-400' : 'text-rose-400'} />
                  <h4 className="text-sm font-bold text-white">{invocationResult.success ? 'Tool completed' : 'Tool did not complete'}</h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {invocationResult.timestamp ? new Date(invocationResult.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>

              {/* Spoken Audio Transcript */}
              {invocationResult.speechText && (
                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs">
                  <span className="font-bold text-blue-300 uppercase tracking-wider text-[10px] block mb-1">
                    Spoken Response Text (browser speech is available in Voice Assistant):
                  </span>
                  <p className="text-slate-200 text-sm italic">
                    "{invocationResult.speechText}"
                  </p>
                </div>
              )}

              {/* Raw JSON Data Payload */}
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  Structured Tool Return Data (JSON):
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-64">
                  {JSON.stringify(invocationResult.data || invocationResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integration Documentation / Architecture Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen size={16} className="text-blue-400" />
          <span>Alexa+ Track Architecture & Evaluation Notes</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">1. Model Independence</span>
            <p className="text-slate-400">
              The 5 core functions are decoupled from any single LLM. They execute against persistent schemas and can be invoked by Alexa+, Amazon Bedrock, or standard MCP agents.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">2. Real Persistent Mutations</span>
            <p className="text-slate-400">
              Invoking <code>create_study_plan</code> saves a plan. Generated quiz questions are interactive in Quiz Center; quiz attempts are saved only after submission.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white block">3. Browser Speech</span>
            <p className="text-slate-400">
              Browser speech recognition and synthesis are used when supported. Typed input remains available; behavior depends on browser permissions and speech support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
