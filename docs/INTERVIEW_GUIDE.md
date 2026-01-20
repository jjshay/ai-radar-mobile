# Interview Talking Points

Quick reference for explaining AI Radar in interviews.

---

## 30-Second Pitch

> "I built a mobile-first app that helps people discover AI news and create LinkedIn content. You swipe through articles like Tinder, swipe right to generate a carousel. While it's generating, you hear an AI-narrated summary and can ask follow-up questions by voice. The whole thing is deployed on Vercel and Railway with a Python backend calling OpenAI APIs."

---

## Questions They Might Ask

### "Walk me through the architecture"

> "It's a classic frontend-backend split. The frontend is vanilla JavaScript hosted on Vercel - I chose vanilla JS over React because it's a mobile app where every kilobyte matters for load time. The backend is Python Flask on Railway. When a user wants to generate content, the frontend kicks off a job and polls for progress every second while showing updates. All the AI stuff - GPT for text, Whisper for speech-to-text, TTS for text-to-speech - happens on the backend where my API keys are secure."

### "Why didn't you use React/Next.js?"

> "For this specific use case, vanilla JS made sense. It's a mobile-first app where performance is critical. No framework means no bundle overhead - the entire app loads in one HTML file. Also, the state management is simple enough that I don't need Redux or Context. That said, if this app grew significantly - like adding user accounts, complex forms, multiple views - I'd probably migrate to React for better component organization."

### "How do you handle long-running tasks?"

> "Background threads with polling. When a user starts generation, I return immediately with a job ID and spawn a thread to do the actual work. The frontend polls /status/{job_id} every second. The job object tracks percent complete and current step, so users see real progress. It's simpler than WebSockets and works fine for updates every 1-2 seconds."

### "What about security?"

> "Main thing is API keys never touch the frontend. All OpenAI calls go through my backend. The key is an environment variable on Railway. I also use CORS to control which domains can call my API. For a production app, I'd add rate limiting and probably authentication."

### "What was the hardest part?"

> "Getting touch gestures to feel natural. Detecting swipe direction was straightforward - compare start and end positions. But making the card animation smooth, having it follow your finger during the swipe, handling edge cases like diagonal swipes - that took iteration. Also, the voice chat flow has three serial API calls (transcribe → think → speak), so latency adds up. I'd want to explore streaming responses to reduce perceived wait time."

### "How would you scale this?"

> "Right now jobs are stored in memory, which works for a demo but loses state on restart. First step would be Redis for job storage. For more scale: put the backend behind a load balancer, use a task queue like Celery for generation jobs, cache common API responses. The frontend is already on Vercel's CDN so that scales automatically."

### "What would you add next?"

> "Real Gamma integration - right now it simulates slide generation. LinkedIn OAuth so users can post directly without copy-paste. User accounts to persist preferences across devices. And I'd love to add streaming for the voice chat - start playing the audio response while it's still generating, like how ChatGPT shows text streaming in."

---

## Technical Terms to Drop Naturally

| Term | Context |
|------|---------|
| **Touch Events API** | "I use touchstart/touchmove/touchend for swipe detection" |
| **MediaRecorder API** | "Captures audio from the user's microphone" |
| **Base64 encoding** | "To send binary audio over JSON" |
| **Background threading** | "Long tasks run in threads so the API responds immediately" |
| **Polling pattern** | "Frontend checks job status every second" |
| **CORS** | "Configured to allow cross-origin requests from my frontend" |
| **Environment variables** | "API keys stored securely, never in code" |
| **TTS / STT** | "Text-to-speech and speech-to-text via OpenAI" |
| **GPT-4o-mini** | "Faster and cheaper than GPT-4, good for real-time use" |

---

## Code Snippets to Reference

### Swipe Detection (show you understand touch events)
```javascript
const deltaX = endX - startX;
const deltaY = endY - startY;
if (Math.abs(deltaX) > Math.abs(deltaY)) {
  // Horizontal swipe - check sign for direction
}
```

### Environment Detection (show you think about deployment)
```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5050'
  : PRODUCTION_API;
```

### Background Job (show you understand async patterns)
```python
thread = threading.Thread(target=do_work, args=(job_id,))
thread.start()
return jsonify({'job_id': job_id})  # Return immediately
```

---

## Numbers to Know

- **Load time:** ~1 second (single HTML file, no framework)
- **Generation time:** ~30 seconds for full carousel
- **Voice chat latency:** ~3-5 seconds (Whisper + GPT + TTS)
- **API cost:** ~$0.01-0.05 per voice interaction
- **Code size:** ~2500 lines frontend, ~250 lines backend

---

## If They Ask About Failures

> "The biggest issue was API keys getting exposed. I initially had the OpenAI key in the frontend for quick testing. When I pushed to GitHub, their secret scanner blocked it. Had to create a fresh repo to remove it from git history. Lesson learned: never put secrets in frontend code, even temporarily."

> "Railway deployment kept crashing because of dependency issues. My original backend imported modules it didn't really need, creating a chain of install failures. I rewrote it as a simpler server with just the essential endpoints. Sometimes less is more."

---

## Closing Statement

> "This project shows I can build end-to-end: mobile UI, backend APIs, AI integration, and deployment. But more importantly, it shows I can make product decisions - like choosing vanilla JS for performance, or the preview-before-post flow for user control. I'm not just writing code, I'm thinking about the user experience."
