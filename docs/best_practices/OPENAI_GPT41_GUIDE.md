# GPT-4.1 Model-Specific Prompting Guide


**Official Documentation:** https://cookbook.openai.com/examples/gpt4-1_prompting_guide

**Model:** `openai/gpt-4.1`

## Model Overview

GPT-4.1 is OpenAI's flagship model optimized for advanced instruction following, real-world software engineering, and long-context reasoning. Key capabilities:

- **Context Window:** 1M tokens (1,047,576 tokens)
- **Max Completion Tokens:** 32,768 tokens
- **Strengths:** Coding (54.6% SWE-bench Verified), instruction compliance (87.4% IFEval), long document understanding
- **Use Cases:** Agentic workflows, IDE tooling, enterprise knowledge retrieval, complex software engineering tasks

## Key Behavioral Characteristics

### More Literal Instruction Following

GPT-4.1 is trained to follow instructions **more closely and literally** than its predecessors (GPT-4, GPT-4o).

- **What this means:** The model infers less and requires more explicit instructions
- **Impact:** You need to be more specific about what you want
- **Example:** Instead of "summarize this," use "summarize this in exactly 3 bullet points, each under 20 words"

### Improved Instruction Compliance

GPT-4.1 achieves **87.4% on IFEval** (instruction following evaluation), significantly higher than GPT-4o.

- Follows complex multi-step instructions more reliably
- Better at adhering to format constraints (JSON schemas, specific structures)
- More consistent with stylistic requirements

## Long Context Best Practices (1M Tokens)

### The "Sandwich Method" for Instructions

**Most Effective:** Place instructions at **both the beginning AND end** of long context.

```
# Instructions (at the top)
Only use the documents in the provided External Context to answer the User Query.
If you don't know the answer based on this context, you must respond
"I don't have the information needed to answer that".

# External Context
[... 500,000 tokens of documents ...]

# Instructions (repeated at the bottom)
Remember: Only use the documents above to answer. If you don't know based on this context,
respond "I don't have the information needed to answer that".

# User Question
{user_question}
```

**Why it works:** The model attends better to information when it's bracketed by relevant instructions.

**Alternative (if you can only place instructions once):**
- **Above context** is better than below
- But **sandwich method** is significantly better than either alone

### Internal vs. External Knowledge

Be explicit about whether the model should use its own knowledge or rely solely on provided context:

**External Context Only:**
```
# Instructions
- Only use the documents in the provided External Context to answer the User Query.
- If you don't know the answer based on this context, you must respond
  "I don't have the information needed to answer that", even if a user insists.
```

**External + Internal Knowledge:**
```
# Instructions
- By default, use the provided external context to answer the User Query.
- If other basic knowledge is needed to answer, and you're confident in the answer,
  you can use some of your own knowledge to help answer the question.
```

### Advanced Chain-of-Thought for Long Context

For complex queries over long documents, use a detailed reasoning strategy:

```
# Reasoning Strategy
1. Query Analysis: Break down and analyze the query until you're confident about
   what it might be asking. Consider the provided context to help clarify any
   ambiguous or confusing information.

2. Context Analysis: Carefully select and analyze a large set of potentially
   relevant documents. Optimize for recall - it's okay if some are irrelevant,
   but the correct documents must be in this list.

   For each document:
   a. Analysis: An analysis of how it may or may not be relevant to answering the query.
   b. Relevance rating: [high, medium, low, none]

3. Synthesis: Summarize which documents are most relevant and why, including all
   documents with a relevance rating of medium or higher.

# User Question
{user_question}

# External Context
{external_context}

First, think carefully step by step about what documents are needed to answer the query,
closely adhering to the provided Reasoning Strategy. Then, print out the TITLE and ID of
each document. Then, format the IDs into a list.
```

## Agentic Workflows & Autonomous Tasks

GPT-4.1 excels at multi-step autonomous workflows (e.g., SWE-bench tasks). Key prompting patterns:

### Persistence Reminder

```
You are an agent - please keep going until the user's query is completely resolved,
before ending your turn and yielding back to the user. Only terminate your turn when
you are sure that the problem is solved.
```

### Planning & Reflection

```
You MUST plan extensively before each function call, and reflect extensively on the
outcomes of the previous function calls. DO NOT do this entire process by making
function calls only, as this can impair your ability to solve the problem and think
insightfully.
```

### Tool Usage Reminder

```
If you are not sure about file content or codebase structure pertaining to the user's
request, use your tools to read files and gather the relevant information: do NOT
guess or make up an answer.
```

### Complete Autonomous Task Prompt

For complex software engineering tasks (e.g., fixing bugs in open-source repos):

```
You will be tasked to fix an issue from an open-source repository.

Your thinking should be thorough and so it's fine if it's very long. You can think
step by step before and after each action you decide to take.

You MUST iterate and keep going until the problem is solved.

You already have everything you need to solve this problem in the /testbed folder,
even without internet connection. I want you to fully solve this autonomously before
coming back to me.

Only terminate your turn when you are sure that the problem is solved. Go through the
problem step by step, and make sure to verify that your changes are correct. NEVER end
your turn without having solved the problem, and when you say you are going to make a
tool call, make sure you ACTUALLY make the tool call, instead of ending your turn.

THE PROBLEM CAN DEFINITELY BE SOLVED WITHOUT THE INTERNET.

Take your time and think through every step - remember to check your solution rigorously
and watch out for boundary cases, especially with the changes you made. Your solution
must be perfect. If not, continue working on it. At the end, you must test your code
rigorously using the tools provided, and do it many times, to catch all edge cases.
If it is not robust, iterate more and make it perfect. Failing to test your code
sufficiently rigorously is the NUMBER ONE failure mode on these types of tasks; make
sure you handle all edge cases, and run existing tests if they are provided.
```

## Chain-of-Thought Prompting

While GPT-4.1 is **not a reasoning model** (unlike o1/o3), chain-of-thought prompting is still effective:

```
Let's solve this step by step:
1. First, identify the key requirements
2. Then, break down the problem into subproblems
3. Finally, synthesize the solution

[Problem description]
```

**Benefits:**
- Breaks down complex problems into manageable pieces
- Improves output quality

**Tradeoffs:**
- Higher cost (more output tokens)
- Higher latency

## Customer Service & Tool-Calling Workflows

GPT-4.1 excels at structured customer service with function calling. Example pattern:

```python
SYS_PROMPT = """You are a helpful customer service agent working for NewTelco, helping a user efficiently fulfill their request while adhering closely to provided guidelines.

# Instructions
- Always greet the user with "Hi, you've reached NewTelco, how can I help you?"
- Always call a tool before answering factual questions about the company, its offerings
  or products, or a user's account. Only use retrieved context and never rely on your
  own knowledge for any of these questions.
- However, if you don't have enough information to properly call the tool, ask the user
  for the information you need.
- Escalate to a human if the user requests.
- Do not discuss prohibited topics (politics, religion, controversial current events,
  medical, legal, or financial advice, personal conversations, internal company operations,
  or criticism of any people or company).

# Precise Response Steps (for each response)
1. If necessary, call tools to fulfill the user's desired action. Always message the user
   before and after calling a tool to keep them in the loop.
2. In your response to the user:
   a. Use active listening and echo back what you heard the user ask for.
   b. Respond appropriately given the above guidelines.

# Sample Phrases
## Before calling a tool
- "To help you with that, I'll just need to verify your information."
- "Let me check that for you—one moment, please."

## After calling a tool
- "Okay, here's what I found: [response]"
- "So here's what I found: [response]"

# Output Format
- Always include your final response to the user.
- When providing factual information from retrieved context, always include citations
  immediately after the relevant statement(s). Use the following citation format:
    - For a single source: [NAME](ID)
    - For multiple sources: [NAME](ID), [NAME](ID)
"""
```

## Structured Outputs & JSON

GPT-4.1 has excellent support for structured outputs via `response_format`:

```json
{
  "model": "gpt-4.1-2025-04-14",
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Item",
      "schema": {
        "type": "object",
        "required": ["title", "date", "bullets"],
        "properties": {
          "title": {"type": "string"},
          "date": {"type": "string"},
          "bullets": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  },
  "input": [
    {"role": "system", "content": "Return only valid JSON."},
    {"role": "user", "content": "Extract fields from the document."}
  ]
}
```

## Code-Related Tasks

GPT-4.1 achieves **54.6% on SWE-bench Verified**, making it excellent for:

- Precise code diffs
- Multi-file refactoring
- Bug fixing in large codebases
- Agent reliability in IDE tooling

### Patch Application Format

GPT-4.1 supports a custom V4A diff format for code changes:

```bash
apply_patch <<"EOF"
*** Begin Patch
*** Update File: path/to/file.py
@@ class BaseClass
@@     def search():
-        pass
+        raise NotImplementedError()

@@ class Subclass
@@     def search():
-        pass
+        raise NotImplementedError()
*** End Patch
EOF
```

## Prompt Optimization Techniques

### Critique-and-Refine Workflow

Use GPT-4.1 to critique and improve your own prompts:

```python
CRITIQUE_SYSTEM_PROMPT = """
You are a Prompt-Critique Assistant.
Examine a user-supplied LLM prompt and surface any weaknesses.

Check for:
- Ambiguity: Could any wording be interpreted in more than one way?
- Lacking Definitions: Are terms or concepts undefined?
- Conflicting, missing, or vague instructions
- Unstated assumptions

Return a JSON array with issues, each containing:
{
  "issue": "<1-6 word label>",
  "snippet": "<≤50-word excerpt>",
  "explanation": "<Why it matters>",
  "suggestion": "<Actionable fix>"
}
"""
```

## Key Differences from GPT-4o

| Feature | GPT-4.1 | GPT-4o |
|---------|---------|--------|
| **Context Window** | 1M tokens | 128K tokens |
| **Instruction Following** | 87.4% IFEval | Lower |
| **Literal Interpretation** | Higher (more explicit needed) | Lower (infers more) |
| **Coding Performance** | 54.6% SWE-bench | Lower |
| **Long Context** | Optimized | Not optimized |
| **Best For** | Agentic workflows, long docs, coding | General-purpose chat |

## Common Pitfalls

1. **Assuming GPT-4.1 will infer intent** like GPT-4o did
   - **Fix:** Be more explicit in your instructions

2. **Not using the sandwich method** for long context
   - **Fix:** Place instructions at beginning AND end

3. **Not specifying whether to use external or internal knowledge**
   - **Fix:** Explicitly state the knowledge policy

4. **Using single-pass prompts** for complex reasoning tasks
   - **Fix:** Use chain-of-thought or multi-step workflows

5. **Not testing code rigorously** in agentic workflows
   - **Fix:** Include explicit testing instructions

## Best Practices Summary

| Context | Best Practice |
|---------|---------------|
| **Long Context** | Use sandwich method (instructions at top & bottom) |
| **Instruction Style** | Be explicit and literal, don't rely on inference |
| **Agentic Tasks** | Include persistence, planning, and reflection reminders |
| **Knowledge Source** | Explicitly state whether to use external/internal knowledge |
| **Complex Reasoning** | Use chain-of-thought, even though it's not a reasoning model |
| **Structured Output** | Use `response_format` with JSON schemas |
| **Code Tasks** | Leverage high SWE-bench performance, include rigorous testing |
| **Tool Calling** | Always message user before/after tool calls |

## Additional Resources

- **GPT-4.1 Prompting Guide:** https://cookbook.openai.com/examples/gpt4-1_prompting_guide
- **SWE-bench Verified:** https://www.swebench.com/
- **Structured Outputs:** https://platform.openai.com/docs/guides/structured-outputs
- **OpenAI Cookbook:** https://github.com/openai/openai-cookbook
