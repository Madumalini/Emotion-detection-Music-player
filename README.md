# EMZY • Emotion Detection Music Player

A full-stack web application that detects user emotions via webcam and recommends music based on the detected emotion.

## 📦 Tech Stack
- **Frontend**: HTML, CSS, JavaScript, EJS templates
- **Backend**: Node.js + Express (server)
- **Emotion Detection API**: Python (Flask) + DeepFace
- **Authentication**: Simple in-memory login (Name + Date of Birth)
- **Camera Access**: Browser WebRTC (getUserMedia)

## ✅ Prerequisites
- Node.js (14+)
- Python (3.8+)
- Python packages: `opencv-python`, `flask`, `pillow`, `numpy`
- (Optional) `deepface` for real webcam emotion recognition; fallback to random emotion when unavailable

## 🚀 Running Locally
1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Python emotion API (runs on port 5001):
   ```bash
   python emotion_api.py
   ```
4. Start the Node.js web server (runs on port 3000):
   ```bash
   npm start
   ```
5. Open in browser:
   - Web app: http://localhost:3000

## 🧠 How It Works
- **Login/Register**: Users register with a name and date of birth (hashed in memory).
- **Emotion Detection**: The browser captures a webcam photo and sends it to the local Python API.
- **Music Recommendation**: Based on the detected emotion, the app displays a set of placeholder songs.

## 📌 Notes
- This project is intended as a demo; user accounts are stored in memory and will reset when the server restarts.
- The emotion detection model is powered by `DeepFace` and may take a few seconds to analyze each photo.

### 🎵 Custom Songs
The app recommends songs based on the detected emotion. To use your own tracks:
1. Place your audio files in `public/songs`.
2. Update the file names in `views/dashboard.ejs` (function `getSongsForEmotion`).

By default, the app expects:
- **Happy** → `public/songs/oorum-blood-unplugged.mp3`
- **Sad** → `public/songs/marana-mass-satisfy.mpeg`

## 🧪 Troubleshooting
- If the app can’t access the camera, ensure your browser is allowed to use the webcam.
- If emotion detection fails, check that the Python API is running on port 5001.

## 📦 Project Structure
- `server.js` – Node/Express server
- `views/` – EJS templates for login/register/dashboard
- `public/` – Static assets (CSS, audio files, etc.)
- `emotion_api.py` – Python Flask API using DeepFace
