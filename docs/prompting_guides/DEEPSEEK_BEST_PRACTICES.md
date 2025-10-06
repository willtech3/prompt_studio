# DeepSeek Prompt Engineering Best Practices


**Official Documentation:** https://docs.together.ai/docs/prompting-deepseek-r1

## Overview

This guide compiles the latest best practices for prompt engineering with DeepSeek models (DeepSeek-Chat, DeepSeek-R1, DeepSeek-V3.2-Exp). DeepSeek models, particularly DeepSeek-R1, are built to **think, not just chat**, making them exceptional at logic, analysis, and step-by-step reasoning.

## Core Prompting Principles

### 1. Be Explicit and Specific

**Principle:** Use clear and specific prompts written in plain language. Complex, lengthy prompts often lead to less effective results.

**Best Practices:**
- Write prompts that are clear, short, and well-organized
- Avoid ambiguous or vague instructions
- Give the model the context it needs for accurate results
- Be explicit about what you want

**Poor Prompt:**
```
Analyze this data.
```

**Better Prompt:**
```
Analyze this Q1 sales data from our e-commerce platform. Identify:
1. Top 3 revenue-generating product categories
2. Month-over-month growth trends
3. Customer retention rate changes
4. Actionable recommendations for Q2

Provide specific numbers and percentages.
```

### 2. Break Down Complex Queries

**Principle:** Requesting too much information in a single prompt can overwhelm the model and result in disorganized or superficial responses.

**Better Approach:**
```
Instead of: "Analyze the codebase, identify bugs, refactor for performance,
             add tests, update documentation, and deploy to production"

Use Sequential Prompts:
1. "Analyze this codebase for potential bugs and security issues"
   [Review response]
2. "For the top 3 issues identified, propose specific refactoring approaches"
   [Review response]
3. "Generate unit tests for the refactored code"
   [Continue...]
```

### 3. Explicitly Instruct to Show Work (DeepSeek-R1)

**Principle:** The best practice is to explicitly instruct DeepSeek to show its work, especially for DeepSeek-R1 which is designed for extended reasoning.

**Example:**
```
Problem: Design a caching strategy for our API with 1M requests/day

Please show your complete reasoning process:
1. Analyze the problem and constraints
2. Explore potential approaches
3. Evaluate trade-offs
4. Reach a conclusion with justification

Use the <think> tag to structure your thinking process.
```

### 4. Force Reasoning with <think> Tag (DeepSeek-R1)

**Principle:** On rare occasions, DeepSeek-R1 bypasses the thinking pattern. If you see this problem, tell the model to start with the <think> tag.

**Example:**
```
Start your response with <think> to show your reasoning process.

Problem: Should we migrate from PostgreSQL to MongoDB for our user
profile storage?

Consider:
- Current data structure (relational)
- Query patterns (mostly key-value lookups)
- Scalability requirements (10x growth expected)
- Team expertise
- Migration costs
```

### 5. Optimize Sampling Parameters (DeepSeek-R1)

**Recommended Settings:**
```python
{
    "temperature": 0.6,  # Range: 0.5-0.7 (0.6 recommended)
    "top_p": 0.95,       # Recommended value
    "max_tokens": 4096   # Adjust based on task complexity
}
```

**Why These Settings:**
- **Temperature 0.5-0.7:** Prevents endless repetitions or incoherent outputs
- **Top-p 0.95:** Balances creativity and coherence
- **Temperature 0.6:** Sweet spot for most tasks

### 6. Leverage Strategic Techniques

**Techniques:**
- **Task Decomposition:** Break complex tasks into manageable steps
- **Context Enrichment:** Provide comprehensive background information
- **Iterative Refinement:** Refine prompts based on initial outputs
- **Perspective Diversification:** Request analysis from multiple viewpoints

## Domain-Specific Approaches

### For Creative Writing

**Example:**
```
Genre: Science fiction thriller
Tone: Dark and suspenseful
Length: 500 words
Style: Third-person limited perspective

Setting: Mars colony in 2075 during a communications blackout

Requirements:
- Protagonist: Female engineer discovering a sabotage plot
- Include technical details about life support systems
- Build tension through environmental hazards
- End with a cliffhanger

Begin with: "The red dust storm had been raging for three days..."
```

### For Mathematical Problems

**Example:**
```
Problem: A company has 3 warehouses (A, B, C) and 5 retail stores (1-5).
Shipping costs vary by distance. Design an optimal distribution strategy.

Data:
- Warehouse A: 1000 units available, costs: [5,8,3,7,6] to stores 1-5
- Warehouse B: 800 units available, costs: [7,4,9,5,8] to stores 1-5
- Warehouse C: 1200 units available, costs: [6,7,4,8,5] to stores 1-5
- Store demands: [400, 350, 500, 300, 450] units

Constraints:
- Minimize total shipping cost
- Meet all store demands
- Don't exceed warehouse capacity

Show your work step-by-step using linear programming approach.
```

### For Code Analysis

**Example:**
```
Analyze this Python function for potential issues:

```python
def process_user_data(users):
    result = []
    for user in users:
        if user['age'] > 18:
            result.append({
                'name': user['name'],
                'email': user['email'],
                'status': 'adult'
            })
    return result
```

Check for:
1. Error handling (missing keys, None values, wrong types)
2. Performance issues (large datasets)
3. Security concerns
4. Edge cases not handled

Provide specific code improvements for each issue found.
```

## Advanced Techniques

### Forcing Extended Reasoning

**Pattern:**
```
<think>
[Model's internal reasoning process goes here]
</think>

<answer>
[Final polished answer based on thinking]
</answer>

Example Prompt:
"Use the <think> tag to show your complete reasoning process, then
provide your final answer in the <answer> tag.

Problem: [Your problem here]"
```

### Multi-Perspective Analysis

**Example:**
```
Analyze this API design from three expert perspectives:

1. SECURITY ENGINEER:
   - Identify vulnerabilities
   - Assess authentication/authorization
   - Check for data exposure risks

2. PERFORMANCE ENGINEER:
   - Find bottlenecks
   - Analyze query efficiency
   - Suggest caching strategies

3. DevOps ENGINEER:
   - Evaluate deployment complexity
   - Assess monitoring capabilities
   - Review scalability approach

For each perspective, provide:
- Key findings
- Severity ratings
- Specific recommendations

[API design details here]
```

### Context Enrichment

**Example:**
```
Context:
- Company: B2B SaaS platform for project management
- Users: 50,000 active teams
- Tech Stack: React, Node.js, PostgreSQL, Redis
- Current Challenge: Response times increasing with data growth
- Budget: $50K for optimization
- Timeline: 3 months

Current Metrics:
- P50 response time: 450ms (target: <200ms)
- P95 response time: 1.2s (target: <500ms)
- Database queries: Avg 8 per request
- Cache hit rate: 35% (low)

Task: Propose comprehensive performance optimization strategy with:
1. Specific technical changes
2. Expected impact on metrics
3. Implementation phases
4. Risk mitigation
5. Cost breakdown
```

## Common Pitfalls and Solutions

| Pitfall | Solution |
|---------|----------|
| **Overly complex single prompts** | Break into sequential, focused prompts |
| **Vague instructions** | Be explicit about goals, format, constraints |
| **Not leveraging <think> tag** | Force reasoning with <think> for DeepSeek-R1 |
| **Wrong sampling parameters** | Use temperature 0.6, top-p 0.95 |
| **Assuming chat-optimized model** | Remember: DeepSeek-R1 is built to think, not chat |
| **Missing context** | Provide comprehensive background information |
| **No explicit reasoning request** | Explicitly ask model to show its work |

## DeepSeek Model Comparison

| Model | Best For | Key Strength |
|-------|----------|--------------|
| **DeepSeek-Chat** | General conversations, quick Q&A | Balanced performance |
| **DeepSeek-R1** | Logic, analysis, step-by-step reasoning | Extended thinking |
| **DeepSeek-V3.2-Exp** | Experimental features, cutting-edge capabilities | Latest innovations |

## Key Takeaways

1. **Be Clear and Specific:** Plain language, well-organized prompts work best
2. **Break Down Complexity:** Sequential prompts beat monolithic ones
3. **Force Reasoning:** Use <think> tag for DeepSeek-R1
4. **Optimize Parameters:** Temperature 0.6, top-p 0.95
5. **Enrich Context:** Provide comprehensive background
6. **Iterate:** Refine based on initial outputs
7. **Remember the Purpose:** DeepSeek-R1 is built to think, not just chat

## Additional Resources

- **DeepSeek R1 Prompting Guide:** https://docs.together.ai/docs/prompting-deepseek-r1
- **Mastering DeepSeek:** https://atlassc.net/2025/02/12/mastering-deepseek-prompt-engineering-from-basics-to-advanced-techniques
- **DeepSeek API Documentation:** https://api-docs.deepseek.com/
