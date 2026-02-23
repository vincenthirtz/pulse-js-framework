# Pulse Example: Chat App

Real-time chat application with multiple rooms, user presence, and message management.

## Features Demonstrated

- Complex nested state management (users, rooms, messages)
- Component composition with `.pulse` files
- Message reactions, editing, and deletion
- Emoji picker and context menus
- localStorage persistence for chat history
- Simulated bot responses for demo

## Getting Started

```bash
cd examples/chat
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main chat layout |
| `src/components/Sidebar.pulse` | Room list and user info |
| `src/components/ChatHeader.pulse` | Room header with actions |
| `src/components/MessageList.pulse` | Message display with reactions |
| `src/components/MessageInput.pulse` | Input with emoji picker |
| `src/components/UserSetupModal.pulse` | User setup flow |

## Framework APIs Used

- `pulse()` - Complex state (messages array, rooms, active user)
- `effect()` - Auto-scroll, localStorage sync
- `el()` - CSS selector DOM creation
- Event handling (input, click, contextmenu)
- `@if` / `@each` directives

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
