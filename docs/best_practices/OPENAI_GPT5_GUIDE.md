# GPT-5 Model-Specific Prompting Guide

**Last Updated:** January 2025

**Official Documentation:** https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide

**Model:** `openai/gpt-5`

## Model Overview

GPT-5 is OpenAI's most advanced model, offering major improvements in reasoning, code quality, and user experience. Key capabilities:

- **Context Window:** 400,000 tokens
- **Max Completion Tokens:** 128,000 tokens
- **Strengths:** Advanced reasoning, reduced hallucinations, superior agentic performance, coding excellence
- **Reasoning Effort Parameter:** Adjustable thinking depth (low/medium/high)
- **Use Cases:** Complex problem-solving, autonomous agents, coding workflows, research, fact-checking

## Revolutionary Improvements

### 1. Reduced Hallucinations

- **~80% fewer factual errors** than o3 when using reasoning
- **~45% fewer factual errors** than GPT-4o with web search enabled
- Significantly more reliable for high-stakes applications

### 2. Superior Reasoning Performance

- Performs better than OpenAI o3 with **50-80% less output tokens** across:
  - Visual reasoning
  - Agentic coding
  - Graduate-level scientific problem solving

### 3. Improved Agentic Performance

- **78.2% on Tau-Bench Retail** (vs. 73.9% baseline) just by switching to Responses API
- Better tool orchestration and multi-step workflows
- More efficient context management

## The `reasoning_effort` Parameter

**Most Important New Feature:** Control how hard the model thinks.

```python
response = client.responses.create(
    model="gpt-5",
    input=[
        {"role": "user", "content": [{"type": "input_text", "text": "Solve this complex problem..."}]}
    ],
    reasoning={"effort": "high", "summary": "auto"}  # low | medium | high
)
```

### When to Use Each Level

| Effort | Best For | Tradeoffs |
|--------|----------|-----------|
| **low** | Simple queries, quick responses | Faster, cheaper, less thorough |
| **medium** | Most tasks (default) | Balanced speed/quality |
| **high** | Complex problems, critical accuracy | Slower, more expensive, most accurate |

**Rule of Thumb:** Scale effort based on task difficulty.

## Responses API (Strongly Recommended)

OpenAI **strongly recommends** using the Responses API for GPT-5:

```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input=[
        {
            "role": "developer",
            "content": [{"type": "input_text", "text": "System instructions here"}]
        },
        {
            "role": "user",
            "content": [{"type": "input_text", "text": "User query here"}]
        }
    ],
    text={"format": {"type": "text"}, "verbosity": "medium"},
    reasoning={"effort": "medium", "summary": "auto"},
    tools=[]  # Add tools as needed
)

answer = response.output_text
```

### Benefits of Responses API

- **Improved agentic flows** (78.2% vs 73.9% on Tau-Bench)
- **Lower costs** through more efficient token usage
- **Better reasoning control** with `reasoning_effort`
- **Cleaner output** with structured responses

## Prompt Optimization

### GPT-5 Prompt Optimizer (Playground Tool)

OpenAI provides a built-in Prompt Optimizer that:

- Removes common prompting failure modes
- Identifies contradictions in instructions
- Fixes missing or unclear format specifications
- Resolves inconsistencies between prompts and few-shot examples

**Access:** Available in OpenAI Playground

### Common Issues the Optimizer Fixes

1. **Contradictions:**
   - "Be concise" + "Provide detailed explanations"
   - "Use JSON" + "Return as bullet points"

2. **Missing Definitions:**
   - Undefined terms or labels
   - Ambiguous success criteria

3. **Format Inconsistencies:**
   - Prompt asks for JSON, examples show plain text
   - Conflicting output requirements

## Breaking Down Complex Tasks

**Peak Performance Strategy:** Break distinct, separable tasks across multiple agent turns.

**Bad (Single Turn):**
```python
# Don't do this for complex multi-step tasks
prompt = """
1. Analyze the codebase
2. Identify all bugs
3. Fix each bug
4. Write tests
5. Run tests
6. Document changes
"""
```

**Good (Multiple Turns):**
```python
# Turn 1: Analysis
response1 = analyze_codebase()

# Turn 2: Bug identification (uses results from turn 1)
response2 = identify_bugs(analysis=response1)

# Turn 3: Fix bugs (uses results from turn 2)
response3 = fix_bugs(bugs=response2)

# Turn 4: Testing & documentation
response4 = test_and_document(fixes=response3)
```

**Why:** Each turn allows the model to focus on one task, improving quality and reducing errors.

## Prompting Best Practices

### 1. Be Specific and Explicit

GPT-5 benefits from clear, detailed instructions:

```python
# Good
prompt = """
Objective: Generate a single, self-contained Python script that exactly solves the specified task.

Hard requirements:
- Use only Python stdlib. No approximate algorithms.
- Tokenization: ASCII [a-z0-9]+ on the original text; match case-insensitively.
- Exact Top‑K semantics: sort by count desc, then token asc.
- Define `top_k` as a list of (token, count) tuples.
- No file I/O, stdin, or network access.

Performance constraints:
- Do NOT materialize the entire token stream.
- Target peak additional memory beyond the counts dict to O(k).

Output format:
- Output only one Python code block; no text outside the block.
"""
```

### 2. Specify Behavioral Priorities

For tasks with multiple requirements, specify priority order:

```python
system_prompt = """
You are a finance document QA assistant.

Behavioral priorities (in order):
1) Grounding: Use ONLY the text inside [Context]. Do NOT use outside knowledge.
2) Evidence check: Verify that the answer text is explicitly present in [Context].
3) Robustness to query noise: Handle misspellings and unclear phrasing.
4) OCR noise handling: Ignore junk characters, reconstruct meaning when possible.

Refusal policy:
- If [Context] is empty or lacks the information, refuse with brief guidance.
- If the question is unrelated to [Context], refuse with brief guidance.

Answer style:
- Default to the shortest exact answer needed (preserve units, signs, casing).
- If the user asks to "write" or "draft", you may produce multi-sentence text.

Output format:
- If answerable: FINAL: <exact answer>
- If refusing: FINAL: Insufficient information in the provided context...
"""
```

### 3. Use Advanced Chain-of-Thought

For complex reasoning tasks:

```python
prompt = """
# Reasoning Strategy
1. Query Analysis: Break down and analyze the query until confident about what it's asking.
   Consider the provided context to clarify any ambiguous information.

2. Context Analysis: Carefully select and analyze a large set of potentially relevant documents.
   Optimize for recall - it's okay if some are irrelevant, but the correct documents
   must be in this list.

   For each document:
   a. Analysis: How it may or may not be relevant to answering the query.
   b. Relevance rating: [high, medium, low, none]

3. Synthesis: Summarize which documents are most relevant and why, including all
   documents with a relevance rating of medium or higher.

# User Question
{user_question}

# External Context
{external_context}

First, think carefully step by step about what documents are needed to answer the query,
closely adhering to the provided Reasoning Strategy.
"""
```

## Reducing Hallucinations

### Grounding with Context

```python
system_prompt = """
Grounding Rules:
1. ONLY use information from the provided [Context].
2. Do NOT use outside knowledge or make assumptions.
3. Before answering, verify the answer text is explicitly present in [Context].
4. If information is missing, refuse politely and request the relevant document.

[Context]
{context_text}

[Question]
{user_question}
"""
```

### Evidence-Based Responses

```python
output_format = """
Output format:
- If answerable from the context:
  FINAL: <exact answer here>
  EVIDENCE: "<quoted span from the context that contains the answer>"

- If refusing:
  FINAL: Insufficient information in the provided context to answer this question.
  Please upload the relevant document or refine your question.
"""
```

## Web Search Integration

GPT-5 with web search enabled shows **~45% fewer factual errors** than GPT-4o:

```python
response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "user", "content": "What are the latest developments in quantum computing?"}
    ],
    web_search_options={"enabled": True}
)
```

## Code Generation

### Optimized Code Prompting

```python
prompt = """
# Objective
Generate production-ready, efficient Python code for {task_description}.

# Hard requirements
- Use only Python stdlib unless otherwise specified
- Follow PEP 8 style guidelines
- Include type hints
- Add docstrings for all public functions
- No global state or mutable defaults

# Performance constraints
- Time complexity: O(n log n) or better
- Space complexity: O(n) or better
- Avoid unnecessary copies or allocations

# Testing requirements
- Include at least 3 test cases
- Cover edge cases (empty input, single element, large input)
- Use assert statements for validation

# Output format
- Single Python file
- Well-structured and readable
- Comments only for complex logic
"""
```

## Agentic Workflows

### Optimal Agent Configuration

```python
class GPT5Agent:
    def __init__(self):
        self.client = OpenAI()

    def solve_task(self, task_description, context=None):
        return self.client.responses.create(
            model="gpt-5",
            input=[
                {
                    "role": "developer",
                    "content": [
                        {
                            "type": "input_text",
                            "text": self._build_system_prompt(task_description)
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": context or task_description
                        }
                    ]
                }
            ],
            text={"format": {"type": "text"}, "verbosity": "medium"},
            reasoning={"effort": "high", "summary": "auto"},  # High effort for complex tasks
            tools=self._get_tools()
        )

    def _build_system_prompt(self, task):
        return f"""
        You are an autonomous agent solving: {task}

        Guidelines:
        1. Plan your approach before taking action
        2. Use tools when appropriate
        3. Verify your work at each step
        4. Continue until the task is fully solved
        5. Only terminate when you're certain the solution is correct
        """
```

## Evaluation & Testing

### LLM-as-a-Judge Pattern

```python
class OpenAIJudge:
    def __init__(self):
        self.client = OpenAI()

    def evaluate(self, prompt, response, criteria):
        judge_prompt = f"""
        Evaluate the following AI response against the specified criteria.

        Prompt: {prompt}
        Response: {response}

        Criteria: {criteria}

        Rate the response on a scale of 1-5 for:
        1. Accuracy
        2. Completeness
        3. Clarity
        4. Relevance

        Provide your rating as JSON: {{"accuracy": X, "completeness": X, ...}}
        """

        resp = self.client.responses.create(
            model="gpt-5",
            input=[{"role": "user", "content": [{"type": "input_text", "text": judge_prompt}]}],
            reasoning={"effort": "medium", "summary": "auto"}
        )
        return resp.output_text
```

## Performance Optimization

### Token Efficiency

**GPT-5 uses 50-80% fewer tokens** than o3 for equivalent performance:

- Use `reasoning.effort` appropriately (don't always use "high")
- Break tasks into separate turns to reduce context size per call
- Use the Responses API for better token management

### Cost Optimization

```python
# Adjust reasoning effort based on task complexity
def get_response(query, complexity="medium"):
    effort_map = {
        "simple": "low",
        "medium": "medium",
        "complex": "high"
    }

    return client.responses.create(
        model="gpt-5",
        input=[{"role": "user", "content": [{"type": "input_text", "text": query}]}],
        reasoning={"effort": effort_map[complexity]}
    )
```

## Best Practices Summary

| Principle | Action |
|-----------|--------|
| **Use Responses API** | Always prefer Responses API for GPT-5 (78.2% vs 73.9% Tau-Bench) |
| **Reasoning Effort** | Scale `reasoning_effort` based on task difficulty |
| **Break Down Tasks** | Separate distinct tasks across multiple agent turns |
| **Be Explicit** | Provide detailed, prioritized instructions |
| **Ground Responses** | Require evidence from provided context |
| **Optimize Prompts** | Use the Prompt Optimizer tool in Playground |
| **Web Search** | Enable for fact-checking (45% fewer errors) |
| **Token Efficiency** | GPT-5 uses 50-80% fewer tokens than o3 |

## Common Pitfalls

1. **Not using Responses API** → Missing out on 4-5% performance gain
2. **Always using `effort="high"`** → Unnecessary cost and latency
3. **Cramming multiple tasks into one turn** → Reduces quality
4. **Vague instructions** → Model doesn't know priorities
5. **Not grounding responses** → Increases hallucinations
6. **Using old prompting patterns** → GPT-5 works best with its own API

## Model Comparison

| Feature | GPT-5 | GPT-4.1 | GPT-4o |
|---------|-------|---------|--------|
| **Context** | 400K | 1M | 128K |
| **Reasoning** | ✅ Best (with effort param) | ❌ Not a reasoning model | ❌ Not a reasoning model |
| **Hallucinations** | ✅ 80% fewer than o3 | Medium | Medium |
| **Agentic** | ✅ Best (78.2% Tau-Bench) | ✅ Good | ✅ Good |
| **Efficiency** | ✅ 50-80% fewer tokens than o3 | Medium | Good |
| **Best For** | Complex reasoning, agents, code | Long context, coding | Multimodal, balanced |

## Additional Resources

- **GPT-5 Prompting Guide:** https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide
- **Prompt Optimization Cookbook:** https://cookbook.openai.com/examples/gpt-5/prompt-optimization-cookbook
- **Responses API Docs:** https://platform.openai.com/docs/guides/responses-api
- **Introducing GPT-5:** https://openai.com/index/introducing-gpt-5/
