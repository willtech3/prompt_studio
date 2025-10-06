# Grok-3 - Balanced General-Purpose Model Guide

**Last Updated:** January 2025

**Official Documentation:** https://docs.x.ai/docs/models

## Model Overview

Grok-3 is xAI's balanced general-purpose model offering excellent performance across a wide range of tasks with good cost-efficiency. It provides solid JSON extraction, structured outputs, and reliable reasoning for everyday workflows.

**Key Specifications:**
- **Best For:** General-purpose tasks, JSON extraction, structured data processing
- **Strengths:** Balance of speed and quality, cost-effective, reliable
- **Use Cases:** Data extraction, content generation, analysis, coding assistance

## Prompting Best Practices

### 1. Structured JSON Extraction

Grok-3 excels at extracting structured data. Define clear schemas.

**Example:**
```
System: You are a data extraction specialist. Return only valid JSON.

Task: Extract key information from this customer support ticket.

Schema:
{
  "ticket_id": string,
  "customer_name": string,
  "issue_category": string,
  "priority": "low" | "medium" | "high",
  "key_points": string[]
}

Ticket:
[content here]
```

### 2. Use XML or Markdown for Context

Structure context clearly for better results.

**Example:**
```xml
<context>
<current_code>
def process_payment(amount, card):
    return charge(card, amount)
</current_code>

<requirements>
- Add input validation
- Handle payment failures
- Add logging
- Return structured response
</requirements>
</context>
```

### 3. Iterate Quickly

Don't over-engineer the first prompt. Refine based on output.

### 4. Specify Output Format

Be explicit about desired format.

**Example:**
```
Output Format: Return a markdown table with columns: Feature, Status, Notes
```

## Common Use Cases

### Data Extraction
```
Extract company information from this press release:
- Company name
- Funding amount
- Investors
- Use of funds

Return as JSON.
```

### Code Generation
```
Generate a Python function to:
- Validate email addresses (RFC 5322)
- Return (is_valid: bool, error_message: str)
- Include docstring and type hints
```

### Content Summarization
```
Summarize this article in 3 bullet points focusing on:
1. Main announcement
2. Key benefits
3. Timeline/availability
```

## Additional Resources

- **xAI Documentation:** https://docs.x.ai
- **Grok Prompts:** https://github.com/xai-org/grok-prompts
