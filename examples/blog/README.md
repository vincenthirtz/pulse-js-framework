# Pulse Example: Blog

Multi-page blog platform with post CRUD operations, categories, and search.

## Features Demonstrated

- Component-based architecture with `.pulse` files
- View state management (list, detail, create, edit)
- Category filtering and full-text search
- Post creation and editing forms
- Responsive design with dark mode

## Getting Started

```bash
cd examples/blog
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main app with view routing |
| `src/components/Header.pulse` | Navigation and search |
| `src/components/PostCard.pulse` | Post preview card |
| `src/components/PostView.pulse` | Full post detail |
| `src/components/PostForm.pulse` | Create/edit form |
| `src/components/Sidebar.pulse` | Category sidebar |

## Framework APIs Used

- `pulse()` - Reactive state (posts, filters, current view)
- `computed()` - Derived filtered post list
- `el()` - CSS selector DOM creation
- `@if` / `@each` directives for conditional rendering
- Component props and callbacks

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
