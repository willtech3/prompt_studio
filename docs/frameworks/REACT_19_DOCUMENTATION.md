# React 19 Documentation & Best Practices

## Overview
React 19 is the latest major release of React (2024/2025), introducing significant improvements in performance, developer experience, and new features that simplify common patterns.

## Installation

```bash
npm install --save-exact react@^19.0.0 react-dom@^19.0.0
```

## Key New Features in React 19

### 1. React Compiler
The new React Compiler automatically optimizes your code, eliminating the need for manual memoization:

```jsx
// Before React 19
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => processData(data), [data]);
  const handleClick = useCallback(() => {
    console.log(processedData);
  }, [processedData]);

  return <div onClick={handleClick}>{processedData}</div>;
});

// With React 19 Compiler - no manual optimization needed
function ExpensiveComponent({ data }) {
  const processedData = processData(data);
  const handleClick = () => {
    console.log(processedData);
  };

  return <div onClick={handleClick}>{processedData}</div>;
}
```

### 2. Server Components
Server Components render on the server, reducing JavaScript bundle size:

```jsx
// app/page.tsx - Server Component by default
async function HomePage() {
  const data = await fetchData(); // Direct async/await in components

  return (
    <div>
      <h1>Server-rendered content</h1>
      <ClientComponent data={data} />
    </div>
  );
}

// components/ClientComponent.tsx
'use client'; // Opt into client-side rendering

function ClientComponent({ data }) {
  const [state, setState] = useState(data);

  return <div>{/* Interactive client content */}</div>;
}
```

### 3. Actions
Actions handle async operations with built-in pending states and error handling:

```jsx
function UpdateForm({ item }) {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      try {
        await updateItem(formData);
        return { success: true };
      } catch (e) {
        return { error: e.message };
      }
    }
  );

  return (
    <form action={submitAction}>
      <input name="name" defaultValue={item.name} />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### 4. Document Metadata
Metadata tags are now supported natively in components:

```jsx
function BlogPost({ post }) {
  return (
    <>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`/posts/${post.slug}`} />

      <article>
        <h1>{post.title}</h1>
        <div>{post.content}</div>
      </article>
    </>
  );
}
```

### 5. use() Hook
The new `use()` hook reads resources in render:

```jsx
function Comments({ commentsPromise }) {
  // use() can be called conditionally, unlike other hooks
  const comments = use(commentsPromise);

  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}
```

### 6. Refs as Props
No more forwardRef needed:

```jsx
// Before React 19
const Input = React.forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});

// React 19 - ref as a regular prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### 7. useFormStatus Hook
Access form state without prop drilling:

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

function Form() {
  return (
    <form action={submitAction}>
      <input name="username" />
      <SubmitButton /> {/* No props needed */}
    </form>
  );
}
```

## Project Setup with Vite

```bash
npm create vite@latest prompt-studio -- --template react-ts
cd prompt-studio
npm install
npm install react@^19.0.0 react-dom@^19.0.0
npm run dev
```

## TypeScript Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## State Management with Zustand

```typescript
// stores/useAppStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        theme: 'light',
        setUser: (user) => set({ user }),
        toggleTheme: () =>
          set((state) => ({
            theme: state.theme === 'light' ? 'dark' : 'light'
          })),
      }),
      {
        name: 'app-storage',
      }
    )
  )
);
```

## Data Fetching with TanStack Query

```typescript
// hooks/useApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL,
});

// Query hook
export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const { data } = await api.get('/prompts');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation hook
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: CreatePromptDTO) => {
      const { data } = await api.post('/prompts', prompt);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}
```

## Component Patterns

### 1. Compound Components
```typescript
interface PromptEditorContext {
  value: string;
  onChange: (value: string) => void;
}

const PromptEditorContext = createContext<PromptEditorContext | null>(null);

function PromptEditor({ children, value, onChange }) {
  return (
    <PromptEditorContext.Provider value={{ value, onChange }}>
      <div className="prompt-editor">{children}</div>
    </PromptEditorContext.Provider>
  );
}

PromptEditor.Input = function Input() {
  const { value, onChange } = useContext(PromptEditorContext)!;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

PromptEditor.Preview = function Preview() {
  const { value } = useContext(PromptEditorContext)!;
  return <div className="preview">{value}</div>;
};

// Usage
<PromptEditor value={prompt} onChange={setPrompt}>
  <PromptEditor.Input />
  <PromptEditor.Preview />
</PromptEditor>
```

### 2. Render Props Pattern
```typescript
interface RenderPropArgs {
  loading: boolean;
  error: Error | null;
  data: any;
}

function DataProvider({
  fetch,
  children
}: {
  fetch: () => Promise<any>;
  children: (args: RenderPropArgs) => React.ReactNode;
}) {
  const [state, setState] = useState<RenderPropArgs>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    fetch()
      .then(data => setState({ loading: false, error: null, data }))
      .catch(error => setState({ loading: false, error, data: null }));
  }, [fetch]);

  return <>{children(state)}</>;
}
```

### 3. Custom Hooks
```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
```

## Performance Optimization

### 1. Code Splitting
```typescript
import { lazy, Suspense } from 'react';

const PromptEditor = lazy(() => import('./components/PromptEditor'));
const Analytics = lazy(() => import('./components/Analytics'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/editor" element={<PromptEditor />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. Virtual Scrolling
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Error Handling

### Error Boundaries
```typescript
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error!} />;
    }

    return this.props.children;
  }
}
```

## Testing

### Component Testing with Vitest and React Testing Library
```typescript
// __tests__/PromptEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PromptEditor } from '../components/PromptEditor';

describe('PromptEditor', () => {
  it('should update prompt on input', async () => {
    const onChange = vi.fn();
    render(<PromptEditor value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New prompt' } });

    expect(onChange).toHaveBeenCalledWith('New prompt');
  });
});
```

## Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Reusable components
│   ├── common/      # Generic components
│   ├── features/    # Feature-specific components
│   └── layout/      # Layout components
├── hooks/           # Custom hooks
├── pages/           # Route pages
├── services/        # API services
├── stores/          # Global state stores
├── styles/          # Global styles
├── types/           # TypeScript types
├── utils/           # Utility functions
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## Routing with React Router v6

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'prompts',
        element: <PromptsPage />,
        children: [
          {
            path: ':promptId',
            element: <PromptDetail />,
            loader: async ({ params }) => {
              return fetchPrompt(params.promptId);
            },
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

## Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:8000/api
VITE_OPENROUTER_API_KEY=your_api_key
VITE_APP_NAME=Prompt Engineering Studio
```

```typescript
// Access in code
const apiUrl = import.meta.env.VITE_API_URL;
```

## Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'state': ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
});
```

## Additional Resources
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React Documentation](https://react.dev)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)