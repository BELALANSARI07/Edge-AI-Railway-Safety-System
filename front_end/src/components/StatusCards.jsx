import React from 'react';
import { 
  Train, 
  Eye, 
  Ruler, 
  Video, 
  Cpu, 
  Radio, 
  Sliders, 
  Database, 
  Lock, 
  ShieldAlert, 
  Binary, 
  Activity 
} from 'lucide-react';

export default function StatusCards({ telemetry = {}, isConnected }) {
  // Parse data fields with defaults matching the backend JSON schema
  const data = {
    trainState: telemetry?.train_state || 'UNKNOWN',
    distanceCm: telemetry?.distance_cm !== undefined ? telemetry.distance_cm : null,
    detectionCount: telemetry?.detection_count !== undefined ? telemetry.detection_count : 0,
    objectDetected: telemetry?.object_detected || telemetry?.object || 'NONE',
    trackStatus: telemetry?.track_status || 'UNKNOWN',
    esp32Status: telemetry?.esp32_status || 'UNKNOWN',
    cameraStatus: telemetry?.camera_status || 'UNKNOWN',
    stopReason: telemetry?.stop_reason || '',
    stopLatched: telemetry?.stop_latched !== undefined ? telemetry.stop_latched : false,
    detectionMax: telemetry?.detection_max || 5,
    trackMemory: telemetry?.track_memory || 10,
    distanceSafe: telemetry?.distance_safe !== undefined ? telemetry.distance_safe : true,
    distanceThresh: telemetry?.distance_thresh !== undefined ? telemetry.distance_thresh : 70.0,
    emergencyBrake: telemetry?.emergency_brake !== undefined ? telemetry.emergency_brake : false,
    frameIndex: telemetry?.frame_index !== undefined ? telemetry.frame_index : 0,
    timestamp: telemetry?.timestamp || ''
  };

  // Status coloring utility
  const getStatusStyle = (val, type = '') => {
    if (!isConnected) return 'text-slate-500 bg-slate-900/40 border-slate-800/80';
    const normalized = String(val || 'UNKNOWN').toUpperCase();

    // Red condition lists
    if (
      normalized === 'STOP' ||
      normalized === 'UNSAFE' ||
      normalized === 'PERSON' ||
      (type === 'emergency_brake' && val === true) ||
      (type === 'distance_safe' && val === false)
    ) {
      return 'text-red-400 bg-red-950/40 border-red-500/30 font-bold';
    }

    // Green condition lists
    if (
      normalized === 'CONNECTED' ||
      normalized === 'SAFE' ||
      normalized === 'RUN' ||
      normalized === 'ON TRACK' ||
      (type === 'emergency_brake' && val === false) ||
      (type === 'distance_safe' && val === true)
    ) {
      return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 font-semibold';
    }

    // Yellow condition lists
    if (
      normalized === 'SLOW' ||
      normalized === 'WARNING' ||
      normalized === 'LATCHED' ||
      (type === 'stop_latched' && val === true)
    ) {
      return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    }

    return 'text-slate-300 bg-slate-900/60 border-slate-800/80';
  };

  // Helper to calculate progress percentage
  const detectionProgress = Math.min(100, Math.max(0, (data.detectionCount / data.detectionMax) * 100));

  return (
    <div className="flex flex-col gap-5">
      
      {/* Primary Status Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Train State */}
        <div className={`glass-card flex items-center justify-between border transition-all duration-300 ${
          isConnected ? getStatusStyle(data.trainState) : 'border-slate-800'
        }`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Control command
            </span>
            <span className="text-sm font-semibold text-slate-500 mt-0.5">
              Train State
            </span>
            <span className="text-2xl font-black mt-1.5 uppercase tracking-wide">
              {isConnected ? data.trainState : 'OFFLINE'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <Train className={`w-7 h-7 ${
              !isConnected ? 'text-slate-600' : data.trainState === 'STOP' ? 'text-red-500 animate-bounce' : 'text-emerald-500'
            }`} />
          </div>
        </div>

        {/* Safety Badge Card (distance_safe) */}
        <div className={`glass-card flex items-center justify-between border transition-all duration-300 ${
          isConnected ? getStatusStyle(data.distanceSafe, 'distance_safe') : 'border-slate-800'
        }`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Range status
            </span>
            <span className="text-sm font-semibold text-slate-500 mt-0.5">
              Distance Safety
            </span>
            <span className="text-xl font-bold mt-2 uppercase tracking-wider">
              {isConnected ? (
                data.distanceSafe ? (
                  <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SAFE</span>
                ) : (
                  <span className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">UNSAFE</span>
                )
              ) : 'N/A'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <Activity className={`w-7 h-7 ${
              !isConnected ? 'text-slate-600' : data.distanceSafe ? 'text-emerald-500' : 'text-red-500 animate-pulse'
            }`} />
          </div>
        </div>
      </div>

      {/* Detection Progress Bar */}
      <div className="glass-card flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Detection Scan Buffer</span>
          <span className="font-mono text-slate-300">
            {data.detectionCount} / {data.detectionMax} Hits
          </span>
        </div>
        <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              data.detectionCount >= data.detectionMax ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
            }`} 
            style={{ width: `${detectionProgress}%` }}
          />
        </div>
      </div>

      {/* 9 remaining metadata grid cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 2: Detected Object */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.objectDetected)}`}>
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Object Detected</div>
            <div className="text-base font-bold text-slate-200 uppercase mt-0.5">
              {isConnected ? data.objectDetected : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 3: Distance */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {isConnected && data.distanceCm !== null ? `${data.distanceCm.toFixed(2)} cm` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 4: Track Status */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.trackStatus)}`}>
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Track Status</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {isConnected ? data.trackStatus : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 5: Camera Node Status */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.cameraStatus)}`}>
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Camera Status</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {isConnected ? data.cameraStatus : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 6: ESP32 Link Status */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.esp32Status)}`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ESP32 Status</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {isConnected ? data.esp32Status : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 7: Detection Count */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detection Count</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {isConnected ? `${data.detectionCount} / ${data.detectionMax}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 8: Stop Latched */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.stopLatched, 'stop_latched')}`}>
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stop Latched</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {isConnected ? (data.stopLatched ? 'LATCHED' : 'UNLATCHED') : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 9: Emergency Brake */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className={`p-2 rounded-lg border ${getStatusStyle(data.emergencyBrake, 'emergency_brake')}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Emergency Brake</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {isConnected ? (data.emergencyBrake ? 'ACTIVE' : 'INACTIVE') : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 10: Distance Threshold */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-800 text-slate-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance Thresh</div>
            <div className="text-base font-bold text-slate-200 mt-0.5 font-mono">
              {isConnected ? `${data.distanceThresh.toFixed(1)} cm` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 11: Frame Index */}
        <div className="glass-card flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-800 text-slate-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Frame Index</div>
            <div className="text-base font-bold text-slate-200 mt-0.5 font-mono">
              {isConnected ? data.frameIndex : 'N/A'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
