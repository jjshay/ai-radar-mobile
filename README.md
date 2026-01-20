# AI Radar - Mobile-First Content Discovery Platform

A swipe-based mobile app that helps users discover AI news, generate LinkedIn carousels, and interact with content through voice AI.

**Live Demo:** [ai-radar-mobile.vercel.app](https://ai-radar-mobile.vercel.app)

---

## What It Does

1. **Discover** - Swipe through AI news cards from multiple sources
2. **Generate** - Create professional LinkedIn carousels with one swipe
3. **Listen** - Get AI-generated audio summaries of articles
4. **Chat** - Ask follow-up questions using voice

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                   (Vercel - Static)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Swipe     │  │   Audio     │  │   Voice Chat        │  │
│  │   Cards     │  │   Player    │  │   (MediaRecorder)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                   (Railway - Python)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Generation │  │   Audio     │  │   Voice Chat        │  │
│  │  Pipeline   │  │   Summary   │  │   (Whisper + TTS)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  OpenAI  │  │  Gamma   │  │  Google  │
        │   APIs   │  │   API    │  │  Sheets  │
        └──────────┘  └──────────┘  └──────────┘
```

---

## Key Features Explained

### 1. Swipe Gesture System

The app uses touch gestures for intuitive mobile interaction:

| Gesture | Action | What Happens |
|---------|--------|--------------|
| **Swipe Right** | Create | Starts carousel generation |
| **Swipe Left** | Skip | Moves to next article |
| **Swipe Up** | Not Interested | Trains the learning system |
| **Swipe Down** | Back | Returns to source list |

**How it works:**
- Touch events track finger position
- Calculate direction based on X/Y delta
- Animate card off-screen in swipe direction
- Trigger appropriate action

### 2. Audio Summary Flow

When generating content, users hear a structured audio briefing:

```
1. Inspiring Quote     → "Einstein said..."
2. Preview            → "Here's what's next..."
3. Summary            → Key points from article
4. Call to Action     → "Want to know more? Just ask!"
```

**Tech:** OpenAI GPT-4o-mini generates the script, TTS-1 converts to speech.

### 3. Voice Chat (Interactive Q&A)

After the summary, users can ask questions about the article:

```
User speaks → Whisper transcribes → GPT answers → TTS responds
```

**Tech:** MediaRecorder API captures audio, sends base64 to backend.

### 4. Learning System

The app learns user preferences over time:

- Tracks liked/disliked topics and sources
- Adjusts article scoring based on history
- Syncs feedback to Google Sheets for analysis

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Vanilla JS + CSS | Fast, no build step, mobile-optimized |
| **Backend** | Python Flask | Simple API, easy OpenAI integration |
| **Hosting** | Vercel + Railway | Free tier, auto-deploy from GitHub |
| **AI** | OpenAI APIs | GPT-4o-mini, Whisper, TTS-1 |
| **Data** | Google Sheets | Simple storage, easy to view/edit |

---

## Project Structure

```
ai-radar-mobile/
├── index.html          # Main app (single-page application)
├── vercel.json         # Vercel deployment config
├── assets/             # Images and icons
└── logos/              # Source logos (TechCrunch, etc.)

ai-radar-backend/
├── simple_server.py    # Flask API server
├── requirements.txt    # Python dependencies
├── Procfile           # Railway start command
└── nixpacks.toml      # Railway build config
```

---

## API Endpoints

### `POST /generate-from-newsout`
Starts carousel generation job.

**Request:**
```json
{
  "title": "Article Title",
  "summary": "Article summary...",
  "preview_only": true
}
```

**Response:**
```json
{
  "job_id": "abc123",
  "status": "queued"
}
```

### `GET /status/<job_id>`
Check generation progress.

**Response:**
```json
{
  "status": "running",
  "percent": 45,
  "message": "Building slides...",
  "slides": [{"name": "Title Card", "status": "complete"}]
}
```

### `POST /audio-summary`
Generate audio briefing for an article.

**Request:**
```json
{
  "title": "Article Title",
  "summary": "Article content...",
  "quote": "Inspiring quote..."
}
```

**Response:** Audio file (audio/mpeg)

### `POST /voice-chat`
Interactive Q&A about an article.

**Request:**
```json
{
  "audio": "base64-encoded-audio",
  "title": "Article Title",
  "summary": "Article content..."
}
```

**Response:**
```json
{
  "question": "What the user asked",
  "answer": "AI response text",
  "audio": "base64-encoded-response-audio"
}
```

---

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repo to Vercel
3. Auto-deploys on every push

### Backend (Railway)
1. Push to GitHub
2. Connect repo to Railway
3. Set `OPENAI_API_KEY` environment variable
4. Auto-deploys on every push

---

## What I'd Add Next

- [ ] Real Gamma API integration for actual slides
- [ ] LinkedIn OAuth for direct posting
- [ ] User accounts with saved preferences
- [ ] Push notifications for trending topics
- [ ] Offline mode with service worker

---

## Author

Built by JJ Shay as a demonstration of mobile-first design, AI integration, and full-stack development.
