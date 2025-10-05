MVP Implementation Plan - UI-First (V2, Scope-Tightened)

## 🎉 Current Status: MVP COMPLETED

All three core phases have been successfully implemented:
- ✅ **Phase 1**: Full-featured UI with React 19, Tailwind CSS v4, responsive design, dark mode
- ✅ **Phase 2**: Backend API with FastAPI, OpenRouter integration, SSE streaming, model catalog
- ✅ **Phase 3**: PostgreSQL database, snapshot system, provider content, best practices

**Key Features Implemented:**
- Real-time AI chat with 400+ models via OpenRouter
- Comprehensive parameter controls (temperature, top-p, top-k, reasoning effort, etc.)
- Provider-specific best practices and optimization guides
- Snapshot save/load system for UI state persistence
- Prompt optimization using AI
- Model catalog with dynamic refresh
- Dark/light theme with system preference support
- Responsive mobile-friendly design
- Toast notifications and keyboard shortcuts

**Next Steps:** Post-MVP enhancements (authentication, advanced features, team collaboration)

---

## Philosophy
Build a working UI first that users can interact with immediately. Add backend integration second. Add persistence last. Each phase produces a usable product.

---

### Progress Legend
- [ ] Pending
- ✅ Completed
- ⏭️ Deferred to post-MVP

## Phase 1: Functional UI (Days 1-3)
**Goal**: Complete working UI with all panels, inspired by `index.html`, using only the minimal dependencies required.

### Day 1: Core Layout & Components

#### 1.1 Project Setup (2 hours) ✅ Completed
```bash
# Create React app with TypeScript and Vite
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Ensure React 19 + compatible tooling
npm install react@^19 react-dom@^19

# Minimal runtime deps for Phase 1 (no routing or API clients yet)
npm install zustand lucide-react react-markdown remark-gfm

# Tailwind CSS v4 (config-less by default)
npm install -D tailwindcss@latest

# Tailwind v4 setup: add a single CSS entry and import in main
# src/styles.css
#   @import "tailwindcss";
# Then in src/main.tsx:
#   import "./styles.css";
```

Notes:
- Defer `axios`, `@tanstack/react-query`, and `react-router-dom` to Phase 2 when the API is introduced.
- Tailwind CSS v4 prefers a config-less setup; only create `tailwind.config.ts` if customization is needed later.
- Prefer `fetch` initially; add `axios` only if it earns its keep.

#### 1.2 Component Structure (4 hours) ✅ Completed
```
src/
├── components/
│   ├── Header.tsx          # Model selector, theme toggle, run button
│   ├── PromptEditor.tsx    # System & user prompt inputs
│   ├── ResponsePanel.tsx   # Streaming response display
│   ├── ParametersPanel.tsx # Model parameters (temp, tokens, etc.)
│   ├── BestPractices.tsx   # Provider-specific best practices
│   ├── HistoryPanel.tsx    # Chat history sidebar
│   └── ModelDetails.tsx    # Model info card
├── store/
│   └── promptStore.ts      # Zustand store for state
├── types/
│   └── models.ts           # TypeScript interfaces
├── utils/
│   └── tokenEstimator.ts   # Rough token counting
└── styles.css              # Tailwind v4 entry
```

Best-practices content source (Phase 1):
- Single source of truth: reuse existing `best_practices/` from repo root.
- For dev serving in Vite without extra config, copy once into the frontend public folder:
```bash
# From repo root
cp -R best_practices ./prompt_studio/frontend/public/best_practices
```

#### 1.3 Core Features (4 hours)
- ✅ Header: Provider dropdown (OpenAI, Anthropic, Google, xAI, DeepSeek), theme toggle, run button
- ✅ Prompt Editor: System prompt (optional), user prompt with variable support
- ✅ Parameters Panel: Temperature, max tokens, top-p, streaming toggle
- ✅ Response Panel: Markdown display, with `aria-live="polite"` for accessibility
- ✅ Best Practices: Load static markdown for selected provider from `public/best_practices`
- ✅ Dark Mode: Respect `prefers-color-scheme` with a simple manual toggle

Trimmed for Phase 1 to avoid premature complexity:
- Cost estimation: move to Phase 2 (requires accurate pricing)
- Routing: not needed for MVP UI shell

### Day 2: Interactivity & Polish

#### 2.1 State Management (3 hours)
```ts
// store/promptStore.ts
interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  streaming: boolean;
}

interface HistoryItem {
  id: string;
  title: string;
  createdAt: number; // epoch ms
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek';
  model: string;
  systemPrompt: string;
  userPrompt: string;
}

interface PromptState {
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek';
  model: string;
  systemPrompt: string;
  userPrompt: string;
  parameters: ModelParameters;
  response: string;
  isStreaming: boolean;
  history: HistoryItem[];
}
```

#### 2.2 UI Interactions (3 hours)
- ✅ Model selection updates parameters panel
- ✅ Token estimation (rough: 1 token ≈ 4 chars)
- ✅ Loading states and subtle animations
- ✅ Copy response to clipboard
- ✅ Clear/reset functionality
- ✅ History search: simple "string contains" filter if time permits; otherwise defer advanced search to Phase 2

#### 2.3 History Panel (2 hours)
- ✅ Collapsible sidebar with past prompts
- ✅ Click to restore previous prompt
- ✅ "New chat" button
- ✅ Timestamp display

### Day 3: Final Polish & Mock API

#### 3.1 Mock Response System (2 hours)
```ts
// Simulate streaming responses (UI only)
const mockStream = async (onChunk: (text: string) => void) => {
  const response = "This is a simulated response...";
  const words = response.split(' ');
  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 50));
    onChunk(word + ' ');
  }
};
```

#### 3.2 Visual & A11y Feedback (2 hours)
- ✅ Streaming text animation
- ✅ Progress/typing indicators
- ✅ Error state surfaces
- ✅ Success notifications (Toast system implemented)
- ✅ Keyboard shortcuts (Cmd/Ctrl + Enter to run)
- ✅ Response region uses `aria-live="polite"`

#### 3.3 Responsive Design (2 hours)
- ✅ Mobile-friendly layout
- ✅ Collapsible panels on small screens
- ✅ Touch-friendly controls
- ✅ Proper scrolling areas

### Definition of Done - Phase 1 ✅ COMPLETED
- ✅ Can select models from 5+ providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Meta, etc.)
- ✅ Can input system and user prompts
- ✅ Shows streaming responses (real-time via SSE)
- ✅ Parameters panel functional with comprehensive controls
- ✅ Best practices loaded from database with provider content system
- ✅ History panel with save/load functionality
- ✅ Dark mode toggle with `prefers-color-scheme` default
- ✅ Responsive on mobile
- ✅ UI runs at `http://localhost:5173`

Component acceptance checks:
- ✅ `ResponsePanel`: renders markdown, streams real chunks, copy-to-clipboard, loading state
- ✅ `PromptEditor`: system + user prompts, keyboard shortcut (Cmd/Ctrl+Enter)
- ✅ `ParametersPanel`: temperature, max tokens, top-p, top-k, penalties, reasoning effort, and more
- ✅ `BestPractices`: loads provider best practices from database
- ✅ `Header`: provider switch, theme toggle, run action
- ✅ `HistoryPanel`: save/load prompts with timestamps
- ✅ `ToastContainer`: success/error notifications

---

## Phase 2: Backend API Integration (Days 4-6) ✅ COMPLETED
**Goal**: Connect UI to OpenRouter via a minimal FastAPI backend with SSE streaming.

### Day 4: FastAPI Setup

#### 4.1 Minimal Backend (2 hours) ✅ Completed
```py
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

#### 4.2 OpenRouter Service (3 hours) ✅ Completed
```py
# backend/app/services/openrouter.py
import httpx
from typing import AsyncGenerator, List, Dict, Any

class OpenRouterService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"

    async def stream_completion(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        **params: Any
    ) -> AsyncGenerator[str, None]:
        # Stream response from OpenRouter (implement in Phase 2)
        yield ""
```

#### 4.3 Streaming Endpoint (3 hours)
- ✅ Keep SSE format consistent and minimal: `data: <text>\n\n` (plain text)
- ✅ Use GET for SSE compatibility
```py
# backend/app/main.py (continued)
from fastapi import Query

@app.get("/api/chat/stream")
async def stream_chat(model: str = Query(...)):
    async def generate():
        # Example: yield tokens/chunks from OpenRouterService
        # async for chunk in openrouter.stream_completion(model=model, messages=[]):
        #     yield f"data: {chunk}\n\n"
        yield "data: streaming not yet implemented\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Day 5: Frontend Integration

#### 5.1 Vite Dev Proxy for SSE (1 hour) ✅ Completed
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

#### 5.2 API Client (2 hours) ✅ Completed
```ts
// services/api.ts
export class APIClient {
  streamChat(request: { model: string }): EventSource {
    // No axios; SSE via EventSource (GET)
    const params = new URLSearchParams({ model: request.model });
    const es = new EventSource(`/api/chat/stream?${params.toString()}`)
    return es;
  }

  stopStream(es?: EventSource) {
    es?.close(); // request cancellation == close SSE connection
  }
}
```

#### 5.3 Real Streaming (3 hours) ✅ Completed
- ✅ Replace mock responses with real SSE
- ✅ Handle `EventSource` messages
- ✅ Append chunks to `response` in store
- ✅ Error handling (basic) for API failures

#### 5.4 Model Management (3 hours) ✅ Completed
- ✅ `/api/models` endpoint to fetch all models from database
- ✅ `/api/models/{model_path}/info` endpoint for detailed model info
- ✅ `/api/models/refresh` endpoint to sync models from OpenRouter
- ✅ Frontend integration to load and display models dynamically
- ✅ Model catalog service to manage OpenRouter model data

### Day 6: Error Handling & Essentials

#### 6.1 Error Handling (3 hours) ✅ Basic implementation complete
- ✅ Network error recovery with try/catch
- ✅ Invalid API key detection
- ✅ User-friendly error messages via toast notifications
- ⏭️ Advanced rate-limit handling (deferred - not needed for MVP)
- ⏭️ Sophisticated timeout management (deferred - basic is sufficient)

#### 6.2 Performance (2 hours) ✅ Completed
- ✅ Request cancellation: close the `EventSource`
- ✅ Stream connection management
- ✅ Kept minimal - no premature optimization

### Definition of Done - Phase 2 ✅ COMPLETED
- ✅ Backend connects to OpenRouter successfully
- ✅ Real-time streaming works end-to-end via SSE
- ✅ Basic error handling implemented
- ✅ Can switch models dynamically
- ✅ No API key in frontend code
- ✅ Model catalog syncs from OpenRouter API
- ✅ Provider content system for best practices
- ✅ Prompt optimization endpoint working

---

## Phase 3: Data Persistence (Days 7-8) ✅ COMPLETED
**Goal**: Add database to save prompts and responses (timezone-safe, sensible defaults).

### Day 7: Database Setup ✅ Completed

#### 7.1 Database Schema (2 hours) ✅ Implemented and Enhanced
- ✅ PostgreSQL 16 with asyncpg driver
- ✅ SQLAlchemy 2.0 ORM with async support
- ✅ Alembic migrations set up
- ✅ Database models created:
  - `User` - user accounts
  - `Prompt` - prompt storage
  - `Execution` - execution history
  - `ModelConfig` - model configurations
  - `OpenRouterModel` - OpenRouter model catalog
  - `ProviderContent` - provider best practices and guides
  - `Snapshot` - UI state snapshots for save/load
- ✅ All tables use UUID primary keys with `gen_random_uuid()`
- ✅ TIMESTAMPTZ fields with timezone support
- ✅ JSONB support for flexible data storage

#### 7.2 Database API Endpoints (4 hours) ✅ Completed
- ✅ `/api/saves` (POST) - Create snapshot
- ✅ `/api/saves` (GET) - List all snapshots
- ✅ `/api/saves/{id}` (GET) - Get specific snapshot
- ✅ `/api/models` (GET) - List models from database
- ✅ `/api/models/{model_path}/info` (GET) - Get model details
- ✅ `/api/models/refresh` (POST) - Sync models from OpenRouter
- ✅ `/api/providers` (GET) - List supported providers
- ✅ `/api/providers/{provider_id}/guide` (GET) - Get optimization guide
- ✅ `/api/providers/{provider_id}/best-practices` (GET) - Get best practices

### Day 8: Frontend Integration ✅ Completed

#### 8.1 Snapshot Management (3 hours) ✅ Completed
- ✅ Save UI state as snapshots (better than just prompts)
- ✅ Load saved snapshots with full state restoration
- ✅ History panel integrated with snapshot system
- ✅ Automatic title generation from prompts
- ⏭️ Quick templates (deferred to post-MVP)

#### 8.2 Best Practices from DB (2 hours) ✅ Completed
- ✅ Load from database via `/api/providers/{provider_id}/best-practices`
- ✅ Provider content seeding script created
- ✅ Best practices panel integrated with API
- ✅ Graceful error handling if content not available

#### 8.3 Provider Content System (2 hours) ✅ Completed
- ✅ Database-driven provider best practices
- ✅ Optimization guides stored in DB
- ✅ Dynamic content loading per provider
- ✅ Provider list endpoint with model counts
- ⏭️ Export/Import functionality (deferred - not critical for MVP)

### Definition of Done - Phase 3 ✅ COMPLETED
- ✅ Snapshots saved to database with full UI state
- ✅ Can load previous snapshots and restore state
- ✅ Database persists models, providers, and content
- ✅ Best practices served from DB
- ✅ Model catalog synchronized from OpenRouter
- ✅ Prompt optimization working with provider guides

---

## Post-MVP Enhancements

### Priority 1: Authentication (2 days)
- [ ] Simple JWT auth
- [ ] User accounts
- [ ] Personal prompt libraries

### Priority 2: Advanced Features (3 days)
- [ ] Variables with form inputs
- [ ] Prompt templates
- [ ] A/B testing
- [ ] Batch processing

### Priority 3: Team Features (5 days)
- [ ] Shared prompts
- [ ] Comments
- [ ] Version control
- [ ] Usage analytics

---

## Tech Stack Summary

### Frontend
```json
{
  "framework": "React 19 + TypeScript",
  "build": "Vite",
  "styling": "Tailwind CSS v4 (config-less)",
  "state": "Zustand",
  "routing": "None in Phase 1 (add later if needed)",
  "markdown": "react-markdown"
}
```

### Backend
```py
FastAPI
httpx (for OpenRouter)
```

### Database
```sql
PostgreSQL 16
UUID defaults via pgcrypto
TIMESTAMPTZ with DEFAULT NOW()
```

---

## Development Principles
1) UI first
2) Real data fast (Phase 2)
3) Persist later (Phase 3)
4) No premature optimization
5) Continuous user feedback

---

## Daily Checklist
- [ ] Current phase fully functional
- [ ] No console errors
- [ ] Works on mobile
- [ ] Can demo to a user
- [ ] Code committed to git

---

## Success Metrics

### Phase 1 Success (UI) ✅ ACHIEVED
- ✅ User can interact with all panels
- ✅ Real-time streaming responses display correctly
- ✅ UI is responsive and polished
- ✅ Dark mode works with system preference support
- ✅ Toast notifications for user feedback
- ✅ Keyboard shortcuts implemented

### Phase 2 Success (API) ✅ ACHIEVED
- ✅ Real responses from OpenRouter
- ✅ Streaming works smoothly via SSE
- ✅ Basic error handling functional
- ✅ Model catalog integration complete
- ✅ Provider content system operational
- ✅ Prompt optimization feature working

### Phase 3 Success (Database) ✅ ACHIEVED
- ✅ UI state persists between sessions via snapshots
- ✅ History is accessible and restorable
- ✅ Database stores models, providers, and content
- ✅ Best practices served dynamically
- ⏭️ Advanced sharing and export (deferred to post-MVP)

---

## Timeline

**Week 1**
- Days 1-3: Complete UI (Phase 1)
- Day 4: Demo and get feedback

**Week 2**
- Days 4-6: API Integration (Phase 2)
- Days 7-8: Database (Phase 3)
- Day 9: Testing and polish
- Day 10: Deploy MVP

**Total Time**: 8-10 days for complete MVP

---

## Remember
The goal is a WORKING product that looks professional from day one. Users should be able to use it immediately, even if it's using mock data initially. Real functionality comes second. Persistence comes last.
