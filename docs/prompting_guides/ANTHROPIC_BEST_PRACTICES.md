# Anthropic Claude Prompt Engineering Best Practices


**Official Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview

## Overview

This guide compiles the latest best practices for prompt engineering with Anthropic's Claude models (Claude 3.7 Sonnet, Claude Opus 4, Claude Opus 4.1, Claude Sonnet 4, Claude Sonnet 4.5). Claude models are distinguished by their extended thinking capabilities, XML tag support, and advanced reasoning patterns that make them particularly effective for coding, agentic workflows, and complex problem-solving.

## Core Prompting Principles

### 1. Use XML Tags for Structure

**Principle:** Claude models are specifically trained to recognize and work effectively with XML-style tags. Using structured tags improves clarity, reduces errors, and enables more sophisticated reasoning patterns.

**Key Benefits:**
- Clearer input/output separation
- Better instruction following
- Reduced hallucinations
- Improved chain-of-thought reasoning

**Examples:**

**Basic XML Structure:**
```xml
<document>
Here is the customer support conversation I need you to analyze.
</document>

<instructions>
1. Identify the customer's primary issue
2. Determine the sentiment (positive, neutral, negative)
3. Suggest next steps for the support team
</instructions>

<example>
Issue: Billing question
Sentiment: Neutral
Next steps: Escalate to billing department
</example>
```

**Thinking Block Pattern:**
```xml
<thinking>
Let me break down this problem step by step:
1. First, I need to understand what the user is asking
2. Then I'll identify the relevant information
3. Finally, I'll formulate a complete answer
</thinking>

<answer>
Based on my analysis, here's the solution...
</answer>
```

### 2. Extended Thinking Capabilities

**Principle:** Claude 4 models support extended thinking modes where the model can explicitly show its reasoning process before providing an answer. This reduces logic errors by up to 40% and improves accuracy on complex tasks.

**Key Tactics:**

- **Use thinking blocks** for complex reasoning tasks
- **Request step-by-step analysis** in separate sections
- **Leverage visible reasoning** to debug and improve prompts

**Examples:**

**Extended Thinking Pattern:**
```xml
SYSTEM: When solving complex problems, use the following structure:

<thinking>
Work through the problem step-by-step here. Show all your reasoning,
calculations, and considerations. This section is for your internal
reasoning process.
</thinking>

<answer>
Provide the final, polished answer here based on your thinking above.
</answer>

USER: Calculate the compound interest on $10,000 at 5% annually for 3 years,
compounded quarterly.
```

**Response Example:**
```xml
<thinking>
Compound interest formula: A = P(1 + r/n)^(nt)
Where:
- P = principal ($10,000)
- r = annual rate (0.05)
- n = compounds per year (4 quarterly)
- t = time in years (3)

Calculation:
A = 10000(1 + 0.05/4)^(4*3)
A = 10000(1 + 0.0125)^12
A = 10000(1.0125)^12
A = 10000(1.1608)
A = $11,608.00

Interest earned = $11,608 - $10,000 = $1,608
</thinking>

<answer>
The compound interest on $10,000 at 5% annually for 3 years, compounded
quarterly, is $1,608.00. The final amount would be $11,608.00.
</answer>
```

### 3. Chain-of-Thought with XML Tags

**Principle:** Combining chain-of-thought prompting with XML tags creates a structured reasoning framework that reduces logic errors and improves answer quality.

**Examples:**

**Structured CoT Pattern:**
```xml
<problem>
A train leaves Station A at 2:00 PM traveling at 60 mph. Another train
leaves Station B (240 miles away) at 3:00 PM traveling toward Station A
at 80 mph. When do they meet?
</problem>

<approach>
1. Calculate distance covered by first train in first hour
2. Set up equation for when trains meet
3. Solve for time
</approach>

<work>
[Show detailed calculations here]
</work>

<verification>
[Double-check the answer]
</verification>

<final_answer>
[Provide the final answer with context]
</final_answer>
```

### 4. Explicit and Clear Instructions

**Principle:** Claude models excel when given explicit, detailed instructions. Be specific about format, tone, constraints, and desired output structure.

**Key Tactics:**

- **Define the role** the model should adopt
- **Specify output format** explicitly
- **Set clear boundaries** on what to include/exclude
- **Use examples** to demonstrate desired output
- **State constraints** upfront (word count, style, etc.)

**Examples:**

**Role Definition:**
```xml
<role>
You are an experienced technical writer creating API documentation for
software engineers. Your writing should be precise, include code examples,
and follow the Google Developer Documentation Style Guide.
</role>

<task>
Document the following REST API endpoint...
</task>
```

**Output Format Specification:**
```xml
SYSTEM: Respond in the following JSON format only:

{
  "summary": "One sentence summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "recommendation": "Your recommendation",
  "confidence": "high/medium/low"
}

USER: Analyze this customer feedback...
```

### 5. Context Awareness and Long Context Handling

**Principle:** Claude Sonnet 4.5 and Claude Opus 4 series have exceptional context awareness and can work effectively with very long contexts (200K+ tokens). Leverage this for complex documents, codebases, and multi-turn conversations.

**Key Tactics:**

- **Front-load critical instructions** in the system prompt
- **Use section markers** for long documents
- **Reference specific sections** by tag or marker
- **Leverage the full context window** for comprehensive analysis

**Examples:**

**Long Document Analysis:**
```xml
<document id="legal_contract">
[... 50,000 tokens of legal text ...]
</document>

<instructions>
Analyze the contract above and:
1. Identify all termination clauses
2. List payment terms
3. Flag any unusual liability limitations
4. Summarize key dates and deadlines

Reference specific sections using the format: [Section X, Paragraph Y]
</instructions>
```

## Claude 4-Specific Advanced Techniques

### Parallel Tool Execution

Claude 4 models can execute multiple tool calls in parallel, improving efficiency for agentic workflows.

```python
# Claude can call multiple tools simultaneously
tools = [
    {
        "name": "get_weather",
        "description": "Get weather for a location",
        "input_schema": {...}
    },
    {
        "name": "get_news",
        "description": "Get latest news",
        "input_schema": {...}
    }
]

# Claude can invoke both tools in one response
response = client.messages.create(
    model="claude-sonnet-4.5",
    tools=tools,
    messages=[{
        "role": "user",
        "content": "What's the weather and latest news in San Francisco?"
    }]
)
```

### Extended Thinking for Debugging

Use extended thinking mode to debug code or analyze complex systems:

```xml
<code>
def calculate_discount(price, customer_type):
    if customer_type == "premium":
        return price * 0.8
    elif customer_type == "regular":
        return price * 0.9
    else:
        return price
</code>

<task>
Debug this code. A customer reported that premium members are getting
charged more than regular members.
</task>

<instructions>
Use extended thinking to:
1. Trace through the logic
2. Identify the bug
3. Explain why it causes the reported issue
4. Provide the corrected code
</instructions>
```

### Socratic Tutoring Pattern

Claude models excel at educational interactions using the Socratic method:

```xml
<role>
You are a patient tutor helping a student learn calculus. Use the Socratic
method: guide them to the answer through questions rather than giving
direct answers.
</role>

<guidelines>
- Ask probing questions
- Provide hints when stuck
- Encourage step-by-step thinking
- Celebrate correct reasoning
- Gently correct misconceptions
</guidelines>

<student_question>
I don't understand how to find the derivative of x^2.
</student_question>
```

## Best Practices by Use Case

### For Coding Tasks

1. **Use thinking blocks** to plan before coding
2. **Request explanations** alongside code
3. **Specify language and framework** versions
4. **Include test cases** in your prompt
5. **Use XML tags** to separate code, tests, and documentation

**Example:**
```xml
<task>
Write a Python function to validate email addresses.
</task>

<requirements>
- Use regex for validation
- Handle edge cases (subdomains, plus addressing)
- Include docstring and type hints
- Python 3.13+
</requirements>

<test_cases>
1. "user@example.com" → Valid
2. "user+tag@subdomain.example.com" → Valid
3. "invalid@" → Invalid
4. "@example.com" → Invalid
</test_cases>
```

### For Analysis and Research

1. **Provide comprehensive context** upfront
2. **Use structured output formats** (XML, JSON, tables)
3. **Request citations** for factual claims
4. **Leverage long context** for multi-document analysis
5. **Use thinking blocks** for complex reasoning

### For Agentic Workflows

1. **Define clear tool schemas** with detailed descriptions
2. **Use parallel tool execution** when possible
3. **Implement thinking blocks** before tool calls
4. **Provide conversation history** for context
5. **Set clear success criteria** for each step

## Common Pitfalls and How to Avoid Them

| Pitfall | Solution |
|---------|----------|
| **Vague instructions** | Be explicit about format, tone, length, and constraints |
| **Ignoring XML tags** | Use structured XML tags for better results with Claude |
| **Not using thinking blocks** | Request explicit reasoning for complex tasks |
| **Unclear output format** | Provide exact format specifications or examples |
| **Missing context** | Front-load all necessary context in the system prompt |
| **Underusing long context** | Leverage Claude's 200K+ context window for comprehensive tasks |

## Model Comparison

| Capability | Claude 3.7 Sonnet | Claude Opus 4 | Claude Opus 4.1 | Claude Sonnet 4 | Claude Sonnet 4.5 |
|------------|-------------------|---------------|-----------------|-----------------|-------------------|
| **Context Window** | 200K tokens | 200K tokens | 200K tokens | 200K tokens | 200K tokens |
| **Extended Thinking** | Hybrid modes | Yes | Yes | Yes | Yes |
| **Best Use Case** | Balanced tasks | Coding | Debugging | Efficiency | Agents/Computer use |
| **SWE-bench Score** | ~65% | ~70% | 74.5% | 72.7% | ~75% |
| **Unique Strength** | Flexible reasoning | Coding excellence | Debug accuracy | Cost-performance | Tool use/agents |

## Additional Resources

- **Prompt Engineering Guide:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- **Anthropic Cookbook:** https://github.com/anthropics/anthropic-cookbook
- **Extended Thinking Examples:** https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
- **Tool Use Guide:** https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Claude API Reference:** https://docs.anthropic.com/en/api
