# Response Formatting Guide

## Overview

Prompt Studio uses a **hybrid approach** to display well-formatted AI responses, combining natural AI output with intelligent UI rendering. This matches how modern AI applications (ChatGPT, Claude, Perplexity) handle response formatting.

## How It Works

### 1. **The AI Models Output Markdown Naturally**

Modern LLMs are trained on markdown and will naturally use it when asked. No special prompting required in most cases:

- **Headers**: `# Main Title`, `## Section`, `### Subsection`
- **Bold/Italic**: `**bold text**`, `*italic text*`
- **Lists**: 
  ```
  - Bullet point
  - Another point
  
  1. Numbered item
  2. Another numbered item
  ```
- **Code Blocks**:
  ````
  ```python
  def hello():
      print("Hello, world!")
  ```
  ````
- **Inline Code**: `variable_name` or `function()`
- **Paragraphs**: Double line breaks create paragraph spacing
- **Links**: `[link text](url)`
- **Blockquotes**: `> quoted text`
- **Tables**: Pipe-separated tables with headers

### 2. **The UI Renders Markdown Properly**

Our ResponsePanel component:
- Uses `react-markdown` to parse markdown syntax
- Applies `@tailwindcss/typography` for beautiful default styling
- Adds `rehype-highlight` for syntax highlighting in code blocks
- Includes custom CSS for optimal spacing and readability
- Supports streaming (renders incrementally as tokens arrive)
- Handles both light and dark themes

### 3. **Technical Stack**

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'           // GitHub Flavored Markdown
import rehypeHighlight from 'rehype-highlight' // Code syntax highlighting
```

**Installed packages:**
- `react-markdown` - Core markdown rendering
- `remark-gfm` - Tables, strikethrough, task lists, autolinks
- `rehype-highlight` - Syntax highlighting for code
- `highlight.js` - Language detection and themes
- `@tailwindcss/typography` - Beautiful typography defaults

## Getting Well-Formatted Responses

### Option A: Let the AI Decide (Recommended)

Most models will naturally format their output well. Just ask your question:

```
Explain how to implement a binary search algorithm.
```

The AI will typically respond with proper headers, code blocks, and paragraphs.

### Option B: Explicitly Request Formatting

For more control, add formatting instructions to your prompt:

```
Explain how to implement a binary search algorithm.

Format your response with:
- Clear section headers
- Code examples in code blocks
- Bullet points for key steps
```

### Option C: Use System Prompts

For consistent formatting across all responses, add to your system prompt:

```
You are a helpful assistant. Always format your responses using markdown:
- Use headers (##) for main sections
- Use code blocks (```) for code examples
- Use bullet points for lists
- Separate paragraphs with blank lines
- Use **bold** for emphasis
```

## Examples

### Example 1: Technical Explanation

**Prompt:**
```
Explain async/await in JavaScript
```

**Expected Response Format:**
```markdown
# Async/Await in JavaScript

## Overview

Async/await is a modern syntax for handling asynchronous operations...

## Basic Syntax

```javascript
async function fetchData() {
  const response = await fetch('api/data')
  return response.json()
}
```

## Key Points

- `async` functions always return promises
- `await` pauses execution until promise resolves
- Better error handling with try/catch
```

### Example 2: Step-by-Step Guide

**Prompt:**
```
How do I set up a React project?
```

**Expected Response Format:**
```markdown
## Setting Up a React Project

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Steps

1. Create a new project:
   ```bash
   npm create vite@latest my-app -- --template react-ts
   ```

2. Navigate to project:
   ```bash
   cd my-app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

Your app should now be running at `http://localhost:5173`
```

## Troubleshooting

### Response Shows Raw Markdown

If you see raw markdown (like `**bold**` instead of **bold**):
1. Ensure `@tailwindcss/typography` is installed
2. Check that `tailwind.config.js` includes the typography plugin
3. Verify the prose classes are applied: `prose prose-sm dark:prose-invert`

### No Syntax Highlighting in Code Blocks

If code blocks don't have syntax highlighting:
1. Ensure `rehype-highlight` and `highlight.js` are installed
2. Check that rehypeHighlight is in the rehypePlugins array
3. Verify highlight.js CSS is imported

### Paragraphs Run Together

If text lacks spacing:
1. Ask the AI to add blank lines between paragraphs
2. Check that custom prose CSS is loaded
3. The AI might be outputting single line breaks instead of double

### Text is Too Wide

The `max-w-none` class on the prose div allows full width. To limit width:
```tsx
<div className="prose prose-sm dark:prose-invert max-w-3xl">
```

## Best Practices

### For Prompt Engineers

1. **Trust the AI**: Modern models know markdown. Don't over-specify format unless needed.
2. **Be Specific**: If you need tables or specific structure, ask for it explicitly.
3. **Test Different Models**: Some models format better than others.
4. **Use Examples**: Show the AI the format you want in the prompt.

### For Developers

1. **Keep Styles Simple**: The typography plugin handles most cases.
2. **Test Streaming**: Ensure incremental rendering works smoothly.
3. **Dark Mode**: Test both themes for readability.
4. **Mobile**: Ensure code blocks scroll properly on small screens.
5. **Accessibility**: Prose content is marked with `aria-live="polite"` for screen readers.

## Advanced: Custom Markdown Components

You can customize how specific markdown elements render:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    // Custom code block with copy button
    code({node, inline, className, children, ...props}) {
      return inline ? (
        <code className={className} {...props}>{children}</code>
      ) : (
        <CodeBlockWithCopy className={className}>
          {children}
        </CodeBlockWithCopy>
      )
    },
    // Custom link behavior
    a({node, children, href, ...props}) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    }
  }}
>
  {response}
</ReactMarkdown>
```

## Summary

**The Answer to Your Question:**

> "Is formatting a matter of the prompt or the UI?"

**Both!** The best approach is:
- Let AI models output **natural markdown** (they're trained for this)
- Have the UI **properly render** that markdown with good typography
- Add **prompt instructions** only when you need specific formatting

This hybrid approach gives you the best of both worlds: natural, well-structured AI output + beautiful, readable rendering.
