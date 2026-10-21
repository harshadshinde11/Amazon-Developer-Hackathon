import React, { useState } from 'react';
import {
  Settings,
  X,
  User,
  Clock,
  Volume2,
  RefreshCw,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { api } from '../api.js';

interface SettingsModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [hoursPerDay, setHoursPerDay] = useState(user.preferredHoursPerDay);
  const [difficulty, setDifficulty] = useState(user.difficultyPreference);
  const [voiceGender, setVoiceGender] = useState(user.voiceGender);
  const [soundEnabled, setSoundEnabled] = useState(user.soundEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateUser({
        displayName,
        email,
        preferredHoursPerDay: hoursPerDay,
        difficultyPreference: difficulty,
        voiceGender,
        soundEnabled,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      onRefreshData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (confirm('Restore the Amazon Hackathon demonstration scenario? (BFS 90%, DFS 85%, A* 40%)')) {
      await api.resetToDemo();
      onRefreshData();
      onClose();
    }
  };

  const handleResetEmpty = async () => {
    if (confirm('Reset database to clean empty state? All subjects, plans, and quizzes will be cleared.')) {
      await api.resetToEmpty();
      onRefreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[#0a0f24] border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-white">Student Settings & Preferences</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">

        <form onSubmit={handleSave} className="space-y-5">
          {/* Profile Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-purple-400" />
              <span>Student Profile</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-700"
                  required
                />
              </div>
            </div>
          </div>

          {/* Academic & Study Targets */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-400" />
              <span>Study Targets</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Daily Study Hours: <strong className="text-white">{hoursPerDay}h</strong>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default Explanation Level</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-700"
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Undergraduate)</option>
                <option value="advanced">Advanced (Deep Dive)</option>
              </select>
            </div>
          </div>

          {/* Voice & Audio Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 size={14} className="text-cyan-400" />
              <span>Voice Assistant Voice</span>
            </h4>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div>
                <span className="text-xs font-bold text-white block">Spoken Voice Feedback</span>
                <span className="text-[11px] text-slate-400">Play spoken answers using Web Speech Synthesis</span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded"
              />
            </div>
          </div>

          {/* Save Profile Button */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check size={14} /> Saved!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>

        {/* Database Demonstration Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Hackathon Testing & Database States
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleResetDemo}
              className="p-3 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 text-left transition-colors flex items-start gap-2.5"
            >
              <RefreshCw size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">Load Demo Data</span>
                <span className="text-[10px] text-slate-400">Restores BFS 90%, DFS 85%, A* 40%</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleResetEmpty}
              className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-left transition-colors flex items-start gap-2.5"
            >
              <Trash2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">Reset to Empty</span>
                <span className="text-[10px] text-slate-400">Clear all records for fresh test</span>
              </div>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
