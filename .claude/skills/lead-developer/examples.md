# Lead Developer Examples

## Example 1: New Feature (WebSocket Heartbeat)

**User:** "Add heartbeat support to the WebSocket client"

**Plan Phase (haiku/sonnet):**
```
1. Read memory/cache/project-snapshot.md → check module sizes
2. grep "heartbeat\|ping\|pong" runtime/websocket.js → find existing code
3. Context needed: api-realtime.md (WebSocket API reference)
4. Plan: Add heartbeatInterval/heartbeatTimeout options, ping/pong cycle, auto-reconnect on timeout
5. Files: runtime/websocket.js, test/websocket.test.js, CLAUDE.md
```

**Execute Phase (sonnet):**
```
1. Read .claude/context/api-realtime.md
2. Implement heartbeat in runtime/websocket.js
3. Write tests in test/websocket.test.js (≥90% coverage)
4. npm test → all pass
5. Update CLAUDE.md WebSocket section
```

## Example 2: Bug Fix (Null Prop Access)

**User:** "Accessing notification.message in @if block throws null error"

**Plan Phase (haiku):**
```
1. grep "notification\|@if\|when(" compiler/transformer/ → find code gen
2. Context needed: api-core.md (when() behavior)
3. Root cause: effects inside when() stay subscribed after branch removal
4. Fix: add optional chaining for prop property access
5. Files: compiler/transformer/expressions.js, test/compiler.test.js
```

**Execute Phase (sonnet):**
```
1. Read .claude/context/api-core.md (when() section only)
2. Fix: notification.message → notification.get()?.message
3. Regression test
4. npm test → all pass
```

## Example 3: Major Refactor (Router RouteTrie)

**Plan Phase (sonnet):**
```
1. Read cache files → current router size, test count
2. Read .claude/context/api-router-store.md
3. ADR: Replace linear route matching with RouteTrie (O(n) → O(k))
4. Present plan to user → approved
```

**Execute Phase (opus):**
```
1. Create ADR document
2. Implement RouteTrie in runtime/router/core.js
3. Migrate createRouter to use RouteTrie
4. Write tests (unit + integration)
5. Performance benchmarks
6. Migration guide for custom route matching
7. npm test → all pass
```
