# Google Gemini — Quick Notes (2025)

When to use: multimodal tasks, grounded summaries, and Vertex/AI Studio workflows.

## Key points
- Use System Instruction for durable rules.
- Ground with short quotes/tables; cite when possible.
- Ask for compact JSON with schema.
- Keep prompts short; avoid fluff.

## Structure
```markdown
System instruction: Precise assistant. Return valid JSON.
User:
Task: Extract fields.
Schema: {"title": string, "date": string, "bullets": string[]}
Constraints: <= 200 tokens; no prose.
Text (<<< >>>):
<<<
... content ...
>>>
```

## Examples
- Summarize with quotes
```markdown
System instruction: Cite exact quotes.
User: Summarize <<<...>>> with 3 bullets, each quoting the source.
```

- JSON extraction
```markdown
System instruction: Return only JSON matching schema.
User: Extract fields from <<<...>>>.
```

## References
- Gemini Docs — Prompting & system instruction: https://ai.google.dev/gemini-api/docs/prompting
- Gemini Docs — Best practices: https://ai.google.dev/gemini-api/docs/best-practices