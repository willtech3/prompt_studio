# Prompt Engineering Studio 🚀

A modern, comprehensive platform for optimizing and evaluating AI prompts across 16 models via OpenRouter's unified API.

## 🎉 Current Status: MVP Fully Functional

The MVP is complete and operational! You can now:
- Chat with 16 AI models in real-time
- Optimize prompts with AI-powered suggestions
- Save and restore your work with snapshots
- Access provider-specific best practices
- Customize model parameters extensively

**Quick Start**: See the [Quick Start](#-quick-start) section below to run the application locally.

## 📋 Project Overview

Prompt Engineering Studio is a cutting-edge application that combines the latest web technologies to provide a powerful platform for:
- **Prompt Management**: Create, version, and organize prompts with templates and variables
- **Multi-Model Access**: Connect to 16 AI models through OpenRouter's unified API
- **Best Practices Engine**: Get model-specific recommendations and automatic improvements
- **Evaluation System**: Test and compare prompts with custom metrics and A/B testing
- **Cost Optimization**: Track token usage and optimize for performance vs. cost

## 🛠️ Technology Stack

### Backend
- **FastAPI** (Python 3.11+) - High-performance async API framework
- **PostgreSQL 16** - Primary database with JSONB support
- **SQLAlchemy 2.0** - ORM with async support
- **Pydantic v2** - Data validation
- **JWT** - Authentication
- **Redis** - Caching and task queue

### Frontend
- **React 19** - Latest React with Server Components
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS framework
- **Shadcn/ui** - Component library
- **Vite** - Build tool
- **Zustand** - State management

### AI Integration
- **OpenRouter API** - Unified access to 16 models
- Support for OpenAI, Anthropic, Google, Meta, and more

## 📁 Project Structure

```
prompt_studio/
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   ├── api/              # API endpoints
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── config/           # Configuration
│   └── tests/            # Backend tests
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   └── stores/       # State management
│   └── public/           # Static assets
├── database/             # Database scripts
│   ├── migrations/       # Alembic migrations
│   └── seeders/          # Data seeders
└── docs/                 # Documentation
    ├── api/              # API documentation
    ├── frameworks/       # Framework guides
    ├── database/         # Database docs
    └── best_practices/   # Prompt engineering guides
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Design Specification](docs/DESIGN_SPECIFICATION.md)** - Complete system design and architecture
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - Detailed 10-week development roadmap
- **[FastAPI Documentation](docs/frameworks/FASTAPI_DOCUMENTATION.md)** - Backend framework guide
- **[React 19 Documentation](docs/frameworks/REACT_19_DOCUMENTATION.md)** - Frontend framework guide
- **[Tailwind CSS v4 Documentation](docs/frameworks/TAILWIND_CSS_V4_DOCUMENTATION.md)** - Styling guide
- **[OpenRouter Documentation](docs/api/OPENROUTER_DOCUMENTATION.md)** - AI model integration
- **[PostgreSQL Documentation](docs/database/POSTGRESQL_DOCUMENTATION.md)** - Database setup and queries
- **[Prompt Engineering Best Practices](docs/best_practices/PROMPT_ENGINEERING_BEST_PRACTICES.md)** - Comprehensive prompting guide

## 🚀 Quick Start

### Prerequisites
- **Python 3.13+** with `uv` package manager
- **Node.js 20+**
- **PostgreSQL 16** (optional - app works without DB)
- **OpenRouter API Key** ([Get one here](https://openrouter.ai))

### Backend Setup

```bash
cd backend

# Create and activate uv virtual environment
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies with uv
uv pip install -r pyproject.toml

# Set up environment variables
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env
# Optionally add DATABASE_URL for persistence

# Run migrations (if using database)
alembic upgrade head

# Seed provider content (if using database)
python scripts/seed_provider_content.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies API to localhost:8000)
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Note**: The application will work without a database for basic chat functionality. Database is required for:
- Saving snapshots
- Loading provider best practices
- Model catalog management

## 🔑 Key Features (Implemented in MVP)

### ✅ Real-Time AI Chat
- 🤖 Access to 16 AI models via OpenRouter
- ⚡ Server-Sent Events (SSE) streaming for real-time responses
- 🎛️ Comprehensive parameter controls:
  - Temperature, Top-P, Top-K
  - Frequency and presence penalties
  - Reasoning effort (for compatible models)
  - Max tokens, stop sequences, and more
- 📝 Markdown rendering for formatted responses
- 📋 Copy-to-clipboard functionality

### ✅ Prompt Optimization
- 🔧 AI-powered prompt improvement suggestions
- 📚 Provider-specific optimization guides
- 💡 Best practices integration
- ✨ Automated clarity and structure enhancements

### ✅ Provider Content System
- 📖 Best practices for each provider (OpenAI, Anthropic, Google, etc.)
- 🎯 Optimization guides tailored to specific models
- 🗂️ Dynamic content loading from database
- 🔄 Refresh model catalog from OpenRouter API

### ✅ Snapshot System
- 💾 Save complete UI state (prompts, parameters, responses)
- 📂 Load previous sessions with full restoration
- 🕐 Timestamped history
- 🔍 Browse and search saved snapshots

### ✅ User Experience
- 🌓 Dark/light theme with system preference support
- 📱 Responsive mobile-friendly design
- ⌨️ Keyboard shortcuts (Cmd/Ctrl+Enter to run)
- 🔔 Toast notifications for feedback
- 🎨 Modern UI with Tailwind CSS v4

### 🚧 Coming Soon (Post-MVP)
- 🔐 User authentication and accounts
- 📊 Advanced analytics and cost tracking
- 🧪 A/B testing and evaluation framework
- 👥 Team collaboration features
- 📦 Template library with variables

## 🗓️ Development Roadmap

### ✅ MVP Phase (Completed)
- ✅ **UI Foundation**: React 19 + TypeScript + Tailwind CSS v4
- ✅ **Backend API**: FastAPI with async support
- ✅ **Database**: PostgreSQL 16 with SQLAlchemy 2.0
- ✅ **OpenRouter Integration**: Real-time streaming, 16 models
- ✅ **Model Catalog**: Dynamic model management and refresh
- ✅ **Provider Content**: Best practices and optimization guides
- ✅ **Snapshot System**: Save and restore UI state
- ✅ **Prompt Optimization**: AI-powered prompt improvement
- ✅ **Theme System**: Dark/light mode with system preference
- ✅ **Responsive Design**: Mobile-friendly layout

### 🚧 Post-MVP: Authentication & Users (In Progress)
- [ ] JWT authentication
- [ ] User registration and login
- [ ] Profile management
- [ ] Personal prompt libraries
- [ ] User-specific API key storage

### 📋 Future Enhancements
- [ ] **Advanced Features**: Prompt variables, templates, A/B testing
- [ ] **Evaluation System**: Custom metrics, batch processing
- [ ] **Analytics**: Token usage tracking, cost optimization
- [ ] **Team Features**: Shared prompts, comments, collaboration
- [ ] **Testing**: Unit tests, integration tests, E2E tests
- [ ] **Deployment**: Production setup, monitoring, CI/CD

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:e2e
```

## 🚢 Deployment

### Production Build

Backend:
```bash
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## 🔒 Security

- JWT-based authentication
- Input sanitization
- SQL injection prevention via ORM
- XSS protection
- Rate limiting
- Encrypted API key storage

## 📊 Performance Goals

- API response time: < 100ms
- Page load time: < 2 seconds
- System uptime: > 99.9%
- Support for 10,000+ concurrent users

## 🤝 Contributing

Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenRouter for unified AI model access
- FastAPI for the excellent web framework
- React team for React 19
- Tailwind Labs for Tailwind CSS v4
- All contributors and maintainers

## 📞 Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

---

**Built with ❤️ for the prompt engineering community**