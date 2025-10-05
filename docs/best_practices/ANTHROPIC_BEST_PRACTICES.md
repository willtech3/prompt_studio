# Anthropic (Claude) — Quick Notes (2025)

When to use: reasoning-heavy tasks, structured instructions, and controllable outputs.

## Key points
- Stable system rules; keep them short.
- Structure with simple XML‑style sections.
- Be explicit on constraints and schema.
- Few‑shot for style; validate downstream.

## Structure (XML‑style)
```xml
<system>Concise, factual assistant.</system>
<task>Extract fields from text.</task>
<rules>
  <rule>Return only JSON matching schema.</rule>
  <rule>Use null when unknown; no prose.</rule>
  <rule>≤ 200 tokens.</rule>
  </rules>
<schema>{"title": string, "date": string, "bullets": string[]}</schema>
<text>
<<<
... content ...
>>>
</text>
```

## Examples
- Plan → answer
```xml
<plan>List steps briefly, then produce final answer only.</plan>
```

- Extract → validate
```xml
<output>{"title":"...","date":"...","bullets":["..."]}</output>
<self_check>Confirm fields and types match schema.</self_check>
```

## References
- Anthropic Docs — Prompt engineering: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering