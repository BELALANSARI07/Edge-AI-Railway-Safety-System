import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statusFilePath = path.join(__dirname, 'public', 'status.json');

// Ensure the directory exists
const dir = path.dirname(statusFilePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log("==========================================================");
console.log("     LIVE AI RAILWAY SYSTEM SIMULATOR (V3.0) RUNNING       ");
console.log(`Writing updates to: ${statusFilePath}`);
console.log("Press Ctrl+C to terminate simulator.");
console.log("==========================================================");

// Formatter for timestamps (yyyy-MM-dd HH:mm:ss)
const getFormattedTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Defined test scenarios matching the ESP32 / Edge AI device states
const scenarios = [
  // Scenario 0: Clear tracks, completely safe
  {
    name: "Safe Tracks (No Hazards)",
    duration: 10, // seconds
    generator: (tick) => ({
      train_state: "RUN",
      distance_cm: 150.0,
      detection_count: 0,
      object: "NONE",
      track_status: "ON TRACK",
      esp32_status: "CONNECTED",
      camera_status: "CONNECTED",
      stop_reason: "",
      stop_latched: false,
      object_detected: "NONE",
      detection_max: 5,
      track_memory: 10,
      distance_safe: true,
      distance_thresh: 70.0,
      emergency_brake: false,
      frame_index: 3800 + tick
    })
  },
  // Scenario 1: Worker near tracks (Caution)
  {
    name: "Track Maintenance Crew (Caution)",
    duration: 8,
    generator: (tick) => {
      const distance = Math.max(72.0, 110.0 - tick * 5);
      const hits = Math.min(3, tick + 1);
      return {
        train_state: "SLOW",
        distance_cm: parseFloat(distance.toFixed(2)),
        detection_count: hits,
        object: "NONE",
        track_status: "WARNING",
        esp32_status: "CONNECTED",
        camera_status: "CONNECTED",
        stop_reason: "PERSON NEAR RAIL ZONE",
        stop_latched: false,
        object_detected: "person",
        detection_max: 5,
        track_memory: 10,
        distance_safe: true,
        distance_thresh: 70.0,
        emergency_brake: false,
        frame_index: 3900 + tick
      };
    }
  },
  // Scenario 2: Hazard cleared, safe
  {
    name: "Crew Stepped Aside (Safe)",
    duration: 5,
    generator: (tick) => ({
      train_state: "RUN",
      distance_cm: 135.0,
      detection_count: 0,
      object: "NONE",
      track_status: "ON TRACK",
      esp32_status: "CONNECTED",
      camera_status: "CONNECTED",
      stop_reason: "",
      stop_latched: false,
      object_detected: "NONE",
      detection_max: 5,
      track_memory: 10,
      distance_safe: true,
      distance_thresh: 70.0,
      emergency_brake: false,
      frame_index: 4000 + tick
    })
  },
  // Scenario 3: Stopped vehicle on crossing (Emergency STOP)
  {
    name: "Vehicle Stalled on Crossing (EMERGENCY)",
    duration: 10,
    generator: (tick) => {
      const distance = Math.max(29.8, 65.0 - tick * 4);
      const isUnsafe = distance < 70.0;
      return {
        train_state: "STOP",
        distance_cm: parseFloat(distance.toFixed(2)),
        detection_count: 5,
        object: "NONE",
        track_status: "OBSTRUCTED",
        esp32_status: "CONNECTED",
        camera_status: "CONNECTED",
        stop_reason: `VEHICLE ON TRACK · ${distance.toFixed(1)}cm`,
        stop_latched: true,
        object_detected: "vehicle",
        detection_max: 5,
        track_memory: 10,
        distance_safe: !isUnsafe,
        distance_thresh: 70.0,
        emergency_brake: isUnsafe,
        frame_index: 4100 + tick
      };
    }
  },
  // Scenario 4: Pedestrian on rails (Emergency STOP)
  {
    name: "Pedestrian Running on Rails (EMERGENCY)",
    duration: 8,
    generator: (tick) => {
      const distance = Math.max(15.5, 45.0 - tick * 3.5);
      const isUnsafe = distance < 70.0;
      return {
        train_state: "STOP",
        distance_cm: parseFloat(distance.toFixed(2)),
        detection_count: 5,
        object: "NONE",
        track_status: "OBSTRUCTED",
        esp32_status: "CONNECTED",
        camera_status: "CONNECTED",
        stop_reason: `PERSON ON TRACK · ${distance.toFixed(1)}cm`,
        stop_latched: true,
        object_detected: "person",
        detection_max: 5,
        track_memory: 10,
        distance_safe: !isUnsafe,
        distance_thresh: 70.0,
        emergency_brake: isUnsafe,
        frame_index: 4200 + tick
      };
    }
  },
  // Scenario 5: Recovery and Clear tracks
  {
    name: "Tracks Restored (Safe)",
    duration: 7,
    generator: (tick) => ({
      train_state: "RUN",
      distance_cm: 145.0,
      detection_count: 0,
      object: "NONE",
      track_status: "ON TRACK",
      esp32_status: "CONNECTED",
      camera_status: "CONNECTED",
      stop_reason: "",
      stop_latched: false,
      object_detected: "NONE",
      detection_max: 5,
      track_memory: 10,
      distance_safe: true,
      distance_thresh: 70.0,
      emergency_brake: false,
      frame_index: 4300 + tick
    })
  }
];

let currentScenarioIdx = 0;
let currentTick = 0;

function updateStatus() {
  const scenario = scenarios[currentScenarioIdx];
  
  // Create status object
  const telemetry = scenario.generator(currentTick);
  telemetry.timestamp = getFormattedTimestamp();

  // Print current status to CLI
  const padding = " ".repeat(Math.max(1, 40 - scenario.name.length));
  console.log(`[${new Date().toLocaleTimeString()}] Active: ${scenario.name}${padding} | State: ${telemetry.train_state} | Obj: ${telemetry.object_detected} | Dist: ${telemetry.distance_cm}cm | Brake: ${telemetry.emergency_brake}`);

  // Write to status.json
  try {
    fs.writeFileSync(statusFilePath, JSON.stringify(telemetry, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing status.json file:", err.message);
  }

  // Handle ticking & scenario rollover
  currentTick++;
  if (currentTick >= scenario.duration) {
    currentTick = 0;
    currentScenarioIdx = (currentScenarioIdx + 1) % scenarios.length;
    console.log("--------------------------------------------------------------------------------------------------");
  }
}

// Write the first tick immediately, then start interval
updateStatus();
setInterval(updateStatus, 1000);
