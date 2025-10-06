# Claude Sonnet 4.5 - Agents, Computer Use, and Autonomous Operations Guide


**Official Documentation:** https://www.anthropic.com/news/claude-sonnet-4-5

## Model Overview

Claude Sonnet 4.5 is described as **"the best model in the world for agents, coding, and computer use"**. It achieves state-of-the-art performance in agentic workflows, can work autonomously for **30 hours** (vs Opus 4's 7 hours), and shows a 19-point jump on OSWorld-Verified for computer use tasks.

**Key Specifications:**
- **Context Window:** 200,000 tokens
- **Output Tokens:** 32,000 tokens
- **Autonomous Operation:** Up to 30 hours
- **OSWorld-Verified Score:** +19 points improvement (computer use)
- **SWE-bench Score:** ~75%
- **Best For:** Agentic workflows, computer use, autonomous operations, tool-heavy tasks
- **Pricing:** $3/M input tokens, $15/M output tokens

## Unique Capabilities

### 1. Extended Autonomous Operation

**30 Hours of Independent Work:**
- Works independently for hours while maintaining clarity and focus
- Makes steady progress on a few tasks at a time
- Provides fact-based progress updates
- Doesn't abandon tasks prematurely

**vs Opus 4:** Massive improvement from 7 hours to 30 hours of autonomous operation.

### 2. Computer Use Excellence

**State-of-the-Art Computer Interaction:**
- Navigate applications and interfaces
- Fill spreadsheets and forms
- Complete web workflows
- Execute multi-step UI interactions
- 19-point improvement on OSWorld-Verified

### 3. Enhanced Tool Usage

**Parallel Tool Execution:**
- Fires off multiple speculative searches simultaneously during research
- Reads several files at once to build context faster
- Maximizes actions per context window
- Runs multiple bash commands in parallel

### 4. Context Awareness

**Token Budget Tracking:**
- Tracks token usage throughout conversations
- Receives updates after each tool call
- Prevents premature task abandonment
- Enables effective execution on long-running tasks

### 5. Memory and Context Management

**New Memory Tools (via Claude Agent SDK):**
- Context editing for long-running tasks
- Memory persistence across sessions
- Sub-agent coordination
- Permissioning systems

## Prompting Best Practices

### 1. Enable Long-Running Autonomous Work

Explicitly tell Sonnet 4.5 it can work for extended periods.

**Long-Running Task Prompt:**
```xml
SYSTEM: You are an autonomous agent capable of working independently for
hours. Your context window will be automatically compacted as it approaches
its limit, allowing you to continue working indefinitely from where you
left off.

Do not stop tasks early due to:
- Token budget concerns (you'll receive updates)
- Time constraints (you can work for 30+ hours)
- Complexity (break tasks into manageable pieces)

Provide fact-based progress updates every 30 minutes of work.

USER: Build a complete e-commerce application with:
- User authentication (JWT)
- Product catalog (PostgreSQL)
- Shopping cart (Redis)
- Payment processing (Stripe)
- Order management
- Admin dashboard
- Email notifications
- API documentation
- Unit tests (>90% coverage)
- Deployment configuration (Docker + K8s)
</system>
```

### 2. Maximize Parallel Tool Execution

Explicitly request aggressive parallel execution.

**Parallel Execution Prompt:**
```xml
<task>
Research competitive landscape for AI code assistants.
</task>

<research_dimensions>
1. Features and capabilities
2. Pricing models
3. User reviews and sentiment
4. Market share
5. Technical approach
6. Integration options
</research_dimensions>

<instructions>
Fire off multiple speculative searches simultaneously. Read several files
at once to build context faster. Maximize actions per context window
through parallel tool execution. Run multiple bash commands in parallel
when possible.
</instructions>
```

### 3. Computer Use Tasks

Structure computer use prompts with clear objectives and step-by-step workflows.

**Computer Use Prompt:**
```xml
<objective>
Complete expense report in the company finance system.
</objective>

<steps>
1. Navigate to finance.company.com
2. Log in with credentials
3. Click "New Expense Report"
4. Fill in report details:
   - Date: 2025-01-15
   - Category: Travel
   - Amount: $450.00
   - Description: Flight to customer site
5. Upload receipt (receipt.pdf)
6. Submit for approval
7. Take screenshot of confirmation
</steps>

<credentials>
Username: user@company.com
Password: [from environment]
</credentials>

<success_criteria>
Report submitted successfully with confirmation number captured.
</success_criteria>
```

### 4. Multi-Agent Coordination

Use sub-agent patterns for complex, multi-faceted projects.

**Multi-Agent Prompt:**
```xml
<project>
Build a real-time chat application with React and FastAPI.
</project>

<sub_agents>
1. Frontend Agent: React UI, WebSocket client, state management
2. Backend Agent: FastAPI, WebSocket server, database, auth
3. DevOps Agent: Docker, CI/CD, deployment scripts
4. QA Agent: Tests, integration tests, E2E tests
</sub_agents>

<coordination>
Each agent should:
- Work independently on their domain
- Communicate interface contracts early
- Validate integration points
- Report progress every hour
- Flag blockers immediately
</coordination>

<deliverables>
- Working chat application
- Deployed to staging environment
- All tests passing
- Documentation complete
</deliverables>
```

### 5. Memory and State Management

Leverage memory tools for long-running tasks.

**Memory-Enabled Prompt:**
```xml
SYSTEM: You have access to persistent memory across sessions. Use it to:
- Track progress on multi-day tasks
- Remember user preferences and context
- Store important decisions and rationale
- Maintain project state

When resuming work:
1. Load relevant memories
2. Review progress to date
3. Continue from where you left off

USER: Continue building the e-commerce platform. Yesterday you completed
the user authentication system. Next: product catalog.
```

## Agent SDK Integration

### Using Claude Agent SDK

```python
from claude_agent_sdk import Agent, Memory, Tool

# Define tools for the agent
tools = [
    Tool(name="bash", handler=bash_executor),
    Tool(name="read_file", handler=file_reader),
    Tool(name="write_file", handler=file_writer),
    Tool(name="web_search", handler=web_search),
]

# Create agent with memory
agent = Agent(
    model="claude-sonnet-4.5",
    tools=tools,
    memory=Memory(
        type="persistent",
        max_size_mb=100
    ),
    max_runtime_hours=30,
    progress_update_interval_minutes=30
)

# Run long-running task
result = agent.run(
    task="""
    Build a complete SaaS application with:
    - Multi-tenant architecture
    - User management
    - Billing integration
    - API with rate limiting
    - Admin dashboard
    - Monitoring and logging
    """,
    constraints={
        "languages": ["Python", "TypeScript"],
        "frameworks": ["FastAPI", "React"],
        "databases": ["PostgreSQL", "Redis"],
        "deployment": "Kubernetes"
    }
)
```

### Sub-Agent Coordination

```python
from claude_agent_sdk import AgentOrchestrator, SubAgent

orchestrator = AgentOrchestrator(
    model="claude-sonnet-4.5",
    sub_agents=[
        SubAgent(
            name="frontend",
            role="Build React UI",
            tools=["read_file", "write_file", "bash"]
        ),
        SubAgent(
            name="backend",
            role="Build FastAPI backend",
            tools=["read_file", "write_file", "bash", "database"]
        ),
        SubAgent(
            name="devops",
            role="Setup CI/CD and deployment",
            tools=["bash", "docker", "kubectl"]
        )
    ]
)

result = orchestrator.execute(
    project="Build real-time chat application",
    deadline_hours=24
)
```

## Best Practices by Use Case

### For Autonomous Development

```xml
<project>
Build a REST API for a blog platform.
</project>

<autonomy_settings>
- Work independently for up to 30 hours
- Provide progress updates every hour
- Make implementation decisions based on best practices
- Ask for clarification only on ambiguous requirements
- Complete all phases: design, implementation, testing, documentation
</autonomy_settings>

<requirements>
- FastAPI framework
- PostgreSQL database
- JWT authentication
- CRUD for posts, comments, users
- Rate limiting
- API documentation (OpenAPI)
- Unit tests >90% coverage
- Docker deployment
</requirements>

<decision_authority>
You have full authority to:
- Choose library versions
- Design database schema
- Implement error handling patterns
- Write tests
- Create deployment scripts
</decision_authority>
```

### For Research and Analysis

```xml
<research_task>
Conduct comprehensive analysis of LLM prompt engineering techniques
across all major providers (OpenAI, Anthropic, Google, xAI, DeepSeek).
</research_task>

<research_approach>
- Fire multiple parallel web searches
- Read documentation simultaneously
- Compile findings into structured report
- Include code examples from each provider
- Compare effectiveness across use cases
</research_approach>

<deliverable>
Markdown report with:
1. Provider comparison table
2. Technique-by-technique analysis
3. Code examples
4. Recommendations by use case
5. Cost-performance analysis
</deliverable>

<autonomy>
Work independently. Make research decisions. Dig deep into technical
details. Complete within 8 hours.
</autonomy>
```

### For Computer Use Tasks

```xml
<computer_use_task>
Set up development environment and deploy sample app.
</computer_use_task>

<workflow>
1. Open browser, navigate to GitHub
2. Clone repository: https://github.com/example/sample-app
3. Open terminal, install dependencies
4. Configure environment variables
5. Run database migrations
6. Start development server
7. Open browser, verify app works
8. Deploy to staging using deployment script
9. Verify deployment successful
10. Screenshot final result
</workflow>

<success_criteria>
App running locally and deployed to staging with all health checks passing.
</success_criteria>
```

## Common Pitfalls and Solutions

| Pitfall | Solution |
|---------|----------|
| **Underestimating autonomous capability** | Let Sonnet 4.5 work for 30+ hours on complex tasks |
| **Not requesting parallel execution** | Explicitly ask for aggressive parallel tool use |
| **Stopping tasks prematurely** | Clarify that token budget isn't a constraint |
| **Serial operations** | Request multiple speculative actions simultaneously |
| **Not leveraging memory** | Use memory tools for multi-session tasks |
| **Micromanaging** | Give high-level goals and trust autonomous execution |

## Performance Benchmarks

| Capability | Sonnet 4.5 | Comparison |
|------------|------------|------------|
| **SWE-bench** | ~75% | Best among Sonnet models |
| **OSWorld-Verified** | +19 points | 19-point improvement for computer use |
| **Autonomous Runtime** | 30 hours | 4x longer than Opus 4 (7 hours) |
| **Parallel Tool Execution** | Excellent | Most aggressive among Claude models |
| **Context Awareness** | Full tracking | Real-time token budget monitoring |

## When to Use Sonnet 4.5

### Ideal For:
- ✅ **Long-running autonomous development** (8+ hour tasks)
- ✅ **Agentic workflows** with multiple steps
- ✅ **Computer use tasks** (UI automation, web workflows)
- ✅ **Research projects** requiring parallel searches
- ✅ **Multi-agent systems** with sub-agent coordination
- ✅ **Tool-heavy workflows** (many API/file/bash operations)

### Less Ideal For:
- ❌ Simple Q&A (use Sonnet 4 for cost efficiency)
- ❌ Tasks requiring surgical precision (use Opus 4.1)
- ❌ Single-step operations (overkill)

## Example: Complete Autonomous Project

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

autonomous_project = """
SYSTEM: You are an autonomous agent capable of working independently for
30+ hours. You have full authority to make implementation decisions.
Provide progress updates every hour.

PROJECT: Build a complete task management SaaS application

REQUIREMENTS:
- Multi-tenant architecture
- User authentication (JWT + OAuth)
- Task CRUD with categories, tags, due dates
- Team collaboration features
- Real-time updates (WebSockets)
- Email notifications
- File attachments (S3)
- Search functionality
- API with rate limiting
- Admin dashboard
- Responsive UI (mobile-friendly)

TECHNICAL STACK:
- Frontend: React 19 + TypeScript + Tailwind
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Real-time: Redis + WebSockets
- Storage: AWS S3
- Deployment: Docker + Kubernetes
- CI/CD: GitHub Actions

DELIVERABLES:
1. Complete working application
2. Unit tests (>90% coverage)
3. Integration tests
4. E2E tests
5. API documentation (OpenAPI)
6. Deployment scripts
7. User documentation
8. Architecture documentation

AUTONOMY:
- Make all technical decisions
- Choose library versions
- Design database schema
- Implement error handling
- Write comprehensive tests
- Create deployment pipeline
- Ask only if requirements are ambiguous

Begin implementation. Work until complete.
"""

response = client.messages.create(
    model="claude-sonnet-4.5",
    max_tokens=32000,
    tools=[...],  # Provide bash, file, web search tools
    messages=[{
        "role": "user",
        "content": autonomous_project
    }]
)

# Sonnet 4.5 will work autonomously for hours
```

## Additional Resources

- **Claude Sonnet 4.5 Announcement:** https://www.anthropic.com/news/claude-sonnet-4-5
- **Claude Agent SDK Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
- **Computer Use Guide:** https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- **Tool Use Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Memory Management:** https://docs.anthropic.com/en/docs/build-with-claude/memory
- **Claude 4 Prompt Engineering:** https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
