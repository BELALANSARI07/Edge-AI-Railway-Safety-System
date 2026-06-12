import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_STATUS_API_URL || './status.json';
const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS, 10) || 1000;

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [events, setEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    totalAlerts: 0,
    lastAlertTime: ''
  });

  const lastTimestampRef = useRef('');
  const failedPollsCountRef = useRef(0);
  const lastTrainStateRef = useRef('');
  const lastObjectRef = useRef('');
  const lastDistanceSafeRef = useRef(true);

  // Trigger Toasts Helper
  const triggerToast = (message, type) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, risk: type }]); // using risk field for toast style compatibility
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Polling logic for status.json
  useEffect(() => {
    if (!pollingActive) {
      setIsConnected(false);
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`HTTP Error Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Successful poll
        setIsConnected(true);
        failedPollsCountRef.current = 0;
        setTelemetry(data);

        // Process new event ticks based on timestamp change
        const currentTimestamp = data?.timestamp || '';
        if (currentTimestamp !== lastTimestampRef.current) {
          lastTimestampRef.current = currentTimestamp;

          // Standardize object detection check
          const primaryObject = String(data?.object_detected || data?.object || 'NONE');
          const hasObject = (primaryObject || 'NONE').toUpperCase() !== 'NONE';
          const isOnTrack = data?.track_status === 'ON TRACK';
          const isUnsafeDistance = data?.distance_safe === false;
          const isEmergencyBrake = data?.emergency_brake === true;
          
          // Risk levels aligned with backend: HIGH = STOP OR emergency OR (on track + unsafe distance)
          const isHighRisk = data?.train_state === 'STOP' || isEmergencyBrake || (isOnTrack && isUnsafeDistance);
          const isMediumRisk = isOnTrack && hasObject && !isHighRisk;
          const riskLevel = isHighRisk ? 'HIGH' : (isMediumRisk ? 'MEDIUM' : 'LOW');

          // Update summary metrics
          setStats(prev => ({
            totalDetections: hasObject ? prev.totalDetections + 1 : prev.totalDetections,
            totalAlerts: (isHighRisk || isMediumRisk) ? prev.totalAlerts + 1 : prev.totalAlerts,
            lastAlertTime: (isHighRisk || isMediumRisk) ? currentTimestamp : prev.lastAlertTime
          }));

          // Add to event log
          const newEvent = {
            id: currentTimestamp + Math.random(),
            timestamp: currentTimestamp,
            object: primaryObject,
            distance: data?.distance_cm || 0,
            risk: riskLevel,
            decision: data?.train_state || 'UNKNOWN',
            stopReason: data?.stop_reason || ''
          };
          
          setEvents(prev => {
            const list = [newEvent, ...prev];
            return list.slice(0, 50); // Buffer up to 50 items
          });

          // State change toasts
          if (data?.train_state === 'STOP') {
            if (lastTrainStateRef.current !== 'STOP' || lastObjectRef.current !== primaryObject) {
              triggerToast(`CRITICAL STOP: Train halted! Reason: ${data?.stop_reason || 'Emergency Condition'}`, 'HIGH');
            }
          }

          if (isEmergencyBrake && lastDistanceSafeRef.current !== false) {
            triggerToast(`EMERGENCY BRAKE TRIGGERED: Hardware emergency stop activated!`, 'HIGH');
          }

          if (isOnTrack && isUnsafeDistance && lastDistanceSafeRef.current !== false) {
            triggerToast(`SAFETY BREACH: Object on track at ${data?.distance_cm?.toFixed(1) || 0} cm (threshold: 70 cm)`, 'HIGH');
          }

          if (isOnTrack && hasObject && !isHighRisk && lastObjectRef.current !== primaryObject) {
            triggerToast(`OBJECT DETECTED ON TRACK: "${(primaryObject || 'NONE').toUpperCase()}" at ${data?.distance_cm?.toFixed(1) || 0} cm`, 'MEDIUM');
          }

          if (!isOnTrack && lastDistanceSafeRef.current === false) {
            triggerToast("SYSTEM SECURED: Object cleared from track, safe distance restored.", 'LOW');
          }

          // Update tracking refs
          lastTrainStateRef.current = data?.train_state || '';
          lastObjectRef.current = primaryObject;
          lastDistanceSafeRef.current = data?.distance_safe !== false;
        }
      } catch (err) {
        failedPollsCountRef.current += 1;
        if (failedPollsCountRef.current >= 2) {
          setIsConnected(false);
          setTelemetry(null);
        }
        console.error("Telemetry Poll Failure:", err.message);
      }
    };

    pollStatus(); // Initial fetch
    const interval = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollingActive]);

  const clearLogs = () => {
    setEvents([]);
    setStats({
      totalDetections: 0,
      totalAlerts: 0,
      lastAlertTime: ''
    });
  };

  return {
    telemetry,
    isConnected,
    pollingActive,
    setPollingActive,
    events,
    stats,
    toasts,
    setToasts,
    clearLogs
  };
}
