# Prompt Studio – UI Style Guide

This guide documents the visual system implemented in `index.html`. The UI is built with Tailwind CSS (CDN) using the Forms and Typography plugins, with dark mode controlled via a `dark` class on `html`.

## Foundations

### Typography
- **Font family (sans)**: `Inter, ui-sans-serif, system-ui`
- **Weights used**: 300, 400, 500, 600, 700
- **Smoothing**: `antialiased`
- **Utilities used**:
  - Headings/labels: `font-medium`, `font-semibold`
  - Monospace snippets: `<code>` inside prose gets default typography styles

### Color System
- **Brand palette** (Tailwind `colors.brand`):
  - 50 `#eff6ff`, 100 `#dbeafe`, 200 `#bfdbfe`, 300 `#93c5fd`, 400 `#60a5fa`,
  - 500 `#3b82f6`, 600 `#2563eb`, 700 `#1d4ed8`, 800 `#1e40af`, 900 `#1e3a8a`
- **Neutrals & semantic roles** (light / dark):
  - Background (app): `bg-white` / `dark:bg-gray-950`
  - Background (panel/card): `bg-white` / `dark:bg-white/5`
  - Text (primary): `text-gray-900` / `dark:text-gray-100`
  - Text (secondary): `text-gray-600` / `dark:text-gray-300`
  - Text (muted): `text-gray-500`
  - Border (subtle dividers): `border-gray-200` / `dark:border-white/10`
  - Border (controls): `border-gray-300` / `dark:border-white/15`
  - Links/interactive text: `text-brand-700` / `dark:text-brand-300`
  - Focus ring: `focus:ring-brand-500`
  - Form controls accent (checkbox, range): `accent-brand-600`

### Elevation & Shadows
- **Soft shadow** (Tailwind extension `shadow-soft`):
  - `0 1px 2px 0 rgba(0,0,0,0.06), 0 1px 3px 0 rgba(0,0,0,0.10)`
- Apply to elevated surfaces like cards and header brand mark.

### Radius Scale
- Common radii in use: `rounded-md`, `rounded-lg`, `rounded-xl`
- Pills/labels: `rounded-md`
- Brand mark: `rounded-lg`
- Cards: `rounded-xl`

### Spacing & Layout
- Page gutters: `px-4 sm:px-6 lg:px-8`
- Grid: `grid grid-cols-12`
  - Left rail (best practices): `hidden lg:flex lg:col-span-3`
  - Main editor: `col-span-12 lg:col-span-6`
  - Right rail (parameters): `col-span-12 lg:col-span-3`
- Container padding for cards: `p-4`
- Control paddings: `px-2.5 py-1.5`, `px-3 py-2`, `px-3.5 py-2`

### Borders
- Subtle dividers: `border-gray-200` / `dark:border-white/10`
- Control borders: `border-gray-300` / `dark:border-white/15`

### Z-index & Positioning
- Sticky header: `sticky top-0 z-20`

### Breakpoints
- Key breakpoint used for rails: `lg`
- Gutter adjustments at `sm`, `lg`

### Prose / Rich Text
- Markdown-rendered content: `prose prose-sm max-w-none` with `dark:prose-invert`

## Theming

Dark mode is enabled via Tailwind `darkMode: 'class'` and applied by toggling `document.documentElement.classList` with persistence in `localStorage`. Respect the `prefers-color-scheme` media query for first paint.

- Document classes: add/remove `dark` on `<html>`
- Body classes: `bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 antialiased`
- Always pair light and dark utilities for surfaces, borders, and text.

Example theme toggle button:

```html
<button
  class="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10"
  aria-label="Toggle theme">
  <!-- Icon swaps based on theme -->
</button>
```

## Components

### App Header
- Container: `sticky top-0 z-20 border-b border-gray-200/70 dark:border-white/10 backdrop-blur bg-white/70 dark:bg-gray-950/60`
- Inner layout: `h-14 flex items-center justify-between gap-3`
- Brand mark: `h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-500 shadow-soft`
- App name: `font-semibold`

### Card
- Wrapper: `rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-soft`
- Title: `font-medium mb-3`
- Use for panels like Parameters, Model details, Editor, Output.

### Buttons
- Primary (Brand):
  - `inline-flex items-center gap-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-medium disabled:opacity-60`
- Secondary (Ghost/Outline):
  - `inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-60`
- Icon button (neutral):
  - `rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10`

### Select (Model Picker)
- Control: `text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[240px]`

### Textarea
- Control: `w-full resize-y rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500`
- Sizes: System prompt `min-h-[88px]`, User prompt `min-h-[160px]`

### Slider
- Input: `<input type=\"range\" class=\"w-full accent-brand-600\" />`
- Labels: primary `text-sm text-gray-600 dark:text-gray-300`, help `text-xs text-gray-500`

### Chips / Tags
- Item: `inline-flex items-center rounded-md border border-gray-300 dark:border-white/15 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent`

### Inline Code Badge
- Example: `<code class=\"px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10\">model/id</code>`

### Prose Content
- Container: `prose prose-sm dark:prose-invert max-w-none`

## Layout Patterns

### Application Shell
- Root wrapper: `min-h-full font-sans`
- Header at top, 12-column grid main, footer with subdued text.

### Three-Pane Workspace
- Left rail (docs): `hidden lg:flex lg:col-span-3 lg:flex-col p-3 border-r border-gray-200 dark:border-white/10`
- Center (editor + output): `col-span-12 lg:col-span-6`
- Right rail (parameters): `col-span-12 lg:col-span-3`

### Footer
- `w-full px-4 sm:px-6 lg:px-8 py-6 text-xs text-gray-500`

## Accessibility Guidelines
- Provide visible focus: `focus:ring-2 focus:ring-brand-500` and `focus:outline-none`
- Sufficient contrast in both light and dark themes (brand-600/700 on white; brand-300 on dark backgrounds)
- Touch targets >= 40x40px where feasible (`p-2` on icon buttons)
- Use `aria-label` on icon-only controls

## Usage Examples

Primary button with icon:

```html
<button class="inline-flex items-center gap-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-medium">
  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-7-7v14"/></svg>
  Run
</button>
```

Panel card:

```html
<section class="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-soft">
  <div class="font-medium mb-3">Parameters</div>
  <!-- content -->
</section>
```

Textarea:

```html
<textarea
  class="w-full min-h-[160px] resize-y rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
  placeholder="Summarize the following text…"></textarea>
```

Select:

```html
<select class="text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[240px]">
  <option>OpenAI — gpt-4o</option>
</select>
```

Chip/Tag:

```html
<span class="inline-flex items-center rounded-md border border-gray-300 dark:border-white/15 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent">json</span>
```

## Tailwind Configuration (as implemented)

Reference of the Tailwind extensions used by the app:

```js
// tailwind.config (inline via CDN)
{
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
        }
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(0,0,0,0.06), 0 1px 3px 0 rgba(0,0,0,0.10)'
      }
    }
  }
}
```

## Implementation Notes
- Tailwind CDN with `forms` and `typography` plugins is loaded in `index.html`.
- Set `meta name=\"color-scheme\" content=\"light dark\"` for better UA theming.
- Theme persistence uses `localStorage` key `theme` with values `light` or `dark`.
- Prefer pairing every surface/text/border color with a `dark:` counterpart.

---
This guide mirrors the current UI. When adding new components, derive their styles from these foundations to maintain visual consistency.
