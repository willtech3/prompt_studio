# Tailwind CSS v4 Documentation

## Overview
Tailwind CSS v4.0 is a complete rewrite of the framework, optimized for performance and modern CSS features. Released in January 2025, it offers up to 10x faster builds and a simplified configuration experience.

## Installation

### Simple Installation (v4)
```bash
npm install tailwindcss@next
```

Add to your CSS:
```css
@import "tailwindcss";
```

That's it! No configuration file needed for basic setup.

## Key Changes from v3 to v4

### 1. No More @tailwind Directives
```css
/* v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 */
@import "tailwindcss";
```

### 2. CSS Variables with Parentheses
```html
<!-- v3 -->
<div class="bg-[var(--my-color)]">

<!-- v4 -->
<div class="bg-(var(--my-color))">
```

### 3. Automatic Content Detection
No need to configure content paths - Tailwind v4 automatically detects your template files.

## Configuration

### Basic Configuration
```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(59.96% 0.238 269.02);
  --color-secondary: oklch(49.77% 0.301 295.11);

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "Fira Code", monospace;

  --spacing-gap: 0.5rem;
  --breakpoint-3xl: 1920px;
}
```

### TypeScript Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'oklch(59.96% 0.238 269.02)',
        secondary: 'oklch(49.77% 0.301 295.11)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

## New Features in v4

### 1. Container Queries
Built-in support without plugins:
```html
<div class="@container">
  <div class="@sm:text-lg @md:text-xl @lg:text-2xl">
    Responsive to container size
  </div>
</div>

<!-- Max-width container queries -->
<div class="@container">
  <div class="@max-md:hidden">Hidden on small containers</div>
</div>
```

### 2. 3D Transforms
```html
<div class="rotate-x-45 rotate-y-45 rotate-z-45 perspective-500">
  3D transformed element
</div>
```

### 3. Advanced Gradients
```html
<!-- Linear gradient with angle -->
<div class="bg-gradient-to-45 from-blue-500 to-purple-500">

<!-- Radial gradient -->
<div class="bg-radial from-center from-blue-500 to-purple-500">

<!-- Conic gradient -->
<div class="bg-conic from-90 from-red-500 via-yellow-500 to-blue-500">
```

### 4. Modern Color Functions
```html
<!-- Using oklch colors -->
<div class="bg-oklch(59.96% 0.238 269.02)">

<!-- Color mixing -->
<div class="bg-mix(blue-500 red-500 50%)">
```

### 5. Cascade Layers
Tailwind v4 uses CSS cascade layers for better specificity control:
```css
@layer base {
  /* Custom base styles */
}

@layer components {
  /* Custom component styles */
}

@layer utilities {
  /* Custom utilities */
}
```

## Component Examples

### 1. Modern Button
```html
<button class="
  px-6 py-3
  bg-gradient-to-r from-blue-600 to-purple-600
  hover:from-blue-700 hover:to-purple-700
  text-white font-semibold rounded-xl
  shadow-lg hover:shadow-xl
  transform transition-all duration-200
  active:scale-95
  focus:outline-none focus:ring-4 focus:ring-blue-500/50
">
  Click Me
</button>
```

### 2. Card Component
```html
<div class="
  @container
  bg-white dark:bg-gray-800
  rounded-2xl shadow-xl
  overflow-hidden
  transition-all duration-300
  hover:shadow-2xl hover:-translate-y-1
">
  <img
    src="..."
    alt="..."
    class="w-full h-48 object-cover"
  />
  <div class="p-6">
    <h3 class="text-xl @sm:text-2xl font-bold mb-2">
      Card Title
    </h3>
    <p class="text-gray-600 dark:text-gray-300">
      Card description that responds to container width
    </p>
  </div>
</div>
```

### 3. Form Input
```html
<div class="relative">
  <input
    type="text"
    placeholder=" "
    class="
      peer
      w-full px-4 py-3 pt-6
      border-2 border-gray-200
      rounded-lg
      focus:border-blue-500
      focus:outline-none
      transition-colors
      dark:bg-gray-800 dark:border-gray-600
    "
  />
  <label class="
    absolute left-4 top-3
    text-gray-500
    transition-all duration-200
    peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
    peer-focus:top-1 peer-focus:text-xs peer-focus:text-blue-500
  ">
    Label
  </label>
</div>
```

## Dark Mode

### Automatic Dark Mode
```html
<!-- Respects system preference -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Automatically switches with system theme
</div>
```

### Manual Dark Mode Toggle
```javascript
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// React component
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
    >
      {isDark ? '🌞' : '🌙'}
    </button>
  );
}
```

## Responsive Design

### Breakpoints
```html
<!-- Default breakpoints -->
<div class="
  text-sm          /* All screens */
  sm:text-base     /* ≥640px */
  md:text-lg       /* ≥768px */
  lg:text-xl       /* ≥1024px */
  xl:text-2xl      /* ≥1280px */
  2xl:text-3xl     /* ≥1536px */
">
```

### Custom Breakpoints
```css
@theme {
  --breakpoint-3xl: 1920px;
  --breakpoint-4xl: 2560px;
}
```

```html
<div class="3xl:text-4xl 4xl:text-5xl">
  Ultra-wide screen text
</div>
```

## Animation & Transitions

### Built-in Animations
```html
<!-- Spin -->
<div class="animate-spin">⚙️</div>

<!-- Pulse -->
<div class="animate-pulse bg-gray-300 h-4 rounded"></div>

<!-- Bounce -->
<div class="animate-bounce">↓</div>
```

### Custom Animations
```css
@theme {
  --animate-slide-in: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

```html
<div class="animate-[slide-in]">Sliding content</div>
```

## Typography

### Prose Plugin Alternative
```html
<article class="
  max-w-prose mx-auto
  text-gray-700 dark:text-gray-300
  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4
  [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3
  [&_p]:mb-4 [&_p]:leading-relaxed
  [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800
  [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded
  [&_pre]:bg-gray-900 [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
  [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
">
  <!-- Article content -->
</article>
```

## Grid & Flexbox Patterns

### Responsive Grid
```html
<div class="
  grid
  grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap-4 sm:gap-6 lg:gap-8
  @container
">
  <div class="@sm:col-span-2">Wide item</div>
  <div>Normal item</div>
  <div>Normal item</div>
</div>
```

### Flexbox Layout
```html
<div class="
  flex flex-col sm:flex-row
  items-center justify-between
  gap-4
">
  <div class="flex-1">Flexible width</div>
  <div class="flex-shrink-0">Fixed width</div>
</div>
```

## Performance Optimization

### 1. JIT (Just-In-Time) Mode
JIT is now the default and only mode in v4, generating styles on-demand.

### 2. Purging Unused Styles
Automatic in production builds - no configuration needed.

### 3. Optimizing for Production
```json
// package.json
{
  "scripts": {
    "build-css": "tailwindcss -i ./src/input.css -o ./dist/output.css --minify"
  }
}
```

## Integration with React Components

### Component with Tailwind
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        font-semibold rounded-lg
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
      `}
    >
      {children}
    </button>
  );
}
```

### Using cn() Utility
```typescript
// utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Component usage
import { cn } from '@/utils/cn';

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-white p-6 shadow-sm',
      className
    )}>
      {children}
    </div>
  );
}
```

## VS Code Setup

### Extensions
- Tailwind CSS IntelliSense
- Tailwind Documentation
- Headwind (class sorting)

### Settings
```json
// .vscode/settings.json
{
  "editor.quickSuggestions": {
    "strings": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Migration from v3 to v4

### Using the Upgrade Tool
```bash
npx @tailwindcss/upgrade@next
```

### Manual Migration Checklist
1. Replace @tailwind directives with @import
2. Update arbitrary value syntax (square brackets to parentheses)
3. Remove container queries plugin (now built-in)
4. Update configuration file format if needed
5. Test dark mode implementation
6. Verify custom theme values

## Browser Support
- Safari 16.4+
- Chrome 111+
- Firefox 128+

For older browser support, continue using Tailwind CSS v3.

## Resources
- [Official Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4)
- [Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind UI Components](https://tailwindui.com/)
- [Tailwind CSS Playground](https://play.tailwindcss.com/)