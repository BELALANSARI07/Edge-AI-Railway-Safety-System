import React, { useEffect, useRef } from 'react';
import { Cpu, Heart } from 'lucide-react';

export default function SystemStats({ 
  isConnected, 
  telemetry = {}, 
  stats = { totalDetections: 0, totalAlerts: 0, lastAlertTime: '' } 
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Heartbeat ECG waveform simulator
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let x = 0;
    const points = [];
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    const render = () => {
      // Background clear
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)'; // transparent trails
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal grid center line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Determine ECG pattern based on connection and emergency states
      let amplitude = 0;
      let wavePeriod = 60; // frames per beat
      let strokeColor = '#10b981'; // green (normal)

      const isDangerState = telemetry?.train_state === 'STOP' || telemetry?.distance_safe === false || telemetry?.emergency_brake === true;

      if (!isConnected) {
        amplitude = 0;
        strokeColor = '#64748b'; // slate flatline
      } else if (isDangerState) {
        amplitude = height * 0.45;
        wavePeriod = 20; // rapid heart rate
        strokeColor = '#ef4444'; // red
      } else if (telemetry?.train_state === 'SLOW') {
        amplitude = height * 0.35;
        wavePeriod = 35; // moderate rhythm
        strokeColor = '#f59e0b'; // amber
      } else {
        amplitude = height * 0.25;
        wavePeriod = 60; // normal sinus rhythm
        strokeColor = '#10b981'; // green
      }

      // Generate ECG shape
      const beatCycle = x % wavePeriod;
      let yOffset = 0;

      if (isConnected) {
        if (beatCycle > wavePeriod - 12 && beatCycle < wavePeriod - 9) {
          yOffset = amplitude * 0.15; // P-wave
        } else if (beatCycle === wavePeriod - 8) {
          yOffset = -amplitude * 0.1; // Q-wave
        } else if (beatCycle === wavePeriod - 7) {
          yOffset = amplitude; // R-wave
        } else if (beatCycle === wavePeriod - 6) {
          yOffset = -amplitude * 0.4; // S-wave
        } else if (beatCycle > wavePeriod - 5 && beatCycle < wavePeriod - 2) {
          yOffset = amplitude * 0.25; // T-wave
        }
      }

      // Record point
      const currentY = height / 2 - yOffset;
      points.push({ x, y: currentY });
      if (points.length > width) {
        points.shift();
      }

      // Draw line
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const drawX = i;
        const drawY = points[i].y;
        if (i === 0) {
          ctx.moveTo(drawX, drawY);
        } else {
          ctx.lineTo(drawX, drawY);
        }
      }
      ctx.stroke();

      x++;
      if (x > width) x = 0;

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isConnected, telemetry.train_state, telemetry.distance_safe, telemetry.emergency_brake]);

  const formatLastAlert = (timeStr) => {
    if (!timeStr) return 'No alerts recorded';
    try {
      // Try to extract time component from "2026-06-11 18:21:28"
      const match = timeStr.match(/\d{2}:\d{2}:\d{2}/);
      if (match) return match[0];
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'No alerts';
    }
  };

  const systemHost = import.meta.env.VITE_SYSTEM_HOST || window.location.origin;

  return (
    <div className="glass rounded-xl border border-slate-800/80 p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/60">
        <Cpu className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Edge Processor Status
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total scans/detections */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Scans
          </span>
          <span className="text-xl font-black text-slate-100 mt-1">
            {stats.totalDetections}
          </span>
        </div>

        {/* Total threat alerts */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Emergency Alerts
          </span>
          <span className={`text-xl font-black mt-1 ${stats.totalAlerts > 0 ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
            {stats.totalAlerts}
          </span>
        </div>
      </div>

      {/* Heartbeat ECG System Health Graph */}
      <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center space-x-1">
            <Heart className={`w-3 h-3 ${isConnected ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`} />
            <span>AI Heartbeat ECG</span>
          </span>
          <span className={isConnected ? 'text-emerald-400' : 'text-slate-600'}>
            {isConnected ? 'STABLE' : 'FLATLINE'}
          </span>
        </div>
        <canvas ref={canvasRef} className="w-full h-10 block rounded bg-slate-950" />
      </div>

      {/* Latency & Server Load Info */}
      <div className="flex flex-col gap-2 text-xs text-slate-400 bg-slate-950/20 p-3 rounded-lg border border-slate-800/40">
        <div className="flex justify-between items-center">
          <span>AI Server Host:</span>
          <span className="font-mono text-slate-200 text-[10px]">{systemHost}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Last Warning Time:</span>
          <span className="font-mono text-slate-200">{formatLastAlert(stats.lastAlertTime)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Process Latency:</span>
          <span className="font-mono text-slate-200">
            {isConnected ? (telemetry?.train_state === 'STOP' ? '11ms (CRITICAL)' : '16ms') : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>System Health:</span>
          <span className={`font-semibold ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`}>
            {isConnected ? '99.9%' : '0.0% (Offline)'}
          </span>
        </div>
      </div>
    </div>
  );
}
