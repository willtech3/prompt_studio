# Claude Context - Prompt Engineering Studio

## ⚠️ IMPORTANT: Greenfield Project Status
**This is a GREENFIELD APPLICATION with ZERO users.** We are in the initial development phase with no production deployment or user base yet. Therefore:
- **Keep code simple and clean** - No over-engineering needed
- **Avoid premature optimization** - Build what works first
- **No complex error handling yet** - Basic error handling is sufficient
- **Skip retry logic and fallbacks** - Add these only when we have real users
- **Minimal testing initially** - Focus on getting features working
- **No elaborate monitoring/logging** - Simple console logs are fine for now

## Project Overview
Prompt Engineering Studio is a modern web application for optimizing and evaluating AI prompts across multiple models using OpenRouter's unified API. The platform helps users create better prompts through best practices, evaluation metrics, and A/B testing.

## Core Purpose
- **Primary Goal**: Build a tool that helps users write better AI prompts through guidance, testing, and optimization
- **Target Users**: Developers, prompt engineers, content creators, and businesses using AI
- **Key Value**: Save time and money by optimizing prompts before production use

## Technical Stack

### Backend (Python 3.13+)
- **Framework**: FastAPI (async, high-performance)
- **Package Manager**: uv (modern Python package management)
- **Database**: PostgreSQL 16 with SQLAlchemy 2.0
- **Authentication**: JWT tokens
- **API Integration**: OpenRouter for 400+ AI models

### Frontend (React 19)
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Build Tool**: Vite
- **Data Fetching**: TanStack Query

## Key Features (MVP to Full)

### MVP Features
1. User authentication (register/login)
2. Single prompt execution with OpenRouter
3. Basic prompt storage and retrieval
4. Simple model selection (3-5 popular models)
5. Basic response display

### Core Features (Post-MVP)
1. Prompt versioning and history
2. Variable interpolation in prompts
3. Model comparison (side-by-side)
4. Token counting and cost estimation
5. Prompt templates library

### Advanced Features
1. Evaluation metrics and scoring
2. A/B testing framework
3. Best practices recommendations
4. Batch processing
5. Team collaboration

## Database Schema (Simplified for MVP)
```sql
users (id, email, username, password_hash, openrouter_api_key)
prompts (id, user_id, title, content, created_at)
executions (id, prompt_id, model, request, response, tokens, cost)
```

## API Structure
```
/api/auth/register    - User registration
/api/auth/login       - User login
/api/prompts          - CRUD for prompts
/api/execute          - Execute prompt with model
/api/models           - List available models
```

## Development Approach
1. **Start Simple**: Get a basic working version quickly - NO over-engineering
2. **Iterate**: Add features one at a time when actually needed
3. **Manual Testing First**: Test features manually before writing automated tests
4. **Build for Zero Users**: We have no users yet, so don't build for scale
5. **Add Complexity Later**: Only add retry logic, fallbacks, and robust error handling when we have real users

## Important Constraints
- **OpenRouter API**: Rate limits and pricing constraints
- **Token Limits**: Different models have different context windows
- **Response Time**: Keep UI responsive during API calls
- **Cost Management**: Track and display costs transparently

## File Structure
```
prompt_studio/
├── backend/          # FastAPI application
├── frontend/         # React application
├── database/         # Migration scripts
└── docs/            # Documentation
```

## Development Workflow
1. Backend API first (can test with curl/Postman)
2. Database schema and models
3. Basic frontend UI
4. Integration and refinement
5. Advanced features incrementally

## Success Metrics
- **Technical**: < 2s page load, < 200ms API response (excluding AI calls)
- **User**: Successfully execute prompts, save/load prompts, compare models
- **Business**: Track token usage, optimize costs, improve prompt quality

## Current Status
- Project structure created ✅
- Documentation prepared ✅
- Ready to start MVP implementation

## Next Immediate Steps
1. Set up Python 3.13+ with uv
2. Create basic FastAPI application
3. Set up PostgreSQL database
4. Implement user authentication
5. Create simple prompt execution endpoint

## Questions/Decisions Needed
- Hosting platform preference?
- Budget for OpenRouter API?
- Target number of users for MVP?
- Preferred authentication method (email/password, OAuth, both)?

## 🚨 NON-NEGOTIABLE RULES
1. **ALWAYS activate the uv virtual environment FIRST** - Never run any Python commands without ensuring the uv venv is active
2. **NEVER use `git commit .`** - Always add files individually with `git add <specific-file>` to avoid committing unintended files

## Technical Notes
- Use async/await for consistency (not for premature optimization)
- Basic try/catch is sufficient - no complex error recovery needed yet
- Console.log is fine for now - no logging frameworks needed
- Environment variables for config is good practice
- Skip rate limiting until we have actual users to limit

## Remember
This is a tool to help people write better prompts. Every feature should serve that goal. Start with the simplest version that provides value, then iterate based on usage and feedback.