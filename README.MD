# 🚂 Edge-AI Railway Safety System

An AI-powered railway safety system that combines Computer Vision, Edge AI, and Embedded Systems to detect obstacles on railway tracks and automatically trigger emergency stop commands to reduce the risk of accidents.

---

## 📌 Overview

Railway tracks are vulnerable to obstacles such as humans, animals, vehicles, and unexpected objects. Delayed detection of these obstacles can lead to accidents, infrastructure damage, and loss of life.

The **Edge-AI Railway Safety System** uses YOLOv8-based object detection, ultrasonic distance sensing, and ESP32-based train control to provide real-time obstacle monitoring and automated emergency response.

The system continuously monitors the railway corridor, validates obstacle distance, and sends stop commands when a potential hazard is detected.

---

## 🎯 Objectives

* Detect obstacles on railway tracks in real time.
* Identify whether the obstacle is inside the railway corridor.
* Validate obstacle distance using ultrasonic sensing.
* Automatically trigger emergency stop commands.
* Reduce collision risks and minimize accident severity.
* Provide live monitoring and incident logging.

---

## ⚙️ System Architecture

Camera Feed
↓
YOLOv8 Object Detection
↓
Railway Corridor Analysis
↓
Ultrasonic Distance Validation
↓
Decision Engine
↓
ESP32 Controller
↓
Emergency Stop Command

---

## 🛠 Hardware Components

* ESP32 Development Board
* HC-SR04 Ultrasonic Sensor
* L298N Motor Driver
* DC Motors
* Train Prototype
* Mobile Phone Camera (IP Webcam)

---

## 💻 Software Stack

* Python
* OpenCV
* YOLOv8
* NumPy
* Requests
* ESP32 Firmware
* JSON Monitoring System

---

## 🚀 Features

### Real-Time Object Detection

Detects:

* Person
* Dog
* Cat
* Cow
* Horse
* Car
* Truck
* Bus
* Motorcycle
* Bicycle

using YOLOv8.

### Railway Corridor Detection

Uses a track polygon to determine whether a detected object is actually present on the railway track.

### Distance Validation

Uses ultrasonic sensing to validate obstacle proximity and reduce false positives.

### Automatic Emergency Stop

Triggers stop commands automatically when:

* Object is detected
* Object is on track
* Object is within safety distance
* Detection remains consistent across multiple validation cycles

### Event Logging

Records system events and emergency stop actions.

### Frontend Ready

Generates live JSON data for dashboard integration.

---

## 📂 Output Files

### status.json

Provides real-time system status.

Example:

```json
{
  "train_state": "GO",
  "distance_cm": 52.5,
  "detection_count": 3,
  "object": "person",
  "track_status": "ON TRACK",
  "esp32_status": "CONNECTED",
  "camera_status": "CONNECTED",
  "stop_reason": "NONE"
}
```

### events.log

Stores emergency stop events and incident information.

### last_incident.jpg

Stores the most recent incident frame.

---

## 🔄 Working Principle

1. Camera captures live video.
2. YOLOv8 detects objects.
3. System checks whether the object overlaps the railway corridor.
4. Ultrasonic sensor measures obstacle distance.
5. Detection confidence is validated over multiple cycles.
6. Emergency stop command is sent to ESP32.
7. Train enters a safe stop state.
8. Manual restart is required for operation.

---

## 📊 Future Scope

* Railway Track Segmentation
* Multiple Camera Support
* Cloud-Based Monitoring
* GPS Integration
* Predictive Collision Analysis
* Track Defect Detection
* Edge AI Deployment
* Integration with Existing Railway Safety Systems

---

## 🔒 Safety Note

This project is a prototype developed for research, educational, and competition purposes. It is not intended for direct deployment in operational railway environments without extensive testing, validation, and regulatory approval.

---

## 👥 Team

### THE OPTIMIZERS

Developed as part of an AI-driven railway safety initiative focused on improving obstacle detection and accident prevention using Edge AI technologies.

---

## ⭐ Project Goal

To contribute towards safer, smarter, and more reliable railway transportation systems through accessible and intelligent technology.
