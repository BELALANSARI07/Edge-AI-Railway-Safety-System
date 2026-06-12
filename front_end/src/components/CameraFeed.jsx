import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Maximize, Minimize, Settings, ShieldAlert, Wifi } from 'lucide-react';

export default function CameraFeed({ telemetry = {}, isConnected }) {
  const [streamUrl, setStreamUrl] = useState(() => {
    return localStorage.getItem('rail_camera_url') || import.meta.env.VITE_DEFAULT_CAMERA_URL || '';
  });
  const [tempUrl, setTempUrl] = useState(streamUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Sync URLs
  useEffect(() => {
    setTempUrl(streamUrl);
    setImageError(false);
    if (streamUrl) {
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
    }
  }, [streamUrl]);

  // Handle URL Save
  const handleSaveUrl = (e) => {
    e.preventDefault();
    localStorage.setItem('rail_camera_url', tempUrl);
    setStreamUrl(tempUrl);
    setShowSettings(false);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen for fullscreen change events (e.g. Escape key pressed)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // HTML5 Canvas Simulator for Railway Track & AI Bounding Boxes
  useEffect(() => {
    if (!isSimulating || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const render = () => {
      frame++;
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0f172a'); // slate-900
      bgGrad.addColorStop(1, '#020617'); // slate-950
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw Grid perspective lines (scanning floor effect)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)'; // slate-700
      ctx.lineWidth = 1;
      const horizonY = h * 0.45;
      const tracksVanishingX = w / 2;

      // Draw horizontal reference grid lines
      for (let i = 0; i < 15; i++) {
        const y = horizonY + (h - horizonY) * Math.pow(i / 15, 2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw longitudinal grid lines
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(tracksVanishingX + (i * w * 0.05), horizonY);
        ctx.lineTo(tracksVanishingX + (i * w * 0.4), h);
        ctx.stroke();
      }

      // Draw Railway tracks
      ctx.strokeStyle = '#475569'; // slate-600
      ctx.lineWidth = 3;
      
      const trackLeftStartX = tracksVanishingX - w * 0.08;
      const trackRightStartX = tracksVanishingX + w * 0.08;
      const trackLeftEndX = tracksVanishingX - w * 0.35;
      const trackRightEndX = tracksVanishingX + w * 0.35;

      // Draw Sleepers (wooden planks connecting tracks)
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 5;
      const sleeperCount = 10;
      // If STOP state is active, halt sleepers movement
      const speed = telemetry?.train_state === 'STOP' ? 0 : 0.5;
      const offset = (frame * speed) % 1;

      for (let i = 0; i < sleeperCount; i++) {
        const progress = (i + offset) / sleeperCount;
        const y = horizonY + (h - horizonY) * Math.pow(progress, 2.5);
        const scale = progress;
        
        const sleeperLeftX = tracksVanishingX - (w * 0.08) * (1 - scale) - (w * 0.35) * scale;
        const sleeperRightX = tracksVanishingX + (w * 0.08) * (1 - scale) + (w * 0.35) * scale;
        
        ctx.beginPath();
        ctx.moveTo(sleeperLeftX, y);
        ctx.lineTo(sleeperRightX, y);
        ctx.stroke();
      }

      // Draw Left/Right Rails
      ctx.strokeStyle = '#64748b'; // slate-500
      ctx.lineWidth = 6;
      
      ctx.beginPath();
      ctx.moveTo(trackLeftStartX, horizonY);
      ctx.lineTo(trackLeftEndX, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(trackRightStartX, horizonY);
      ctx.lineTo(trackRightEndX, h);
      ctx.stroke();

      // Gleam overlay on tracks
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trackLeftStartX + 1, horizonY);
      ctx.lineTo(trackLeftEndX + 2, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(trackRightStartX - 1, horizonY);
      ctx.lineTo(trackRightEndX - 2, h);
      ctx.stroke();

      // Scanning HUD Line
      const scanY = horizonY + (h - horizonY) * (0.5 + Math.sin(frame * 0.02) * 0.5);
      ctx.strokeStyle = telemetry?.train_state === 'STOP' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();
      // Scan line shadow
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, 'rgba(59, 130, 246, 0)');
      scanGrad.addColorStop(0.5, telemetry?.train_state === 'STOP' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)');
      scanGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, w, 60);

      // AI Obstacle Drawing based on Telemetry
      const objectDetected = String(telemetry?.object_detected || telemetry?.object || 'NONE');
      const hasObject = (objectDetected || 'NONE').toUpperCase() !== 'NONE';

      if (hasObject && isConnected) {
        const objectType = objectDetected;
        const distance = telemetry?.distance_cm || 0;
        
        // Scale coordinate positions based on distance in cm
        const maxDist = 150.0;
        const distClamp = Math.min(maxDist, Math.max(10.0, distance));
        const distProgress = 1 - (distClamp / maxDist); // 0 (far) to 1 (close)
        
        const objectScale = 0.15 + distProgress * 0.65;
        const objY = horizonY + (h - horizonY) * Math.pow(distProgress, 1.8);
        const objX = tracksVanishingX + (Math.sin(frame * 0.01) * w * 0.04) * distProgress;

        const objW = 100 * objectScale;
        const objH = 150 * objectScale;
        const boxX = objX - objW / 2;
        const boxY = objY - objH;

        // Bounding Box Colors
        let color = '#ef4444'; // default red
        let fill = `rgba(239, 68, 68, ${0.1 + Math.abs(Math.sin(frame * 0.1)) * 0.15})`;

        if (telemetry?.distance_safe === true && telemetry?.train_state !== 'STOP') {
          color = '#10b981'; // green if safe
          fill = 'rgba(16, 185, 129, 0.05)';
        } else if (telemetry?.train_state === 'SLOW') {
          color = '#eab308'; // yellow
          fill = 'rgba(234, 179, 8, 0.08)';
        }

        // Draw Bounding Box Corners
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + (telemetry?.train_state === 'STOP' ? 1.5 : 0);
        
        const lineLen = Math.min(20, objW * 0.3);
        
        ctx.beginPath();
        ctx.moveTo(boxX + lineLen, boxY);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX, boxY + lineLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boxX + objW - lineLen, boxY);
        ctx.lineTo(boxX + objW, boxY);
        ctx.lineTo(boxX + objW, boxY + lineLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boxX + lineLen, boxY + objH);
        ctx.lineTo(boxX, boxY + objH);
        ctx.lineTo(boxX, boxY + objH - lineLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boxX + objW - lineLen, boxY + objH);
        ctx.lineTo(boxX + objW, boxY + objH);
        ctx.lineTo(boxX + objW, boxY + objH - lineLen);
        ctx.stroke();

        // Semi-transparent box fill
        ctx.fillStyle = fill;
        ctx.fillRect(boxX, boxY, objW, objH);

        // Bounding Box Label
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(10, 12 * objectScale)}px monospace`;
        const labelText = `${(objectType || 'NONE').toUpperCase()} ${(distance || 0).toFixed(1)}cm`;
        const metrics = ctx.measureText(labelText);
        
        ctx.fillRect(boxX - 1, boxY - (18 * objectScale), metrics.width + 10, 18 * objectScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, boxX + 4, boxY - 4 * objectScale);

        // Dist Indicator Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(boxX + objW / 2, boxY + objH);
        ctx.lineTo(boxX + objW / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ground ellipse
        ctx.fillStyle = fill;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(boxX + objW / 2, boxY + objH, objW / 2, 8 * objectScale, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Lock grid overlay during STOP state
        if (telemetry?.train_state === 'STOP') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.moveTo(0, boxY + objH / 2);
          ctx.lineTo(boxX, boxY + objH / 2);
          ctx.moveTo(w, boxY + objH / 2);
          ctx.lineTo(boxX + objW, boxY + objH / 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 - (frame % 30) / 75})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(boxX + objW / 2, boxY + objH / 2, (frame % 30) * 1.5, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      // Draw HUD stats overlay (AI Cam Metadata)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(15, 15, 215, 85);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.strokeRect(15, 15, 215, 85);

      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '11px monospace';
      ctx.fillText(`SOURCE: ${streamUrl ? 'LIVE IP CAMERA' : 'AI_SIMULATOR_01'}`, 25, 32);
      ctx.fillText(`FRAME IDX: ${telemetry?.frame_index || 0}`, 25, 48);
      ctx.fillText(`ESP32 LINK: ${telemetry?.esp32_status || 'DISCONNECTED'}`, 25, 64);
      ctx.fillText(`TIMECODE: ${telemetry?.timestamp || new Date().toLocaleTimeString()}`, 25, 80);

      // Red recording node on HUD
      ctx.fillStyle = '#ef4444';
      if (frame % 40 < 20) {
        ctx.beginPath();
        ctx.arc(210, 30, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Watermark Text bottom left
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.font = '10px sans-serif';
      ctx.fillText("EDGE AI SAFETY CORE V3.0 // DEEPMIND ANTIGRAVITY", 25, h - 20);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, telemetry, isConnected, streamUrl]);

  const displayObject = String(telemetry?.object_detected || telemetry?.object || 'NONE');

  return (
    <div 
      ref={containerRef}
      className={`glass-heavy rounded-xl overflow-hidden shadow-2xl relative border flex flex-col group transition-all duration-500 ${
        telemetry?.train_state === 'STOP' && isConnected
          ? 'border-red-500 shadow-red-950/20'
          : 'border-slate-800'
      }`}
      style={{ minHeight: '400px' }}
    >
      {/* Title / Info Bar */}
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-slate-800/80 z-10">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Live Stream Feed
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span className="text-[10px] font-mono text-slate-400">
            {streamUrl ? 'IP CAM URL IN USE' : 'AI TARGET SIMULATION ACTIVE'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings Trigger */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-all ${
              showSettings 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Configure Camera Source"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <form 
          onSubmit={handleSaveUrl}
          className="absolute top-[49px] left-0 right-0 bg-slate-950/95 border-b border-slate-800 p-4 z-20 flex flex-col gap-3 transition-all animate-slideDown shadow-xl"
        >
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Configure IP Camera Source
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., http://192.168.1.100:8080/video" 
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="glass-input flex-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-md shadow-blue-500/10"
            >
              Apply Source
            </button>
            {streamUrl && (
              <button 
                type="button"
                onClick={() => {
                  setTempUrl('');
                  setStreamUrl('');
                  localStorage.removeItem('rail_camera_url');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg transition"
              >
                Clear / Reset
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Leave URL blank to run the automated Canvas track simulator.
          </p>
        </form>
      )}

      {/* Main Stream Area */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Connection Loss Overlay */}
        {!isConnected && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10 animate-fade">
            <CameraOff className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wider">Waiting for Camera Connection</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1.5">
              The dashboard is disconnected. Please check status.json or make sure the Edge AI node is online.
            </p>
          </div>
        )}

        {/* Video feed or Canvas simulator */}
        {isSimulating ? (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block min-h-[350px] cursor-pointer"
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center">
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Wifi className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-sm font-semibold">Waiting for Camera Connection</p>
                <p className="text-xs text-slate-500 mt-1">{streamUrl}</p>
                <button
                  onClick={() => setIsSimulating(true)}
                  className="mt-4 text-xs bg-slate-800 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Switch back to Canvas Simulator
                </button>
              </div>
            ) : (
              <img 
                src={streamUrl} 
                alt="Live camera stream feed" 
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* AI Bounding box overlays */}
            {streamUrl && !imageError && (displayObject || 'NONE').toUpperCase() !== 'NONE' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`absolute top-4 right-4 flex items-center space-x-2 px-3 py-1 rounded bg-black/60 border text-xs font-mono font-bold ${
                  telemetry?.train_state === 'STOP' ? 'border-red-500 text-red-500 animate-pulse' : 'border-emerald-500 text-emerald-500'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                  <span>AI DETECT: {(displayObject || 'NONE').toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
