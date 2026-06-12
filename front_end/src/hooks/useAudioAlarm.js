import { useState, useEffect, useRef, useCallback } from 'react';

export default function useAudioAlarm(trainState, isConnected) {
  const [isMuted, setIsMuted] = useState(true); // default true due to autoplay browser block
  const lastStateRef = useRef('');

  // Audio synthesizer warning sound using Web Audio API (short industrial alarm)
  const playAlarmSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      // Dual tone oscillator for industrial alarm feel
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, audioCtx.currentTime); // Pitch A
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(600, audioCtx.currentTime); // Pitch B

      // Pulsing alert sequence (short play time of 0.65 seconds)
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.65);
      osc2.stop(audioCtx.currentTime + 0.65);
    } catch (err) {
      console.warn("Web Audio Context not initialized or supported yet.", err);
    }
  }, []);

  // Play audio sound ONLY upon transitioning into a new STOP condition
  useEffect(() => {
    if (isConnected && !isMuted) {
      if (trainState === 'STOP' && lastStateRef.current !== 'STOP') {
        playAlarmSound();
      }
    }
    // Track previous state to determine transitions
    if (isConnected) {
      lastStateRef.current = trainState;
    }
  }, [trainState, isConnected, isMuted, playAlarmSound]);

  return {
    isMuted,
    setIsMuted,
    playAlarmSound
  };
}
