# Architecture Deep Dive

This document explains the key technical decisions and code patterns in AI Radar.

---

## Frontend Architecture

### Why Vanilla JS (No Framework)?

I chose vanilla JavaScript over React/Vue for these reasons:

1. **Mobile Performance** - No framework overhead means faster load times
2. **Single File** - Entire app in one HTML file, easy to deploy anywhere
3. **No Build Step** - Push to GitHub, it's live. No webpack/vite config
4. **Learning** - Shows I understand the fundamentals, not just frameworks

**Trade-off:** Harder to manage state as app grows. Would add React if it gets much bigger.

---

## Key Code Patterns

### 1. Touch Gesture Detection

**The Problem:** Detect swipe direction on mobile touch screens.

**The Solution:**

```javascript
// Track where the finger started
let startX, startY;

card.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

card.addEventListener('touchend', (e) => {
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;

  // Calculate how far finger moved
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Which direction was stronger?
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 50) handleSwipe('right');
    else if (deltaX < -50) handleSwipe('left');
  } else {
    // Vertical swipe
    if (deltaY > 50) handleSwipe('down');
    else if (deltaY < -50) handleSwipe('up');
  }
});
```

**How I'd explain it:** "I compare the start and end positions of the touch. The larger delta (X or Y) tells me horizontal vs vertical. The sign (positive/negative) tells me the direction. The 50px threshold prevents accidental swipes."

---

### 2. API Base URL Detection

**The Problem:** App needs to call localhost during development, production URL when deployed.

**The Solution:**

```javascript
const PRODUCTION_API = 'https://web-production-08a17.up.railway.app';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5050'
  : PRODUCTION_API;
```

**How I'd explain it:** "I check the current hostname. If we're on localhost, use the local backend. Otherwise, use the production Railway URL. This way I don't need separate configs for dev vs prod."

---

### 3. Polling for Job Status

**The Problem:** Backend generation takes time. Need to show progress without blocking UI.

**The Solution:**

```javascript
async function pollStatus(jobId) {
  const response = await fetch(`${API_BASE}/status/${jobId}`);
  const data = await response.json();

  // Update UI with current progress
  updateProgressBar(data.percent);
  updateStatusText(data.message);

  // Keep polling until done or failed
  if (data.status === 'running') {
    setTimeout(() => pollStatus(jobId), 1000);  // Check again in 1 second
  } else if (data.status === 'completed') {
    showSuccess(data.result);
  } else if (data.status === 'failed') {
    showError(data.message);
  }
}
```

**How I'd explain it:** "Instead of waiting for the whole job to finish, I ask the server every second 'how's it going?' The server tells me the percentage and current step, so I can show real progress to the user. When status changes to completed or failed, I stop polling."

---

### 4. Audio Recording with MediaRecorder

**The Problem:** Capture user's voice question from the microphone.

**The Solution:**

```javascript
async function startRecording() {
  // Ask for microphone permission
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Create recorder
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  // Collect audio data as it comes in
  recorder.ondataavailable = (e) => chunks.push(e.data);

  // When stopped, process the recording
  recorder.onstop = async () => {
    // Clean up - release the microphone
    stream.getTracks().forEach(track => track.stop());

    // Combine chunks into one audio file
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });

    // Send to backend for processing
    await sendToBackend(audioBlob);
  };

  recorder.start();
}
```

**How I'd explain it:** "First I request microphone access - the browser shows a permission popup. Then MediaRecorder captures audio in chunks. When the user stops recording, I combine those chunks into a single audio file and send it to my backend, which uses OpenAI's Whisper to transcribe it."

---

### 5. Base64 Audio Transfer

**The Problem:** Need to send audio file to backend via JSON.

**The Solution:**

```javascript
// Convert audio blob to base64 string
const reader = new FileReader();
reader.readAsDataURL(audioBlob);

reader.onloadend = () => {
  // Result is "data:audio/webm;base64,SGVsbG8gV29ybGQ..."
  // Split to get just the base64 part
  const base64Audio = reader.result.split(',')[1];

  // Now I can send it as JSON
  fetch('/voice-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64Audio })
  });
};
```

**How I'd explain it:** "Binary files like audio can't go directly in JSON. Base64 converts binary to text characters. It makes the data about 33% bigger, but now I can send it as a regular JSON string. The backend decodes it back to binary."

---

## Backend Architecture

### Why Flask?

1. **Simplicity** - Few lines to create an API endpoint
2. **Python AI Ecosystem** - OpenAI SDK works great with Python
3. **Railway Compatibility** - Deploys easily with Nixpacks

---

### Key Backend Patterns

### 1. Background Job Processing

**The Problem:** Carousel generation takes 30+ seconds. Can't make user wait.

**The Solution:**

```python
import threading

# Store all jobs in memory
jobs = {}

@app.route('/generate', methods=['POST'])
def generate():
    job_id = str(uuid.uuid4())[:8]

    # Initialize job state
    jobs[job_id] = {
        'status': 'running',
        'percent': 0,
        'message': 'Starting...'
    }

    # Run the actual work in background thread
    thread = threading.Thread(target=do_generation, args=(job_id,))
    thread.start()

    # Return immediately with job ID
    return jsonify({'job_id': job_id, 'status': 'queued'})

def do_generation(job_id):
    # This runs in background
    for step in steps:
        jobs[job_id]['percent'] = step.percent
        jobs[job_id]['message'] = step.name
        # ... do work ...

    jobs[job_id]['status'] = 'completed'
```

**How I'd explain it:** "I don't want the user staring at a loading spinner for 30 seconds. So I return immediately with a job ID, then do the real work in a background thread. The frontend polls /status/{job_id} to get updates. It's like a restaurant giving you a number and calling it when your order is ready."

**Trade-off:** Jobs are stored in memory, so they're lost if server restarts. For production, I'd use Redis or a database.

---

### 2. OpenAI Integration for Audio

**The Problem:** Generate spoken audio summaries of articles.

**The Solution:**

```python
import openai

@app.route('/audio-summary', methods=['POST'])
def audio_summary():
    data = request.json
    client = openai.OpenAI()

    # Step 1: Generate a script with GPT
    chat = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{
            'role': 'system',
            'content': 'Create a podcast-style summary...'
        }, {
            'role': 'user',
            'content': f'Article: {data["title"]}\n{data["summary"]}'
        }]
    )
    script = chat.choices[0].message.content

    # Step 2: Convert script to speech
    tts = client.audio.speech.create(
        model='tts-1',
        voice='nova',
        input=script
    )

    # Return the audio file
    return Response(tts.content, mimetype='audio/mpeg')
```

**How I'd explain it:** "Two OpenAI calls in sequence. First, GPT writes a natural-sounding script from the article. Then TTS converts that script to audio. I return the raw audio bytes with the right content-type header so the browser knows it's an MP3."

---

### 3. Voice Chat (Speech-to-Text-to-Speech)

**The Problem:** User speaks a question, needs a spoken answer.

**The Solution:**

```python
@app.route('/voice-chat', methods=['POST'])
def voice_chat():
    data = request.json
    client = openai.OpenAI()

    # Step 1: Transcribe user's audio with Whisper
    audio_bytes = base64.b64decode(data['audio'])
    with tempfile.NamedTemporaryFile(suffix='.webm') as f:
        f.write(audio_bytes)
        f.seek(0)
        transcript = client.audio.transcriptions.create(
            model='whisper-1',
            file=f
        )
    question = transcript.text

    # Step 2: Generate answer with GPT
    chat = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{
            'role': 'system',
            'content': f'Answer questions about: {data["title"]}'
        }, {
            'role': 'user',
            'content': question
        }]
    )
    answer = chat.choices[0].message.content

    # Step 3: Convert answer to speech
    tts = client.audio.speech.create(
        model='tts-1',
        voice='nova',
        input=answer
    )

    # Return both text and audio
    return jsonify({
        'question': question,
        'answer': answer,
        'audio': base64.b64encode(tts.content).decode()
    })
```

**How I'd explain it:** "Three AI calls in a pipeline. Whisper transcribes what the user said. GPT generates an answer using the article as context. TTS speaks the answer. I return both the text (so I can show it on screen) and the audio (so I can play it)."

---

## Security Considerations

### API Key Protection

**Problem:** OpenAI API key can't be in frontend code - anyone could steal it.

**Solution:** All OpenAI calls go through my backend. The key is stored as an environment variable on Railway, never in code.

```javascript
// WRONG - key exposed in browser
const response = await openai.chat.completions.create({...});

// RIGHT - call my backend, which has the key
const response = await fetch(`${API_BASE}/audio-summary`, {...});
```

### CORS Configuration

```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)  # Allows frontend on different domain to call API
```

**How I'd explain it:** "Browsers block requests to different domains by default (security feature). CORS headers tell the browser 'it's okay, this frontend is allowed to call me.' In production, I'd restrict this to only my Vercel domain."

---

## Performance Decisions

| Decision | Why |
|----------|-----|
| Single HTML file | One network request, instant load |
| CSS variables | Easy theming, smaller CSS |
| Lazy audio loading | Don't generate until user clicks Listen |
| Job polling (not WebSockets) | Simpler, works everywhere, good enough for 1-second updates |
| In-memory job storage | Fast, sufficient for demo. Would use Redis for production |

---

## What I Learned

1. **Mobile-first is hard** - Touch events behave differently than mouse events
2. **Audio APIs are powerful** - MediaRecorder + Web Audio enable voice features without native apps
3. **Serverless has limits** - Had to use Railway (always-on) because background jobs need persistent state
4. **AI APIs are expensive** - GPT-4o-mini + Whisper + TTS costs ~$0.01-0.05 per voice chat interaction
