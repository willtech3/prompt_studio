# DeepSeek-R1 - Extended Reasoning Model Guide


**Official Documentation:** https://docs.together.ai/docs/prompting-deepseek-r1

## Model Overview

DeepSeek-R1 **isn't built to chat—it's built to think**. This makes it exceptionally powerful for logic, analysis, and step-by-step reasoning tasks. Unlike conversational models, DeepSeek-R1 excels at showing its work and providing transparent reasoning processes.

**Key Specifications:**
- **Best For:** Logic, analysis, step-by-step reasoning, mathematical proofs, complex problem-solving
- **Unique Feature:** Extended thinking with <think> tags
- **Strengths:** Transparent reasoning, reduced hallucinations, detailed analysis
- **Optimal Settings:** Temperature 0.5-0.7 (0.6 recommended), top-p 0.95

## Core Principle: Explicit Reasoning

### The <think> Tag Pattern

**Critical:** DeepSeek-R1 performs best when explicitly instructed to show its reasoning using the <think> tag.

**Structure:**
```
<think>
[Model's internal step-by-step reasoning process]
- Analyzing the problem
- Exploring approaches
- Evaluating options
- Considering edge cases
- Reaching conclusions
</think>

<answer>
[Final polished answer based on the thinking above]
</answer>
```

### Forcing Reasoning

On rare occasions, DeepSeek-R1 bypasses thinking. If this happens:

**Solution:**
```
Start your response with <think> to show your complete reasoning process.

Problem: [Your problem here]
```

## Prompting Best Practices

### 1. Explicitly Request Reasoning

**Example:**
```
Use the <think> tag to show your step-by-step reasoning, then provide
your final answer.

Problem: A database query takes 5 seconds on average. After adding an
index on the WHERE clause column, it still takes 5 seconds. What could
be the issue?

Show your complete diagnostic reasoning process.
```

### 2. Mathematical Problem Solving

**Example:**
```
<think>
Frame your mathematical reasoning step-by-step with clear constraints.
</think>

Problem: Find the optimal number of servers needed to handle:
- 100,000 requests/second
- Each request takes 50ms to process
- Target: 99.9% of requests complete within 200ms
- Each server can handle 1000 concurrent connections

Show calculations, assumptions, and safety margins in your reasoning.
```

### 3. Logical Analysis

**Example:**
```
Analyze this system design for logical flaws:

[System design description]

Use <think> to:
1. Identify assumptions in the design
2. Test each assumption against requirements
3. Find potential failure modes
4. Evaluate severity of each flaw
5. Propose specific fixes

Provide systematic analysis showing your reasoning at each step.
```

### 4. Code Debugging

**Example:**
```
This function has a subtle bug that causes intermittent failures:

```python
def process_batch(items):
    results = []
    for item in items:
        if item.status == 'pending':
            result = process(item)
            results.append(result)
    return results
```

Use <think> to:
1. Trace through the code logic
2. Identify potential race conditions or state issues
3. Consider edge cases
4. Pinpoint the root cause
5. Explain why it causes intermittent failures

Show complete reasoning process.
```

### 5. Strategic Decision Making

**Example:**
```
Decision: Should we migrate from monolithic architecture to microservices?

Context:
- Current: Django monolith, 500K lines of code
- Team: 15 engineers
- Users: 1M active, growing 20%/month
- Pain Points: Deployment takes 2 hours, scaling entire app is expensive
- Budget: $200K for migration

Use <think> to systematically analyze:
1. Current bottlenecks and their root causes
2. Microservices benefits vs migration costs
3. Alternative approaches (modular monolith, serverless)
4. Risk assessment (technical, organizational, timeline)
5. Break-even analysis

Provide recommendation with transparent reasoning.
```

## Optimal Sampling Parameters

```python
{
    "temperature": 0.6,    # Recommended (range: 0.5-0.7)
    "top_p": 0.95,         # Recommended
    "max_tokens": 8192,    # Higher for extended reasoning
    "stop": ["</answer>"]  # Optional: stop at answer end
}
```

**Why These Settings:**
- **Temperature 0.6:** Prevents repetitions and incoherent outputs
- **Top-p 0.95:** Balances exploration and focus
- **Higher max_tokens:** Extended reasoning requires more output space

## Advanced Techniques

### Chain of Thought Prompting

```
Problem: Design a distributed task queue system

Break down your thinking:

<think>
**Step 1: Requirements Analysis**
[Analyze requirements]

**Step 2: Architecture Options**
[Explore Redis, RabbitMQ, Kafka, SQS]

**Step 3: Trade-off Evaluation**
[Compare options across dimensions]

**Step 4: Component Design**
[Design chosen architecture]

**Step 5: Failure Mode Analysis**
[Consider what can go wrong]

**Step 6: Final Recommendation**
[Synthesize conclusions]
</think>

<answer>
[Implementation roadmap based on analysis above]
</answer>
```

### Multi-Perspective Reasoning

```
Analyze this API security design from three perspectives:

1. **ATTACKER PERSPECTIVE:**
<think>
How would I try to exploit this system?
- Authentication bypass attempts
- Injection attacks
- Rate limit evasion
[Complete attack analysis]
</think>

2. **DEFENDER PERSPECTIVE:**
<think>
How do I protect against these attacks?
- Defense in depth strategies
- Monitoring and detection
- Incident response
[Complete defense analysis]
</think>

3. **ARCHITECT PERSPECTIVE:**
<think>
How do I design security that doesn't hurt usability?
- Balance security vs developer experience
- Performance implications
- Operational complexity
[Complete architecture analysis]
</think>

<answer>
[Comprehensive security recommendation]
</answer>
```

### Comparative Analysis with Reasoning

```
Compare three caching strategies: Redis, Memcached, CDN

For each option, show reasoning:

<think>
**Redis Analysis:**
- Use cases it excels at
- Limitations
- Cost implications
- Operational complexity
[Detailed reasoning]

**Memcached Analysis:**
[Similar structured reasoning]

**CDN Analysis:**
[Similar structured reasoning]

**Comparative Evaluation:**
[Cross-comparison with scoring]
</think>

<answer>
Recommendation matrix:
- Use Redis when: [conditions]
- Use Memcached when: [conditions]
- Use CDN when: [conditions]
</answer>
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Not using <think> tag** | Explicitly request it in prompt |
| **Treating it like a chat model** | Remember: built to think, not chat |
| **Temperature too high** | Keep within 0.5-0.7 range |
| **Insufficient context** | Provide all relevant information upfront |
| **Not leveraging step-by-step** | Request explicit reasoning steps |
| **Rushing to answer** | Encourage thorough thinking before concluding |

## When to Use DeepSeek-R1

### Use DeepSeek-R1 For:
- ✅ **Mathematical problem solving**
- ✅ **Logical analysis and debugging**
- ✅ **Strategic decision making**
- ✅ **Complex system design**
- ✅ **Multi-step reasoning tasks**
- ✅ **Research and analysis**
- ✅ **Code review requiring deep understanding**

### Use DeepSeek-Chat For:
- ❌ Simple Q&A
- ❌ Quick content generation
- ❌ Casual conversations
- ❌ Tasks not requiring extended reasoning

## Key Takeaways

1. **Explicit Reasoning:** Always request <think> tag for best results
2. **Optimal Parameters:** Temperature 0.6, top-p 0.95
3. **Built to Think:** Not optimized for chat—excels at analysis
4. **Show Your Work:** Model performs best when showing reasoning
5. **Prevent Bypassing:** Force reasoning with explicit <think> request
6. **Step-by-Step:** Break complex problems into reasoning steps
7. **Transparent Process:** Leverage visible thinking for debugging and validation

## Additional Resources

- **DeepSeek R1 Prompting Guide:** https://docs.together.ai/docs/prompting-deepseek-r1
- **DeepSeek Documentation:** https://api-docs.deepseek.com/
- **Advanced Techniques:** https://atlassc.net/2025/02/12/mastering-deepseek-prompt-engineering-from-basics-to-advanced-techniques
