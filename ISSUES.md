# Known Bugs

These issues were found by building and type-checking the frontend and scanning the backend. Please open them as GitHub issues if not already tracked.

## 1) Frontend build fails: missing BestPractices.tsx (TS2307) in SidebarTabs

- Missing file: `frontend/src/components/BestPractices.tsx`
- Import site: `frontend/src/components/SidebarTabs.tsx`

### Steps to Reproduce
1. `cd frontend`
2. `npm ci`
3. `npm run build`

### Actual Result
```
src/components/SidebarTabs.tsx(4,31): error TS2307: Cannot find module './BestPractices' or its corresponding type declarations.
```

### Expected Result
Build succeeds. The "Best Practices" tab renders, or the tab is temporarily hidden until implemented.

### Impact
- Blocks local builds and CI.
- "Best Practices" tab is non-functional.

### Suggested Fixes
- Implement `src/components/BestPractices.tsx` (even a minimal placeholder), or
- Remove/guard the import and tab until the component exists, or
- Reuse provider prompting guides from the backend as initial content.

---

## 2) TypeScript error TS7053 in SettingsContent when filtering providers

In `frontend/src/components/SettingsContent.tsx`:
```ts
// line ~39
const filtered = providerList.filter((p) => enabled[(p.id as any)] !== false)
```
- `enabled` is `Record<ProviderID, boolean>`
- `p.id` is `string`, forcing `any` and triggering TS7053

### Steps to Reproduce
1. `cd frontend`
2. `npm ci`
3. `npm run build`

### Actual Result
```
src/components/SettingsContent.tsx(39,55): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'Record<ProviderID, boolean>'.
```

### Expected Result
Build succeeds without type errors.

### Suggested Fixes
- Narrow `p.id` to the `ProviderID` union type:
  - Option A: type `providerList` as `Array<{ id: ProviderID; name: string }>`
  - Option B: cast at usage: `enabled[p.id as ProviderID] !== false`
  - Option C: derive a narrowed variable: `const id = (p.id as ProviderID)` and use `enabled[id]`

---

## 3) Backend OpenRouter streaming assumes OpenAI delta format

`backend/services/openrouter.py` parses streamed lines as if they share the OpenAI response shape:
```py
obj = _json.loads(data)
delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
```
OpenRouter models are proxied and often use OpenAI-compatible shapes, but this may not be universal. Non-conforming models could result in lost chunks.

### Impact
- Certain models may stream nothing if their event payloads differ from the assumed shape.

### Suggested Mitigation
- Consider yielding raw `data` when `choices[0].delta.content` is empty but JSON parse succeeded, or support additional shapes.

---

## 4) Provider ID normalization inconsistencies (x-ai vs xai)

- `backend/app/main.py` normalizes providers by removing dashes: `provider = provider.replace("-", "")` (lines ~209–213), producing `xai`.
- Elsewhere (e.g., `docs`, frontend presets), models may use `x-ai/` prefix or provider id `xai`.

### Impact
- Potential mismatches when filtering or joining provider data across API and UI.

### Suggested Fix
- Standardize on `xai` for provider ids and handle both `xai/` and `x-ai/` prefixes consistently across backend and frontend.

---

## 5) Alembic migrations drop non-existent tables on fresh DB

`e1173acf8985_add_model_id_to_provider_content.py` unconditionally drops `executions`, `prompts`, and `openrouter_models` tables. On a fresh database that never had these tables, Alembic will error.

### Suggested Fix
- Guard drops with `op.execute("DROP TABLE IF EXISTS ...")` or check for table existence.

---

## 6) SQLAlchemy JSONB default uses a mutable literal

`backend/models/model_config.py` uses `default={}` for `pricing` JSONB column.

### Risk
- Mutable default arguments can be shared across instances in some ORMs. SQLAlchemy often treats this as a server default vs Python default, but it’s safer to use `default=dict`.

### Suggested Fix
- Replace `default={}` with `default=dict` for JSON/JSONB columns.

---

## 7) Frontend provider guidance model id mismatch

`frontend/src/components/PromptGuidanceModal.tsx` initializes `selectedModels` with `x-ai/grok-4`, but `api.getProviderPromptingGuides` calls the backend with `providerId` `'xai'` and `modelId` `'x-ai/grok-4'`. Backend `seed_provider_content` normalizes provider to `'xai'` for x‑ai models, but model ids are stored with `'x-ai/'` prefix. Ensure consistent handling.

### Suggested Fix
- Confirm `GET /api/providers/{provider_id}/prompting-guides?model_id=` uses stored model ids including `x-ai/` prefix; document this in API or normalize on fetch.

---

If you want, I can convert these into GitHub issues once `gh auth login` is configured in this environment.
