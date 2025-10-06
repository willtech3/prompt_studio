# GPT-4o Model-Specific Prompting Guide

**Last Updated:** January 2025

**Official Documentation:** https://platform.openai.com/docs/models/gpt-4o

**Model:** `openai/gpt-4o`

## Model Overview

GPT-4o ("o" for "omni") is OpenAI's flagship multimodal model that can accept and generate text, images, and audio. Key capabilities:

- **Context Window:** 128,000 tokens
- **Max Completion Tokens:** 16,384 tokens
- **Modalities:** Text + Image input → Text output (Audio capabilities via separate API)
- **Strengths:** Multimodal understanding, vision tasks, balanced performance, cost-efficiency
- **Speed:** 2x faster than GPT-4 Turbo
- **Cost:** 50% cheaper than GPT-4 Turbo

## Key Strengths

### Multimodal Excellence

GPT-4o excels at vision and audio understanding compared to previous models:

- **Vision:** Robust image analysis, OCR, diagram understanding
- **Multilingual:** Superior performance on non-English languages
- **Balanced:** GPT-4 Turbo-level performance on text, reasoning, and coding while excelling at vision

### Cost-Performance Balance

- 50% lower cost than GPT-4 Turbo
- 2x faster response times
- Maintains high-quality outputs across modalities

## Vision & Image Prompting

### Basic Image Input Format

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg"
                        # OR use base64: f"data:image/jpeg;base64,{base64_image}"
                    }
                }
            ]
        }
    ],
    max_tokens=300  # IMPORTANT: Set max_tokens or output will be cut off
)
```

### Image Input Methods

**1. Public URL:**
```python
{
    "type": "image_url",
    "image_url": {"url": "https://example.com/image.jpg"}
}
```

**2. Base64 Encoding:**
```python
import base64

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

{
    "type": "image_url",
    "image_url": {"url": f"data:image/jpeg;base64,{encode_image('path/to/image.jpg')}"}
}
```

### Image Limits & Considerations

- **Limit:** 10 images per chat request
- **Quality:** Use `quality` parameter (50-100) when encoding base64 to balance size vs. clarity
- **Max Tokens:** Always set `max_tokens` parameter to avoid truncated responses
- **File Types:** Supports JPEG, PNG, WebP, non-animated GIF

### Vision Best Practices

**1. Be Specific About What to Extract:**
```python
prompt = """
Analyze this image and extract:
1. Main objects visible
2. Text present (OCR)
3. Overall scene description
4. Any notable details

Format as JSON with keys: objects, text, description, details
"""
```

**2. Use Few-Shot Examples for Consistent Output:**
```python
messages = [
    {"role": "system", "content": "You extract book information from cover images."},
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "**Example 1:**\n\n**Question:** Who wrote this book?"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{example1_img}"}}
        ]
    },
    {
        "role": "assistant",
        "content": [{"type": "text", "text": "**Reasoning:** The cover displays 'John Doe' as the author.\n\n**Conclusion:** John Doe"}]
    },
    # Now the actual query
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "**Question:** Who wrote this book?"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{new_img}"}}
        ]
    }
]
```

**3. Structured Output with Vision:**
```python
from pydantic import BaseModel, Field
from typing import List

class Employee(BaseModel):
    employee_name: str = Field(..., description="The name of the employee")
    role: str = Field(..., description="The role of the employee")
    manager_name: str | None = Field(None, description="The manager's name, if applicable")

class EmployeeList(BaseModel):
    employees: List[Employee] = Field(..., description="A list of employees")

# Use with instructor or response_format for structured output
response = client.chat.completions.create(
    model="gpt-4o",
    response_model=EmployeeList,  # With instructor
    messages=[
        {
            "role": "user",
            "content": "Analyze the organizational chart and extract employee information."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{org_chart_img}"}
                }
            ]
        }
    ]
)
```

## Vision Use Cases

### 1. Optical Character Recognition (OCR)

```python
prompt = """
Extract all text from this image. Preserve:
- Original formatting where possible
- Tables as markdown tables
- Lists as bullet points
- Headers and sections
"""
```

### 2. Document Analysis

```python
prompt = """
Analyze this document and provide:
1. Document type (invoice, receipt, contract, etc.)
2. Key entities (dates, amounts, names, addresses)
3. Important clauses or terms
4. Any anomalies or issues

Return as structured JSON.
"""
```

### 3. Image-Based Question Answering

```python
# RAG with vision
prompt = f"""
Based on the image provided and the following context, answer the user's question.

Context:
{retrieved_text_context}

Question: {user_question}

Describe what you see in the image that relates to the question.
"""
```

### 4. Visual Reasoning & Analysis

```python
prompt = """
Analyze this chart/graph and:
1. Identify the type of visualization
2. Extract key data points
3. Identify trends or patterns
4. Provide insights or conclusions
5. Note any limitations or caveats
"""
```

### 5. Quality Control & Inspection

```python
# Example: Package damage detection
prompt = """
Analyze this package image:
- Is the package damaged? (yes/no)
- If yes, describe the damage
- Severity level (minor, moderate, severe)
- Recommended action (refund, replace, escalate)

Return decision as JSON with reasoning.
"""
```

## Vision Fine-Tuning

GPT-4o supports vision fine-tuning for custom image understanding tasks:

```python
# Example training format
{
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What is the title of this book?"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}}
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "**Reasoning:** The title is displayed at the top of the cover.\n\n**Conclusion:** Introduction to Machine Learning"
                }
            ]
        }
    ]
}
```

## General Text Prompting

### Few-Shot Prompting

GPT-4o benefits from few-shot examples like text-only models:

```python
messages = [
    {"role": "system", "content": "Answer in a consistent poetic style."},
    {"role": "user", "content": "Teach me about patience."},
    {
        "role": "assistant",
        "content": "The river that carves the deepest valley flows from a modest spring; the grandest symphony originates from a single note."
    },
    {"role": "user", "content": "Teach me about the ocean."}
]
```

### Chain-of-Thought

```python
prompt = """
Let's solve this step by step:
1. First, identify what we know
2. Then, determine what we need to find
3. Finally, calculate the answer

Problem: {problem_description}
"""
```

### Structured Outputs

```python
response = client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": "Return only valid JSON."},
        {"role": "user", "content": "Extract entities from this text..."}
    ]
)
```

## Tool Calling & Function Calling

GPT-4o has excellent tool-calling capabilities:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                },
                "required": ["location"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)
```

## Performance Optimization

### Balancing Cost & Quality

- **Use GPT-4o for:** Multimodal tasks, vision, balanced performance/cost
- **Use GPT-4.1 for:** Long context (>128K tokens), complex coding, enterprise knowledge retrieval
- **Use GPT-4o-mini for:** Simple tasks, high-volume requests, cost-sensitive applications

### Token Management

```python
# Estimate tokens before calling
import tiktoken

encoding = tiktoken.encoding_for_model("gpt-4o")
token_count = len(encoding.encode(prompt_text))

# Set appropriate max_tokens
max_tokens = min(16384, desired_output_length)
```

## Common Pitfalls

1. **Forgetting max_tokens:** Always set `max_tokens` or responses get cut off
2. **Too many images:** Limit is 10 images per request
3. **Not encoding images properly:** Use correct base64 encoding with MIME type
4. **Inefficient base64:** Use quality parameter (50-70) to reduce size
5. **Not being specific enough:** Vision tasks benefit from explicit instructions

## Best Practices Summary

| Category | Best Practice |
|----------|---------------|
| **Vision** | Always set `max_tokens`, use quality parameter for base64 |
| **Images** | Limit to 10 per request, use appropriate encoding |
| **Prompting** | Be specific about what to extract, use few-shot examples |
| **Structured Output** | Use Pydantic models or JSON schemas for consistency |
| **Tool Calling** | Leverage strong function calling for agentic workflows |
| **Cost** | Balance between GPT-4o (vision/multilingual) and GPT-4o-mini (simple tasks) |

## Model Comparison

| Feature | GPT-4o | GPT-4.1 | GPT-4o-mini |
|---------|--------|---------|-------------|
| **Context** | 128K | 1M | 128K |
| **Vision** | ✅ Excellent | ✅ Good | ✅ Good |
| **Cost** | Medium | High | Low |
| **Speed** | Fast | Medium | Very Fast |
| **Best For** | Multimodal, balanced | Long context, coding | Simple tasks, volume |

## Additional Resources

- **GPT-4o Announcement:** https://openai.com/index/hello-gpt-4o/
- **Vision Fine-Tuning Guide:** https://cookbook.openai.com/examples/multimodal/vision_fine_tuning_on_gpt4o_for_visual_question_answering
- **Function Calling with Vision:** https://cookbook.openai.com/examples/multimodal/Using_GPT4_Vision_With_Function_Calling
- **OpenAI Cookbook:** https://github.com/openai/openai-cookbook
