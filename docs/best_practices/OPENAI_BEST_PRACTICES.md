# OpenAI Prompt Engineering — Quick Notes (2025)

When to use: general-purpose tasks, strong tool use, and strict JSON via Responses API.

## Key points
- Be specific (role, task, success criteria, constraints).
- Separate instructions from data; use `<<< >>>` for inputs.
- Prefer structured outputs via `response_format` (JSON schema).
- Few‑shot (1–3) for style; validate downstream and retry on invalid JSON.

## Structure (chat)
```markdown
System: Stable rules. Return only valid JSON.

User:
Task: <what to extract/do>
Schema: {"title": string, "date": string, "bullets": string[]}
Constraints: <= 200 tokens; no prose.
Text (<<< >>>):
<<<
... content ...
>>>
```

## Examples
- Structured output (Responses API)
```json
{
  "model": "gpt-4.1-mini",
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
    {"role": "user", "content": "Extract fields from <<<...>>>."}
  ]
}
```

- Few‑shot style (chat)
```markdown
System: Terse copywriter.
User: Rewrite as a tagline.
Examples:
- In: "Fast cloud backups" → Out: "Back up. Flat-out fast."
- In: "Fresh roasted beans" → Out: "Roasted. Boasted. Posted."
Now: "AI for everyone"
```

## References
- OpenAI Docs — Prompting: https://platform.openai.com/docs/guides/prompting
- OpenAI Docs — Structured outputs: https://platform.openai.com/docs/guides/structured-outputs