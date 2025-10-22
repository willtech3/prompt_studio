"""Prompt optimization constants and provider-specific hints."""

# OpenAI's official meta-prompt for prompt optimization
# Source: https://the-decoder.com/openai-releases-its-meta-prompt-for-prompt-optimization/
META_PROMPT = """Given a task description or existing prompt, produce a detailed system prompt to guide a language model in completing the task effectively.

# Guidelines

- Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
- Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
- Reasoning Before Conclusions: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
- Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
- Conclusion, classifications, or results should ALWAYS appear last.
- Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
- What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
- Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
- Formatting: Use markdown features for readability. DO NOT USE ``` CODE BLOCKS UNLESS SPECIFICALLY REQUESTED.
- Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
- Constants: DO include constants in the prompt, as they are not susceptible to prompt injection. Such as guides, rubrics, and examples.
- Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
- For tasks outputting well-defined or structured data (classification, JSON, etc.) bias towards outputting a JSON.
- JSON should never be wrapped in code blocks (```) unless explicitly requested.

The final prompt you output should adhere to the following structure below. Do not include any additional commentary, only output the completed system prompt. SPECIFICALLY, do not include any additional messages at the start or end of the prompt. (e.g. no "---")

[Concise instruction describing the task - this should be the first line in the prompt, no section header]

[Additional details as needed.]

[Optional sections with headings or bullet points for detailed steps.]

# Steps [optional]

[optional: a detailed breakdown of the steps necessary to accomplish the task]

# Output Format

[Specifically call out how the output should be formatted, be it response length, structure e.g. JSON, markdown, etc]

# Examples [optional]

[Optional: 1-3 well-defined examples with placeholders if necessary. Clearly mark where examples start and end, and what the input and output are. User placeholders as necessary.]
[If the examples are shorter than what a realistic example is expected to be, make a reference with () explaining how real examples should be longer / shorter / different. AND USE PLACEHOLDERS! ]

# Notes [optional]

[optional: edge cases, details, and an area to call or repeat out specific important considerations]
"""

# Provider-specific optimization hints
PROVIDER_HINTS = {
    "anthropic": """Claude models work best with XML-style tags like <instructions>, <context>, <thinking>, and <output>. Use explicit thinking blocks for complex reasoning tasks.

    For tool calling: Claude Sonnet 4.5 supports parallel tool execution (up to 5 tools simultaneously). Use <thinking> blocks to reason about which tools to call and why. Example: '<thinking>I need current data, so I'll call search_web first, then analyze the results.</thinking>'""",
    "openai": """GPT models benefit from clear delimiters (triple quotes, <<<>>>), step-by-step instructions, specific role definitions, and explicit output format specifications.

    For tool calling: GPT-4+ supports parallel function calling (up to 10 tools). Be explicit about when to use tools: 'Use search_web for current information, then calculate for math.' Provide clear, detailed function descriptions in your tool schemas.""",
    "deepseek": """DeepSeek-R1 models benefit from explicit <think> tags for reasoning tasks. Be explicit about showing work and breaking down complex queries into sequential prompts.

    For tool calling: DeepSeek models work well with sequential tool calls. Use explicit reasoning: 'First, I'll search for X using search_web. Then, based on those results, I'll calculate Y.' Break complex multi-tool workflows into clear steps.""",
    "google": """Gemini models work well with structured sections, explicit role definitions, and grounding passages. Specify token budgets and use numbered outputs.

    For tool calling: Gemini supports function declarations. Use structured, numbered instructions: '1. Search for current data using search_web. 2. Extract key metrics. 3. Format results as JSON.' Be explicit about output format expectations.""",
    "xai": """Grok models prefer explicit JSON schemas for structured output, clear role definitions, and tuning one parameter at a time.

    For tool calling: Grok models benefit from clear tool usage instructions. Specify exact function names and expected parameters. Example: 'When asked about current events, call search_web with the query parameter. When asked for calculations, call calculate with the expression parameter.'""",
}
