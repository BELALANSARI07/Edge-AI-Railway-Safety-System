import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import CameraFeed from '../components/CameraFeed';
import StatusCards from '../components/StatusCards';
import SystemStats from '../components/SystemStats';
import EventLog from '../components/EventLog';
import useTelemetry from '../hooks/useTelemetry';
import useAudioAlarm from '../hooks/useAudioAlarm';
import { Bell, X, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [theme, setTheme] = useState('dark');

  // Load telemetry state
  const {
    telemetry,
    isConnected,
    pollingActive,
    setPollingActive,
    events,
    stats,
    toasts,
    setToasts,
    clearLogs
  } = useTelemetry();

  // Load audio alarm state (triggered on train_state === 'STOP')
  const { isMuted, setIsMuted } = useAudioAlarm(
    telemetry ? telemetry.train_state : 'UNKNOWN',
    isConnected
  );

  // Sync Theme CSS Class
  useEffect(() => {
    const bodyClass = document.body.classList;
    if (theme === 'light') {
      bodyClass.add('light');
      bodyClass.remove('dark');
    } else {
      bodyClass.add('dark');
      bodyClass.remove('light');
    }
  }, [theme]);

  // Emergency conditions
  const objectDetected = String(telemetry?.object_detected || telemetry?.object || 'NONE');
  const hasObject = (objectDetected || 'NONE').toUpperCase() !== 'NONE';
  const isStopState = telemetry?.train_state === 'STOP';
  const isUnsafeDistance = telemetry?.distance_safe === false;

  const showEmergencyBanner = isConnected && telemetry && (isStopState || hasObject || isUnsafeDistance);

  return (
    <div className={`min-h-screen flex flex-col font-sans relative antialiased transition-all grid-bg ${
      isStopState && isConnected ? 'border-4 border-red-500 animate-flash-red' : ''
    }`}>
      {/* Warning Screen Flash Red overlay when emergency banner conditions are active */}
      {showEmergencyBanner && (
        <div className="absolute inset-0 alert-flash-screen z-50 pointer-events-none" />
      )}

      {/* Main Header */}
      <Header 
        isConnected={isConnected} 
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        pollingActive={pollingActive}
        onTogglePolling={() => setPollingActive(!pollingActive)}
      />

      {/* Main content grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Large Emergency Warning Banner */}
        {showEmergencyBanner && (
          <div className="bg-red-950/90 border-2 border-red-500 rounded-xl p-4 flex items-center space-x-4 animate-pulse relative overflow-hidden shadow-2xl z-10">
            {/* Neon warning stripe design overlay */}
            <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-b from-red-500 to-rose-600"></div>
            <div className="p-3 bg-red-900/40 border border-red-500/30 rounded-lg text-red-500 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black tracking-widest text-red-400 uppercase">
                🚨 HIGH RISK
              </div>
              <div className="text-lg font-extrabold text-white leading-tight mt-0.5">
                Stop Reason: <span className="text-red-200">{telemetry?.stop_reason || 'Safety Condition Triggered'}</span>
              </div>
              <div className="text-xs text-red-300 font-semibold mt-1">
                Active System Command: STOP SIGNAL DEPLOYED | Object: {(objectDetected || 'NONE').toUpperCase()} | Distance Status: UNSAFE
              </div>
            </div>
          </div>
        )}

        {/* Top Section Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Camera Stream (Takes 2 cols on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <CameraFeed 
              telemetry={telemetry || {}} 
              isConnected={isConnected} 
            />
          </div>

          {/* Right Panel: AI Status Cards & Stats Widget */}
          <div className="flex flex-col gap-6">
            <StatusCards 
              telemetry={telemetry || {}} 
              isConnected={isConnected} 
            />
            
            <SystemStats 
              isConnected={isConnected} 
              telemetry={telemetry || {}}
              stats={stats}
            />
          </div>
        </div>

        {/* Bottom Section: Safety Event Log */}
        <div className="w-full">
          <EventLog 
            events={events} 
            onClearLogs={clearLogs}
          />
        </div>
      </main>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl border shadow-2xl flex items-start space-x-3 transition-all duration-300 animate-slideIn ${
              toast.risk === 'HIGH' 
                ? 'bg-red-950/95 border-red-500 text-slate-100' 
                : 'bg-amber-950/95 border-amber-500 text-slate-100'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${
              toast.risk === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider opacity-60">
                {toast.risk === 'HIGH' ? 'CRITICAL DETECTION' : 'WARNING'}
              </div>
              <div className="text-sm font-semibold mt-0.5 leading-snug">
                {toast.message}
              </div>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <footer className="glass border-t border-slate-800/40 p-4 text-center mt-auto">
        <p className="text-xs text-slate-500">
          Edge AI Smart Railway Safety Control Panel Terminal. Designed for Industrial Safety Demo.
        </p>
      </footer>
    </div>
  );
}
