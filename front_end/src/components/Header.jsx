import React, { useState, useEffect } from 'react';
import { TrainFront, ShieldAlert, Sun, Moon, Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function Header({ 
  isConnected, 
  isMuted, 
  onToggleMute, 
  theme, 
  onToggleTheme, 
  pollingActive,
  onTogglePolling 
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="glass shadow-lg border-b border-slate-800/50 p-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Side: Brand Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center p-2.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <TrainFront className="w-6 h-6 animate-pulse" />
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </div>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-slate-400 light:from-slate-900 light:to-slate-700">
              Edge AI Railway Safety System
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <span>Control Room Terminal</span>
              <span className="w-1 h-1 rounded-full bg-slate-500"></span>
              <span>AI Detection Enabled</span>
            </p>
          </div>
        </div>

        {/* Center: Live Status Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Connection Status Indicator */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border transition-all duration-300 ${
            isConnected 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`relative flex h-2 w-2`}>
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span>{isConnected ? 'ONLINE' : 'DISCONNECTED'}</span>
          </div>

          {/* Autorefresh Indicator / Toggle */}
          <button
            onClick={onTogglePolling}
            title={pollingActive ? "Pause Autorefresh" : "Resume Autorefresh"}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
              pollingActive 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pollingActive ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span>{pollingActive ? 'POLLING' : 'PAUSED'}</span>
          </button>
        </div>

        {/* Right Side: Clock & Settings */}
        <div className="flex flex-wrap items-center justify-end gap-4">
          {/* Time and Date */}
          <div className="text-right hidden md:block border-r border-slate-800 pr-4 mr-1">
            <div className="text-sm font-mono font-bold tracking-widest text-slate-200 dark:text-slate-200 light:text-slate-800">
              {formatTime(time)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              {formatDate(time)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-950/40 p-1 rounded-lg border border-slate-800/80">
            {/* Audio Alert Toggle */}
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-md transition-all duration-200 ${
                isMuted 
                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' 
                  : 'text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20'
              }`}
              title={isMuted ? 'Unmute alert sounds' : 'Mute alert sounds'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
