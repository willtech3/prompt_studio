# xAI (Grok) — Quick Notes (2025)

When to use: fast, concise answers with minimal fluff; strict JSON extraction.

## Key points
- State role, task, constraints; delimit inputs.
- Prefer strict JSON outputs; validate client‑side.
- Keep tool definitions precise if using tools.

## Structure
```markdown
System: Concise, factual. Return valid JSON.
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
- JSON extraction
```json
{"title":"...","date":"...","bullets":["..."]}
```

- Brief reasoning → final
```markdown
Plan: 1) parse → 2) extract → 3) output JSON
Final: {...}
```

## References
- xAI Docs: https://docs.x.ai/