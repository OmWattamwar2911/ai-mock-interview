# 🎙️ Interview Bot – Real-Time AI Interviewer Service

A standalone conversational AI interviewer service built with the **LiveKit Agents framework**. It joins a WebRTC video room with the candidate, conducts the interview in real time using a pipeline of **VAD (Silero) → STT → LLM → TTS**, supports natural interruptions and turn-taking, and posts structured results back to the Rehearse Next.js app.

---

## Architecture

- **Web App (`apps/web`)**: Manages authentication, creates interview sessions, issues short-lived LiveKit participant tokens, and renders the video/audio interface and feedback reports.
- **LiveKit Server (`rehearse-livekit`)**: Docker container running on ports `7880` (WebSocket/HTTP) and `7881`/`7882` (RTC).
- **Interview Bot (`interview-bot/`)**: Standalone Python process running `agent.py`. Listens for room events, queries candidate context (resume, job description, skill gaps) from Next.js, and conducts the interview.

---

## Profiles (Cloud vs. 100% Free Local)

Configure via the `PROFILE` variable in `interview-bot/.env`:

| Component | `PROFILE=cloud` | `PROFILE=local` (Zero Paid APIs) |
|---|---|---|
| **VAD** | Silero VAD (offline) | Silero VAD (offline) |
| **STT** | Deepgram Nova-2 | `faster-whisper` (offline) |
| **LLM** | OpenAI `gpt-4o-mini` | Ollama (`llama3.1` 8B) |
| **TTS** | ElevenLabs / OpenAI TTS | Piper (offline) |

---

## Windows Setup Instructions (Step-by-Step)

### 1. Prerequisites on Windows
1. **Docker Desktop**: Ensure Docker Desktop is installed and running with WSL2 backend.
2. **Python 3.10 or 3.11**: [Download Python for Windows](https://www.python.org/downloads/). Ensure "Add Python to PATH" is checked.
3. **Node.js & pnpm**: Already set up for the monorepo.

---

### 2. Start LiveKit Server & Postgres
From the root of the project:
```powershell
docker compose up -d rehearse-postgres livekit
```
Verify LiveKit is running:
- Open `http://localhost:7880` in your browser (should return `OK` or upgrade response).

---

### 3. Set Up Python Environment for the Bot
Open a new PowerShell terminal and navigate to `interview-bot`:
```powershell
cd interview-bot

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

### 4. Configuration (Choose Cloud or Local)

#### Option A: Cloud Profile (Simplest setup if you have keys)
In `interview-bot/.env`:
```ini
PROFILE=cloud
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
# Optional:
ELEVENLABS_API_KEY=...
```

#### Option B: Local Profile (100% Free & Offline)
1. **Install Ollama**:
   - Download the Windows installer from [ollama.com/download](https://ollama.com/download)
   - Open PowerShell and pull the model:
     ```powershell
     ollama pull llama3.1
     ```
2. **Install faster-whisper**:
   ```powershell
   pip install faster-whisper
   ```
3. In `interview-bot/.env`:
   ```ini
   PROFILE=local
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   WHISPER_MODEL=base
   ```

---

### 5. Health Check
Before starting, run the automated health check:
```powershell
python health_check.py
```
It verifies:
- Core environment variables
- Module imports
- Connection to LiveKit server (`http://localhost:7880`)

---

### 6. Starting Everything

1. **Terminal 1 (Next.js Web App)**:
   ```powershell
   pnpm dev
   ```
   Web app runs at `http://localhost:3000`.

2. **Terminal 2 (Interview Bot)**:
   ```powershell
   cd interview-bot
   .\venv\Scripts\Activate.ps1
   python agent.py dev
   ```

3. **In the Browser**:
   - Navigate to `http://localhost:3000/interview`
   - Click **Start Interview with Aria**
   - Allow camera and microphone access
   - Aria will greet you and begin the conversation!

---

## Bot Turn Behavior & Features
- **Warm Welcome**: Introduces herself, explains the format, confirms readiness.
- **Adaptive Questions**: Questions blend the candidate's actual resume projects, the job requirements, and targeted skill gaps.
- **Follow-ups & Probing**: Natural follow-ups using the STAR method for behavioral answers and technical "how/why" questions.
- **Interruption Handling**: Silero VAD detects candidate voice and pauses speaking immediately.
- **Report Generation**: Emits structured assessment feedback into the database upon interview completion.
