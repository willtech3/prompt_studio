# Claude Opus 4 - Best Coding Model Guide


**Official Documentation:** https://www.anthropic.com/news/claude-4

## Model Overview

Claude Opus 4 is **the best coding model in the world**, achieving state-of-the-art performance on SWE-bench (72.5%) and Terminal-bench (43.2%). It excels at complex coding tasks, multi-file refactoring, large codebase navigation, and precise instruction following.

**Key Specifications:**
- **Context Window:** 200,000 tokens
- **Output Tokens:** 32,000 tokens (extended generation support)
- **SWE-bench Score:** 72.5% (state-of-the-art at release)
- **Terminal-bench Score:** 43.2%
- **Best For:** Complex coding, refactoring, codebase analysis, software engineering tasks
- **Unique Strengths:** Parallel tool execution, improved memory with local file access, exceptional code taste

## Core Prompting Principles for Coding

### 1. Be Explicit and Specific

Claude Opus 4 responds exceptionally well to clear, explicit instructions. Specify exactly what you want in terms of:
- Programming language and version
- Framework or library versions
- Coding style and standards
- Expected output format
- Test coverage requirements

**Example:**
```xml
<task>
Implement a rate limiter for a REST API.
</task>

<requirements>
- Language: Python 3.13+
- Framework: FastAPI
- Algorithm: Token bucket
- Storage: Redis
- Rate limits: 100 requests/minute per user, 1000 requests/hour
- Include unit tests using pytest
- Follow PEP 8 standards
- Add docstrings and type hints
</requirements>
```

### 2. Use Extended Thinking for Complex Tasks

Extended thinking is especially helpful for tasks involving reflection after tool use or complex multi-step reasoning.

**Prompt Pattern:**
```xml
SYSTEM: After receiving tool results, carefully reflect on their quality
and determine optimal next steps before proceeding. Use thinking blocks to
show your reasoning.

<thinking>
[Your step-by-step reasoning about the code structure, edge cases, and
implementation approach]
</thinking>

<implementation>
[The actual code]
</implementation>

USER: Refactor this legacy codebase to use async/await patterns...
```

### 3. Leverage Context Awareness

Claude Sonnet 4.5 (and Opus 4 to a lesser extent) features context awareness - the model tracks its remaining context window throughout a conversation.

**Prompt for Long Tasks:**
```xml
SYSTEM: Your context window will be automatically compacted as it
approaches its limit, allowing you to continue working indefinitely from
where you left off. Therefore, do not stop tasks early due to token budget
concerns. Complete the full implementation.

USER: Refactor this entire Django application to use PostgreSQL instead
of SQLite, updating all 50+ model files...
```

### 4. Prevent Hard-Coding and Ensure Quality

Simple prompts can dramatically reduce Claude Opus 4's propensity towards undesired behaviors.

**Anti-Hard-Coding Prompt:**
```
Please implement <function_name> for me. Please write a high quality,
general purpose solution. If the task is unreasonable or infeasible, or
if any of the tests are incorrect, please tell me. Do not hard code any
test cases. Please tell me if the problem is unreasonable instead of hard
coding test cases!
```

### 5. Control Output Formatting Style

The formatting style used in your prompt may influence Claude's response style. Match your prompt style to your desired output style.

**Example:**
- **To reduce markdown in output:** Remove markdown from your prompt
- **To get concise code:** Use concise language in your instructions
- **To get verbose explanations:** Include verbose examples in your prompt

## Advanced Coding Techniques

### Parallel Tool Execution

Claude 4 can execute multiple tool calls in parallel, significantly improving efficiency.

**Example Prompt:**
```xml
<task>
Set up a new React + TypeScript project with the following:
1. Initialize npm project
2. Install dependencies (react, typescript, vite, tailwind)
3. Create folder structure (src/, components/, utils/, types/)
4. Set up Tailwind config
5. Create initial App.tsx component
</task>

<instructions>
Use parallel tool execution where possible to maximize efficiency. Run
independent commands simultaneously.
</instructions>
```

**API Example:**
```python
tools = [
    {
        "name": "execute_bash",
        "description": "Execute bash commands",
        "input_schema": {...}
    },
    {
        "name": "write_file",
        "description": "Write content to a file",
        "input_schema": {...}
    },
    {
        "name": "read_file",
        "description": "Read file contents",
        "input_schema": {...}
    }
]

response = client.messages.create(
    model="claude-opus-4",
    tools=tools,
    max_tokens=8192,
    messages=[{
        "role": "user",
        "content": "Set up the React + TypeScript project as specified..."
    }]
)

# Claude can call multiple tools in parallel (e.g., write_file for
# multiple files simultaneously)
```

### Multi-File Refactoring

Opus 4 handles multi-file code refactoring and large codebase navigation adeptly.

**Refactoring Prompt:**
```xml
<codebase>
[Provide relevant files or directory structure]
</codebase>

<refactoring_task>
Refactor this codebase to:
1. Extract common utilities into a shared utils module
2. Apply dependency injection for better testability
3. Add proper error handling throughout
4. Update all affected files consistently
</refactoring_task>

<constraints>
- Maintain backward compatibility
- Don't break existing tests
- Update imports across all files
- Preserve existing functionality
</constraints>
```

### Code Review and Debugging

**Code Review Prompt:**
```xml
<code>
[Paste code here]
</code>

<review_focus>
1. Security vulnerabilities
2. Performance bottlenecks
3. Code smells and anti-patterns
4. Test coverage gaps
5. Documentation quality
</review_focus>

<instructions>
Provide specific line-by-line feedback with:
- Issue severity (High/Medium/Low)
- Explanation of the problem
- Concrete code examples for fixes
</instructions>
```

## Best Practices by Task Type

### For New Feature Implementation

```xml
<feature>
Add user authentication with JWT tokens to the API.
</feature>

<technical_details>
- Framework: FastAPI
- Database: PostgreSQL with SQLAlchemy
- Password hashing: bcrypt
- Token expiry: 24 hours
- Include refresh token mechanism
</technical_details>

<deliverables>
1. Authentication routes (login, register, refresh)
2. JWT middleware
3. Password hashing utilities
4. Database models
5. Unit tests (>90% coverage)
6. API documentation
</deliverables>

<thinking>
[Work through the architecture before coding]
</thinking>
```

### For Bug Fixes

```xml
<bug_report>
Users report that premium members are being charged more than regular
members, opposite of expected behavior.
</bug_report>

<current_code>
def calculate_discount(price, customer_type):
    if customer_type == "premium":
        return price * 0.8
    elif customer_type == "regular":
        return price * 0.9
    else:
        return price
</current_code>

<instructions>
Use extended thinking to:
1. Trace through the logic
2. Identify the root cause
3. Explain why it causes the reported issue
4. Provide corrected code with tests
</instructions>
```

### For Codebase Analysis

```xml
<analysis_task>
Analyze this codebase and identify:
1. Architectural patterns in use
2. Key dependencies and their versions
3. Potential technical debt
4. Opportunities for optimization
5. Security considerations
</analysis_task>

<codebase>
[Provide directory structure and key files]
</codebase>

<output_format>
Provide a structured markdown report with sections for each analysis point.
Include code references using filename:line_number format.
</output_format>
```

## Common Pitfalls and Solutions

| Pitfall | Solution |
|---------|----------|
| **Vague requirements** | Specify language, framework, versions, standards, and test requirements |
| **Not using thinking blocks** | Request explicit reasoning for complex refactoring or architecture decisions |
| **Missing context** | Provide full file context, directory structure, and dependencies |
| **Ignoring parallel execution** | Prompt for parallel tool calls on independent operations |
| **Hard-coded solutions** | Explicitly request general-purpose, high-quality solutions |
| **Unclear success criteria** | Define exactly what "done" looks like (tests passing, documentation, etc.) |

## Performance Benchmarks

| Benchmark | Claude Opus 4 Score | Context |
|-----------|---------------------|---------|
| **SWE-bench** | 72.5% | Real-world software engineering tasks |
| **Terminal-bench** | 43.2% | Command-line interface tasks |
| **HumanEval** | ~90% | Python coding problems |
| **Instruction Following** | State-of-the-art | Precise adherence to coding requirements |

## Code Quality Features

1. **Code Taste:** Adapts to your specific coding style while maintaining best practices
2. **32K Output:** Supports extensive generation and refactoring projects
3. **Memory Improvements:** Better recall when given access to local files
4. **Tool Use:** Can use tools in parallel for faster workflows
5. **Instruction Following:** More precise than previous generations

## Example: Complete Feature Implementation

**Prompt:**
```xml
<feature>
Build a file upload system with virus scanning.
</feature>

<requirements>
- Language: Python 3.13+
- Framework: FastAPI
- Storage: AWS S3
- Virus scanning: ClamAV
- Max file size: 100MB
- Allowed types: PDF, DOCX, XLSX, images
- Include progress tracking
</requirements>

<architecture>
1. Upload endpoint with multipart form data
2. File validation (type, size)
3. Temporary storage
4. Virus scan with ClamAV
5. Upload to S3 if clean
6. Return download URL
7. Clean up temp files
</architecture>

<deliverables>
- Complete implementation
- Unit tests (>90% coverage)
- Integration tests
- API documentation
- Error handling
- Logging
</deliverables>

<thinking>
[Think through the architecture, edge cases, error scenarios, and
implementation order before coding]
</thinking>
```

## Additional Resources

- **Claude 4 Announcement:** https://www.anthropic.com/news/claude-4
- **Claude 4 Prompt Engineering Guide:** https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
- **Anthropic Cookbook:** https://github.com/anthropics/anthropic-cookbook
- **Tool Use Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Extended Thinking Guide:** https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
