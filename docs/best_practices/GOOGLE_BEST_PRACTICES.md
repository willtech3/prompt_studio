# Google Gemini Prompt Engineering Best Practices


**Official Documentation:** https://ai.google.dev/gemini-api/docs/prompting-strategies

## Overview

This guide compiles the latest best practices for prompt engineering with Google's Gemini models (Gemini 2.5 Flash, Gemini 2.5 Pro). Gemini models are distinguished by their native multimodal capabilities, long context windows (1M+ tokens), and efficient performance across text, images, video, audio, and code.

## Core Prompting Principles

### 1. Be Specific and Iterate

**Principle:** Tell Gemini exactly what you need it to do and provide as much context as possible. The most fruitful prompts average around 21 words with relevant context, yet most prompts people try are usually less than nine words.

**Key Actions:**
- Clearly state what you want (summarize, write, change tone, create)
- Provide complete context and background
- Include specific requirements and constraints
- Define expected output format

**Examples:**

**Poor Prompt (7 words):**
```
Analyze this sales data.
```

**Better Prompt (23 words):**
```
Analyze Q1 2025 sales data from our e-commerce platform, focusing on
conversion rates, customer retention, and top 3 revenue-driving products.
Provide actionable recommendations.
```

### 2. Use Natural Language

**Principle:** Write as if you're speaking to another person and express complete thoughts.

**Good Practices:**
- Write conversationally, not in keywords
- Use complete sentences
- Express your thought process
- Avoid jargon and acronyms unless necessary

**Example:**
```
Instead of: "Python function email validation regex"

Use: "Write a Python function that validates email addresses using regex.
The function should handle edge cases like subdomains and plus addressing,
and return both a boolean and descriptive error message."
```

### 3. Structure Your Prompts

**Principle:** Start by defining the model's role, give context/input data, then provide the instruction.

**Recommended Structure:**
```
[Role] → [Context/Data] → [Instruction] → [Output Format]
```

**Example:**
```
ROLE: You are a senior data analyst with expertise in e-commerce metrics.

CONTEXT: Our online store has seen a 15% drop in conversion rates over
the past month despite increased traffic.

DATA:
- Traffic: +25% (100K → 125K visitors)
- Add-to-cart: +20% (10K → 12K)
- Completed purchases: -5% (5K → 4.75K)
- Average cart value: -10% ($75 → $67.50)

INSTRUCTION: Analyze this data and identify the root causes of the
conversion rate drop. Consider factors like user experience, pricing,
checkout friction, and competition.

OUTPUT: Provide:
1. Top 3 most likely causes (ranked by impact)
2. Supporting evidence from the data
3. Recommended actions for each cause
```

### 4. Be Concise and Avoid Complexity

**Principle:** State your request in brief but specific language and avoid unnecessary complexity.

**Guidelines:**
- Remove filler words and redundant explanations
- Break complex tasks into multiple simpler prompts
- Use bullet points for lists of requirements
- Avoid nested conditionals or overly complex logic

**Example:**

**Too Complex:**
```
I need you to, if possible and if you have time, maybe look at this code
and see if there might be any issues or problems that could potentially
cause bugs or errors in the future, or perhaps suggest some improvements
if you think they would be helpful.
```

**Better:**
```
Review this code for:
- Potential bugs or errors
- Performance issues
- Suggested improvements
```

### 5. Make it a Conversation

**Principle:** Fine-tune your prompts if the results don't meet your expectations. Use iterative refinement.

**Conversational Pattern:**
```
USER: Write a function to validate passwords.

GEMINI: [Returns basic validation function]

USER: Good start. Now add requirements for:
- Minimum 12 characters
- At least one special character
- No common dictionary words
- Return detailed error messages

GEMINI: [Returns improved function]

USER: Perfect. Now add unit tests for edge cases.
```

### 6. Few-Shot Prompting

**Principle:** Gemini can often pick up on patterns using a few examples, though you may need to experiment with the number of examples.

**Important:** Make sure the structure and formatting of few-shot examples are the same to avoid responses with undesired formats. Pay special attention to XML tags, white spaces, newlines, and example splitters.

**Example:**
```
Classify customer feedback as positive, neutral, or negative.

Examples:

Input: "The product arrived quickly and works perfectly!"
Output: positive

Input: "It's okay, does what it's supposed to do."
Output: neutral

Input: "Terrible quality, broke after two days."
Output: negative

Now classify this:
Input: "Exceeded my expectations, absolutely love it!"
Output:
```

### 7. Leverage Your Documents

**Principle:** Personalize Gemini's output with information from your own files in Google Drive.

**Example:**
```
Using the sales report in my Drive (Q1_2025_Sales.xlsx), create a
summary presentation highlighting:
- Top 5 products by revenue
- Quarter-over-quarter growth trends
- Regional performance comparison
```

### 8. Use Gemini as Your Prompt Editor

**Principle:** When using Gemini Advanced, you can ask it to improve your prompts.

**Meta-Prompting:**
```
Make this a power prompt: [original prompt text here]
```

Gemini will make suggestions on how to improve your prompt with better structure, clarity, and specificity.

## Advanced Techniques

### Break Complex Problems into Multiple Requests

Writing separate prompts can help Gemini refine and focus the answers it gives.

**Instead of one complex prompt:**
```
Analyze this codebase, identify bugs, suggest improvements, refactor the
main module, add tests, and document everything.
```

**Use sequential prompts:**
```
1. First: Analyze this codebase and identify bugs.
2. Then: Suggest specific improvements for the bugs found.
3. Then: Refactor the main module based on improvements.
4. Finally: Generate tests and documentation.
```

### Content Order Matters

The order of content in the prompt can sometimes affect the response. Try changing the content order and see how that affects the response.

**Example A (Context → Question):**
```
[Large document here]

Based on the document above, what are the key findings?
```

**Example B (Question → Context):**
```
What are the key findings in the following document?

[Large document here]
```

Test both orderings to see which produces better results for your use case.

### Temperature Settings for Different Tasks

**For Reasoning Tasks:**
- Set temperature to **0.2** for:
  - Code generation
  - Bug fixing
  - Mathematical calculations
  - Factual analysis
  - Debugging

**For Creative Tasks:**
- Set temperature to **1.5-2.0** for:
  - Image generation
  - Video creation
  - Music composition
  - Creative writing
  - Brainstorming

## Common Pitfalls and Solutions

| Pitfall | Solution |
|---------|----------|
| **Prompts too short (< 9 words)** | Aim for ~21 words with relevant context |
| **Ambiguous language** | Use specific, concrete terms |
| **Missing context** | Provide background, constraints, and goals |
| **Complex instructions** | Break into multiple sequential prompts |
| **Inconsistent few-shot examples** | Match structure, formatting, and delimiters exactly |
| **Not iterating** | Refine prompts based on initial results |
| **Ignoring role definition** | Start with "You are a [role] with expertise in [domain]" |

## Best Practices by Model

### For Gemini 2.5 Flash (Speed & Efficiency)

- Keep prompts concise
- Use for high-volume, low-latency tasks
- Ideal for summarization, chat, data extraction
- Leverage 1M token context window for large documents

### For Gemini 2.5 Pro (Reasoning & Multimodal)

- Use for complex reasoning tasks
- Leverage multimodal capabilities (text + images + video + audio)
- Enable thinking mode for advanced reasoning
- Set temperature to 0.2 for reasoning, 1.5-2.0 for creative tasks

## Multimodal Prompting

Gemini models are natively multimodal and can understand text, images, video, and audio together.

**Example:**
```
[Upload image of flowchart]

Analyze this flowchart and:
1. Convert it to executable Python code
2. Identify any logic errors or inefficiencies
3. Suggest optimizations
4. Generate unit tests
```

**Video Analysis Example:**
```
[Upload video of product demonstration]

Watch this product demo and create:
1. Written transcript
2. Key features list
3. Marketing copy for website
4. FAQ based on demonstrated features
```

## Optimal Prompt Formula

```
[ROLE]
You are a [specific role] with expertise in [domain].

[CONTEXT]
[Relevant background information and current situation]

[INPUT/DATA]
[Specific data, code, text, or multimodal content to analyze]

[INSTRUCTION]
[Clear, specific task using action verbs]

[CONSTRAINTS]
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

[OUTPUT FORMAT]
[Exact format desired: JSON, markdown, bullet points, etc.]

[EXAMPLES] (optional)
[Few-shot examples if needed]
```

## Additional Resources

- **Prompt Design Strategies:** https://ai.google.dev/gemini-api/docs/prompting-strategies
- **Gemini Prompt Guide:** https://workspace.google.com/learning/content/gemini-prompt-guide
- **Write Better Prompts:** https://cloud.google.com/gemini/docs/discover/write-prompts
- **Gemini Models Overview:** https://deepmind.google/models/gemini/
- **Prompt Engineering for AI:** https://cloud.google.com/discover/what-is-prompt-engineering
