"""
AI-Based Railway Safety System
================================
Stack : YOLOv8n · OpenCV · Requests · ESP32 · HC-SR04 · IP Webcam
Author: Generated for Belal's Edge-AI Railway Hazard Detection Project
"""

import cv2
import json
import logging
import time
import threading
from datetime import datetime
from pathlib import Path
import os

import numpy as np
import requests
from ultralytics import YOLO

# ──────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────

ESP32_IP    = "192.168.29.207"
CAMERA_URL  = "http://192.168.29.33:8080/video"

ESP32_STOP_URL     = f"http://{ESP32_IP}/stop"
ESP32_GO_URL       = f"http://{ESP32_IP}/go"
ESP32_DISTANCE_URL = f"http://{ESP32_IP}/distance"
ESP32_PING_URL     = f"http://{ESP32_IP}/"
ESP32_STATUS_URL   = f"http://{ESP32_IP}/status"    # returns emergencyStop state

YOLO_EVERY_N_FRAMES     = 5       # run YOLO once every N frames
DISTANCE_EVERY_N_FRAMES = 20      # fetch ultrasonic every N frames
JSON_WRITE_INTERVAL_SEC = 0.5     # status.json write interval

YOLO_IMGSZ      = 256
YOLO_CONF       = 0.5
DISTANCE_THRESH = 70.0            # cm — below this = danger
STOP_THRESHOLD  = 5               # YOLO cycles before STOP
TRACK_MEMORY    = 10              # frames of on-track memory

ALLOWED_CLASSES = {
    "person", "dog", "cat", "cow", "horse",
    "car", "truck", "bus", "motorcycle", "bicycle",
}

STATUS_JSON_PATHS = (
    Path("front_end/public/status.json"),
    Path("status.json"),
)
EVENT_LOG_PATH      = Path("events.log")
INCIDENT_IMAGE_PATH = Path("last_incident.jpg")

ESP32_TIMEOUT = 1.5   # seconds for each HTTP request to ESP32

# ──────────────────────────────────────────────
# LOGGING
# ──────────────────────────────────────────────

logging.basicConfig(
    filename=str(EVENT_LOG_PATH),
    level=logging.INFO,
    format="%(asctime)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

def log_event(message: str) -> None:
    """Log only critical events (STOP, EMERGENCY, RECONNECT, RESET) - no verbose logging."""
    if any(keyword in message for keyword in ['STOP', 'EMERGENCY', 'RECONNECT', 'RESET', 'ERROR']):
        logging.info(message)


# ──────────────────────────────────────────────
# ESP32 COMMUNICATION  (non-blocking, fire-and-forget)
# ──────────────────────────────────────────────

def _fetch(url: str) -> str | None:
    """GET url, return text or None on failure."""
    try:
        r = requests.get(url, timeout=ESP32_TIMEOUT)
        r.raise_for_status()
        return r.text.strip()
    except Exception:
        return None


def send_command(url: str) -> None:
    """Send ESP32 command in a daemon thread so it never blocks the main loop."""
    threading.Thread(target=_fetch, args=(url,), daemon=True).start()


def fetch_distance() -> tuple[float | None, str]:
    """
    Returns (distance_cm, esp32_status).
    esp32_status: "CONNECTED" | "DISCONNECTED"
    """
    text = _fetch(ESP32_DISTANCE_URL)
    if text is None:
        return None, "DISCONNECTED"
    try:
        return float(text), "CONNECTED"
    except ValueError:
        return None, "DISCONNECTED"


def fetch_esp32_status() -> dict | None:
    """
    Fetch /status from ESP32.
    Returns dict like {"emergencyStop": true, "stopCommand": false}
    or None if unreachable.
    """
    text = _fetch(ESP32_STATUS_URL)
    if text is None:
        return None
    try:
        return json.loads(text)
    except Exception:
        return None


def ping_esp32() -> bool:
    """Returns True if ESP32 root endpoint responds correctly."""
    text = _fetch(ESP32_PING_URL)
    return text is not None and "Railway Safety" in text



# ──────────────────────────────────────────────

def bbox_on_track(x1: int, y1: int, x2: int, y2: int,
                  polygon: np.ndarray) -> bool:
    """
    Sample multiple points from the bottom half of the bounding box.
    If ANY sample point falls inside the track polygon → ON TRACK.
    Bottom-half sampling avoids false positives from distant upper torso.
    """
    mid_y  = (y1 + y2) // 2
    bot_y  = y2
    mid_x  = (x1 + x2) // 2
    q1_y   = (mid_y + bot_y) // 2          # 75 % down the box

    sample_points = [
        (x1,   bot_y),   # bottom-left
        (x2,   bot_y),   # bottom-right
        (mid_x, bot_y),  # bottom-centre
        (mid_x, q1_y),   # lower-mid-centre
        (mid_x, mid_y),  # mid-centre
    ]

    for pt in sample_points:
        if cv2.pointPolygonTest(polygon, (float(pt[0]), float(pt[1])), False) >= 0:
            return True
    return False


# ──────────────────────────────────────────────
# STATUS JSON WRITER  (background thread)
# ──────────────────────────────────────────────

class StatusWriter:
    """Writes status.json every 0.5 s from a shared state dict."""

    def __init__(self, state: dict) -> None:
        self._state = state
        self._lock  = threading.Lock()
        self._stop  = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def update(self, **kwargs) -> None:
        with self._lock:
            self._state.update(kwargs)

    def _run(self) -> None:
        while not self._stop.is_set():
            with self._lock:
                snapshot = dict(self._state)
            snapshot["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            try:
                payload = json.dumps(snapshot, indent=2)
                for status_path in STATUS_JSON_PATHS:
                    status_path.write_text(payload, encoding="utf-8")
            except OSError:
                pass
            time.sleep(JSON_WRITE_INTERVAL_SEC)

    def stop(self) -> None:
        self._stop.set()


# ──────────────────────────────────────────────
# OVERLAY DRAWING
# ──────────────────────────────────────────────

FONT       = cv2.FONT_HERSHEY_SIMPLEX
CLR_GREEN  = (0, 255, 0)
CLR_RED    = (0, 0, 255)
CLR_YELLOW = (0, 220, 255)
CLR_WHITE  = (255, 255, 255)
CLR_CYAN   = (255, 220, 0)


def draw_overlay(frame: np.ndarray, info: dict) -> None:
    """Draw HUD on frame (mutates frame in place)."""
    state     = info["train_state"]
    dist      = info["distance_cm"]
    count     = info["detection_count"]
    obj       = info["object"]
    track_st  = info["track_status"]
    esp_st    = info["esp32_status"]
    reason    = info["stop_reason"]
    memory    = info["track_memory"]
    emg_brake = info.get("emergency_brake", False)

    state_clr = CLR_RED if state == "STOP" else CLR_GREEN
    track_clr = CLR_RED if track_st == "ON TRACK" else CLR_GREEN
    esp_clr   = CLR_GREEN if esp_st == "CONNECTED" else CLR_RED

    dist_str = f"{dist:.1f} cm" if dist is not None else "N/A"

    lines = [
        (f"STATE   : {state}",                  state_clr),
        (f"DISTANCE: {dist_str}",               CLR_YELLOW),
        (f"COUNT   : {count}/{STOP_THRESHOLD}", CLR_WHITE),
        (f"OBJECT  : {obj.upper()}",            CLR_WHITE),
        (f"TRACK   : {track_st}",               track_clr),
        (f"ESP32   : {esp_st}",                 esp_clr),
        (f"REASON  : {reason}",                 CLR_WHITE),
        (f"MEMORY  : {memory}",                 CLR_CYAN),
    ]

    x, y0, dy = 10, 30, 30
    for text, color in lines:
        cv2.putText(frame, text, (x, y0), FONT, 0.65, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(frame, text, (x, y0), FONT, 0.65, color,     1, cv2.LINE_AA)
        y0 += dy

    # ── Emergency brake banner (centred, blinking, hard to miss) ─
    if emg_brake:
        fh, fw = frame.shape[:2]
        banner  = "!! EMERGENCY BRAKE !!"
        scale, thick = 1.3, 3
        (tw, th), _ = cv2.getTextSize(banner, FONT, scale, thick)
        bx = (fw - tw) // 2
        by = fh // 2
        pad = 16
        # Filled dark-red box
        cv2.rectangle(frame,
                      (bx - pad,      by - th - pad),
                      (bx + tw + pad, by + pad),
                      (0, 0, 120), cv2.FILLED)
        cv2.rectangle(frame,
                      (bx - pad,      by - th - pad),
                      (bx + tw + pad, by + pad),
                      CLR_RED, 2)
        # Blink: text visible only on even seconds
        if int(time.time()) % 2 == 0:
            cv2.putText(frame, banner, (bx, by),
                        FONT, scale, (0, 0, 0), thick + 2, cv2.LINE_AA)
            cv2.putText(frame, banner, (bx, by),
                        FONT, scale, CLR_RED,   thick,     cv2.LINE_AA)

    # Timestamp bottom-left
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, ts, (10, frame.shape[0] - 10),
                FONT, 0.45, (180, 180, 180), 1, cv2.LINE_AA)


def draw_detections(frame: np.ndarray,
                    detections: list[dict],
                    polygon: np.ndarray) -> None:
    """Draw track polygon and bounding boxes."""
    # Track polygon (semi-transparent fill)
    overlay = frame.copy()
    cv2.fillPoly(overlay, [polygon], (0, 60, 0))
    cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
    cv2.polylines(frame, [polygon], True, CLR_GREEN, 2)

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        on_track = det["on_track"]
        label    = det["label"].upper()
        color    = CLR_RED if on_track else CLR_YELLOW
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, label, (x1, max(y1 - 6, 0)),
                    FONT, 0.55, color, 2, cv2.LINE_AA)


# ──────────────────────────────────────────────
# DEMO MODE (Synthetic Frame Generator)
# ──────────────────────────────────────────────

class DemoFrameGenerator:
    """Generates synthetic frames for testing without hardware."""
    
    def __init__(self, width: int = 640, height: int = 480):
        self.width = width
        self.height = height
        self.frame_count = 0
    
    def generate_frame(self) -> np.ndarray:
        """Create a synthetic frame with optional detection overlay."""
        frame = np.ones((self.height, self.width, 3), dtype=np.uint8) * 50  # Dark background
        
        # Draw track polygon
        track_polygon = np.array([
            (int(self.width * 0.30), self.height),
            (int(self.width * 0.70), self.height),
            (int(self.width * 0.58), int(self.height * 0.40)),
            (int(self.width * 0.42), int(self.height * 0.40)),
        ], dtype=np.int32)
        
        overlay = frame.copy()
        cv2.fillPoly(overlay, [track_polygon], (0, 100, 0))
        cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
        cv2.polylines(frame, [track_polygon], True, (0, 255, 0), 2)
        
        # Draw some text
        cv2.putText(frame, "DEMO MODE - No Camera", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 165, 255), 2)
        cv2.putText(frame, f"Frame: {self.frame_count}", (20, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
        
        # Occasionally add a mock detection
        if self.frame_count % 60 == 0:  # Every 60 frames, show a mock person
            x1, y1, x2, y2 = 250, 200, 390, 420
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(frame, "PERSON", (x1, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        self.frame_count += 1
        return frame


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main() -> None:  # noqa: C901  (complexity expected for a control loop)
    print("[INFO] Loading YOLOv8n model …")
    model = YOLO("yolov8n.pt")

    # Map YOLO class index → name for fast lookup
    yolo_names: dict[int, str] = model.names   # {0: 'person', 1: 'bicycle', …}

    startup_writer = StatusWriter({
        "train_state": "GO",
        "distance_cm": None,
        "detection_count": 0,
        "object": "NONE",
        "object_detected": "NONE",
        "track_status": "OFF TRACK",
        "esp32_status": "DISCONNECTED",
        "camera_status": "CONNECTING",
        "stop_reason": "NONE",
        "stop_latched": False,
        "detection_max": STOP_THRESHOLD,
        "track_memory": 0,
        "distance_safe": True,
        "distance_thresh": DISTANCE_THRESH,
        "emergency_brake": False,
        "frame_index": 0,
    })

    print("[INFO] Opening camera …")
    cap = cv2.VideoCapture()
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
    cap.open(CAMERA_URL)
    demo_mode = False
    demo_gen = None
    
    if not cap.isOpened():
        print(f"[WARN] Cannot open camera at {CAMERA_URL}")
        print(f"[INFO] Entering DEMO MODE with synthetic frames...")
        demo_mode = True
        demo_gen = DemoFrameGenerator(640, 480)
    else:
        print("[INFO] Using IP camera stream.")

    # ── Shared mutable state ──────────────────
    train_state     : str         = "GO"   # "GO" | "STOP"
    distance_cm     : float | None = None
    esp32_status    : str         = "DISCONNECTED"
    camera_status   : str         = "DEMO" if demo_mode else "CONNECTED"

    detection_count : int  = 0    # persistent counter (goes up/down)
    track_memory    : int  = 0    # frames of on-track persistence
    stop_latched    : bool = False

    last_detections : list[dict] = []
    last_object     : str        = "NONE"
    last_track_st   : str        = "OFF TRACK"
    stop_reason     : str        = "NONE"

    frame_idx            : int   = 0
    last_json_time       : float = 0.0
    prev_esp32_connected : bool  = False
    emergency_brake      : bool  = False   # ESP32 hardware emergency stop

    # ── Status writer ─────────────────────────
    shared_state = {
        "train_state":     train_state,
        "distance_cm":     distance_cm,
        "detection_count": detection_count,
        "object":          last_object,
        "track_status":    last_track_st,
        "esp32_status":    esp32_status,
        "camera_status":   camera_status,
        "stop_reason":     stop_reason,
        "timestamp":       "",
    }
    startup_writer.stop()
    writer = StatusWriter(shared_state)

    mode_str = "[DEMO MODE]" if demo_mode else "[LIVE MODE]"
    print(f"{mode_str} System running.  ESC=exit  G=go  R=reset")

    while True:
        if demo_mode:
            frame = demo_gen.generate_frame()
            ret = True
        else:
            ret, frame = cap.read()
        
        if not ret:
            camera_status = "DISCONNECTED"
            writer.update(camera_status=camera_status)
            print("[WARN] Frame grab failed, retrying …")
            time.sleep(0.05)
            continue
        camera_status = "CONNECTED"

        h, w = frame.shape[:2]

        # ── Build track polygon for this frame size ───────────
        track_polygon = np.array([
            (int(w * 0.30), h),
            (int(w * 0.70), h),
            (int(w * 0.58), int(h * 0.40)),
            (int(w * 0.42), int(h * 0.40)),
        ], dtype=np.int32)

        # ── Fetch ultrasonic + ESP32 status every N frames ────
        if frame_idx % DISTANCE_EVERY_N_FRAMES == 0:
            distance_cm, esp32_status = fetch_distance()
            currently_connected = (esp32_status == "CONNECTED")

            # ── Read emergency brake state from ESP32 ─────────
            if currently_connected:
                esp_st = fetch_esp32_status()
                if esp_st is not None:
                    was_emergency = emergency_brake
                    emergency_brake = esp_st.get("emergencyStop", False)

                    # Log when emergency brake first fires
                    if emergency_brake and not was_emergency:
                        stop_reason = f"EMERGENCY BRAKE · {distance_cm:.1f}cm" \
                                      if distance_cm else "EMERGENCY BRAKE"
                        train_state = "STOP"  # Set to STOP immediately on emergency brake
                        # Force immediate JSON update
                        writer.update(
                            train_state=train_state,
                            stop_reason=stop_reason,
                            emergency_brake=emergency_brake,
                        )
                        log_event(
                            f"EMERGENCY BRAKE | distance={distance_cm}cm"
                        )
                        print(f"[EMERGENCY BRAKE] Hardware stop triggered")

                    # Clear emergency reason when it clears
                    if not emergency_brake and was_emergency:
                        if stop_reason.startswith("EMERGENCY BRAKE"):
                            stop_reason = "NONE"
                            # Force immediate JSON update when emergency clears
                            writer.update(
                                stop_reason=stop_reason,
                                emergency_brake=False,
                            )

            # ── Reconnect detection ───────────────────────────
            if currently_connected and not prev_esp32_connected:
                resync_url = ESP32_STOP_URL if stop_latched else ESP32_GO_URL
                send_command(resync_url)
                distance_cm = None
                emergency_brake = False
                # Force JSON update on reconnect
                writer.update(
                    distance_cm=distance_cm,
                    emergency_brake=False,
                    esp32_status=esp32_status,
                )
                log_event(
                    f"ESP32 RECONNECTED | resynced with "
                    f"{'STOP' if stop_latched else 'GO'}"
                )
                print(
                    f"[RECONNECT] ESP32 back online — "
                    f"sent {'STOP' if stop_latched else 'GO'}"
                )

            prev_esp32_connected = currently_connected

        # ── YOLO inference every N frames ─────────────────────
        any_on_track_this_cycle = False

        if frame_idx % YOLO_EVERY_N_FRAMES == 0:
            results = model(frame, imgsz=YOLO_IMGSZ, conf=YOLO_CONF, verbose=False)
            last_detections = []

            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                label  = yolo_names.get(cls_id, "")
                if label not in ALLOWED_CLASSES:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                on_track = bbox_on_track(x1, y1, x2, y2, track_polygon)

                last_detections.append({
                    "label":    label,
                    "bbox":     (x1, y1, x2, y2),
                    "on_track": on_track,
                })

                if on_track:
                    any_on_track_this_cycle = True
                    last_object = label

            # Update track memory
            if any_on_track_this_cycle:
                track_memory = TRACK_MEMORY
            else:
                track_memory = max(0, track_memory - 1)

            stable_on_track = track_memory > 0
            last_track_st   = "ON TRACK" if stable_on_track else "OFF TRACK"

            # Update last_object when nothing on track
            if not stable_on_track:
                last_object = "NONE"

            # ── Persistent counter logic ──────────────────────
            if not stop_latched:
                dist_ok = (distance_cm is not None and distance_cm < DISTANCE_THRESH)
                if stable_on_track and dist_ok:
                    detection_count = min(detection_count + 1, STOP_THRESHOLD)
                else:
                    detection_count = max(detection_count - 1, 0)

                if detection_count >= STOP_THRESHOLD:
                    # STOP condition met
                    stop_latched = True
                    train_state  = "STOP"
                    stop_reason  = f"{last_object.upper()} ON TRACK · {distance_cm:.1f}cm"
                    send_command(ESP32_STOP_URL)

                    # Force immediate JSON update on STOP
                    writer.update(
                        train_state=train_state,
                        stop_latched=stop_latched,
                        stop_reason=stop_reason,
                    )

                    # Save single incident image (overwrite)
                    cv2.imwrite(str(INCIDENT_IMAGE_PATH), frame)

                    # Log critical event
                    log_event(
                        f"STOP | object={last_object} | "
                        f"distance={distance_cm:.1f}cm | "
                        f"reason={stop_reason}"
                    )
                    print(f"[STOP] {stop_reason}")
        else:
            # Non-YOLO frame: decay track_memory by 1 each frame for smoother behaviour
            track_memory = max(0, track_memory - 1)

        # ── Draw ──────────────────────────────────────────────
        draw_detections(frame, last_detections, track_polygon)

        hud_info = {
            "train_state":     train_state,
            "distance_cm":     distance_cm,
            "detection_count": detection_count,
            "object":          last_object,
            "track_status":    last_track_st,
            "esp32_status":    esp32_status,
            "stop_reason":     stop_reason,
            "track_memory":    track_memory,
            "emergency_brake": emergency_brake,
        }
        draw_overlay(frame, hud_info)
        cv2.imshow("Railway Safety System", frame)

        # ── status.json (rate-limited, writer thread handles interval) ──
        # (StatusWriter handles its own timing; just push latest state)
        now = time.time()
        if now - last_json_time >= JSON_WRITE_INTERVAL_SEC:
            writer.update(
                # ── Train ──────────────────────
                train_state      = train_state,
                stop_latched     = stop_latched,
                stop_reason      = stop_reason,
                # ── Detection ──────────────────
                object_detected  = last_object,
                track_status     = last_track_st,
                detection_count  = detection_count,
                detection_max    = STOP_THRESHOLD,
                track_memory     = track_memory,
                # ── Sensor ─────────────────────
                distance_cm      = distance_cm,
                distance_safe    = (distance_cm is None or distance_cm >= DISTANCE_THRESH),
                distance_thresh  = DISTANCE_THRESH,
                # ── Hardware ───────────────────
                emergency_brake  = emergency_brake,
                esp32_status     = esp32_status,
                camera_status    = camera_status,
                # ── Meta ───────────────────────
                frame_index      = frame_idx,
            )
            last_json_time = now

        # ── Keyboard controls ─────────────────────────────────
        key = cv2.waitKey(1) & 0xFF

        if key == 27:           # ESC → exit
            break

        elif key == ord('g') or key == ord('G'):
            if stop_latched:
                stop_latched    = False
                train_state     = "GO"
                stop_reason     = "NONE"
                detection_count = 0
                track_memory    = 0
                send_command(ESP32_GO_URL)
                # Force immediate JSON update on state change
                writer.update(
                    train_state=train_state,
                    stop_latched=stop_latched,
                    stop_reason=stop_reason,
                    detection_count=detection_count,
                    track_memory=track_memory,
                )
                print("[GO] Manual resume — /go sent to ESP32")
            else:
                print("[INFO] Train already moving.")

        elif key == ord('r') or key == ord('R'):
            # Full system restart — wipe all state, resume train
            stop_latched         = False
            train_state          = "GO"
            stop_reason          = "NONE"
            detection_count      = 0
            track_memory         = 0
            distance_cm          = None
            last_object          = "NONE"
            last_track_st        = "OFF TRACK"
            last_detections      = []
            prev_esp32_connected = False   # force resync check next poll
            send_command(ESP32_GO_URL)
            log_event("FULL RESET by user — /go sent to ESP32")
            print("[RESET] Full system reset — /go sent to ESP32")

        frame_idx += 1

    # ── Cleanup ───────────────────────────────────────────────
    writer.stop()
    if not demo_mode:
        cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Shutdown complete.")


if __name__ == "__main__":
    main()
