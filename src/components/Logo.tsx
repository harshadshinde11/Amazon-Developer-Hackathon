import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32, showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 shadow-lg shadow-purple-500/25 p-2"
        style={{ width: size, height: size }}
      >
        {/* Orbital ring */}
        <div className="absolute inset-0 rounded-xl border border-white/30 animate-pulse pointer-events-none" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-white"
        >
          {/* Graduation Cap */}
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
          {/* Orbital / Compass Sparkle */}
          <circle cx="12" cy="7" r="1.2" fill="white" stroke="none" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeOpacity="0.4" strokeWidth="1.5" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
              StudyPilot
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 tracking-wider">
              AI
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 tracking-wide">
            Amazon Alexa+ 2026
          </span>
        </div>
      )}
    </div>
  );
};
